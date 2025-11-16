<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Icon from '@iconify/svelte';

	let {
		file,
		onCopyLink,
		onCopyContents,
		onRename,
		onDelete
	}: {
		file: FileContent;
		onCopyLink: (file: FileContent) => void;
		onCopyContents: (file: FileContent) => Promise<void>;
		onRename: (file: FileContent) => Promise<void>;
		onDelete: (file: FileContent) => Promise<void>;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="size-8">
				<Icon icon="lucide:more-horizontal" class="size-4" />
				<span class="sr-only">File actions</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		{#if file.type === 'file'}
			<DropdownMenu.Item onclick={() => onCopyLink(file)}>
				<Icon icon="lucide:link" class="mr-2 size-4" />
				Copy Link
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => onCopyContents(file)}>
				<Icon icon="lucide:copy" class="mr-2 size-4" />
				Copy Contents
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
		{/if}
		<DropdownMenu.Item onclick={() => onRename(file)}>
			<Icon icon="lucide:edit" class="mr-2 size-4" />
			Rename
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => onDelete(file)} class="text-destructive">
			<Icon icon="lucide:trash" class="mr-2 size-4" />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
