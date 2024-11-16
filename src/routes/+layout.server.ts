import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { getUser } }) => {
	const user = await getUser();
	return {
		user
	};
};
