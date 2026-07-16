export type PullRequest = {
	id: number;
	number: number;
	title: string;
	url: string;
	repo: string;
	state: 'open' | 'closed';
	draft: boolean;
	merged: boolean;
	updatedAt: string;
	labels: string[];
	pullUrl: string | null;
};

export type CheckConclusion =
	| 'success'
	| 'failure'
	| 'neutral'
	| 'cancelled'
	| 'timed_out'
	| 'action_required'
	| 'skipped'
	| 'stale'
	| null;

export type CheckRun = {
	id: number;
	name: string;
	status: 'queued' | 'in_progress' | 'completed';
	conclusion: CheckConclusion;
	url: string | null;
};

export type CiState = 'success' | 'failure' | 'pending' | 'none';

export type CiStatus = {
	state: CiState;
	checks: CheckRun[];
};

export type PullRequestStats = {
	open: number;
	drafts: number;
	merged: number;
	closed: number;
};

type SearchItem = {
	id: number;
	number: number;
	title: string;
	html_url: string;
	repository_url: string;
	state: 'open' | 'closed';
	draft?: boolean;
	updated_at: string;
	pull_request?: { url: string; merged_at: string | null };
	labels: { name: string }[];
};

type SearchResponse = {
	items: SearchItem[];
};

function repoFromUrl(repositoryUrl: string): string {
	// https://api.github.com/repos/owner/name -> owner/name
	return repositoryUrl.replace('https://api.github.com/repos/', '');
}

function sevenDaysAgoISO(): string {
	const d = new Date();
	d.setDate(d.getDate() - 7);
	return d.toISOString().slice(0, 10);
}

/**
 * Fetch pull requests involving the user (author, assignee, mentions, review requests)
 * updated in the last 7 days. Optionally scope to specific repos.
 */
export async function fetchPullRequests(
	username: string,
	token: string,
	repos: string[]
): Promise<PullRequest[]> {
	const since = sevenDaysAgoISO();
	const qParts = ['is:pr', `involves:${username}`, `updated:>=${since}`];

	if (repos.length > 0) {
		const repoQuery = repos.map((r) => `repo:${r}`).join(' ');
		qParts.push(repoQuery);
	}

	const q = qParts.join(' ');
	const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
		q
	)}&sort=updated&order=desc&per_page=50`;

	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(url, { headers });

	if (!res.ok) {
		let message = `GitHub API error (${res.status})`;
		if (res.status === 401) message = 'Invalid access token.';
		else if (res.status === 403) message = 'Rate limit reached. Add a token to raise the limit.';
		else if (res.status === 422) message = 'Invalid search query. Check the username and repos.';
		throw new Error(message);
	}

	const data = (await res.json()) as SearchResponse;

	return data.items.map((item) => ({
		id: item.id,
		number: item.number,
		title: item.title,
		url: item.html_url,
		repo: repoFromUrl(item.repository_url),
		state: item.state,
		draft: item.draft ?? false,
		merged: Boolean(item.pull_request?.merged_at),
		updatedAt: item.updated_at,
		labels: item.labels.map((l) => l.name),
		pullUrl: item.pull_request?.url ?? null
	}));
}

export type PrCategory = 'open' | 'drafts' | 'merged' | 'closed';

export function prCategory(pr: PullRequest): PrCategory {
	if (pr.merged) return 'merged';
	if (pr.state === 'closed') return 'closed';
	if (pr.draft) return 'drafts';
	return 'open';
}

export function computeStats(prs: PullRequest[]): PullRequestStats {
	const stats: PullRequestStats = { open: 0, drafts: 0, merged: 0, closed: 0 };
	for (const pr of prs) {
		stats[prCategory(pr)]++;
	}
	return stats;
}

export type PullRequestDetail = PullRequest & {
	body: string | null;
	author: string;
	authorAvatar: string;
	baseRef: string;
	headRef: string;
	headSha: string;
	comments: number;
	reviewComments: number;
	commits: number;
	additions: number;
	deletions: number;
	changedFiles: number;
};

type PullDetailResponse = {
	id: number;
	number: number;
	title: string;
	html_url: string;
	state: 'open' | 'closed';
	draft: boolean;
	merged: boolean;
	body: string | null;
	user: { login: string; avatar_url: string };
	base: { ref: string };
	head: { ref: string; sha: string };
	updated_at: string;
	labels: { name: string }[];
	comments: number;
	review_comments: number;
	commits: number;
	additions: number;
	deletions: number;
	changed_files: number;
};

/**
 * Fetch full detail for a single pull request.
 */
export async function fetchPullRequestDetail(
	owner: string,
	repo: string,
	number: number,
	token: string
): Promise<PullRequestDetail> {
	const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(url, { headers });

	if (!res.ok) {
		let message = `GitHub API error (${res.status})`;
		if (res.status === 401) message = 'Invalid access token.';
		else if (res.status === 403) message = 'Rate limit reached. Add a token to raise the limit.';
		else if (res.status === 404) message = 'Pull request not found.';
		throw new Error(message);
	}

	const item = (await res.json()) as PullDetailResponse;

	return {
		id: item.id,
		number: item.number,
		title: item.title,
		url: item.html_url,
		repo: `${owner}/${repo}`,
		state: item.state,
		draft: item.draft,
		merged: item.merged,
		updatedAt: item.updated_at,
		labels: item.labels.map((l) => l.name),
		pullUrl: null,
		body: item.body,
		author: item.user.login,
		authorAvatar: item.user.avatar_url,
		baseRef: item.base.ref,
		headRef: item.head.ref,
		headSha: item.head.sha,
		comments: item.comments,
		reviewComments: item.review_comments,
		commits: item.commits,
		additions: item.additions,
		deletions: item.deletions,
		changedFiles: item.changed_files
	};
}

type CheckRunsResponse = {
	check_runs: {
		id: number;
		name: string;
		status: 'queued' | 'in_progress' | 'completed';
		conclusion: string | null;
		html_url: string | null;
	}[];
};

type CombinedStatusResponse = {
	state: 'success' | 'failure' | 'pending' | 'error';
	statuses: {
		context: string;
		state: 'success' | 'failure' | 'pending' | 'error';
		target_url: string | null;
	}[];
};

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'cancelled', 'action_required']);

/**
 * Fetch combined CI status (GitHub Actions check runs + legacy commit statuses)
 * for a given commit SHA.
 */
export async function fetchCiStatus(
	owner: string,
	repo: string,
	sha: string,
	token: string
): Promise<CiStatus> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const [checkRunsRes, statusRes] = await Promise.allSettled([
		fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`, {
			headers
		}),
		fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`, { headers })
	]);

	const checks: CheckRun[] = [];

	if (checkRunsRes.status === 'fulfilled' && checkRunsRes.value.ok) {
		const data = (await checkRunsRes.value.json()) as CheckRunsResponse;
		for (const run of data.check_runs) {
			checks.push({
				id: run.id,
				name: run.name,
				status: run.status,
				conclusion: run.conclusion as CheckConclusion,
				url: run.html_url
			});
		}
	}

	if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
		const data = (await statusRes.value.json()) as CombinedStatusResponse;
		for (const s of data.statuses) {
			const status: 'completed' | 'pending' = s.state === 'pending' ? 'pending' : 'completed';
			const conclusion: CheckConclusion =
				s.state === 'success' ? 'success' : s.state === 'error' ? 'failure' : (s.state as CheckConclusion);
			checks.push({
				id: checks.length,
				name: s.context,
				status: status === 'pending' ? 'in_progress' : 'completed',
				conclusion: s.state === 'pending' ? null : conclusion,
				url: s.target_url
			});
		}
	}

	let state: CiState = 'none';
	if (checks.length > 0) {
		const hasFailure = checks.some((c) => c.conclusion && FAILURE_CONCLUSIONS.has(c.conclusion));
		const hasPending = checks.some((c) => c.status !== 'completed');
		if (hasFailure) state = 'failure';
		else if (hasPending) state = 'pending';
		else state = 'success';
	}

	return { state, checks };
}

/**
 * Fetch the head commit SHA for a pull request given its API URL
 * (as returned by the search API's `pull_request.url` field).
 */
export async function fetchPrHeadSha(pullUrl: string, token: string): Promise<string | null> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(pullUrl, { headers });
	if (!res.ok) return null;

	const data = (await res.json()) as { head?: { sha?: string } };
	return data.head?.sha ?? null;
}

export function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	const now = Date.now();
	const diff = Math.max(0, now - then);
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? '' : 's'} ago`;
}
