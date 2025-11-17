<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	import UserMenu from '$lib/components/user-menu.svelte';
	import { repositories, currentRepository } from '$lib/stores/repositories';
	import { authStore } from '$lib/stores/auth';
	import Database from 'lucide-svelte/icons/database';
	import Plus from 'lucide-svelte/icons/plus';

	let { onCreateRepo, onSignOut }: { onCreateRepo: () => void; onSignOut: () => void } = $props();
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<div class="flex items-center justify-between px-2 py-2">
					<h2 class="text-lg font-semibold">3db</h2>
					<UserMenu {onSignOut} />
				</div>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Repositories</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each $repositories as repo (repo.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={$currentRepository?.id === repo.id}
								onclick={() => currentRepository.set(repo)}
							>
								<Database class="size-4" />
								<span class="truncate">{repo.name}</span>
							</Sidebar.MenuButton>
							<Sidebar.MenuAction showOnHover>
								<RepoContextMenu {repo} />
							</Sidebar.MenuAction>
						</Sidebar.MenuItem>
					{:else}
						<div class="px-2 py-4 text-center text-sm text-muted-foreground">
							Loading...
						</div>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Button class="w-full" onclick={onCreateRepo}>
					<Plus class="mr-2 size-4" />
					New Repository
				</Button>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
