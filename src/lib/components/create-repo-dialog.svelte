<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { GitHubConfig } from '$lib/services/github';
	import * as github from '$lib/services/github';
	import { repositories } from '$lib/stores/repositories';

	let { open = $bindable(false), config } = $props<{
		open?: boolean;
		config: GitHubConfig;
	}>();

	let name = $state('');
	let isPrivate = $state(true);
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Repository name is required';
			return;
		}

		loading = true;
		error = null;

		try {
			const newRepo = await github.createRepository(config, name.trim(), isPrivate);
			repositories.update((repos) => [...repos, newRepo]);
			name = '';
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create repository';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!open) {
			name = '';
			error = null;
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

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="private"
					bind:checked={isPrivate}
					disabled={loading}
					class="h-4 w-4 rounded border-gray-300"
				/>
				<label for="private" class="text-sm font-medium">Private repository</label>
			</div>

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
