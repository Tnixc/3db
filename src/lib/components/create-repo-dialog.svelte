<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { GitHubConfig } from '$lib/services/github';
	import * as github from '$lib/services/github';
	import { repositories } from '$lib/stores/repositories';
	import * as service from '$lib/services/service';
	import type { Repository } from '$lib/types';
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
			let repo = existingRepo;

			// Only create new repo if it doesn't exist
			if (!repo) {
				repo = await github.createRepository(config, name.trim());
			}

			// Update service config
			const serviceConfig = await service.getServiceConfig(config);
			if (!serviceConfig.connectedRepos.includes(repo.full_name)) {
				serviceConfig.connectedRepos.push(repo.full_name);
				await service.updateServiceConfig(config, serviceConfig);
			}

			repositories.update((repos) => [...repos, repo]);
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
			<Dialog.Title>Create Repository</Dialog.Title>
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
				NOTE: This will create a public repository. You files will be publicly accessible.
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
