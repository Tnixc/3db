<script lang="ts">
	import type { Repository } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import Copy from 'lucide-svelte/icons/copy';
	import Trash from 'lucide-svelte/icons/trash';
	import { authStore } from '$lib/stores/auth';
	import { repositories, currentRepository } from '$lib/stores/repositories';

	let { repo }: { repo: Repository } = $props();

	// 3db-service is a system repository and cannot be deleted
	const isServiceRepo = $derived(repo.name === '3db-service');

	async function handleDelete() {
		// Prevent deletion of service repository
		if (isServiceRepo) {
			alert('The 3db-service repository is required for the app to function and cannot be deleted.');
			return;
		}

		if (!confirm(`Are you sure you want to delete "${repo.name}"? This action cannot be undone.`)) {
			return;
		}

		if ($authStore.status !== 'ready') return;

		try {
			// Use server API to delete repository (accesses httpOnly cookie)
			const response = await fetch(`/api/repos/${repo.owner.login}/${repo.name}`, {
				method: 'DELETE',
				credentials: 'same-origin'
			});

			if (!response.ok) {
				throw new Error(`Failed to delete repository: ${response.statusText}`);
			}

			// Update stores
			repositories.update((repos) => repos.filter((r) => r.id !== repo.id));
			if ($currentRepository?.id === repo.id) {
				currentRepository.set(null);
			}
		} catch (err) {
			console.error('Failed to delete repository:', err);
			alert('Failed to delete repository');
		}
	}

	function copyRepoUrl() {
		navigator.clipboard.writeText(repo.html_url);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="size-6">
				<MoreHorizontal class="size-4" />
				<span class="sr-only">Repository menu</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>Repository Actions</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => window.open(repo.html_url, '_blank')}>
			<ExternalLink class="mr-2 size-4" />
			Open in GitHub
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={copyRepoUrl}>
			<Copy class="mr-2 size-4" />
			Copy URL
		</DropdownMenu.Item>
		{#if !isServiceRepo}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={handleDelete} class="text-destructive">
				<Trash class="mr-2 size-4" />
				Delete Repository
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
