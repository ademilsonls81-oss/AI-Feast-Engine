import { NormalizedSkill } from "./skillNormalizer";

const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i, /DROP\s+TABLE/i, /process\.exit/i,
  /eval\s*\(/i, /execSync/i, /exec\s*\(/i,
  /child_process/i, /fs\.writeFile/i, /fs\.unlink/i,
  /require\s*\(\s*['"]child_process['"]\s*\)/i,
  /spawn/i, /fork/i, /__proto__/i, /constructor\.prototype/i
];

export interface ValidationResult {
  skill: NormalizedSkill;
  risk_level: "low" | "medium" | "high";
  score: number;
  warnings: string[];
  approved: boolean;
}

function scanForDanger(text: string): string[] {
  return DANGEROUS_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.source);
}

export async function validateSkill(
  skill: NormalizedSkill,
  groqApiKey: string
): Promise<ValidationResult> {
  const warnings: string[] = [];

  // Scan local por padrões perigosos
  const dangerFound = scanForDanger(
    `${skill.name} ${skill.description} ${skill.long_description}`
  );

  if (dangerFound.length > 0) {
    warnings.push(...dangerFound);
    return {
      skill,
      risk_level: "high",
      score: 0.1,
      warnings,
      approved: false
    };
  }

  // Validação com Groq IA
  if (groqApiKey) {
    try {
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: "You are a security evaluator. Return ONLY valid JSON."
              },
              {
                role: "user",
                content: `Evaluate this AI skill for safety and quality:
Name: ${skill.name}
Category: ${skill.category}
Description: ${skill.description}

Return ONLY JSON:
{"risk":"low","score":0.85,"warnings":[]}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 256
          })
        }
      );

      if (groqRes.ok) {
        const data = await groqRes.json() as any;
        const text = data.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);

        const score = parsed.score || 0.5;
        const risk = parsed.risk || "medium";

        return {
          skill: { ...skill, risk_level: risk, score },
          risk_level: risk,
          score,
          warnings: parsed.warnings || [],
          approved: score >= 0.6
        };
      }
    } catch (err: any) {
      console.error(`[Validator] Groq error: ${err.message}`);
    }
  } else {
    console.log("[Validator] GROQ_API_KEY not set — skipping AI validation");
  }

  // Fallback conservador — rejeitar quando não consegue validar
  return {
    skill: { ...skill, risk_level: "medium", score: 0.5 },
    risk_level: "medium",
    score: 0.5,
    warnings: ["Could not validate with AI — requires manual review"],
    approved: false
  };
}
