"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptoUtils = void 0;
var crypto = require("crypto");
// @ts-ignore
var SafeBuffer = typeof Buffer !== 'undefined' ? Buffer : globalThis.Buffer;
/**
 * Utility for decrypting API keys using the master ENCRYPTION_KEY
 */
exports.cryptoUtils = {
    decrypt: function (encryptedData, masterKeyBase64) {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Invalid encrypted data format');
        }
        var combined = SafeBuffer.from(encryptedData, 'base64');
        if (combined.length < 96)
            throw new Error('Invalid encryption format: Data too short');
        var salt = combined.subarray(0, 64);
        var iv = combined.subarray(64, 64 + 16);
        var tag = combined.subarray(64 + 16, 64 + 16 + 16);
        var encrypted = combined.subarray(64 + 16 + 16);
        if (iv.length !== 16)
            throw new Error("Invalid IV length: ".concat(iv.length));
        var masterKey = SafeBuffer.from(masterKeyBase64, 'base64');
        // This is a simplified version of pbkdf2 to match the existing implementation
        // Note: In Node.js environment (Vite proxy)
        var derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
        var decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(tag);
        var decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
};
