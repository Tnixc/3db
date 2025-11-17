<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';

	let { file, onNavigate }: { file: FileContent; onNavigate: (path: string) => void } = $props();

	const icon = $derived(file.type === 'dir' ? 'lucide:folder' : 'lucide:file');
</script>

{#if file.type === 'dir'}
	<Button
		variant="ghost"
		class="group/row h-auto w-full p-0 hover:bg-transparent"
		onclick={() => onNavigate(file.path)}
	>
		<div class="flex w-full items-center gap-2">
			<Icon {icon} class="size-4 shrink-0" />
			<span class="flex-1 truncate text-left">{file.name}</span>
			<div class="w-4 shrink-0">
				<Icon icon="lucide:chevron-right" class="size-4 opacity-0 transition-opacity group-hover/row:opacity-100" />
			</div>
		</div>
	</Button>
{:else}
	<div class="flex items-center gap-2">
		<Icon {icon} class="size-4 shrink-0" />
		<span>{file.name}</span>
	</div>
{/if}
