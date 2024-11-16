import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, getUser } }) => {
	// First check if there's an active session
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// Only get user if there's an active session
	const user = session ? await getUser() : null;

	return {
		user
	};
};
