import { writable } from 'svelte/store';
import type { Repository } from '$lib/types';

export const repositories = writable<Repository[]>([]);
export const currentRepository = writable<Repository | null>(null);
