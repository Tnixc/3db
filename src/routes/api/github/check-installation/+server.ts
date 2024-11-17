import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase, getUser } }) => {
	const user = await getUser();

	if (!user) {
		return json({ installed: false });
	}

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session?.provider_token) {
			return json({ installed: false });
		}

		// Make a request to GitHub API to check if the app is installed
		const response = await fetch('https://api.github.com/user/installations', {
			headers: {
				Authorization: `Bearer ${session.provider_token}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		const data = await response.json();
		const installed = data.total_count > 0;

		return json({ installed });
	} catch (error) {
		console.error('Error checking GitHub app installation:', error);
		return json({ installed: false });
	}
};
