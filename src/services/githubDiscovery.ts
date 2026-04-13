const GITHUB_API = "https://api.github.com";
const SEARCH_TERMS = [
  "ai skills",
  "agent skills",
  "awesome skills",
  "prompt engineering",
  "llm tools",
  "ai agents",
  "claude skills",
  "gpt tools",
  "langchain tools",
  "ai automation",
  "prompt templates",
  "ai workflows"
];

const HEADERS: Record<string, string> = {
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "AI-Feast-Engine",
};

if (process.env.GITHUB_TOKEN) {
  HEADERS["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
}

export interface RawSkillRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stars: number;
  readme?: string;
  files?: string[];
}

export async function discoverRepos(): Promise<RawSkillRepo[]> {
  const results: RawSkillRepo[] = [];
  const seen = new Set<string>();

  for (const term of SEARCH_TERMS) {
    try {
      const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(term)}&sort=stars&order=desc&per_page=30`;
      const res = await fetch(url, { headers: HEADERS });

      if (!res.ok) {
        if (res.status === 403) {
          console.warn(`[Discovery] GitHub API rate limit exceeded for "${term}"`);
          break;
        }
        console.warn(`[Discovery] HTTP ${res.status} for "${term}"`);
        continue;
      }

      const data = await res.json() as any;
      if (!data.items) continue;

      for (const repo of data.items) {
        if (seen.has(repo.full_name)) continue;
        if (repo.stargazers_count < 50) continue;
        if (repo.fork) continue;

        seen.add(repo.full_name);
        results.push({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || "",
          html_url: repo.html_url,
          stars: repo.stargazers_count
        });
      }

      // Respeitar rate limit do GitHub
      await new Promise(r => setTimeout(r, 1000));

    } catch (err: any) {
      console.error(`[Discovery] Error searching "${term}": ${err.message}`);
    }
  }

  console.log(`[Discovery] Found ${results.length} repos`);
  return results;
}

export async function extractReadme(repo: RawSkillRepo): Promise<string> {
  try {
    const url = `${GITHUB_API}/repos/${repo.full_name}/readme`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return "";
    const data = await res.json() as any;
    if (!data.content) return "";
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export async function extractSkillFiles(repo: RawSkillRepo): Promise<string[]> {
  try {
    const url = `${GITHUB_API}/repos/${repo.full_name}/git/trees/HEAD?recursive=1`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json() as any;

    return (data.tree || [])
      .filter((f: any) =>
        f.type === "blob" &&
        (f.path.endsWith(".md") ||
          f.path.endsWith(".json") ||
          f.path.endsWith(".yaml"))
      )
      .map((f: any) => f.path)
      .slice(0, 10);
  } catch {
    return [];
  }
}
