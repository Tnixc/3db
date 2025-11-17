import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { urlMappingService } from '$lib/services/url-mappings';
import { URL_ENCRYPTION_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const token = cookies.get('github_token');
	if (!token) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userCookie = cookies.get('github_user');
	if (!userCookie) {
		return json({ error: 'User info not found' }, { status: 401 });
	}

	try {
		const { download_url } = await request.json();

		if (!download_url) {
			return json({ error: 'Missing download_url' }, { status: 400 });
		}

		// Encrypt the download URL to create the UUID
		const uuid = urlMappingService.encodeUrl(download_url, URL_ENCRYPTION_KEY);

		// Return masked URL
		const maskedUrl = `${url.origin}/f/${uuid}`;

		return json({ uuid, url: maskedUrl });
	} catch (error: any) {
		console.error('Failed to create file link:', error);
		return json({ error: error.message || 'Failed to create file link' }, { status: 500 });
	}
};
