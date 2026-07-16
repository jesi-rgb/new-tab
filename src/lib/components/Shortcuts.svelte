<script lang="ts">
	import { settings } from '$lib/settings.svelte';

	let adding = $state(false);
	let label = $state('');
	let url = $state('');

	function normalizeUrl(value: string): string {
		const trimmed = value.trim();
		if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
		return trimmed;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!label.trim() || !url.trim()) return;
		settings.addShortcut(label.trim(), normalizeUrl(url));
		label = '';
		url = '';
		adding = false;
	}

	function faviconFor(url: string): string {
		try {
			const host = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
		} catch {
			return '';
		}
	}
</script>

<section class="shortcuts">
	<header>
		<h2>Shortcuts</h2>
		<button class="add-btn" onclick={() => (adding = !adding)}>
			<span class="plus">+</span> Add
		</button>
	</header>

	{#if adding}
		<form class="add-form" onsubmit={add}>
			<input type="text" placeholder="Name" bind:value={label} required />
			<input type="text" placeholder="example.com" bind:value={url} required />
			<div class="form-actions">
				<button type="button" class="ghost" onclick={() => (adding = false)}>Cancel</button>
				<button type="submit" class="solid">Save</button>
			</div>
		</form>
	{/if}

	<ul>
		{#each settings.current.shortcuts as sc (sc.id)}
			<li>
				<a href={sc.url} class="shortcut">
					<img src={faviconFor(sc.url)} alt="" width="24" height="24" loading="lazy" />
					<span>{sc.label}</span>
				</a>
				<button
					class="remove"
					title="Remove"
					aria-label="Remove {sc.label}"
					onclick={() => settings.removeShortcut(sc.id)}>×</button
				>
			</li>
		{/each}
		{#if settings.current.shortcuts.length === 0}
			<li class="empty">No shortcuts yet.</li>
		{/if}
	</ul>
</section>

<style>
	.shortcuts {
		width: 100%;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: -0.02em;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 0.45rem 0.8rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
		box-shadow: var(--shadow);
	}

	.add-btn:hover {
		background: var(--surface-hover);
	}

	.plus {
		font-size: 1.1rem;
		line-height: 1;
	}

	.add-form {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		margin-bottom: 0.75rem;
		box-shadow: var(--shadow);
	}

	.add-form input {
		border: 1px solid transparent;
		background: var(--surface-hover);
		border-radius: 10px;
		padding: 0.6rem 0.75rem;
		font-size: 0.9rem;
		color: var(--text);
	}

	.add-form input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.ghost,
	.solid {
		border-radius: 9px;
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 500;
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text);
	}

	.solid {
		background: var(--text);
		color: var(--bg);
		border-color: var(--text);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	li {
		position: relative;
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		text-decoration: none;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.1rem;
		font-size: 1.05rem;
		font-weight: 500;
		box-shadow: var(--shadow);
		transition: background 0.15s;
	}

	.shortcut:hover {
		background: var(--surface-hover);
	}

	.shortcut img {
		border-radius: 6px;
		flex-shrink: 0;
	}

	.remove {
		position: absolute;
		top: 50%;
		right: 0.85rem;
		transform: translateY(-50%);
		background: var(--surface-hover);
		border: none;
		color: var(--text-muted);
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		font-size: 1.1rem;
		line-height: 1;
		opacity: 0;
		transition: opacity 0.15s;
	}

	li:hover .remove {
		opacity: 1;
	}

	.remove:hover {
		color: var(--text);
	}

	.empty {
		color: var(--text-muted);
		font-size: 0.9rem;
	}
</style>
