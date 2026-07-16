<script lang="ts">
	import { settings } from '$lib/settings.svelte';
	import { prStore } from '$lib/pr-store.svelte';
	import SetupModal from '$lib/components/SetupModal.svelte';
	import PrItem from '$lib/components/PrItem.svelte';
	import Shortcuts from '$lib/components/Shortcuts.svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';

	let setupOpen = $state(!settings.configured);
	let now = $state(new Date());

	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	const greeting = $derived.by(() => {
		const h = now.getHours();
		if (h < 12) return 'Good morning';
		if (h < 18) return 'Good afternoon';
		return 'Good evening';
	});

	const dateLabel = $derived(
		now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
	);

	const timeLabel = $derived(
		now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
	);

	$effect(() => {
		if (settings.configured && prStore.lastLoaded === null) prStore.load();
	});
</script>

<svelte:head>
	<title>New Tab</title>
</svelte:head>

<SetupModal bind:open={setupOpen} onsaved={() => prStore.load()} />

<main class:blurred={setupOpen}>
	<header class="top">
		<div class="clock">
			<span class="time">{timeLabel}</span>
			<button class="icon-btn" title="Settings" aria-label="Settings" onclick={() => (setupOpen = true)}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
				</svg>
			</button>
		</div>
	</header>

	<div class="hero">
		<p class="date">{dateLabel}</p>
		<h1>{greeting}{settings.current.username ? `, ${settings.current.username}` : ''}</h1>
	</div>

	<div class="grid">
		<section class="prs">
			<div class="section-head">
				<h2>Pull requests from the last 7 days</h2>
				<button class="refresh" onclick={() => prStore.load()} disabled={prStore.loading}>
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class:spinning={prStore.loading}
					>
						<path d="M23 4v6h-6M1 20v-6h6" />
						<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
					</svg>
					Refresh
				</button>
			</div>

			<div class="stats">
				<button
					type="button"
					class="stat"
					class:active={prStore.filter === 'open'}
					aria-pressed={prStore.filter === 'open'}
					onclick={() => prStore.toggleFilter('open')}
				>
					<span class="stat-label">Open PRs</span>
					<span class="stat-value">{prStore.stats.open}</span>
				</button>
				<button
					type="button"
					class="stat"
					class:active={prStore.filter === 'drafts'}
					aria-pressed={prStore.filter === 'drafts'}
					onclick={() => prStore.toggleFilter('drafts')}
				>
					<span class="stat-label">Drafts</span>
					<span class="stat-value">{prStore.stats.drafts}</span>
				</button>
				<button
					type="button"
					class="stat"
					class:active={prStore.filter === 'merged'}
					aria-pressed={prStore.filter === 'merged'}
					onclick={() => prStore.toggleFilter('merged')}
				>
					<span class="stat-label">Merged</span>
					<span class="stat-value">{prStore.stats.merged}</span>
				</button>
				<button
					type="button"
					class="stat"
					class:active={prStore.filter === 'closed'}
					aria-pressed={prStore.filter === 'closed'}
					onclick={() => prStore.toggleFilter('closed')}
				>
					<span class="stat-label">Closed</span>
					<span class="stat-value">{prStore.stats.closed}</span>
				</button>
			</div>

			{#if prStore.repoList.length > 0}
				<div class="repo-badges">
					{#each prStore.repoList as repo (repo)}
						<button
							type="button"
							class="repo-badge"
							class:active={prStore.repoFilter === repo}
							aria-pressed={prStore.repoFilter === repo}
							onclick={() => prStore.toggleRepoFilter(repo)}
						>
							{repo}
						</button>
					{/each}
				</div>
			{/if}

			{#if prStore.error}
				<div class="notice error">{prStore.error}</div>
			{/if}

			{#if prStore.loading && prStore.prs.length === 0}
				<div class="notice">Loading pull requests…</div>
			{:else if prStore.prs.length === 0 && !prStore.error}
				<div class="notice">No pull requests in the last 7 days.</div>
			{:else if prStore.filteredPrs.length === 0}
				<div class="notice">No matching pull requests.</div>
			{:else}
				<ul class="pr-list">
					{#each prStore.filteredPrs as pr (pr.id)}
						<PrItem {pr} ci={prStore.ciStatuses[pr.id]} />
					{/each}
				</ul>
			{/if}
		</section>

		<aside class="sidebar">
			{#if settings.current.weather.enabled}
				<WeatherWidget />
			{/if}
			<Shortcuts />
		</aside>
	</div>
</main>

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 2rem 2.5rem 4rem;
		transition: filter 0.2s;
	}

	main.blurred {
		filter: blur(6px);
		pointer-events: none;
		user-select: none;
	}

	.top {
		display: flex;
		justify-content: flex-end;
	}

	.clock {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		color: var(--text-muted);
	}

	.time {
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		display: grid;
		place-items: center;
		padding: 0.35rem;
		border-radius: 8px;
	}

	.icon-btn:hover {
		color: var(--text);
		background: var(--surface-hover);
	}

	.hero {
		margin: 2rem 0 2.5rem;
	}

	.date {
		margin: 0 0 0.4rem;
		color: var(--text-muted);
		font-size: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 2.75rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 2.5rem;
		align-items: start;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
	}

	.section-head h2 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: -0.02em;
	}

	.refresh {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 0.5rem 0.9rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text);
		box-shadow: var(--shadow);
	}

	.refresh:hover:not(:disabled) {
		background: var(--surface-hover);
	}

	.refresh:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.spinning {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		margin-bottom: 1.5rem;
		overflow: hidden;
	}

	.stat {
		padding: 1.25rem 1.5rem;
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: none;
		border-top: none;
		border-bottom: none;
		border-left: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.stat:hover {
		background: var(--surface-hover);
	}

	.stat.active {
		background: var(--surface-hover);
		box-shadow: inset 0 -2px 0 var(--text);
	}

	.stat:last-child {
		border-right: none;
	}

	.stat-label {
		color: var(--text-muted);
		font-size: 0.92rem;
	}

	.stat-value {
		font-size: 1.7rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.repo-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.repo-badge {
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--text-muted);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.repo-badge:hover {
		color: var(--text);
		background: var(--surface-hover);
	}

	.repo-badge.active {
		color: var(--text);
		background: var(--surface-hover);
		border-color: var(--text);
	}

	.pr-list {
		list-style: none;
		margin: 0;
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		overflow: hidden;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.notice {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 2rem;
		text-align: center;
		color: var(--text-muted);
		box-shadow: var(--shadow);
	}

	.notice.error {
		color: #cf222e;
		border-color: #f5c6cb;
	}

	@media (max-width: 900px) {
		main {
			padding: 1.5rem 1.25rem 3rem;
		}

		.grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		h1 {
			font-size: 2.1rem;
		}

		.stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat:nth-child(2) {
			border-right: none;
		}

		.stat:nth-child(1),
		.stat:nth-child(2) {
			border-bottom: 1px solid var(--border);
		}
	}
</style>
