declare global {
	namespace App {
		interface Locals {
			token?: string;
			user?: {
				login: string;
				name: string;
				email: string;
				avatar_url: string;
			};
		}
		interface PageData {
			user: {
				login: string;
				name: string;
				email: string;
				avatar_url: string;
			} | null;
		}
	}
}

export {};
