import { RawSkill } from "./skillExtractor";

export interface NormalizedSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  tags: string[];
  source: "github";
  repo_url: string;
  stars: number;
  verified: boolean;
  is_active: boolean;
  risk_level?: string;
  score?: number;
}

const CATEGORIES = [
  "development",
  "content",
  "automation",
  "analysis",
  "security"
];

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    // Remove emojis and non-alphanumeric chars first
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "")
    // Keep only letters, numbers, spaces
    .replace(/[^a-z0-9\s]/g, "")
    // Collapse whitespace and convert to hyphens
    .replace(/\s+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

function inferCategory(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();

  if (/security|audit|scan|vuln|pentest/.test(text)) return "security";
  if (/code|dev|debug|review|refactor|test/.test(text)) return "development";
  if (/write|content|blog|article|copy|text/.test(text)) return "content";
  if (/automat|workflow|pipeline|schedule|cron/.test(text)) return "automation";
  return "analysis";
}

function inferTags(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const tagMap: Record<string, string> = {
    "ai": "ai", "gpt": "gpt", "llm": "llm",
    "code": "code", "python": "python", "javascript": "javascript",
    "security": "security", "data": "data", "api": "api",
    "automation": "automation", "analysis": "analysis",
    "content": "content", "github": "github", "cli": "cli"
  };

  return Object.entries(tagMap)
    .filter(([key]) => text.includes(key))
    .map(([, tag]) => tag)
    .slice(0, 5);
}

export function normalizeSkill(raw: RawSkill): NormalizedSkill {
  const id = toSnakeCase(raw.name);
  const slug = toKebabCase(raw.name);
  const category = inferCategory(raw.name, raw.description);
  const tags = inferTags(raw.name, raw.description);

  return {
    id,
    name: raw.name,
    slug,
    description: raw.description.substring(0, 200),
    long_description: raw.content.substring(0, 500),
    category,
    tags: tags.length > 0 ? tags : ["skill", "ai"],
    source: "github",
    repo_url: raw.repo_url,
    stars: raw.stars,
    verified: false,
    is_active: false
  };
}
