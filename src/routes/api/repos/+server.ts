import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as github from '$lib/services/github';
import type { GitHubConfig } from '$lib/services/github';

// GET all repositories
export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		const repos = await github.getRepositories(config);
		return json(repos);
	} catch (err) {
		console.error('Error fetching repositories:', err);
		throw error(500, 'Failed to fetch repositories');
	}
};

// POST create repository
export const POST: RequestHandler = async ({ cookies, request }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		const { name } = await request.json();

		if (!name) {
			throw error(400, 'Repository name is required');
		}

		const repo = await github.createRepository(config, name);
		return json(repo);
	} catch (err) {
		console.error('Error creating repository:', err);
		throw error(500, 'Failed to create repository');
	}
};
