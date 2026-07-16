<script lang="ts">
	import { relativeTime, type PullRequest } from '$lib/github';

	let { pr }: { pr: PullRequest } = $props();

	function statusColor(pr: PullRequest): string {
		if (pr.merged) return 'var(--merged, #8957e5)';
		if (pr.state === 'closed') return 'var(--closed, #cf222e)';
		if (pr.draft) return 'var(--draft, #8a8a8f)';
		return 'var(--accent)';
	}
</script>

<li class="pr">
	<a href={pr.url} class="row">
		<span class="pr-icon" style:color={statusColor(pr)} aria-hidden="true">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
				/>
			</svg>
		</span>
		<span class="body">
			<span class="title">{pr.title}</span>
			<span class="sub">
				{pr.repo} #{pr.number} · Updated {relativeTime(pr.updatedAt)}
			</span>
			{#if pr.labels.length > 0}
				<span class="labels">
					{#each pr.labels.slice(0, 4) as label (label)}
						<span class="label">{label}</span>
					{/each}
				</span>
			{/if}
		</span>
		<span class="external" aria-hidden="true">
			<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M6 3.5H3.5v9h9V10M9.5 3.5h3v3M12 4L7 9" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
	</a>
</li>

<style>
	.pr {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		text-decoration: none;
		padding: 1.15rem 1.35rem;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}

	.pr:last-child .row {
		border-bottom: none;
	}

	.row:hover {
		background: var(--surface-hover);
	}

	.pr-icon {
		margin-top: 0.15rem;
		flex-shrink: 0;
	}

	.body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.title {
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sub {
		font-size: 0.88rem;
		color: var(--text-muted);
	}

	.labels {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	.label {
		font-size: 0.78rem;
		background: var(--surface-hover);
		color: var(--text-muted);
		padding: 0.2rem 0.55rem;
		border-radius: 6px;
	}

	.external {
		color: var(--text-subtle);
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.row:hover .external {
		color: var(--accent);
	}
</style>
