<script lang="ts">
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import type { Repository } from '$lib/types';
	import * as service from '$lib/services/service';
	import * as github from '$lib/services/github';
	import { repositories, currentRepository } from '$lib/stores/repositories';
	import Icon from '@iconify/svelte';
	import type { GitHubConfig } from '$lib/services/github';
	import type { Snippet } from 'svelte';
	import { serviceConfig } from '$lib/stores/service-config';
	import { get } from 'svelte/store';
	import { needsReload } from '$lib/stores/reload';

	let { repository, config, children } = $props<{
		repository: Repository;
		config: GitHubConfig;
		children: Snippet;
	}>();

	async function handleDisconnect() {
		try {
			const currentConfig = get(serviceConfig);
			const updatedConfig = {
				...currentConfig,
				connectedRepos: currentConfig.connectedRepos.filter(
					(repoName) => repoName !== repository.full_name
				)
			};

			if (updatedConfig.connectedRepos.length === 0) {
				if (
					!confirm('This is the last connected repository. Are you sure you want to disconnect it?')
				) {
					return;
				}
			}

			await service.updateServiceConfig(config, updatedConfig);
			serviceConfig.set(updatedConfig);
			repositories.update((repos) => repos.filter((r) => r.id !== repository.id));

			if ($currentRepository?.id === repository.id) {
				currentRepository.set(null);
			}
		} catch (err) {
			console.error('Error disconnecting repository:', err);
		} finally {
			needsReload.set(true);
		}
	}

	async function handleDelete() {
		if (
			!confirm(`Are you sure you want to delete ${repository.name}? This action cannot be undone.`)
		) {
			return;
		}

		try {
			await github.deleteRepository(config, repository.owner.login, repository.name);
			repositories.update((repos) => repos.filter((r) => r.id !== repository.id));

			if ($currentRepository?.id === repository.id) {
				currentRepository.set(null);
			}
		} catch (err) {
			console.error('Error deleting repository:', err);
		} finally {
			needsReload.set(true);
		}
	}

	function openOnGitHub() {
		window.open(repository.html_url, '_blank');
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		<div>
			{@render children?.()}
		</div>
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item onclick={openOnGitHub}>
			<Icon icon="lucide:external-link" class="mr-2 h-4 w-4" />
			<span>Open on GitHub</span>
		</ContextMenu.Item>
		<ContextMenu.Separator />
		<ContextMenu.Item onclick={handleDisconnect} class="text-destructive">
			<Icon icon="lucide:unlink" class="mr-2 h-4 w-4" />
			<span>Disconnect Repository</span>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleDelete} class="text-destructive">
			<Icon icon="lucide:trash" class="mr-2 h-4 w-4" />
			<span>Delete Repository</span>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
