<script lang="ts">
	import { resetMode, setMode, mode } from 'mode-watcher';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';
	import Sun from 'lucide-svelte/icons/sun';
	import Moon from 'lucide-svelte/icons/moon';
	import Monitor from 'lucide-svelte/icons/monitor';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={buttonVariants({ variant: 'outline', size: 'icon' })}>
		{#if mode.current === 'light'}
			<Sun class="size-5" />
		{:else if mode.current === 'dark'}
			<Moon class="size-5" />
		{:else}
			<Monitor class="size-5" />
		{/if}
		<span class="sr-only">Toggle theme</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Item onclick={() => setMode('light')}>
			<Sun class="mr-2 size-4" />
			Light
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => setMode('dark')}>
			<Moon class="mr-2 size-4" />
			Dark
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => resetMode()}>
			<Monitor class="mr-2 size-4" />
			System
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
