import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createSupabaseLoadClient } from '@supabase/auth-helpers-sveltekit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase = createSupabaseLoadClient({
		supabaseUrl: PUBLIC_SUPABASE_URL,
		supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
		event: { fetch },
		serverSession: null // Remove serverSession since we're not using sessions anymore
	});

	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error) {
		console.error('Error fetching user:', error);
	}

	return {
		supabase,
		user
	};
};
