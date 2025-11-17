<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import Folder from 'lucide-svelte/icons/folder';
	import File from 'lucide-svelte/icons/file';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	let { file, onNavigate }: { file: FileContent; onNavigate: (path: string) => void } = $props();
</script>

{#if file.type === 'dir'}
	<Button
		variant="ghost"
		class="group/row h-auto w-full p-0 hover:bg-transparent"
		onclick={() => onNavigate(file.path)}
	>
		<div class="flex w-full items-center gap-2">
			<Folder class="size-4 shrink-0" />
			<span class="flex-1 truncate text-left">{file.name}</span>
			<div class="w-4 shrink-0">
				<ChevronRight class="size-4 opacity-0 transition-opacity group-hover/row:opacity-100" />
			</div>
		</div>
	</Button>
{:else}
	<div class="flex w-full items-center gap-2">
		<File class="size-4 shrink-0" />
		<span class="flex-1 truncate text-left">{file.name}</span>
		<div class="w-4 shrink-0" aria-hidden="true">
			<!-- Empty spacer to match folder row layout -->
		</div>
	</div>
{/if}
