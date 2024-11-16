/// <reference types="@supabase/supabase-js" />

declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			getSession: () => Promise<import('@supabase/supabase-js').Session | null>;
		}
		// interface Error {}
		interface PageData {
			session: import('@supabase/supabase-js').Session | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
