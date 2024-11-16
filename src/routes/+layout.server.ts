import type { LayoutServerLoad } from '@sveltejs/kit';

export const load = (async ({ locals: { getUser } }) => {
	const user = await getUser();
	return {
		user
	};
}) satisfies LayoutServerLoad;
