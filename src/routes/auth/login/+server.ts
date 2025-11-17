import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_CLIENT_ID } from '$env/static/private';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url }) => {
	// Determine the redirect URI based on environment
	const redirectUri = dev
		? 'http://localhost:5173/auth/callback'
		: `${url.origin}/auth/callback`;

	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		scope: 'repo user:email', // repo for full access, user:email to get private email
		redirect_uri: redirectUri
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
