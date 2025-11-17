<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import { authStore } from '$lib/stores/auth';
</script>

<div class="p-8">
	<h1 class="mb-4 text-3xl font-bold">3db</h1>

	<div class="mb-6 max-w-xl space-y-4">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Login with GitHub</h2>
			<p class="text-sm text-muted-foreground">
				Use GitHub OAuth to securely authenticate and access your repositories.
			</p>
		</div>

		<div class="space-y-2">
			<Button class="w-full" onclick={() => authStore.login()}>
				<Icon icon="lucide:github" class="mr-2 h-4 w-4" />
				Continue with GitHub
			</Button>
		</div>

		<div class="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
			<h3 class="mb-2 flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
				<Icon icon="lucide:shield-check" class="h-4 w-4" />
				Secure OAuth Authentication
			</h3>
			<ul class="list-inside list-disc space-y-1 text-sm text-green-600 dark:text-green-400">
				<li>Your access token is stored in secure httpOnly cookies</li>
				<li>Protected from XSS attacks and browser extensions</li>
				<li>No token management required - just click to login</li>
			</ul>
		</div>

		<div class="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
			<h3 class="mb-2 flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
				<Icon icon="lucide:info" class="h-4 w-4" />
				After logging in
			</h3>
			<ol class="list-inside list-decimal space-y-1 text-sm text-blue-600 dark:text-blue-400">
				<li>You'll be redirected to GitHub to authorize 3db</li>
				<li>Grant access to your repositories (repo scope)</li>
				<li>Initial setup may take 15-30 seconds</li>
				<li>A repository called '3db-service' will be created for metadata</li>
				<li>Once ready, you can start managing your repositories!</li>
			</ol>
		</div>
	</div>

	<div class="max-w-2xl space-y-6 py-8">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Use GitHub as a CDN</h2>
			<p class="text-muted-foreground">
				3db provides a simple interface to use GitHub repositories as a content delivery network or
				file store. Pretty flaky, but works.
			</p>
		</div>

		<div class="space-y-4">
			<h3 class="font-medium">Features:</h3>
			<ul class="text-muted-foreground list-inside list-disc space-y-2">
				<li>Create and connect multiple repositories</li>
				<li>Upload and delete files</li>
				<li>Browse files and folders</li>
				<li>Get direct CDN links</li>
			</ul>
		</div>

		<div class="bg-muted rounded-lg p-4">
			<h3 class="mb-2 font-medium">How it works:</h3>
			<p class="text-muted-foreground text-sm">
				A repository called '3db-service' will be created to store metadata. You can then create or
				connect repositories to use as storage. Files are stored in public GitHub repositories and
				served via GitHub's CDN.
			</p>
		</div>

		<div class="rounded-lg border border-destructive bg-card p-4">
			<h3 class="mb-2 font-medium text-destructive">Warning</h3>
			<p class="text-sm text-destructive">
				This is an experimental project. Only use for non-critical data. Files are public and
				GitHub's 5GB repository limit applies.
			</p>
		</div>

		<div class="text-muted-foreground text-sm">
			<a href="https://github.com/tnixc/3db" class="hover:text-primary underline" target="_blank">
				View source code on GitHub
			</a>
		</div>
	</div>
</div>
