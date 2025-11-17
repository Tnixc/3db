import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		console.error('OAuth error:', error);
		throw redirect(302, '/?error=oauth_failed');
	}

	try {
		// Determine the redirect URI (must match what we sent to GitHub)
		const redirectUri = dev
			? 'http://localhost:5173/auth/callback'
			: `${url.origin}/auth/callback`;

		// Exchange code for access token
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri
			})
		});

		const tokenData = await tokenResponse.json();

		if (tokenData.error || !tokenData.access_token) {
			console.error('Token exchange error:', tokenData.error_description || tokenData.error);
			throw redirect(302, '/?error=token_exchange_failed');
		}

		const accessToken = tokenData.access_token;
		const scope = tokenData.scope || '';

		// Log the received scopes for debugging
		console.log('[Auth] Received token with scopes:', scope);

		// Validate that we have the 'repo' scope (GitHub returns space-separated scopes)
		const scopes = scope.split(' ').filter((s: string) => s.length > 0);
		if (!scopes.includes('repo') && !scopes.includes('public_repo')) {
			console.error('[Auth] Missing required "repo" or "public_repo" scope. Received scopes:', scope);
			console.error('[Auth] Please ensure the GitHub OAuth App has the correct permissions configured.');
			console.error('[Auth] Visit https://github.com/settings/developers to check your OAuth App settings.');
			throw redirect(302, '/?error=insufficient_permissions');
		}

		// Verify token and get user info
		const userResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		if (!userResponse.ok) {
			console.error('Failed to fetch user info');
			throw redirect(302, '/?error=user_fetch_failed');
		}

		// Check actual OAuth scopes from the response headers
		const actualScopes = userResponse.headers.get('x-oauth-scopes') || '';
		console.log('[Auth] Token actual scopes from API:', actualScopes);

		// Verify we have write permissions
		const actualScopeList = actualScopes.split(',').map((s: string) => s.trim());
		if (!actualScopeList.includes('repo') && !actualScopeList.includes('public_repo')) {
			console.error('[Auth] Token verification failed - missing write permissions');
			console.error('[Auth] Token scopes:', actualScopes);
			console.error(
				'[Auth] IMPORTANT: You may need to revoke and re-authorize the app at https://github.com/settings/applications'
			);
			throw redirect(302, '/?error=token_verification_failed');
		}

		const userData = await userResponse.json();

		// Set httpOnly cookie for token (secure, not accessible by JavaScript)
		cookies.set('github_token', accessToken, {
			path: '/',
			httpOnly: true, // Protected from JavaScript
			secure: !dev, // HTTPS only in production
			sameSite: 'lax', // CSRF protection (lax for OAuth redirect)
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Set user info cookie (readable by client for UI)
		cookies.set(
			'github_user',
			JSON.stringify({
				login: userData.login,
				name: userData.name || userData.login,
				email: userData.email || `${userData.login}@users.noreply.github.com`,
				avatar_url: userData.avatar_url
			}),
			{
				path: '/',
				httpOnly: false, // Readable by client
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			}
		);

		throw redirect(302, '/');
	} catch (error) {
		if (error instanceof Response) {
			throw error; // Re-throw redirect responses
		}
		console.error('OAuth callback error:', error);
		throw redirect(302, '/?error=auth_failed');
	}
};
