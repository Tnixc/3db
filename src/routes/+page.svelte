<script lang="ts">
	let { data } = $props();
	let repoPath = $state('');
	let contents: Array<{
		path: string;
		type: string;
		name: string;
		size: number;
		html_url?: string;
		last_commit_date?: string;
	}> = $state([]);
	let error: string | null = $state(null);
	let loading = $state(false);
	let currentPath = $state('');

	$effect(() => {
		if (data.user) {
			console.log('Authenticated user:', data.user);
		}
	});

	async function fetchRepoContents(path = '') {
		if (!repoPath) {
			error = 'Please enter a repository path';
			return;
		}

		loading = true;
		error = null;

		try {
			const {
				data: { session }
			} = await data.supabase.auth.getSession();
			const token = session?.provider_token;

			const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, {
				headers: {
					Authorization: `token ${token}`,
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (!response.ok) throw new Error('Failed to fetch repository contents');

			const responseData = await response.json();
			contents = Array.isArray(responseData) ? responseData : [responseData];
			currentPath = path;
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred';
			}
		} finally {
			loading = false;
		}
	}

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

	function handleItemClick(item: { type: string; path: string; html_url?: string }) {
		if (item.type === 'dir') {
			fetchRepoContents(item.path);
		} else {
			window.open(item.html_url, '_blank');
		}
	}

	function navigateToPath(path: string) {
		fetchRepoContents(path);
	}

	function formatSize(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
	}

	function formatDate(date: string | undefined) {
		if (!date) return '';
		return new Date(date).toLocaleDateString();
	}

	function getItemIcon(type: string) {
		return type === 'dir' ? '📁' : '📄';
	}
</script>

<div class="app">
	{#if !data.user}
		<div>
			<h1>GitHub Repository Viewer</h1>
			<button onclick={signIn} class="login-button">Login with GitHub</button>
		</div>
	{:else}
		<div class="header">
			<h1>Repository Viewer</h1>
			<button onclick={signOut} class="logout-button">Logout</button>
		</div>

		<div class="user-info">
			<img src={data.user.user_metadata.avatar_url} alt="Profile" class="avatar" />
			<span>{data.user.user_metadata.name}</span>
		</div>

		<div class="repo-input">
			<input bind:value={repoPath} placeholder="owner/repo-name (e.g., octocat/Hello-World)" />
			<button onclick={() => fetchRepoContents()}>View Contents</button>
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
					<button
						type="button"
						class="breadcrumb-btn"
						onclick={() => navigateToPath('')}
						onkeydown={(e) => e.key === 'Enter' && navigateToPath('')}
					>
						root
					</button>
					{#each currentPath.split('/') as part, index}
						{#if part}
							<span>/</span>
							<button
								type="button"
								class="breadcrumb-btn"
								onclick={() =>
									navigateToPath(
										currentPath
											.split('/')
											.slice(0, index + 1)
											.join('/')
									)}
								onkeydown={(e) =>
									e.key === 'Enter' &&
									navigateToPath(
										currentPath
											.split('/')
											.slice(0, index + 1)
											.join('/')
									)}
							>
								{part}
							</button>
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
							<tr class="content-row">
								<td>
									<button
										type="button"
										class="file-button"
										onclick={() => handleItemClick(item)}
										onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
									>
										<div class="file-name">
											<span>{getItemIcon(item.type)}</span>
											{item.name}
										</div>
									</button>
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
