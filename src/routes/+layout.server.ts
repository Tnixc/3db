import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, getUser } }) => {
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const user = session ? await getUser() : null;

	return {
		user,
		session
	};
};
