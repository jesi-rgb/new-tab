<script lang="ts">
	import { page } from '$app/state';
	import { settings } from '$lib/settings.svelte';
	import {
		fetchPullRequestDetail,
		fetchCiStatus,
		fetchDashboardAccess,
		relativeTime,
		type PullRequestDetail,
		type CiStatus,
		type DashboardAccess
	} from '$lib/github';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	marked.setOptions({ breaks: true, gfm: true });

	function resolveRelativeUrl(url: string, owner: string, repo: string, ref: string): string {
		if (/^([a-z][a-z\d+.-]*:|#|\/\/)/i.test(url)) return url;
		const base = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/`;
		try {
			return new URL(url, base).toString();
		} catch {
			return url;
		}
	}

	function renderMarkdown(body: string, owner: string, repo: string, ref: string): string {
		const html = marked.parse(body, { async: false }) as string;
		const clean = DOMPurify.sanitize(html);
		const container = document.createElement('div');
		container.innerHTML = clean;
		container.querySelectorAll('img').forEach((img) => {
			const src = img.getAttribute('src');
			if (src) img.setAttribute('src', resolveRelativeUrl(src, owner, repo, ref));
		});
		container.querySelectorAll('a').forEach((a) => {
			const href = a.getAttribute('href');
			if (href) a.setAttribute('href', resolveRelativeUrl(href, owner, repo, ref));
		});
		return container.innerHTML;
	}

	const owner = $derived(page.params.owner ?? '');
	const repo = $derived(page.params.repo ?? '');
	const number = $derived(Number(page.params.number ?? ''));

	let pr = $state<PullRequestDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let ci = $state<CiStatus | null>(null);
	let ciLoading = $state(false);
	let dashboard = $state<DashboardAccess | null>(null);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyPassword() {
		if (!dashboard) return;
		try {
			await navigator.clipboard.writeText(dashboard.password);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context); nothing to show.
		}
	}

	function statusLabel(pr: PullRequestDetail): string {
		if (pr.merged) return 'Merged';
		if (pr.state === 'closed') return 'Closed';
		if (pr.draft) return 'Draft';
		return 'Open';
	}

	function statusColor(pr: PullRequestDetail): string {
		if (pr.merged) return 'var(--merged, #8957e5)';
		if (pr.state === 'closed') return 'var(--closed, #cf222e)';
		if (pr.draft) return 'var(--draft, #8a8a8f)';
		return 'var(--accent)';
	}

	function ciSummaryLabel(ci: CiStatus): string {
		if (ci.state === 'success') return 'All checks passed';
		if (ci.state === 'failure') {
			const count = ci.checks.filter(
				(c) => c.conclusion && ['failure', 'timed_out', 'cancelled', 'action_required'].includes(c.conclusion)
			).length;
			return `${count} check${count === 1 ? '' : 's'} failing`;
		}
		if (ci.state === 'pending') return 'Checks running';
		return 'No checks';
	}

	function checkIcon(conclusion: string | null, status: string): 'success' | 'failure' | 'pending' {
		if (status !== 'completed') return 'pending';
		if (conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped') return 'success';
		return 'failure';
	}

	async function load() {
		loading = true;
		error = '';
		ci = null;
		dashboard = null;
		try {
			pr = await fetchPullRequestDetail(owner, repo, number, settings.current.token);
			loadCi();
			loadDashboard();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load pull request.';
		} finally {
			loading = false;
		}
	}

	async function loadCi() {
		if (!pr) return;
		ciLoading = true;
		try {
			ci = await fetchCiStatus(owner, repo, pr.headSha, settings.current.token);
		} catch {
			ci = null;
		} finally {
			ciLoading = false;
		}
	}

	// The preview deployment comment is absent on most PRs; then the buttons stay hidden.
	async function loadDashboard() {
		try {
			dashboard = await fetchDashboardAccess(owner, repo, number, settings.current.token);
		} catch {
			dashboard = null;
		}
	}

	$effect(() => {
		owner;
		repo;
		number;
		load();
	});
</script>

<svelte:head>
	<title>{pr ? `${pr.title} · ${pr.repo}` : 'Pull request'}</title>
</svelte:head>

<main>
	<a href="/" class="back">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M10 3.5 5.5 8l4.5 4.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		Back
	</a>

	{#if loading}
		<div class="notice">Loading pull request…</div>
	{:else if error}
		<div class="notice error">{error}</div>
	{:else if pr}
		<article class="pr-detail">
			<header>
				<span class="status" style:color={statusColor(pr)} style:border-color={statusColor(pr)}>
					{statusLabel(pr)}
				</span>
				<h1>{pr.title}</h1>
				<p class="meta">
					<img class="avatar" src={pr.authorAvatar} alt={pr.author} width="20" height="20" />
					<span>
						<strong>{pr.author}</strong> wants to merge into
						<code>{pr.baseRef}</code> from <code>{pr.headRef}</code>
					</span>
				</p>
				<p class="sub">
					{pr.repo} #{pr.number} · Updated {relativeTime(pr.updatedAt)}
				</p>
			</header>

			{#if pr.labels.length > 0}
				<div class="labels">
					{#each pr.labels as label (label)}
						<span class="label">{label}</span>
					{/each}
				</div>
			{/if}

			<a class="github-link" href={pr.url} target="_blank" rel="noopener noreferrer">
				View on GitHub
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6 3.5H3.5v9h9V10M9.5 3.5h3v3M12 4L7 9" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>

			{#if dashboard}
				<div class="dashboard-row">
					<a class="dashboard-btn" href={dashboard.url} target="_blank" rel="noopener noreferrer">
						<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
							<circle cx="8" cy="8" r="6.25" />
							<ellipse cx="8" cy="8" rx="3" ry="6.25" />
							<path d="M1.9 6h12.2M1.9 10h12.2" stroke-linecap="round" />
						</svg>
						Open deployment
					</a>
					<button type="button" class="dashboard-btn" class:copied onclick={copyPassword}>
						{#if copied}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
								<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z" />
							</svg>
							Copied
						{:else}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<rect x="5.75" y="5.75" width="8" height="8" rx="1.5" />
								<path d="M10.25 3.25a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1.5 1.5" stroke-linecap="round" />
							</svg>
							Copy password
						{/if}
					</button>
				</div>
			{/if}

			<div class="ci-section">
				{#if ciLoading}
					<div class="ci-summary ci-loading">Loading CI status…</div>
				{:else if ci && ci.state !== 'none'}
					<div class="ci-summary ci-{ci.state}">
						{#if ci.state === 'success'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
								<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z" />
							</svg>
						{:else if ci.state === 'failure'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
								<path d="M2.343 13.657A8 8 0 1 1 13.657 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8l-1.97 1.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94Z" />
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4v4.25l3 1.5-.75 1.5-3.75-1.9V4h1.5Z" />
							</svg>
						{/if}
						{ciSummaryLabel(ci)}
					</div>

					<ul class="checks">
						{#each ci.checks as check (check.id + check.name)}
							{@const icon = checkIcon(check.conclusion, check.status)}
							<li class="check">
								<span class="check-icon check-{icon}" aria-hidden="true">
									{#if icon === 'success'}
										<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
											<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z" />
										</svg>
									{:else if icon === 'failure'}
										<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
											<path d="M2.343 13.657A8 8 0 1 1 13.657 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8l-1.97 1.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94Z" />
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
											<path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4v4.25l3 1.5-.75 1.5-3.75-1.9V4h1.5Z" />
										</svg>
									{/if}
								</span>
								<span class="check-name">{check.name}</span>
								{#if check.conclusion}
									<span class="check-conclusion">{check.conclusion.replace('_', ' ')}</span>
								{/if}
								{#if check.url}
									<a class="check-link" href={check.url} target="_blank" rel="noopener noreferrer">
										Details
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="stats">
				<div class="stat">
					<span class="stat-label">Commits</span>
					<span class="stat-value">{pr.commits}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Files changed</span>
					<span class="stat-value">{pr.changedFiles}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Additions</span>
					<span class="stat-value additions">+{pr.additions}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Deletions</span>
					<span class="stat-value deletions">-{pr.deletions}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Comments</span>
					<span class="stat-value">{pr.comments + pr.reviewComments}</span>
				</div>
			</div>

			{#if pr.body}
				<div class="body markdown-body">
					{@html renderMarkdown(pr.body, owner, repo, pr.baseRef)}
				</div>
			{/if}
		</article>
	{/if}
</main>

<style>
	main {
		max-width: 780px;
		margin: 0 auto;
		padding: 2rem 2.5rem 4rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.92rem;
		margin-bottom: 1.5rem;
	}

	.back:hover {
		color: var(--text);
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

	.pr-detail {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 2rem 2.25rem;
	}

	.status {
		display: inline-block;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border: 1px solid;
		border-radius: 999px;
		padding: 0.2rem 0.7rem;
		margin-bottom: 0.75rem;
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.35rem;
		color: var(--text-muted);
		font-size: 0.92rem;
	}

	.meta code {
		background: var(--surface-hover);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.avatar {
		border-radius: 999px;
	}

	.sub {
		margin: 0;
		color: var(--text-subtle, var(--text-muted));
		font-size: 0.88rem;
	}

	.labels {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 1.25rem 0 0;
	}

	.label {
		font-size: 0.78rem;
		background: var(--surface-hover);
		color: var(--text-muted);
		padding: 0.2rem 0.55rem;
		border-radius: 6px;
	}

	.ci-section {
		margin: 1.25rem 0 0;
	}

	.ci-summary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.92rem;
		font-weight: 600;
		padding: 0.5rem 0.9rem;
		border-radius: 8px;
	}

	.ci-summary.ci-loading {
		color: var(--text-muted);
		background: var(--surface-hover);
	}

	.ci-summary.ci-success {
		color: #1a7f37;
		background: rgba(26, 127, 55, 0.12);
	}

	.ci-summary.ci-failure {
		color: #cf222e;
		background: rgba(207, 34, 46, 0.12);
	}

	.ci-summary.ci-pending {
		color: #9a6700;
		background: rgba(154, 103, 0, 0.12);
	}

	.checks {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 0.9rem;
		font-size: 0.88rem;
		border-bottom: 1px solid var(--border);
	}

	.check:last-child {
		border-bottom: none;
	}

	.check-icon {
		flex-shrink: 0;
		display: flex;
	}

	.check-icon.check-success {
		color: #1a7f37;
	}

	.check-icon.check-failure {
		color: #cf222e;
	}

	.check-icon.check-pending {
		color: #9a6700;
	}

	.check-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text);
		font-weight: 500;
	}

	.check-conclusion {
		font-size: 0.78rem;
		color: var(--text-muted);
		text-transform: capitalize;
		flex-shrink: 0;
	}

	.check-link {
		flex-shrink: 0;
		font-size: 0.82rem;
		color: var(--accent);
		text-decoration: none;
	}

	.check-link:hover {
		text-decoration: underline;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		margin: 1.5rem 0;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 1.25rem 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.stat-label {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.stat-value {
		font-size: 1.15rem;
		font-weight: 700;
	}

	.additions {
		color: #1a7f37;
	}

	.deletions {
		color: #cf222e;
	}

	.body {
		color: var(--text);
		font-size: 0.95rem;
		line-height: 1.55;
		margin: 1.5rem 0;
	}

	.markdown-body :global(p) {
		margin: 0 0 0.8em;
	}

	.markdown-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3),
	.markdown-body :global(h4),
	.markdown-body :global(h5),
	.markdown-body :global(h6) {
		margin: 1em 0 0.5em;
		font-weight: 600;
		line-height: 1.3;
	}

	.markdown-body :global(h1) {
		font-size: 1.5em;
	}

	.markdown-body :global(h2) {
		font-size: 1.3em;
	}

	.markdown-body :global(h3) {
		font-size: 1.15em;
	}

	.markdown-body :global(a) {
		color: var(--accent);
		text-decoration: none;
	}

	.markdown-body :global(a:hover) {
		text-decoration: underline;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		margin: 0 0 0.8em;
		padding-left: 1.5em;
	}

	.markdown-body :global(li) {
		margin: 0.2em 0;
	}

	.markdown-body :global(li > input[type='checkbox']) {
		margin-right: 0.4em;
	}

	.markdown-body :global(code) {
		background: var(--surface-2, rgba(127, 127, 127, 0.15));
		border-radius: 4px;
		padding: 0.15em 0.35em;
		font-size: 0.88em;
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
	}

	.markdown-body :global(pre) {
		background: var(--surface-2, rgba(127, 127, 127, 0.15));
		border-radius: 8px;
		padding: 0.8em 1em;
		overflow-x: auto;
		margin: 0 0 0.8em;
	}

	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}

	.markdown-body :global(blockquote) {
		margin: 0 0 0.8em;
		padding: 0.2em 1em;
		border-left: 3px solid var(--border, rgba(127, 127, 127, 0.4));
		color: var(--text-secondary, inherit);
	}

	.markdown-body :global(img) {
		max-width: 100%;
		border-radius: 6px;
	}

	.markdown-body :global(table) {
		border-collapse: collapse;
		margin: 0 0 0.8em;
		width: 100%;
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--border, rgba(127, 127, 127, 0.3));
		padding: 0.4em 0.7em;
		text-align: left;
	}

	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid var(--border, rgba(127, 127, 127, 0.3));
		margin: 1em 0;
	}

	.github-link {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.75rem;
		gap: 0.5rem;
		width: 100%;
		padding: 0.85rem 1rem;
		border-radius: 10px;
		color: #fff;
		background: var(--accent);
		border: 1px solid var(--accent);
		text-decoration: none;
		font-weight: 600;
		font-size: 1rem;
		transition: filter 0.12s;
	}

	.github-link:hover {
		filter: brightness(1.1);
	}

	.dashboard-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
		margin-top: 0.6rem;
	}

	.dashboard-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.7rem 1rem;
		border-radius: 10px;
		font-family: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		color: var(--accent);
		background: var(--surface);
		border: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
		transition:
			background 0.12s,
			color 0.12s;
	}

	.dashboard-btn:hover {
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	.dashboard-btn.copied {
		color: #1a7f37;
		border-color: rgba(26, 127, 55, 0.5);
	}

	@media (max-width: 700px) {
		main {
			padding: 1.5rem 1.25rem 3rem;
		}

		.stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
