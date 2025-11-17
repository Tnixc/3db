import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { urlMappingService } from '$lib/services/url-mappings';
import type { GitHubConfig } from '$lib/services/github';
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

	const user = JSON.parse(userCookie);

	try {
		const { owner, repo, path, sha, download_url } = await request.json();

		if (!owner || !repo || !path || !sha || !download_url) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Create GitHub config
		const config: GitHubConfig = {
			token,
			userEmail: user.email || ''
		};

		// Generate UUID and store mapping
		const uuid = await urlMappingService.addMapping(
			config,
			user.login,
			owner,
			repo,
			path,
			sha,
			download_url,
			URL_ENCRYPTION_KEY
		);

		// Return masked URL
		const maskedUrl = `${url.origin}/f/${uuid}`;

		return json({ uuid, url: maskedUrl });
	} catch (error: any) {
		console.error('Failed to create file link:', error);
		return json({ error: error.message || 'Failed to create file link' }, { status: 500 });
	}
};
