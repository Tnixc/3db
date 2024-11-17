<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme';
	import { PUBLIC_GITHUB_APP_NAME } from '$env/static/public';

	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import UserMenu from '$lib/components/user-menu.svelte';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	import GithubAppPrompt from '$lib/components/github-app-prompt.svelte';
	import Icon from '@iconify/svelte';
	import * as github from '$lib/services/github';

	let { data, children } = $props<{
		data: App.PageData;
		children: Snippet;
	}>();

	let hasGithubApp = $state<boolean | null>(null); // Change to nullable
	let sidebarOpen = $state(true);
	let githubConfig: github.GitHubConfig | null = $state(null);
	let currentPath = $state('');
	let isLoading = $state(true); // Add loading state

	let createRepoDialogOpen = $state(false);
	let uploadDialogOpen = $state(false);

	function handleCreateRepoOpenChange(open: boolean) {
		createRepoDialogOpen = open;
	}

	function handleUploadDialogOpenChange(open: boolean) {
		uploadDialogOpen = open;
	}

	async function loadCurrentDirectory() {
		if (!githubConfig || !$currentRepository) return;
		// Reload the current directory content
		try {
			const contents = await github.getContents(
				githubConfig,
				$currentRepository.owner.login,
				$currentRepository.name,
				currentPath
			);
			// You'll need to update your file browser component to accept contents as a prop
			// or use a store to manage the contents
		} catch (error) {
			console.error('Error reloading directory:', error);
		}
	}

	async function initGitHubConfig() {
		if (!data.supabase || !data.user) return;

		try {
			// Get the current session which includes provider tokens
			const {
				data: { session }
			} = await data.supabase.auth.getSession();
			if (!session?.provider_token) return;

			githubConfig = {
				token: session.provider_token,
				userEmail: data.user.email ?? 'unknown'
			};

			await loadRepositories();
		} catch (error) {
			console.error('Error initializing GitHub config:', error);
		}
	}

	async function loadRepositories() {
		if (!githubConfig) return;

		try {
			const repos = await github.getRepositories(githubConfig);
			repositories.set(repos);
		} catch (error) {
			console.error('Error loading repositories:', error);
		}
	}
	async function checkGithubAppInstallation() {
		if (!data.user) return;

		try {
			const response = await fetch('/api/github/check-installation', {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const { installed } = await response.json();
			hasGithubApp = installed;
		} catch (error) {
			console.error('Error checking GitHub app installation:', error);
			hasGithubApp = false;
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (data.user) {
			checkGithubAppInstallation();
		} else {
			isLoading = false;
		}
	});

	$effect(() => {
		theme.set($theme);
		if (data.user) {
			initGitHubConfig();
		}
	});

	async function signOut() {
		await data.supabase.auth.signOut();
		window.location.reload();
	}
</script>

{#if !isLoading}
	{#if data.user}
		{#if !hasGithubApp}
			<GithubAppPrompt
				installationUrl={`https://github.com/apps/${PUBLIC_GITHUB_APP_NAME}/installations/new`}
			/>
		{:else}
			<Sidebar.Provider bind:open={sidebarOpen}>
				<Sidebar.Root>
					<Sidebar.Header>
						<UserMenu user={data.user} onSignOut={signOut} />
					</Sidebar.Header>

					<Sidebar.Content>
						{#if githubConfig}
							<Sidebar.Group>
								<Sidebar.GroupLabel>Repositories</Sidebar.GroupLabel>
								<Sidebar.Menu>
									{#each $repositories as repo}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton
												class="relative whitespace-nowrap after:absolute after:right-0 after:h-full after:w-6 after:bg-gradient-to-r after:from-transparent after:to-sidebar"
												isActive={$currentRepository?.id === repo.id}
												onclick={() => currentRepository.set(repo)}
											>
												<Icon icon="lucide:database" class="mr-2 h-4 w-4" />
												{repo.name}
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{/each}
								</Sidebar.Menu>
							</Sidebar.Group>
						{:else}
							<div class="p-4 text-sm text-muted-foreground">Loading repositories...</div>
						{/if}
					</Sidebar.Content>

					<Sidebar.Footer>
						<Button
							class="w-full"
							onclick={() => (uploadDialogOpen = true)}
							disabled={!$currentRepository}
						>
							<Icon icon="lucide:upload" class="mr-2 h-4 w-4" />
							Upload File
						</Button>
						<Button variant="outline" size="sm" onclick={() => (createRepoDialogOpen = true)}>
							<Icon icon="lucide:plus" class="mr-2 h-4 w-4" />
							New Repository
						</Button>
					</Sidebar.Footer>
				</Sidebar.Root>

				<Sidebar.Inset>
					{@render children()}

					{#if githubConfig}
						<CreateRepoDialog
							bind:open={createRepoDialogOpen}
							onOpenChange={handleCreateRepoOpenChange}
							config={githubConfig}
						/>

						<FileUploadDialog
							bind:open={uploadDialogOpen}
							onOpenChange={handleUploadDialogOpenChange}
							config={githubConfig}
							{currentPath}
							onUploadComplete={loadCurrentDirectory}
						/>
					{/if}
				</Sidebar.Inset>
			</Sidebar.Provider>
		{/if}
	{:else}
		{@render children()}
	{/if}
{/if}
