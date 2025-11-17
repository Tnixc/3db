<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';

	let { column, children, ...restProps }: { column: any; children: string } & Omit<ComponentProps<typeof Button>, 'children'> = $props();

	const isSorted = $derived(column.getIsSorted());
</script>

<Button
	variant="ghost"
	class="-ml-4 h-auto p-0 hover:bg-transparent font-medium"
	onclick={column.getToggleSortingHandler()}
	{...restProps}
>
	<div class="flex items-center gap-2">
		<span>{children}</span>
        <span class="w-4">
			{#if isSorted === 'asc'}
				<ArrowUp class="size-4 shrink-0" />
			{:else if isSorted === 'desc'}
				<ArrowDown class="size-4 shrink-0" />
			{:else}
				<ArrowUpDown class="size-4 shrink-0 opacity-50" />
			{/if}
        </span>
	</div>
</Button>
