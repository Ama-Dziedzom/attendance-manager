/**
 * PIN Generator Utility
 * 
 * Centralizes the logic for generating numeric PINs for ZKTeco devices.
 * Previously this logic was duplicated in 5+ places in adms-routes.ts.
 * 
 * ZKTeco terminals require a numeric-only PIN to identify users.
 * Priority: device_pin field > extracted from emp_id
 */

import { logger } from './logger';

export interface PinSource {
    emp_id: string;
    device_pin?: number | null;
    name?: string;
}

/**
 * Generates a numeric PIN for a ZKTeco device.
 * 
 * Logic:
 * 1. If `device_pin` is set, use it directly
 * 2. Otherwise, extract numeric portion from `emp_id` (e.g. "ID-00004" → "4")
 * 3. Strip leading zeros to get a clean integer string
 * 
 * @throws Error if no numeric data can be extracted
 */
export function generateDevicePin(employee: PinSource): string {
    if (employee.device_pin != null) {
        return employee.device_pin.toString();
    }

    const partToUse = employee.emp_id.includes('-')
        ? employee.emp_id.split('-')[1]
        : employee.emp_id;

    const numericOnly = partToUse.replace(/\D/g, '');

    if (!numericOnly) {
        logger.error(`Cannot generate device PIN for employee ${employee.emp_id}: no numeric data`);
        throw new Error(`Cannot generate device PIN for employee ${employee.emp_id}`);
    }

    // Remove leading zeros
    return parseInt(numericOnly, 10).toString();
}

/**
 * Validates a PIN is within ZKTeco device limits.
 * PIN must be a positive integer that fits in a 32-bit signed integer.
 */
export function validatePin(pin: string): boolean {
    const pinNum = parseInt(pin, 10);
    return !isNaN(pinNum) && pinNum > 0 && pinNum < 2147483647;
}
