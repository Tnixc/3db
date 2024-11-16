export type Repository = {
	id: string;
	name: string;
	full_name: string;
	owner: {
		login: string;
		avatar_url: string;
	};
	default_branch: string;
	private: boolean;
	html_url: string;
};

export type FileContent = {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: 'file' | 'dir';
	content?: string;
	encoding?: string;
};
