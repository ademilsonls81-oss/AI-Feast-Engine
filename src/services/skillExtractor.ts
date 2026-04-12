import { RawSkillRepo, extractReadme } from "./githubDiscovery";

export interface RawSkill {
  name: string;
  description: string;
  content: string;
  source_repo: string;
  repo_url: string;
  stars: number;
}

export async function extractSkillsFromRepo(
  repo: RawSkillRepo
): Promise<RawSkill[]> {
  const skills: RawSkill[] = [];

  try {
    // Delay para respeitar rate limit do GitHub
    await new Promise(r => setTimeout(r, 300));

    const readme = await extractReadme(repo);
    if (!readme) return skills;

    // Extrair seções do README como skills potenciais
    const sections = readme.split(/^#{1,3}\s+/m).filter(s => s.trim().length > 50);

    for (const section of sections.slice(0, 5)) {
      const lines = section.split("\n");
      const title = lines[0]?.trim();
      const body = lines.slice(1).join("\n").trim();

      if (!title || title.length < 3 || title.length > 100) continue;
      if (body.length < 30) continue;

      // Filtrar seções que parecem skills reais
      const skillKeywords = [
        "skill", "agent", "prompt", "tool", "command",
        "execute", "run", "generate", "analyze", "process"
      ];

      const hasKeyword = skillKeywords.some(kw =>
        title.toLowerCase().includes(kw) ||
        body.toLowerCase().includes(kw)
      );

      if (!hasKeyword && skills.length > 0) continue;

      skills.push({
        name: title,
        description: body.substring(0, 200),
        content: body.substring(0, 1000),
        source_repo: repo.full_name,
        repo_url: repo.html_url,
        stars: repo.stars
      });
    }

  } catch (err: any) {
    console.error(`[Extractor] Error: ${err.message}`);
  }

  return skills;
}
