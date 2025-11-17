<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
	import Link from 'lucide-svelte/icons/link';
	import Copy from 'lucide-svelte/icons/copy';
	import Edit from 'lucide-svelte/icons/edit';
	import Trash from 'lucide-svelte/icons/trash';
	import Check from 'lucide-svelte/icons/check';

	let {
		file,
		onCopyLink,
		onCopyContents,
		onRename,
		onDelete,
		copiedLink = false
	}: {
		file: FileContent;
		onCopyLink: (file: FileContent) => Promise<void>;
		onCopyContents: (file: FileContent) => Promise<void>;
		onRename: (file: FileContent) => Promise<void>;
		onDelete: (file: FileContent) => Promise<void>;
		copiedLink?: boolean;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="size-8">
				<MoreHorizontal class="size-4" />
				<span class="sr-only">File actions</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		{#if file.type === 'file'}
			<DropdownMenu.Item onclick={() => onCopyLink(file)}>
				{#if copiedLink}
					<Check class="mr-2 size-4 text-green-500" />
				{:else}
					<Link class="mr-2 size-4" />
				{/if}
				Copy Link
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => onCopyContents(file)}>
				<Copy class="mr-2 size-4" />
				Copy Contents
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
		{/if}
		<DropdownMenu.Item onclick={() => onRename(file)}>
			<Edit class="mr-2 size-4" />
			Rename
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => onDelete(file)} class="text-destructive">
			<Trash class="mr-2 size-4" />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
