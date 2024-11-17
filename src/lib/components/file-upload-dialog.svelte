<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { GitHubConfig } from '$lib/services/github';
	import * as github from '$lib/services/github';
	import { currentRepository } from '$lib/stores/repositories';
	import { needsReload } from '$lib/stores/reload';

	let {
		open = $bindable(false),
		config,
		currentPath = '', // Default to empty string
		onUploadComplete = () => {}
	} = $props<{
		open?: boolean;
		onOpenChange?: (value: boolean) => void;
		config: GitHubConfig;
		currentPath?: string;
		onUploadComplete?: () => void;
	}>();

	let files = $state<FileList | null>(null);
	let path = $state(currentPath);
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit() {
		if (!files?.length || !$currentRepository) {
			error = 'Please select files';
			return;
		}

		loading = true;
		error = null;

		try {
			// Upload all files sequentially
			for (const file of Array.from(files)) {
				const reader = new FileReader();

				const fileContent = await new Promise<string | ArrayBuffer>((resolve, reject) => {
					reader.onload = () => resolve(reader.result as string | ArrayBuffer);
					reader.onerror = reject;

					if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|json|ya?ml|csv)$/i)) {
						reader.readAsText(file);
					} else {
						reader.readAsArrayBuffer(file);
					}
				});

				// Combine the path with filename
				const filePath = path ? `${path}/${file.name}` : file.name;

				await github.createFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					filePath,
					fileContent
				);
			}

			onUploadComplete();
			needsReload.set(true);
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to upload files';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!open) {
			files = null;
			error = null;
			path = currentPath; // Reset path to current directory when dialog closes
		}
	});

	$effect(() => {
		path = currentPath; // Update path when currentPath prop changes
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Upload File</Dialog.Title>
			<Dialog.Description>Upload a file to the current directory.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<label class="block">
					<span class="text-sm font-medium">Destination Folder</span>
					<Input
						bind:value={path}
						placeholder="Enter folder path (optional)"
						disabled={loading}
						class="mt-1"
					/>
					<p class="text-xs text-muted-foreground">Leave empty to upload to the root directory</p>
				</label>
			</div>

			<div class="space-y-2">
				<label class="block">
					<span class="text-sm font-medium">File</span>
					<Input
						type="file"
						multiple
						onchange={(e) => (files = e.currentTarget.files)}
						disabled={loading}
						class="mt-1 bg-white text-black"
					/>
					<!-- FIXME: This is a hack to make the input look better -->
				</label>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Uploading...' : 'Upload'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
