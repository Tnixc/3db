import crypto from 'crypto';

export class UrlMappingService {
	/**
	 * Encrypt a download URL using AES-256-GCM
	 * Returns a URL-safe encrypted string
	 */
	encodeUrl(downloadUrl: string, encryptionKey: string): string {
		// Create a 32-byte key from the encryption key
		const key = crypto.createHash('sha256').update(encryptionKey).digest();

		// Generate a random IV (12 bytes for GCM)
		const iv = crypto.randomBytes(12);

		// Create cipher
		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

		// Encrypt the URL
		let encrypted = cipher.update(downloadUrl, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		// Get the auth tag
		const authTag = cipher.getAuthTag();

		// Combine IV + authTag + encrypted data
		const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);

		// Convert to base64url (URL-safe)
		return combined
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	/**
	 * Decrypt a URL from the encrypted string
	 */
	decodeUrl(encoded: string, encryptionKey: string): string {
		// Convert from base64url to buffer
		const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64 + '=='.substring(0, (4 - (base64.length % 4)) % 4);
		const combined = Buffer.from(padded, 'base64');

		// Extract IV (12 bytes), authTag (16 bytes), and encrypted data
		const iv = combined.subarray(0, 12);
		const authTag = combined.subarray(12, 28);
		const encrypted = combined.subarray(28);

		// Create a 32-byte key from the encryption key
		const key = crypto.createHash('sha256').update(encryptionKey).digest();

		// Create decipher
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(authTag);

		// Decrypt the URL
		let decrypted = decipher.update(encrypted, undefined, 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	}
}

export const urlMappingService = new UrlMappingService();
