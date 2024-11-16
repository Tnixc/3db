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
