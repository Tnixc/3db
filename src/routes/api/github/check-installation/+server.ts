import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json({ installed: false });
	}

	const token = authHeader.replace('Bearer ', '');

	try {
		// Make a request to GitHub API to check if the app is installed
		const response = await fetch('https://api.github.com/user/installations', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		if (!response.ok) {
			return json({ installed: false });
		}

		const data = await response.json();
		const installed = data.total_count > 0;

		return json({ installed });
	} catch (error) {
		console.error('Error checking GitHub app installation:', error);
		return json({ installed: false });
	}
};
