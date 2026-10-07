import {
	fetchPullRequests,
	fetchPrHead,
	fetchCiStatus,
	fetchDashboardUrl,
	computeStats,
	prCategory,
	type PullRequest,
	type PullRequestStats,
	type PrCategory,
	type CiStatus
} from './github';
import { settings } from './settings.svelte';

class PrStore {
	prs = $state<PullRequest[]>([]);
	stats = $state<PullRequestStats>({ open: 0, drafts: 0, merged: 0, closed: 0 });
	loading = $state(false);
	error = $state('');
	lastLoaded = $state<number | null>(null);
	filter = $state<PrCategory | null>(null);
	repoFilter = $state<string | null>(null);
	ciStatuses = $state<Record<number, CiStatus | undefined>>({});
	branches = $state<Record<number, string | undefined>>({});
	dashboardUrls = $state<Record<number, string | undefined>>({});

	repoList = $derived.by(() => {
		const seen = new Set<string>();
		for (const pr of this.prs) seen.add(pr.repo);
		return [...seen].sort();
	});

	filteredPrs = $derived(
		this.prs.filter((pr) => {
			const cat = prCategory(pr);
			if (this.filter) return cat === this.filter && (!this.repoFilter || pr.repo === this.repoFilter);
			// By default, hide merged/closed PRs unless explicitly selected via the filter.
			return cat !== 'merged' && cat !== 'closed' && (!this.repoFilter || pr.repo === this.repoFilter);
		})
	);

	/**
	 * PRs where a review is still pending from the user ("needs my attention").
	 * Only surfaces still-open PRs, and respects the active repo filter.
	 */
	reviewRequestedPrs = $derived(
		this.prs.filter(
			(pr) =>
				pr.reviewRequested &&
				pr.state === 'open' &&
				!pr.merged &&
				(!this.repoFilter || pr.repo === this.repoFilter)
		)
	);

	toggleFilter(category: PrCategory) {
		this.filter = this.filter === category ? null : category;
	}

	toggleRepoFilter(repo: string) {
		this.repoFilter = this.repoFilter === repo ? null : repo;
	}

	async load() {
		if (!settings.configured) return;
		this.loading = true;
		this.error = '';
		try {
			this.prs = await fetchPullRequests(
				settings.current.username,
				settings.current.token,
				settings.current.repos
			);
			this.stats = computeStats(this.prs);
			this.lastLoaded = Date.now();
			this.ciStatuses = {};
			this.branches = {};
			this.dashboardUrls = {};
			this.loadCiStatuses();
			this.loadDashboardUrls();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load pull requests.';
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Fetch head info (branch name, and CI status for non-merged/closed PRs)
	 * in the background. Updates state progressively as each result comes in.
	 */
	private loadCiStatuses() {
		const token = settings.current.token;
		const candidates = this.prs.filter((pr) => pr.pullUrl);

		for (const pr of candidates) {
			(async () => {
				try {
					const head = await fetchPrHead(pr.pullUrl!, token);
					if (!head) return;
					this.branches = { ...this.branches, [pr.id]: head.ref };

					const cat = prCategory(pr);
					if (cat !== 'open' && cat !== 'drafts') return;
					const status = await fetchCiStatus(
						...(pr.repo.split('/') as [string, string]),
						head.sha,
						token
					);
					this.ciStatuses = { ...this.ciStatuses, [pr.id]: status };
				} catch {
					// Ignore failures (e.g. rate limiting); simply omit the CI badge / branch.
				}
			})();
		}
	}

	/**
	 * Look up the preview dashboard link posted by CI on each live PR.
	 * Most PRs have no such comment, in which case nothing is stored.
	 */
	private loadDashboardUrls() {
		const token = settings.current.token;

		for (const pr of this.prs) {
			const cat = prCategory(pr);
			if (cat !== 'open' && cat !== 'drafts') continue;

			(async () => {
				try {
					const url = await fetchDashboardUrl(
						...(pr.repo.split('/') as [string, string]),
						pr.number,
						token
					);
					if (url) this.dashboardUrls = { ...this.dashboardUrls, [pr.id]: url };
				} catch {
					// Ignore failures; the dashboard button simply stays hidden.
				}
			})();
		}
	}
}

export const prStore = new PrStore();
