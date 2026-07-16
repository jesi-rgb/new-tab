import {
	fetchPullRequests,
	fetchPrHeadSha,
	fetchCiStatus,
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

	repoList = $derived.by(() => {
		const seen = new Set<string>();
		for (const pr of this.prs) seen.add(pr.repo);
		return [...seen].sort();
	});

	filteredPrs = $derived(
		this.prs.filter(
			(pr) =>
				(!this.filter || prCategory(pr) === this.filter) &&
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
			this.loadCiStatuses();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load pull requests.';
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Fetch CI status for non-merged, non-closed PRs in the background.
	 * Updates ciStatuses progressively as each result comes in.
	 */
	private loadCiStatuses() {
		const token = settings.current.token;
		const candidates = this.prs.filter((pr) => {
			const cat = prCategory(pr);
			return (cat === 'open' || cat === 'drafts') && pr.pullUrl;
		});

		for (const pr of candidates) {
			(async () => {
				try {
					const sha = await fetchPrHeadSha(pr.pullUrl!, token);
					if (!sha) return;
					const status = await fetchCiStatus(...(pr.repo.split('/') as [string, string]), sha, token);
					this.ciStatuses = { ...this.ciStatuses, [pr.id]: status };
				} catch {
					// Ignore failures (e.g. rate limiting); simply omit the CI badge.
				}
			})();
		}
	}
}

export const prStore = new PrStore();
