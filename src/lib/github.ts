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
	pull_request?: { merged_at: string | null };
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
		labels: item.labels.map((l) => l.name)
	}));
}

export function computeStats(prs: PullRequest[]): PullRequestStats {
	const stats: PullRequestStats = { open: 0, drafts: 0, merged: 0, closed: 0 };
	for (const pr of prs) {
		if (pr.merged) stats.merged++;
		else if (pr.state === 'closed') stats.closed++;
		else if (pr.draft) stats.drafts++;
		else stats.open++;
	}
	return stats;
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
