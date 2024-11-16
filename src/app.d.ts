/// <reference types="@supabase/supabase-js" />

declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			getUser: () => Promise<import('@supabase/supabase-js').User | null>;
		}
		interface PageData {
			user: import('@supabase/supabase-js').User | null;
		}
	}
}

export {};
