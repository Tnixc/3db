<script lang="ts">
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import type { Repository } from '$lib/types';
	import * as service from '$lib/services/service';
	import { repositories, currentRepository } from '$lib/stores/repositories';
	import type { GitHubConfig } from '$lib/services/github';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	let { repository, config, children } = $props<{
		repository: Repository;
		config: GitHubConfig;
		children: Snippet; // Add children to props
	}>();

	async function handleDisconnect() {
		try {
			const serviceConfig = await service.getServiceConfig(config);
			serviceConfig.connectedRepos = serviceConfig.connectedRepos.filter(
				(repoName: string) => repoName !== repository.full_name
			);

			if (serviceConfig.connectedRepos.length === 0) {
				if (
					!confirm('This is the last connected repository. Are you sure you want to disconnect it?')
				) {
					return;
				}
			}

			await service.updateServiceConfig(config, serviceConfig);
			repositories.update((repos) => repos.filter((r) => r.id !== repository.id));

			// Clear current repository if it was disconnected
			if ($currentRepository?.id === repository.id) {
				currentRepository.set(null);
			}
		} catch (err) {
			console.error('Error disconnecting repository:', err);
		}
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		<div>
			{@render children?.()}
		</div>
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item onclick={handleDisconnect} class="text-destructive">
			<Icon icon="lucide:unlink" class="mr-2 h-4 w-4" />
			<span>Disconnect Repository</span>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
