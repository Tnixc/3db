<script lang="ts">
	import type { Repository } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Icon from '@iconify/svelte';
	import { deleteRepository } from '$lib/services/github';
	import { authStore } from '$lib/stores/auth';
	import { repositories, currentRepository } from '$lib/stores/repositories';

	let { repo }: { repo: Repository } = $props();

	async function handleDelete() {
		if (!confirm(`Are you sure you want to delete "${repo.name}"? This action cannot be undone.`)) {
			return;
		}

		if ($authStore.status !== 'ready') return;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			await deleteRepository(config, repo.owner.login, repo.name);

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
				<Icon icon="lucide:more-horizontal" class="size-4" />
				<span class="sr-only">Repository menu</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>Repository Actions</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => window.open(repo.html_url, '_blank')}>
			<Icon icon="lucide:external-link" class="mr-2 size-4" />
			Open in GitHub
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={copyRepoUrl}>
			<Icon icon="lucide:copy" class="mr-2 size-4" />
			Copy URL
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={handleDelete} class="text-destructive">
			<Icon icon="lucide:trash" class="mr-2 size-4" />
			Delete Repository
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
