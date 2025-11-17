/**
 * Security utility functions for input validation and sanitization
 */

/**
 * Sanitize a file path to prevent path traversal attacks
 * @param path The path to sanitize
 * @returns Sanitized path with no path traversal sequences
 */
export function sanitizePath(path: string): string {
	// Remove path traversal attempts and normalize
	return path
		.replace(/\.\./g, '') // Remove ..
		.replace(/^\/+/, '') // Remove leading slashes
		.replace(/\/+/g, '/') // Normalize multiple slashes
		.trim();
}

/**
 * Sanitize a filename to prevent path injection
 * @param filename The filename to sanitize
 * @returns Sanitized filename safe for file operations
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/\.\./g, '') // Remove path traversal
		.replace(/[\/\\]/g, '_') // Replace path separators with underscore
		.replace(/^\.+/, '') // Remove leading dots
		.replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
		.trim();
}

/**
 * Validate a repository name according to GitHub's rules
 * @param name The repository name to validate
 * @returns Validation result with error message if invalid
 */
export function validateRepositoryName(name: string): { valid: boolean; error?: string } {
	if (!name || name.trim().length === 0) {
		return { valid: false, error: 'Repository name is required' };
	}

	if (name.length > 100) {
		return { valid: false, error: 'Repository name must be 100 characters or less' };
	}

	// GitHub repository name rules:
	// - Alphanumeric, hyphen, underscore, and period only
	// - Cannot start with period or hyphen
	// - Cannot end with period
	if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
		return {
			valid: false,
			error: 'Repository name can only contain alphanumeric characters, hyphens, underscores, and periods'
		};
	}

	if (name.startsWith('.') || name.startsWith('-')) {
		return { valid: false, error: 'Repository name cannot start with a period or hyphen' };
	}

	if (name.endsWith('.')) {
		return { valid: false, error: 'Repository name cannot end with a period' };
	}

	// Reserved names
	const reserved = ['_', '.', '..'];
	if (reserved.includes(name)) {
		return { valid: false, error: 'This repository name is reserved' };
	}

	return { valid: true };
}

/**
 * Validate file size
 * @param size File size in bytes
 * @param maxSize Maximum allowed size in bytes (default: 100MB)
 * @returns Validation result with error message if invalid
 */
export function validateFileSize(
	size: number,
	maxSize: number = 100 * 1024 * 1024
): { valid: boolean; error?: string } {
	if (size > maxSize) {
		return {
			valid: false,
			error: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`
		};
	}
	return { valid: true };
}

/**
 * Check if a file extension is blocked for security reasons
 * @param filename The filename to check
 * @param blockedExtensions List of blocked extensions (default: common executables)
 * @returns True if the extension is blocked
 */
export function isBlockedFileExtension(
	filename: string,
	blockedExtensions: string[] = [
		'.exe',
		'.bat',
		'.cmd',
		'.sh',
		'.ps1',
		'.scr',
		'.msi',
		'.dll',
		'.com',
		'.pif',
		'.vbs',
		'.js' // Blocking .js at upload level (can be added to repo via git)
	]
): boolean {
	const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
	return blockedExtensions.includes(ext);
}

/**
 * Safely decode base64 with error handling
 * @param encoded Base64 encoded string
 * @returns Decoded string or null if invalid
 */
export function safeBase64Decode(encoded: string): string | null {
	try {
		// Remove whitespace and validate base64 format
		const cleaned = encoded.replace(/\s/g, '');
		if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
			return null;
		}
		return atob(cleaned);
	} catch {
		return null;
	}
}

/**
 * Safely parse JSON with error handling
 * @param json JSON string to parse
 * @param defaultValue Default value to return on error
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return defaultValue;
	}
}
