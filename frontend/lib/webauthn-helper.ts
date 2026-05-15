// WebAuthn Helper Utilities for Fingerprint Registration
// Uses Windows Hello on HP Envy for biometric authentication

import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/browser'

export interface BiometricCredential {
    credentialId: string
    publicKey: string
    counter: number
    registeredAt: string
    deviceType: string
    aaguid?: string
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
    return window?.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function'
}

/**
 * Check if platform authenticator (Windows Hello) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!isWebAuthnSupported()) {
        return false
    }

    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch (error) {
        console.error('Error checking platform authenticator:', error)
        return false
    }
}

/**
 * Generate registration options for WebAuthn
 */
export function generateRegistrationOptions(
    employeeId: string,
    employeeName: string,
    employeeEmail: string
): PublicKeyCredentialCreationOptionsJSON {
    // Generate a random challenge (in production, this should come from server)
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    return {
        challenge: bufferToBase64URLString(challenge),
        rp: {
            name: 'Attendance Manager',
            id: window.location.hostname,
        },
        user: {
            id: employeeId,
            name: employeeEmail || employeeId,
            displayName: employeeName,
        },
        pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
            authenticatorAttachment: 'platform', // Use platform authenticator (Windows Hello)
            requireResidentKey: false,
            userVerification: 'required', // Require biometric verification
        },
    }
}

/**
 * Generate authentication options for WebAuthn
 */
export function generateAuthenticationOptions(
    allowedCredentials?: { id: string; type: 'public-key' }[]
): PublicKeyCredentialRequestOptionsJSON {
    // Generate a random challenge
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    return {
        challenge: bufferToBase64URLString(challenge),
        timeout: 60000,
        rpId: window.location.hostname,
        userVerification: 'required',
        allowCredentials: allowedCredentials,
    }
}

/**
 * Register a new fingerprint credential using Windows Hello
 */
export async function registerFingerprint(
    employeeId: string,
    employeeName: string,
    employeeEmail: string
): Promise<BiometricCredential> {
    // Check support
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser')
    }

    const platformAvailable = await isPlatformAuthenticatorAvailable()
    if (!platformAvailable) {
        throw new Error('Windows Hello is not available. Please set up Windows Hello in your system settings.')
    }

    try {
        // Generate registration options
        const options = generateRegistrationOptions(employeeId, employeeName, employeeEmail)

        // Start registration with SimpleWebAuthn
        const credential = await startRegistration({ optionsJSON: options })

        // Extract credential data
        const credentialId = credential.id
        const publicKey = credential.response.publicKey || ''

        // Create biometric credential object
        const biometricCredential: BiometricCredential = {
            credentialId,
            publicKey,
            counter: 0,
            registeredAt: new Date().toISOString(),
            deviceType: 'platform', // Windows Hello
            aaguid: credential.response.authenticatorData,
        }

        return biometricCredential
    } catch (error: any) {
        console.error('Fingerprint registration error:', error)

        // Provide user-friendly error messages
        if (error.name === 'NotAllowedError') {
            throw new Error('Fingerprint registration was cancelled or timed out')
        } else if (error.name === 'InvalidStateError') {
            throw new Error('This fingerprint is already registered')
        } else if (error.name === 'NotSupportedError') {
            throw new Error('Your device does not support fingerprint authentication')
        } else {
            throw new Error(`Registration failed: ${error.message}`)
        }
    }
}

/**
 * Verify fingerprint for attendance check-in
 */
export async function verifyFingerprint(
    allowedCredentialIds?: string[]
): Promise<{ credentialId: string; success: boolean }> {
    if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser')
    }

    try {
        // Generate authentication options
        const allowedCredentials = allowedCredentialIds?.map(id => ({
            id,
            type: 'public-key' as const,
        }))

        const options = generateAuthenticationOptions(allowedCredentials)

        // Start authentication
        const assertion = await startAuthentication({ optionsJSON: options })

        return {
            credentialId: assertion.id,
            success: true,
        }
    } catch (error: any) {
        console.error('Fingerprint verification error:', error)

        if (error.name === 'NotAllowedError') {
            throw new Error('Fingerprint verification was cancelled or timed out')
        } else if (error.name === 'InvalidStateError') {
            throw new Error('No registered fingerprints found')
        } else {
            throw new Error(`Verification failed: ${error.message}`)
        }
    }
}

/**
 * Get user-friendly setup instructions for Windows Hello
 */
export function getWindowsHelloInstructions(): string[] {
    return [
        'Open Windows Settings (Win + I)',
        'Go to Accounts > Sign-in options',
        'Click on "Fingerprint recognition (Windows Hello)"',
        'Click "Set up" and follow the on-screen instructions',
        'Register multiple fingers for better reliability',
        'Return to this page and try registration again',
    ]
}

/**
 * Utility: Convert ArrayBuffer to Base64URL string
 */
function bufferToBase64URLString(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let str = ''

    for (const charCode of bytes) {
        str += String.fromCharCode(charCode)
    }

    const base64String = btoa(str)

    return base64String
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

/**
 * Utility: Convert Base64URL string to ArrayBuffer
 */
export function base64URLStringToBuffer(base64URLString: string): ArrayBuffer {
    const base64 = base64URLString
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const padLength = (4 - (base64.length % 4)) % 4
    const padded = base64.padEnd(base64.length + padLength, '=')

    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }

    return bytes.buffer
}
