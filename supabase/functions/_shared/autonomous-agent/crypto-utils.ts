// @ts-ignore
import crypto from 'node:crypto';
// @ts-ignore
import { Buffer } from 'node:buffer';

const SafeBuffer = Buffer;

/**
 * Utility for decrypting API keys using the master ENCRYPTION_KEY
 */
export const cryptoUtils = {
    decrypt(encryptedData: string, masterKeyBase64: string): string {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Invalid encrypted data format');
        }

        const combined = SafeBuffer.from(encryptedData, 'base64');
        if (combined.length < 96) throw new Error('Invalid encryption format: Data too short');

        const salt = combined.subarray(0, 64);
        const iv = combined.subarray(64, 64 + 16);
        const tag = combined.subarray(64 + 16, 64 + 16 + 16);
        const encrypted = combined.subarray(64 + 16 + 16);

        if (iv.length !== 16) throw new Error(`Invalid IV length: ${iv.length}`);

        const masterKey = SafeBuffer.from(masterKeyBase64, 'base64');

        // This is a simplified version of pbkdf2 to match the existing implementation
        // Note: In Node.js environment (Vite proxy)
        const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

        const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
};
