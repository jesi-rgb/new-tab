<script lang="ts">
	import {
		relativeTime,
		type PullRequest,
		type CiStatus,
	} from "$lib/github";

	let {
		pr,
		ci,
		branch,
		dashboardUrl,
	}: {
		pr: PullRequest;
		ci?: CiStatus;
		branch?: string;
		dashboardUrl?: string;
	} = $props();

	let promptCopied = $state(false);
	let promptTimer: ReturnType<typeof setTimeout> | undefined;

	// Build a Discord-markdown review request for this PR. The preview link
	// already carries the password as a query param, so nothing else to share.
	function reviewPrompt(): string {
		if (!dashboardUrl) return "";
		return [
			`\u{1F4DD} **${pr.title}** #${pr.number}`,
			``,
			`\u{1F310} [Preview deployment](${dashboardUrl}) \u00b7 \u{1F4AC}[PR Link](${pr.url})`,
		].join("\n");
	}

	async function copyReviewPrompt() {
		if (!dashboardUrl) return;
		try {
			await navigator.clipboard.writeText(reviewPrompt());
			promptCopied = true;
			clearTimeout(promptTimer);
			promptTimer = setTimeout(() => (promptCopied = false), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context); nothing to show.
		}
	}

	function statusColor(pr: PullRequest): string {
		if (pr.merged) return "var(--merged, #8957e5)";
		if (pr.state === "closed") return "var(--closed, #cf222e)";
		if (pr.draft) return "var(--draft, #8a8a8f)";
		return "var(--accent)";
	}

	function repoName(repo: string): string {
		const idx = repo.indexOf("/");
		return idx === -1 ? repo : repo.slice(idx + 1);
	}

	// Deterministic hash of the repo name -> a consistent hue, so the same
	// repo always gets the same pill color. Lightness/chroma are fixed so
	// every generated color has consistent contrast and saturation - tweak
	// REPO_L / REPO_C below to adjust all pill colors at once.
	const REPO_L = 0.58; // lightness (0-1)
	const REPO_C = 0.13; // chroma

	function repoHue(repo: string): number {
		let hash = 0;
		for (let i = 0; i < repo.length; i++) {
			hash = (hash << 5) - hash + repo.charCodeAt(i);
			hash |= 0;
		}
		return (Math.abs(hash) + 220) % 360;
	}

	function repoColor(repo: string, alpha = 1): string {
		const hue = repoHue(repo);
		return `oklch(${REPO_L} ${REPO_C} ${hue}${alpha < 1 ? ` / ${alpha}` : ""})`;
	}

	function ciLabel(ci: CiStatus): string {
		if (ci.state === "success") return "CI passing";
		if (ci.state === "failure") return "CI failing";
		if (ci.state === "pending") return "CI running";
		return "";
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
				{#if ci && ci.state !== "none"}
					<span class="ci-badge ci-{ci.state}" title={ciLabel(ci)}>
						{#if ci.state === "success"}
							<svg
								width="13"
								height="13"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<path
									d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z"
								/>
							</svg>
						{:else if ci.state === "failure"}
							<svg
								width="13"
								height="13"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<path
									d="M2.343 13.657A8 8 0 1 1 13.657 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8l-1.97 1.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94Z"
								/>
							</svg>
						{:else}
							<svg
								width="13"
								height="13"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<path
									d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4v4.25l3 1.5-.75 1.5-3.75-1.9V4h1.5Z"
								/>
							</svg>
						{/if}
						{ciLabel(ci)}
					</span>
				{/if}
			</span>
			<span class="sub">
				<span
					class="repo-pill"
					style:background={repoColor(pr.repo, 0.14)}
					style:border-color={repoColor(pr.repo, 0.6)}
					style:color={repoColor(pr.repo)}
				>
					{repoName(pr.repo)}
				</span>
				<span>·</span>
				<span class="sub-sep pr-number">#{pr.number}</span>
				<span>·</span>
				{#if branch}
					<span class="sub-sep branch">
						<svg
							width="12"
							height="12"
							viewBox="0 0 16 16"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z"
							/>
						</svg>
						{branch}
					</span>
				{/if}
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
			{#if dashboardUrl}
				<a
					href={dashboardUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="action-btn icon-only dashboard"
					title="Open preview dashboard"
					aria-label="Open preview dashboard"
				>
					<svg
						width="15"
						height="15"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<circle cx="8" cy="8" r="6.25" />
						<ellipse cx="8" cy="8" rx="3" ry="6.25" />
						<path
							d="M1.9 6h12.2M1.9 10h12.2"
							stroke-linecap="round"
						/>
					</svg>
				</a>
				<button
					type="button"
					class="action-btn icon-only dashboard"
					class:copied={promptCopied}
					title="Copy review request for Discord"
					aria-label="Copy review request for Discord"
					onclick={copyReviewPrompt}
				>
					{#if promptCopied}
						<svg
							width="15"
							height="15"
							viewBox="0 0 16 16"
							fill="currentColor"
						>
							<path
								d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6.5 10.94l5.97-5.97a.75.75 0 0 1 1.06 0Z"
							/>
						</svg>
					{:else}
						<svg
							width="15"
							height="15"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path
								d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-3.5 2.75V4.5a1 1 0 0 1 1-1Z"
								stroke-linejoin="round"
							/>
							<path
								d="M5.5 6.5h5M5.5 8.75h3"
								stroke-linecap="round"
							/>
						</svg>
					{/if}
				</button>
			{/if}
			<a href={detailHref} class="action-btn" title="View details">
				Details
			</a>
			<a
				href={pr.url}
				target="_blank"
				rel="noopener noreferrer"
				class="action-btn icon-only"
				title="Open on GitHub"
				aria-label="Open on GitHub"
			>
				<svg
					width="15"
					height="15"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						d="M6 3.5H3.5v9h9V10M9.5 3.5h3v3M12 4L7 9"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
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
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem;
		font-size: 0.88rem;
		color: var(--text-muted);
	}

	.repo-pill {
		font-size: 0.76rem;
		font-weight: 800;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
	}

	.sub-sep {
		white-space: nowrap;
	}

	.pr-number {
		font-family: "SF Mono", monospace;
		font-weight: 600;
	}

	.branch {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
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

	button.action-btn {
		cursor: pointer;
		font-family: inherit;
	}

	.action-btn.dashboard {
		color: var(--accent);
		border-color: color-mix(in oklch, var(--accent) 40%, transparent);
	}

	.action-btn.dashboard:hover {
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	.action-btn.copied {
		color: #1a7f37;
		border-color: rgba(26, 127, 55, 0.5);
	}

	.updated-at {
		font-size: 0.88rem;
		color: var(--text-muted);
	}
</style>
