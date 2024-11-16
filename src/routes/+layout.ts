import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createSupabaseLoadClient } from '@supabase/auth-helpers-sveltekit';
import type { LoadEvent } from '@sveltejs/kit';

export const load = async ({ fetch, depends }: LoadEvent) => {
	depends('supabase:auth');

	const supabase = createSupabaseLoadClient({
		supabaseUrl: PUBLIC_SUPABASE_URL,
		supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
		event: { fetch },
		serverSession: null
	});

	// First check session
	const {
		data: { session }
	} = await supabase.auth.getSession();

	let user = null;
	if (session) {
		const {
			data: { user: userData },
			error
		} = await supabase.auth.getUser();
		if (error) {
			console.error('Error fetching user:', error);
		} else {
			user = userData;
		}
	}

	return {
		supabase,
		user
	};
};
