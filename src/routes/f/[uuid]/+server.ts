import type { RequestHandler } from './$types';
import { urlMappingService } from '$lib/services/url-mappings';
import { error } from '@sveltejs/kit';
import { URL_ENCRYPTION_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const { uuid } = params;

	try {
		// Decrypt the URL from the UUID
		const downloadUrl = urlMappingService.decodeUrl(uuid, URL_ENCRYPTION_KEY);

		if (!downloadUrl || !downloadUrl.startsWith('https://raw.githubusercontent.com/')) {
			throw error(400, 'Invalid file identifier');
		}

		// Fetch the file from GitHub
		// For public repos, this works without authentication
		// For private repos, this will fail with 404 (user needs to make repo public)
		const response = await fetch(downloadUrl);

		if (!response.ok) {
			if (response.status === 404) {
				throw error(
					404,
					'File not found. If this is a private repository, you need to make it public for CDN functionality.'
				);
			}
			throw error(response.status, 'Failed to fetch file from GitHub');
		}

		// Get the file content
		const content = await response.arrayBuffer();

		// Get content type from the response or determine from URL
		let contentType = response.headers.get('content-type') || 'application/octet-stream';

		// If GitHub didn't provide a content type, guess from extension
		if (contentType === 'application/octet-stream' || contentType === 'text/plain') {
			const ext = downloadUrl.split('.').pop()?.toLowerCase() || '';
			const contentTypeMap: Record<string, string> = {
				jpg: 'image/jpeg',
				jpeg: 'image/jpeg',
				png: 'image/png',
				gif: 'image/gif',
				webp: 'image/webp',
				svg: 'image/svg+xml',
				pdf: 'application/pdf',
				json: 'application/json',
				txt: 'text/plain',
				html: 'text/html',
				css: 'text/css',
				js: 'application/javascript',
				ts: 'application/typescript',
				md: 'text/markdown',
				mp4: 'video/mp4',
				webm: 'video/webm',
				mp3: 'audio/mpeg',
				wav: 'audio/wav',
				zip: 'application/zip',
				tar: 'application/x-tar',
				gz: 'application/gzip'
			};
			contentType = contentTypeMap[ext] || contentType;
		}

		// Extract filename from URL
		const filename = downloadUrl.split('/').pop() || 'file';

		// Set headers for CDN behavior
		setHeaders({
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Content-Disposition': `inline; filename="${filename}"`,
			'Access-Control-Allow-Origin': '*' // Allow CORS for CDN usage
		});

		// Return the file content
		return new Response(content);
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Failed to serve file:', err);
		throw error(500, 'Failed to serve file');
	}
};
