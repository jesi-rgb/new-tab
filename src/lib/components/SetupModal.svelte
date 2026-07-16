<script lang="ts">
	import { settings } from '$lib/settings.svelte';

	let {
		open = $bindable(),
		onsaved
	}: { open: boolean; onsaved?: () => void } = $props();

	let username = $state(settings.current.username);
	let token = $state(settings.current.token);
	let reposText = $state(settings.current.repos.join('\n'));

	$effect(() => {
		if (open) {
			username = settings.current.username;
			token = settings.current.token;
			reposText = settings.current.repos.join('\n');
		}
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const repos = reposText
			.split(/[\n,]/)
			.map((r) => r.trim())
			.filter(Boolean);
		settings.setGitHub(username, token, repos);
		open = false;
		onsaved?.();
	}

	function backdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && settings.configured) {
			open = false;
		}
	}
</script>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onclick={backdropClick}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
			<h2 id="setup-title">Connect GitHub</h2>
			<p class="lead">Enter your GitHub username to show pull requests. A token is optional.</p>

			<form onsubmit={submit}>
				<label class="field">
					<span class="label-row"><span>GitHub username</span></span>
					<input
						type="text"
						bind:value={username}
						placeholder="octocat"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						required
					/>
				</label>

				<label class="field">
					<span class="label-row">
						<span>Access token</span>
						<span class="optional">Optional</span>
					</span>
					<input
						type="password"
						bind:value={token}
						placeholder="github_pat_..."
						autocomplete="off"
						spellcheck="false"
					/>
					<span class="hint">A token can show private pull requests. It stays in this browser.</span>
				</label>

				<label class="field">
					<span class="label-row">
						<span>Repositories</span>
						<span class="optional">Optional</span>
					</span>
					<textarea
						bind:value={reposText}
						placeholder="supabase/supabase&#10;vercel/next.js"
						rows="3"
					></textarea>
					<span class="hint">One <code>owner/repo</code> per line. Leave empty to show all your PRs.</span>
				</label>

				<button type="submit" class="submit">Continue</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(120, 120, 120, 0.45);
		backdrop-filter: blur(4px);
		display: grid;
		place-items: center;
		padding: 1.5rem;
		z-index: 100;
	}

	.modal {
		background: var(--surface);
		border-radius: 24px;
		box-shadow: var(--shadow-lg);
		padding: 2.25rem;
		width: 100%;
		max-width: 460px;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.7rem;
		letter-spacing: -0.02em;
	}

	.lead {
		margin: 0 0 1.75rem;
		color: var(--text-muted);
		line-height: 1.5;
		font-size: 0.98rem;
	}

	.field {
		display: block;
		margin-bottom: 1.25rem;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.optional {
		color: var(--text-subtle);
		font-weight: 400;
	}

	input,
	textarea {
		width: 100%;
		border: 1px solid transparent;
		background: var(--surface-hover);
		border-radius: var(--radius-sm);
		padding: 0.85rem 1rem;
		font-size: 1rem;
		color: var(--text);
		font-family: inherit;
		resize: vertical;
		transition: border-color 0.15s, background 0.15s;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--accent);
		background: var(--surface);
	}

	.hint {
		display: block;
		margin-top: 0.5rem;
		color: var(--text-muted);
		font-size: 0.85rem;
		line-height: 1.45;
	}

	code {
		font-size: 0.82em;
		background: var(--surface-hover);
		padding: 0.05em 0.35em;
		border-radius: 5px;
	}

	.submit {
		width: 100%;
		margin-top: 0.5rem;
		border: none;
		background: var(--text);
		color: var(--bg);
		border-radius: 14px;
		padding: 1rem;
		font-size: 1rem;
		font-weight: 600;
		transition: opacity 0.15s;
	}

	.submit:hover {
		opacity: 0.88;
	}
</style>
