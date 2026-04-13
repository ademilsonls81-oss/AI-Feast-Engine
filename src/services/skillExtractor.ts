import { RawSkillRepo, extractReadme } from "./githubDiscovery";

export interface RawSkill {
  name: string;
  description: string;
  content: string;
  source_repo: string;
  repo_url: string;
  stars: number;
}

// ==========================================
// BLACKLIST DE TÍTULOS — seções comuns de README que NÃO são skills
// ==========================================
const TITLE_BLACKLIST = [
  "installation",
  "getting started",
  "usage",
  "requirements",
  "license",
  "contributing",
  "changelog",
  "what's in this repo",
  "what is this",
  "table of contents",
  "overview",
  "introduction",
  "prerequisites",
  "faq",
  "troubleshooting",
  "contact",
  "acknowledgements",
  "references",
  "roadmap",
  "about",
  "setup",
  "quick start",
  "getting-started",
  "how to use",
  "how to install",
  "documentation",
  "docs",
  "examples",
  "demo",
  "features",
  "architecture",
  "project structure",
  "file structure",
  "installation guide",
  "configuration",
  "config",
  "deployment",
  "docker",
  "testing",
  "tests",
  "contribute",
  "contributors",
  "support",
  "help",
  "api",
  "endpoints",
  "changelog",
  "version",
  "release notes",
  "migration guide",
  "security",
  "privacy",
  "terms",
  "disclaimer",
  "sponsors",
  "backers",
  "donate",
  "community",
  "how it works",
  "ai agent",
  "awesome",
  "tutorial",
];

// ==========================================
// VALIDAÇÃO DE TÍTULO — rejeita lixo comum de READMEs
// ==========================================

function isBlacklisted(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return TITLE_BLACKLIST.some(b => lower.includes(b));
}

function hasHtmlLikeChars(title: string): boolean {
  return /[<>[\]()]/.test(title);
}

function isEmojiOrGarbage(title: string): boolean {
  // Rejeita se o título é apenas emojis, caracteres especiais, ou strings como "中文", ".graphifyignore"
  // Padrão: se não tem pelo menos 3 letras alfabéticas (a-z), rejeita
  const alphaCount = (title.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 3) return true;

  // Rejeita se contém apenas caracteres CJK ou símbolos
  if (/^[\u4e00-\u9fff\p{Emoji}\s·\.\-_]+$/u.test(title)) return true;

  return false;
}

function isRepoName(title: string, repoFullName: string): boolean {
  // Extrai o nome do repo (parte após o /)
  const repoName = repoFullName.split("/").pop()?.toLowerCase() || "";
  // Normaliza título e nome do repo para comparação
  const normalizedTitle = title.toLowerCase().replace(/[\s\-_.]/g, "");
  const normalizedRepo = repoName.toLowerCase().replace(/[\s\-_.]/g, "");
  return normalizedTitle === normalizedRepo || normalizedTitle.includes(normalizedRepo);
}

function isValidSkillTitle(title: string, repoFullName: string): boolean {
  // Tamanho mínimo e máximo
  if (title.length < 5 || title.length > 60) return false;

  // Blacklist
  if (isBlacklisted(title)) return false;

  // HTML-like chars
  if (hasHtmlLikeChars(title)) return false;

  // Emoji/garbage
  if (isEmojiOrGarbage(title)) return false;

  // Igual ao nome do repo
  if (isRepoName(title, repoFullName)) return false;

  return true;
}

// ==========================================
// EXTRAÇÃO PRINCIPAL
// ==========================================

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

      if (!title) continue;

      // Filtros rigorosos de título
      if (!isValidSkillTitle(title, repo.full_name)) continue;

      // Corpo mínimo
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

      if (!hasKeyword) continue;

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
