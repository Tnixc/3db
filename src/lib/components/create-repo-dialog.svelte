<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { GitHubConfig } from '$lib/services/github';
	import * as github from '$lib/services/github';
	import { repositories } from '$lib/stores/repositories';
	import * as service from '$lib/services/service';
	import type { Repository } from '$lib/types';
	import { serviceConfig } from '$lib/stores/service-config';
	import { get } from 'svelte/store';

	let existingRepo = $state<Repository | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let { open = $bindable(false), config } = $props<{
		open?: boolean;
		onOpenChange?: (value: boolean) => void;
		config: GitHubConfig;
	}>();

	let name = $state('');

	async function checkExistingRepo() {
		if (!name.trim()) return;

		try {
			const repos = await github.getRepositories(config);
			existingRepo = repos.find((repo) => repo.name === name.trim()) || null;
		} catch (err) {
			console.error('Error checking for existing repo:', err);
		}
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Repository name is required';
			return;
		}

		loading = true;
		error = null;

		try {
			let repo: Repository | null = existingRepo;
			const repos = await github.getRepositories(config);
			const username = repos[0]?.owner.login;

			if (!username) {
				throw new Error('Could not determine GitHub username');
			}

			const repoExists = await github.checkRepo(config, username, name.trim());
			if (!repoExists) {
				repo = await github.createRepository(config, name.trim());
			} else {
				const foundRepo = repos.find((r) => r.name === name.trim());
				if (!foundRepo) {
					throw new Error('Repository not found');
				}
				repo = foundRepo;
			}

			if (!repo) {
				throw new Error('Failed to create or find repository');
			}

			// Update both remote and local config
			const currentConfig = get(serviceConfig);
			if (!currentConfig.connectedRepos.includes(repo.full_name)) {
				const updatedConfig = {
					...currentConfig,
					connectedRepos: [...currentConfig.connectedRepos, repo.full_name]
				};

				await service.updateServiceConfig(config, updatedConfig);
				serviceConfig.set(updatedConfig);
			}

			repositories.update((repos) => [...repos, repo as Repository]);
			name = '';
			open = false;
		} catch (err) {
			console.error('Error in handleSubmit:', err);
			error = err instanceof Error ? err.message : 'Failed to connect repository';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (name) {
			checkExistingRepo();
		} else {
			existingRepo = null;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Link or Create Repository</Dialog.Title>
			<Dialog.Description>Create a new GitHub repository to use as a database.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<label for="name" class="text-sm font-medium">Repository Name</label>
				<Input id="name" bind:value={name} placeholder="my-database" disabled={loading} />
			</div>
			{#if existingRepo}
				<p class="text-sm">
					This repository already exists. Connecting it will give 3DB access to its contents.
				</p>
			{/if}
			<p class="text-sm text-accent-foreground">
				NOTE: This will create a public repository. Your files will be publicly accessible.
			</p>
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Creating...' : 'Create'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
