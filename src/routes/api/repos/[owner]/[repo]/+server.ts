import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as github from '$lib/services/github';
import type { GitHubConfig } from '$lib/services/github';

// DELETE repository
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	const { owner, repo } = params;

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		await github.deleteRepository(config, owner, repo);
		return json({ success: true });
	} catch (err) {
		console.error('Error deleting repository:', err);
		throw error(500, 'Failed to delete repository');
	}
};
