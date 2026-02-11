/**
 * ZKTeco Fingerprint Template Validator & Converter
 * 
 * Handles validation and normalization of fingerprint templates
 * between SLK20R (enrollment device) and MB460 (attendance terminal).
 * 
 * Both devices use ZKTeco SilkID algorithm, but may produce templates
 * with slightly different sizes or headers. This service normalizes
 * templates to ensure cross-device compatibility.
 */

import { logger } from '../utils/logger';

// Known valid template sizes for ZKTeco devices
const VALID_TEMPLATE_SIZES = {
    SILKID_V10_STANDARD: 1232,   // Most common for SilkID v10.0
    SILKID_V10_EXTENDED: 1260,   // SLK20R with header (28-byte header + 1232 payload)
    ZKFINGER_V9: 608,            // Older ZKFinger v9 format
    ZKFINGER_V9_MINI: 512,       // Compact ZKFinger v9 format
};

const ALL_VALID_SIZES = Object.values(VALID_TEMPLATE_SIZES);

export interface TemplateValidationResult {
    isValid: boolean;
    base64Length: number;
    bufferSize: number;
    firstBytesHex: string;
    lastBytesHex: string;
    sizeCategory: string | null;
    warnings: string[];
    errors: string[];
}

export interface TemplateInspection extends TemplateValidationResult {
    isBase64Valid: boolean;
    expectedSizes: number[];
    sizeMatch: boolean;
    suggestedNormalization: string | null;
}

/**
 * Validate a Base64-encoded fingerprint template
 */
export function validateTemplate(base64Template: string): TemplateValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!base64Template || base64Template.trim().length === 0) {
        return {
            isValid: false,
            base64Length: 0,
            bufferSize: 0,
            firstBytesHex: '',
            lastBytesHex: '',
            sizeCategory: null,
            warnings,
            errors: ['Template is empty or null'],
        };
    }

    // Clean whitespace
    const cleanTemplate = base64Template.replace(/\s/g, '');

    // Validate Base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanTemplate)) {
        errors.push('Template contains invalid Base64 characters');
    }

    let buffer: Buffer;
    try {
        buffer = Buffer.from(cleanTemplate, 'base64');
    } catch (e) {
        return {
            isValid: false,
            base64Length: cleanTemplate.length,
            bufferSize: 0,
            firstBytesHex: '',
            lastBytesHex: '',
            sizeCategory: null,
            warnings,
            errors: [`Failed to decode Base64: ${e}`],
        };
    }

    // Size category detection
    let sizeCategory: string | null = null;
    if (buffer.length === VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD) {
        sizeCategory = 'SilkID v10.0 Standard (1232 bytes)';
    } else if (buffer.length === VALID_TEMPLATE_SIZES.SILKID_V10_EXTENDED) {
        sizeCategory = 'SilkID v10.0 Extended (1260 bytes - has 28-byte header)';
        warnings.push('Template has 28-byte header. MB460 may need the trimmed 1232-byte version.');
    } else if (buffer.length === VALID_TEMPLATE_SIZES.ZKFINGER_V9) {
        sizeCategory = 'ZKFinger v9 (608 bytes)';
        warnings.push('This is a v9 format template. MB460 with SilkID may not accept it.');
    } else if (buffer.length === VALID_TEMPLATE_SIZES.ZKFINGER_V9_MINI) {
        sizeCategory = 'ZKFinger v9 Mini (512 bytes)';
        warnings.push('This is a compact v9 format. MB460 with SilkID may not accept it.');
    } else {
        sizeCategory = `Unknown size (${buffer.length} bytes)`;
        warnings.push(`Template size ${buffer.length} is not a standard ZKTeco size. Expected one of: ${ALL_VALID_SIZES.join(', ')}`);
    }

    // Size reasonableness check
    if (buffer.length < 100) {
        errors.push(`Template only ${buffer.length} bytes — too small for a valid fingerprint.`);
    }
    if (buffer.length > 5000) {
        warnings.push(`Template is ${buffer.length} bytes — unusually large for ZKTeco format.`);
    }

    // Check for potential truncation (Base64 length should be ~4/3 of binary length)
    const expectedBase64Len = Math.ceil(buffer.length / 3) * 4;
    if (cleanTemplate.length < expectedBase64Len - 4) {
        warnings.push(`Base64 string length (${cleanTemplate.length}) seems short for ${buffer.length} bytes. Possible truncation.`);
    }

    return {
        isValid: errors.length === 0,
        base64Length: cleanTemplate.length,
        bufferSize: buffer.length,
        firstBytesHex: buffer.slice(0, 20).toString('hex'),
        lastBytesHex: buffer.slice(-10).toString('hex'),
        sizeCategory,
        warnings,
        errors,
    };
}

/**
 * Full inspection of a template — for diagnostics
 */
export function inspectTemplate(base64Template: string): TemplateInspection {
    const validation = validateTemplate(base64Template);

    const cleanTemplate = (base64Template || '').replace(/\s/g, '');
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isBase64Valid = base64Regex.test(cleanTemplate) && cleanTemplate.length > 0;

    let suggestedNormalization: string | null = null;
    if (validation.bufferSize === VALID_TEMPLATE_SIZES.SILKID_V10_EXTENDED) {
        suggestedNormalization = 'Trim 28-byte header to produce 1232-byte template for MB460';
    } else if (validation.bufferSize > VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD && validation.bufferSize < VALID_TEMPLATE_SIZES.SILKID_V10_EXTENDED) {
        suggestedNormalization = `Template is ${validation.bufferSize} bytes. Try trimming to 1232 bytes.`;
    }

    return {
        ...validation,
        isBase64Valid,
        expectedSizes: ALL_VALID_SIZES,
        sizeMatch: ALL_VALID_SIZES.includes(validation.bufferSize),
        suggestedNormalization,
    };
}

/**
 * Normalize a template for MB460 compatibility.
 * 
 * - If 1260 bytes: trim 28-byte header to get 1232
 * - If already 1232 or other valid size: return as-is
 * - If larger than 1232 but not 1260: attempt to extract last 1232 bytes
 * 
 * Returns the normalized Base64 string and metadata about what was done.
 */
export function normalizeTemplateForMB460(base64Template: string): {
    template: string;
    originalSize: number;
    normalizedSize: number;
    action: string;
} {
    const cleanTemplate = base64Template.replace(/\s/g, '');
    const buffer = Buffer.from(cleanTemplate, 'base64');
    const originalSize = buffer.length;

    // Case 1: Already the right size
    if (buffer.length === VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD) {
        logger.info(`[TemplateNorm] Template already ${buffer.length} bytes — no normalization needed.`);
        return {
            template: cleanTemplate,
            originalSize,
            normalizedSize: buffer.length,
            action: 'none',
        };
    }

    // Case 2: 1260-byte template with 28-byte header
    if (buffer.length === VALID_TEMPLATE_SIZES.SILKID_V10_EXTENDED) {
        const trimmed = buffer.slice(28);
        logger.info(`[TemplateNorm] Trimmed 28-byte header: ${originalSize} → ${trimmed.length} bytes`);
        return {
            template: trimmed.toString('base64'),
            originalSize,
            normalizedSize: trimmed.length,
            action: 'trimmed_28byte_header',
        };
    }

    // Case 3: Larger than expected — try trimming to 1232 from end
    if (buffer.length > VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD) {
        const excess = buffer.length - VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD;
        const trimmed = buffer.slice(excess);
        logger.warn(`[TemplateNorm] ⚠️ Non-standard size ${buffer.length}. Trimming ${excess} leading bytes to get 1232.`);
        return {
            template: trimmed.toString('base64'),
            originalSize,
            normalizedSize: trimmed.length,
            action: `trimmed_${excess}_leading_bytes`,
        };
    }

    // Case 4: Smaller than expected — return as-is with warning
    logger.warn(`[TemplateNorm] ⚠️ Template is ${buffer.length} bytes (smaller than expected 1232). Returning as-is.`);
    return {
        template: cleanTemplate,
        originalSize,
        normalizedSize: buffer.length,
        action: 'none_undersized',
    };
}

/**
 * Verify template compatibility with a target device type.
 */
export function verifyCompatibility(
    base64Template: string,
    targetDevice: 'mb460' | 'k40' | 'slk20r'
): { compatible: boolean; reason: string } {
    const cleanTemplate = base64Template.replace(/\s/g, '');
    let buffer: Buffer;

    try {
        buffer = Buffer.from(cleanTemplate, 'base64');
    } catch {
        return { compatible: false, reason: 'Invalid Base64 encoding' };
    }

    const deviceRequirements: Record<string, { sizes: number[]; description: string }> = {
        mb460: {
            sizes: [VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD],
            description: 'MB460 requires SilkID v10.0 at 1232 bytes',
        },
        k40: {
            sizes: [VALID_TEMPLATE_SIZES.ZKFINGER_V9, VALID_TEMPLATE_SIZES.ZKFINGER_V9_MINI],
            description: 'K40 accepts ZKFinger v9 at 608 or 512 bytes',
        },
        slk20r: {
            sizes: [VALID_TEMPLATE_SIZES.SILKID_V10_STANDARD, VALID_TEMPLATE_SIZES.SILKID_V10_EXTENDED],
            description: 'SLK20R produces SilkID v10.0 at 1232 or 1260 bytes',
        },
    };

    const req = deviceRequirements[targetDevice];
    if (!req) {
        return { compatible: false, reason: `Unknown target device: ${targetDevice}` };
    }

    if (req.sizes.includes(buffer.length)) {
        return { compatible: true, reason: `Template size ${buffer.length} matches ${req.description}` };
    }

    return {
        compatible: false,
        reason: `Template size ${buffer.length} bytes does not match expected sizes [${req.sizes.join(', ')}]. ${req.description}`,
    };
}
