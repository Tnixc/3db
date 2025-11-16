declare global {
	namespace App {
		interface Locals {}
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
