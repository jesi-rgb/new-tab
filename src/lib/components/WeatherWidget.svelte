<script lang="ts">
	import { settings } from '$lib/settings.svelte';
	import {
		fetchWeather,
		searchLocation,
		weatherEmoji,
		type GeoResult,
		type Weather
	} from '$lib/weather';

	let weather = $state<Weather | null>(null);
	let loading = $state(false);
	let error = $state('');
	let editing = $state(false);
	let query = $state('');
	let results = $state<GeoResult[]>([]);
	let searching = $state(false);

	async function load() {
		const w = settings.current.weather;
		if (!w.enabled || w.latitude === null || w.longitude === null) return;
		loading = true;
		error = '';
		try {
			weather = await fetchWeather(w.latitude, w.longitude);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load weather.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void settings.current.weather.latitude;
		void settings.current.weather.longitude;
		load();
	});

	let searchTimer: ReturnType<typeof setTimeout>;
	function onQueryInput() {
		clearTimeout(searchTimer);
		if (query.trim().length < 2) {
			results = [];
			return;
		}
		searchTimer = setTimeout(async () => {
			searching = true;
			try {
				results = await searchLocation(query.trim());
			} catch {
				results = [];
			} finally {
				searching = false;
			}
		}, 300);
	}

	function pick(r: GeoResult) {
		const place = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
		settings.setWeather(true, r.latitude, r.longitude, place);
		editing = false;
		query = '';
		results = [];
	}

	function locationLabel(r: GeoResult) {
		return [r.name, r.admin1, r.country].filter(Boolean).join(', ');
	}
</script>

<div class="weather">
	{#if editing || settings.current.weather.latitude === null}
		<div class="editor">
			<div class="editor-head">
				<span class="section-label">Weather</span>
				{#if settings.current.weather.latitude !== null}
					<button class="text-btn" onclick={() => (editing = false)}>Cancel</button>
				{/if}
			</div>
			<input
				type="text"
				placeholder="Search a city…"
				bind:value={query}
				oninput={onQueryInput}
			/>
			{#if searching}
				<p class="muted small">Searching…</p>
			{:else if results.length > 0}
				<ul class="results">
					{#each results as r (r.latitude + '' + r.longitude)}
						<li>
							<button onclick={() => pick(r)}>{locationLabel(r)}</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{:else}
		<button class="card" onclick={() => (editing = true)} title="Change location">
			{#if loading}
				<span class="muted">Loading weather…</span>
			{:else if error}
				<span class="muted">{error}</span>
			{:else if weather}
				<span class="emoji">{weatherEmoji(weather.code, weather.isDay)}</span>
				<span class="info">
					<span class="temp">{weather.temperature}°</span>
					<span class="desc">{weather.description}</span>
					<span class="meta">
						{settings.current.weather.place} · H:{weather.high}° L:{weather.low}°
					</span>
				</span>
			{/if}
		</button>
	{/if}
</div>

<style>
	.weather {
		width: 100%;
	}

	.card {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		text-align: left;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		box-shadow: var(--shadow);
		transition: background 0.15s;
	}

	.card:hover {
		background: var(--surface-hover);
	}

	.emoji {
		font-size: 2.2rem;
		line-height: 1;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.temp {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.desc {
		font-size: 0.95rem;
	}

	.meta {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.editor {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		box-shadow: var(--shadow);
	}

	.editor-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.section-label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.text-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	input {
		width: 100%;
		border: 1px solid transparent;
		background: var(--surface-hover);
		border-radius: 10px;
		padding: 0.65rem 0.85rem;
		font-size: 0.95rem;
		color: var(--text);
	}

	input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.results {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
	}

	.results button {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 0.55rem 0.5rem;
		border-radius: 8px;
		font-size: 0.9rem;
		color: var(--text);
	}

	.results button:hover {
		background: var(--surface-hover);
	}

	.muted {
		color: var(--text-muted);
	}

	.small {
		font-size: 0.85rem;
		margin: 0.5rem 0 0;
	}
</style>
