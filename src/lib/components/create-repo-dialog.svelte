<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Icon from '@iconify/svelte';
	import { authStore } from '$lib/stores/auth';
	import { repositories } from '$lib/stores/repositories';
	import { validateRepositoryName } from '$lib/utils/security';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let repoName = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleCreate() {
		const trimmedName = repoName.trim();

		// Validate repository name
		const validation = validateRepositoryName(trimmedName);
		if (!validation.valid) {
			error = validation.error || 'Invalid repository name';
			return;
		}

		if ($authStore.status !== 'ready') return;

		loading = true;
		error = null;

		try {
			// Use server API to create repository (accesses httpOnly cookie)
			const response = await fetch('/api/repos', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: trimmedName }),
				credentials: 'same-origin'
			});

			if (!response.ok) {
				throw new Error(`Failed to create repository: ${response.statusText}`);
			}

			const newRepo = await response.json();

			// Add to repositories store
			repositories.update((repos) => [...repos, newRepo]);

			// Reset and close
			repoName = '';
			open = false;
		} catch (err: any) {
			console.error('Failed to create repository:', err);
			error = err.message || 'Failed to create repository';
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (!newOpen) {
			// Reset form when closing
			repoName = '';
			error = null;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create New Repository</Dialog.Title>
			<Dialog.Description>
				Create a new GitHub repository to store your files. The repository will be public.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="repo-name">Repository Name</Label>
				<Input
					id="repo-name"
					bind:value={repoName}
					placeholder="my-cdn-files"
					disabled={loading}
					oninput={() => {
						error = null;
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') handleCreate();
					}}
				/>
				<p class="text-xs text-muted-foreground">
					Alphanumeric, hyphens, underscores, and periods only. Max 100 characters.
				</p>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			<Button onclick={handleCreate} disabled={loading || !repoName.trim()}>
				{#if loading}
					<Icon icon="lucide:loader-2" class="mr-2 size-4 animate-spin" />
					Creating...
				{:else}
					<Icon icon="lucide:plus" class="mr-2 size-4" />
					Create Repository
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
