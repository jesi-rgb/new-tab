<script lang="ts">
	import {
		BadgeCheck,
		Check,
		CirclePlay,
		CloudCheck,
		ExternalLink,
		GitBranch,
		Globe,
		MessageSquareText,
	} from "@lucide/svelte";
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
		stamped = false,
	}: {
		pr: PullRequest;
		ci?: CiStatus;
		branch?: string;
		dashboardUrl?: string;
		stamped?: boolean;
	} = $props();

	let copied = $state<"prompt" | "branch" | null>(null);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy(text: string, what: "prompt" | "branch") {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (copied = null), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context); nothing to show.
		}
	}

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

	// Mergeable on our terms: stamped by a teammate's review and every check green.
	const mergeable = $derived(stamped && ci?.state === "success");
</script>

<li class="pr">
	<div class="row">
		<div class="main">
			<span class="pr-icon" style:color={statusColor(pr)} aria-hidden="true">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					{#if pr.draft && pr.state === "open"}
						<!-- Octicon git-pull-request-draft-16 -->
						<path
							d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0-4.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z"
						/>
					{:else}
						<!-- Octicon git-pull-request-16 -->
						<path
							d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
						/>
					{/if}
				</svg>
			</span>
			<div class="body">
				<span class="meta-row">
					<span
						class="repo-pill"
						style:background={repoColor(pr.repo, 0.14)}
						style:border-color={repoColor(pr.repo, 0.6)}
						style:color={repoColor(pr.repo)}
					>
						{repoName(pr.repo)}
					</span>
					{#if ci && ci.state !== "none"}
						<span
							class="indicator ci-{ci.state}"
							title={ciLabel(ci)}
							aria-label={ciLabel(ci)}
						>
							<CirclePlay size={20} />
						</span>
					{/if}
					{#if stamped}
						<span
							class="indicator stamp"
							title="Reviewed-by and Approved-by"
							aria-label="Reviewed and approved"
						>
							<BadgeCheck size={20} />
						</span>
					{/if}
					{#if mergeable}
						<span
							class="indicator mergeable"
							title="Mergeable: stamped and CI passing"
							aria-label="Mergeable"
						>
							<CloudCheck size={20} />
						</span>
					{/if}
				</span>
				<span class="title-row">
					<a href={detailHref} class="title">{pr.title}</a>
				</span>
				<span class="sub">
					<span class="sub-sep pr-number">#{pr.number}</span>
					<span>·</span>
					{#if branch}
						<button
							type="button"
							class="sub-sep branch"
							class:copied={copied === "branch"}
							title="Copy branch name"
							onclick={() => copy(branch, "branch")}
						>
							{#if copied === "branch"}
								<Check size={12} strokeWidth={2.5} />
							{:else}
								<GitBranch size={12} />
							{/if}
							{branch}
						</button>
					{/if}
				</span>
				{#if pr.labels.length > 0}
					<span class="labels">
						{#each pr.labels.slice(0, 4) as label (label)}
							<span class="label">{label}</span>
						{/each}
					</span>
				{/if}
			</div>
		</div>
		<div class="actions">
			{#if dashboardUrl}
				<a
					href={dashboardUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="action-btn dashboard"
					title="Open preview dashboard"
					aria-label="Open preview dashboard"
				>
					<Globe size={20} />
				</a>
				<button
					type="button"
					class="action-btn dashboard"
					class:copied={copied === "prompt"}
					title="Copy review request for Discord"
					aria-label="Copy review request for Discord"
					onclick={() => copy(reviewPrompt(), "prompt")}
				>
					{#if copied === "prompt"}
						<Check size={20} />
					{:else}
						<MessageSquareText size={20} />
					{/if}
				</button>
			{/if}
			<a
				href={pr.url}
				target="_blank"
				rel="noopener noreferrer"
				class="action-btn"
				title="Open on GitHub"
				aria-label="Open on GitHub"
			>
				<ExternalLink size={20} />
			</a>
		</div>
	</div>
</li>

<style>
	.pr {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}

	.pr:last-child .row {
		border-bottom: none;
	}

	.row:hover {
		background: var(--surface-hover);
	}

	/* Positioning context for the title's stretched link (see .title::after). */
	.main {
		/* Height of the repo pill row: 0.62rem × 1.4 line height + 2px border. */
		--meta-h: calc(0.62rem * 1.4 + 2px);
		position: relative;
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		padding: 1.15rem 1.35rem;
	}

	.pr-icon {
		/* Skip past the repo pill row and the body gap (0.3rem) so the icon
		   lines up with the title. */
		margin-top: calc(0.15rem + var(--meta-h) + 0.3rem);
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
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Make the whole row body open the detail page, not just the title text. */
	.title::after {
		content: "";
		position: absolute;
		inset: 0;
	}

	.main:hover .title {
		text-decoration: underline;
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

	/* Pinned to the pill's height; larger indicator icons overflow it
	   vertically instead of growing the row, keeping .pr-icon aligned. */
	.meta-row {
		display: flex;
		align-items: center;
		height: var(--meta-h);
		gap: 0.45rem;
	}

	/* Sits above the stretched title link so its tooltip is reachable. */
	.indicator {
		position: relative;
		z-index: 1;
		display: inline-flex;
		flex-shrink: 0;
	}

	.indicator.ci-success,
	.indicator.stamp,
	.indicator.mergeable {
		color: #1a7f37;
	}

	.indicator.ci-failure {
		color: #cf222e;
	}

	.indicator.ci-pending {
		color: #bc4c00;
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
		font-size: 0.62rem;
		font-weight: 800;
		line-height: 1.4;
		letter-spacing: 0.02em;
		padding: 0 0.4rem;
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

	/* Sits above the stretched title link so clicks copy instead of navigating. */
	.branch {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		border-radius: 6px;
		padding: 0.05rem 0.3rem;
		margin: -0.05rem -0.3rem;
		cursor: copy;
		transition:
			background 0.12s,
			color 0.12s;
	}

	.branch:hover {
		color: var(--text);
		background: var(--border);
	}

	.branch.copied {
		color: #1a7f37;
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

	/* Full-height square buttons, flush against each other and the row edge. */
	.actions {
		display: flex;
		flex-shrink: 0;
	}

	.action-btn {
		display: grid;
		place-items: center;
		/* Fixed width = height of a one-line row, so buttons line up across rows;
		   taller rows (wrapped branch, labels) only stretch them vertically. */
		width: 6.1875rem;
		padding: 0;
		text-decoration: none;
		color: var(--text-muted);
		background: none;
		border: none;
		border-left: 1px solid var(--border);
		border-radius: 0;
		transition:
			background 0.12s,
			color 0.12s;
	}

	.action-btn:hover {
		color: var(--text);
		background: var(--surface-hover);
	}

	button.action-btn {
		cursor: pointer;
		font-family: inherit;
	}

	.action-btn.dashboard {
		color: var(--accent);
	}

	.action-btn.dashboard:hover {
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	.action-btn.copied {
		color: #1a7f37;
	}

	.updated-at {
		font-size: 0.88rem;
		color: var(--text-muted);
	}
</style>
