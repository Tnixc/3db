import * as github from './github';
import type { GitHubConfig } from './github';
import { SERVICE_REPO_PATH } from '$lib/types';
import type { FileContent } from '$lib/types';

const MAPPINGS_FILE = 'url-mappings.json';

export type UrlMapping = {
	owner: string;
	repo: string;
	path: string;
	sha: string;
	download_url: string;
	created: string;
};

export type UrlMappings = {
	[uuid: string]: UrlMapping;
};

export class UrlMappingService {
	/**
	 * Get all URL mappings from the service repository
	 */
	async getMappings(config: GitHubConfig, username: string): Promise<UrlMappings> {
		try {
			const content = await github.getContents(config, username, SERVICE_REPO_PATH, MAPPINGS_FILE);
			if (Array.isArray(content)) {
				throw new Error('Expected file, got directory');
			}
			const fileContent = content as FileContent;
			if (!fileContent.content) {
				return {};
			}
			const decoded = atob(fileContent.content);
			return JSON.parse(decoded);
		} catch (error: any) {
			// If file doesn't exist, return empty mappings
			if (error.status === 404) {
				return {};
			}
			throw error;
		}
	}

	/**
	 * Save URL mappings to the service repository
	 */
	async saveMappings(
		config: GitHubConfig,
		username: string,
		mappings: UrlMappings,
		sha?: string
	): Promise<void> {
		const content = JSON.stringify(mappings, null, 2);
		await github.createFile(
			config,
			username,
			SERVICE_REPO_PATH,
			MAPPINGS_FILE,
			content,
			'Update URL mappings',
			sha
		);
	}

	/**
	 * Encrypt a download URL using AES-256-GCM
	 * Returns a URL-safe encrypted string
	 */
	encodeUrl(downloadUrl: string, encryptionKey: string): string {
		const crypto = require('crypto');

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
		const crypto = require('crypto');

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

	/**
	 * Add a new URL mapping
	 * Returns an encrypted string that contains the download_url
	 * Optionally stores metadata in the user's service repo for record-keeping
	 */
	async addMapping(
		config: GitHubConfig,
		username: string,
		owner: string,
		repo: string,
		path: string,
		sha: string,
		download_url: string,
		encryptionKey: string
	): Promise<string> {
		// Generate encrypted URL (this is our "UUID")
		const encoded = this.encodeUrl(download_url, encryptionKey);

		// Optionally store metadata in service repo for user's reference
		// This is done in the background and doesn't block the response
		try {
			let currentSha: string | undefined;
			let mappings: UrlMappings;

			try {
				const content = await github.getContents(
					config,
					username,
					SERVICE_REPO_PATH,
					MAPPINGS_FILE
				);
				if (!Array.isArray(content)) {
					const fileContent = content as FileContent;
					currentSha = fileContent.sha;
					if (fileContent.content) {
						mappings = JSON.parse(atob(fileContent.content));
					} else {
						mappings = {};
					}
				} else {
					mappings = {};
				}
			} catch (error: any) {
				if (error.status === 404) {
					mappings = {};
				} else {
					throw error;
				}
			}

			// Store or update mapping
			mappings[encoded] = {
				owner,
				repo,
				path,
				sha,
				download_url,
				created: mappings[encoded]?.created || new Date().toISOString()
			};

			// Save mappings (non-blocking)
			await this.saveMappings(config, username, mappings, currentSha);
		} catch (err) {
			// Log but don't fail - the encoded URL works without this
			console.warn('Failed to save mapping metadata:', err);
		}

		return encoded;
	}

	/**
	 * Get a URL mapping by UUID
	 */
	async getMapping(config: GitHubConfig, username: string, uuid: string): Promise<UrlMapping | null> {
		const mappings = await this.getMappings(config, username);
		return mappings[uuid] || null;
	}
}

export const urlMappingService = new UrlMappingService();
