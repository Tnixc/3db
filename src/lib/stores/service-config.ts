import { writable } from 'svelte/store';
import type { ServiceConfig } from '$lib/types';
import { DEFAULT_SERVICE_CONFIG } from '$lib/types';

export const serviceConfig = writable<ServiceConfig>(DEFAULT_SERVICE_CONFIG);
