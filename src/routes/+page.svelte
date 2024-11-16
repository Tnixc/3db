<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let repoPath = $state('');
	let contents = $state([]);
	let error = $state(null);
	let loading = $state(false);
	let currentPath = $state('');

	$effect(() => {
		if (data.session && data.user) {
			console.log('Authenticated user:', data.user);
		}
	});

	async function signIn() {
		const { data: authData, error } = await data.supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
		if (error) console.error(error);
	}

	async function signOut() {
		const { error } = await data.supabase.auth.signOut();
		contents = [];
		repoPath = '';
		currentPath = '';
		window.location.reload();
	}

	async function fetchRepoContents(path = '') {
		if (!repoPath) {
			error = 'Please enter a repository path';
			return;
		}

		loading = true;
		error = null;

		try {
			const token = data.session?.provider_token;
			const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, {
				headers: {
					Authorization: `token ${token}`,
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (!response.ok) throw new Error('Failed to fetch repository contents');

			const data = await response.json();
			contents = Array.isArray(data) ? data : [data];
			currentPath = path;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function handleItemClick(item) {
		if (item.type === 'dir') {
			fetchRepoContents(item.path);
		} else {
			window.open(item.html_url, '_blank');
		}
	}

	function navigateToPath(path) {
		fetchRepoContents(path);
	}

	function formatSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
	}

	function formatDate(date) {
		if (!date) return '';
		return new Date(date).toLocaleDateString();
	}

	function getItemIcon(type) {
		return type === 'dir' ? '📁' : '📄';
	}
</script>

<div class="app">
	{#if !data.session}
		<div>
			<h1>GitHub Repository Viewer</h1>
			<button on:click={signIn} class="login-button">Login with GitHub</button>
		</div>
	{:else}
		<div class="header">
			<h1>Repository Viewer</h1>
			<button on:click={signOut} class="logout-button">Logout</button>
		</div>

		<div class="user-info">
			<img src={data.session.user.user_metadata.avatar_url} alt="Profile" class="avatar" />
			<span>{data.session.user.user_metadata.name}</span>
		</div>

		<div class="repo-input">
			<input bind:value={repoPath} placeholder="owner/repo-name (e.g., octocat/Hello-World)" />
			<button on:click={() => fetchRepoContents()}>View Contents</button>
		</div>

		{#if loading}
			<div class="loading">Loading...</div>
		{/if}

		{#if error}
			<div class="error">
				{error}
			</div>
		{/if}

		{#if contents.length}
			<div class="repo-contents">
				<div class="breadcrumb">
					<span on:click={() => navigateToPath('')}>root</span>
					{#each currentPath.split('/') as part, index}
						{#if part}
							<span>/</span>
							<span
								on:click={() =>
									navigateToPath(
										currentPath
											.split('/')
											.slice(0, index + 1)
											.join('/')
									)}
							>
								{part}
							</span>
						{/if}
					{/each}
				</div>

				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Size</th>
							<th>Last Updated</th>
						</tr>
					</thead>
					<tbody>
						{#each contents as item (item.path)}
							<tr on:click={() => handleItemClick(item)} class="content-row">
								<td>
									<div class="file-name">
										<span>{getItemIcon(item.type)}</span>
										{item.name}
									</div>
								</td>
								<td>{item.type}</td>
								<td>{formatSize(item.size)}</td>
								<td>{formatDate(item.last_commit_date)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
