<script lang="ts">
	import FileBrowser from '$lib/components/file-browser.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import { authStore } from '$lib/stores/auth';

	let githubConfig = $derived.by(() => {
		const state = $authStore;
		if (state.status === 'ready') {
			return { token: state.token, userEmail: state.user.email };
		}
		return null;
	});
</script>

<div class="container mx-auto p-4">
	{#if $authStore.status === 'logged_out'}
		<TokenLogin />
	{:else if githubConfig}
		<div class="space-y-4">
			<FileBrowser config={githubConfig} />
		</div>
	{/if}
</div>
