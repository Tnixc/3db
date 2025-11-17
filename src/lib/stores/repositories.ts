import { writable } from 'svelte/store';
import type { Repository } from '$lib/types';

// Load cached repositories from localStorage
const cachedRepos = typeof window !== 'undefined'
	? JSON.parse(localStorage.getItem('repositories') || '[]')
	: [];

// Load cached current repository ID from localStorage
const cachedCurrentRepoId = typeof window !== 'undefined'
	? localStorage.getItem('currentRepositoryId')
	: null;

// Create repositories store with cached data
export const repositories = writable<Repository[]>(cachedRepos);

// Subscribe to repositories to save to localStorage
if (typeof window !== 'undefined') {
	repositories.subscribe((repos) => {
		localStorage.setItem('repositories', JSON.stringify(repos));
	});
}

// Create currentRepository store
function createCurrentRepositoryStore() {
	const { subscribe, set, update } = writable<Repository | null>(null);

	// Try to restore the previously selected repository
	if (typeof window !== 'undefined' && cachedCurrentRepoId) {
		const cachedRepo = cachedRepos.find((r: Repository) => r.id.toString() === cachedCurrentRepoId);
		if (cachedRepo) {
			set(cachedRepo);
		}
	}

	return {
		subscribe,
		set: (repo: Repository | null) => {
			set(repo);
			if (typeof window !== 'undefined') {
				if (repo) {
					localStorage.setItem('currentRepositoryId', repo.id.toString());
				} else {
					localStorage.removeItem('currentRepositoryId');
				}
			}
		},
		update
	};
}

export const currentRepository = createCurrentRepositoryStore();

// When repositories list is updated, update the currentRepository reference if it exists
if (typeof window !== 'undefined') {
	let currentRepoValue: Repository | null = null;

	currentRepository.subscribe((repo) => {
		currentRepoValue = repo;
	});

	repositories.subscribe((repos) => {
		if (currentRepoValue) {
			// Find the updated repository object with the same ID
			const updatedRepo = repos.find(r => r.id === currentRepoValue!.id);
			if (updatedRepo) {
				// Update the reference to the new object
				currentRepository.set(updatedRepo);
			} else {
				// Repository was deleted, clear the selection
				currentRepository.set(null);
			}
		}
	});
}
