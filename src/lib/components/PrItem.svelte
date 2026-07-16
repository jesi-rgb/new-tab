<script lang="ts">
	import { relativeTime, type PullRequest, type CiStatus } from '$lib/github';

	let { pr, ci }: { pr: PullRequest; ci?: CiStatus } = $props();

	function statusColor(pr: PullRequest): string {
		if (pr.merged) return 'var(--merged, #8957e5)';
		if (pr.state === 'closed') return 'var(--closed, #cf222e)';
		if (pr.draft) return 'var(--draft, #8a8a8f)';
		return 'var(--accent)';
	}

	function ciLabel(ci: CiStatus): string {
		if (ci.state === 'success') return 'CI passing';
		if (ci.state === 'failure') return 'CI failing';
		if (ci.state === 'pending') return 'CI running';
		return '';
	}

	const detailHref = $derived(`/pr/${pr.repo}/${pr.number}`);
</script>

<li class="pr">
	<div class="row">
		<span class="pr-icon" style:color={statusColor(pr)} aria-hidden="true">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
				/>
			</svg>
		</span>
		<a href={detailHref} class="body">
			<span class="title-row">
				<span class="title">{pr.title}</span>
				{#if ci && ci.state !== 'none'}
					<span class="ci-badge ci-{ci.state}" title={ciLabel(ci)}>
						{#if ci.state === 'success'}
							<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
								<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z" />
							</svg>
						{:else if ci.state === 'failure'}
							<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
								<path d="M2.343 13.657A8 8 0 1 1 13.657 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8l-1.97 1.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94Z" />
							</svg>
						{:else}
							<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4v4.25l3 1.5-.75 1.5-3.75-1.9V4h1.5Z" />
							</svg>
						{/if}
						{ciLabel(ci)}
					</span>
				{/if}
			</span>
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
		</a>
		<span class="actions">
			<a href={detailHref} class="action-btn" title="View details">
				Details
			</a>
			<a href={pr.url} target="_blank" rel="noopener noreferrer" class="action-btn icon-only" title="Open on GitHub" aria-label="Open on GitHub">
				<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6 3.5H3.5v9h9V10M9.5 3.5h3v3M12 4L7 9" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
		</span>
	</div>
</li>

<style>
	.pr {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
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
		text-decoration: none;
		color: inherit;
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

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	.title-row .title {
		min-width: 0;
	}

	.ci-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
		font-size: 0.76rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}

	.ci-badge.ci-success {
		color: #1a7f37;
		background: rgba(26, 127, 55, 0.12);
	}

	.ci-badge.ci-failure {
		color: #cf222e;
		background: rgba(207, 34, 46, 0.12);
	}

	.ci-badge.ci-pending {
		color: #9a6700;
		background: rgba(154, 103, 0, 0.12);
	}

	.body:hover .title {
		text-decoration: underline;
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

	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
		margin-top: 0.05rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		padding: 0.4rem 0.7rem;
		transition:
			background 0.12s,
			color 0.12s;
	}

	.action-btn:hover {
		color: var(--text);
		background: var(--surface-hover);
	}

	.action-btn.icon-only {
		padding: 0.4rem;
	}
</style>
