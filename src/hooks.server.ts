import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Check for authentication in cookies
	const token = event.cookies.get('github_token');
	const userStr = event.cookies.get('github_user');

	if (token && userStr) {
		try {
			const user = JSON.parse(userStr);
			event.locals.token = token;
			event.locals.user = user;
		} catch (error) {
			// Invalid cookie data, clear it
			event.cookies.delete('github_token', { path: '/' });
			event.cookies.delete('github_user', { path: '/' });
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});

	// Add comprehensive security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
	);
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://api.github.com https://raw.githubusercontent.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
	);

	// Add HSTS header for HTTPS (only in production)
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};
