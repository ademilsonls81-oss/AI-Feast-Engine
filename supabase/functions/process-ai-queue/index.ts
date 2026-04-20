import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1";

const GEMINI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const MODEL = "gemini-1.5-flash"; // Free tier only - no other model allowed

function cleanJSON(text: string): string {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .trim();
}

async function callGemini(prompt: string, retryCount = 0): Promise<{ summary: string; translations: Record<string, string>; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      topP: 0.8,
      topK: 40
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    if (!res.ok) {
      const errorMsg = data.error?.message || data.error || "Unknown";
      console.error(`[GEMINI ERROR ${res.status}]:`, JSON.stringify(data));
      
      // Retry 429 (rate limit) with 60 second wait
      if ((res.status === 429 || res.status === 503) && retryCount < 3) {
        const delay = 60000; // 60 seconds for rate limit
        console.log(`[GEMINI] ${res.status} received, retrying in 60s (attempt ${retryCount + 1}/3)`);
        await new Promise(r => setTimeout(r, delay));
        return callGemini(prompt, retryCount + 1);
      }
      
      if (res.status === 403) {
        return { summary: "", translations: {}, error: `PERMISSION_DENIED: ${errorMsg}. Check API key and project access.` };
      }
      
      return { summary: "", translations: {}, error: `Error ${res.status}: ${errorMsg}` };
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    let jsonStr = cleanJSON(responseText);
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = cleanJSON(jsonMatch[0]);

    const parsed = JSON.parse(jsonStr);
    
    if (parsed.summary) {
      return {
        summary: String(parsed.summary).slice(0, 150),
        category: parsed.category || "Geral",
        tags: parsed.tags || [],
        sentiment: parsed.sentiment || "Neutro",
        original_source: parsed.original_source || null,
        timestamp: parsed.timestamp || new Date().toISOString(),
        translations: parsed.translations || {}
      };
    }

    return { summary: "", translations: {}, error: "Invalid response format" };
  } catch (err) {
    return { summary: "", translations: {}, error: err.message };
  }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST method" }), { status: 405 });
  }

  // FREE TIER: Process only 1 post per request with 15s delay to stay within RPM limits
  const { limit = 1 } = await req.json();
  const processedLimit = Math.min(limit, 1); // Maximum 1 post per execution

  const { data: pendingPosts, error: fetchError } = await supabase
    .from("posts")
    .select("id, title, content_raw, retry_count")
    .eq("status", "pending")
    .limit(processedLimit);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    return new Response(JSON.stringify({ message: "No pending posts", processed: 0 }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const results = [];
  let requestCount = 0;

  for (const post of pendingPosts) {
    // Throttle: Max 3 requests per minute (free tier safety limit)
    requestCount++;
    
    // Free tier = 3 RPM max = 20 second delay between requests
    if (requestCount > 1) {
      await new Promise(r => setTimeout(r, 20000)); // 20 seconds
    }
    
    const rawContent = post.content_raw || post.title || "";
    
    if (!rawContent || rawContent.length < 10) {
      await supabase
        .from("posts")
        .update({ status: "error", error_message: "Conteúdo insuficiente" })
        .eq("id", post.id);
      results.push({ id: post.id, error: "Conteúdo insuficiente" });
      continue;
    }

    const sourceText = rawContent.length > 3000 ? rawContent.substring(0, 3000) + "..." : rawContent;

    const prompt = `You are a JSON-only API. Return ONLY valid JSON with no explanations.

Task: Analyze the news and return structured data (ALL IN ENGLISH):
- summary: English summary (max 150 chars)
- category: Main category (Technology, Economy, Health, Science, Sports, Politics, Entertainment, Environment, or General)
- tags: 3-5 keywords array
- sentiment: Analysis (Positive, Neutral, or Negative)
- original_source: URL from the content if available, or null
- timestamp: publication date if available, or current timestamp
- translations: Translate summary to: en, es, fr, de, it, ja, ko, zh, ru, ar

JSON structure:
{
  "summary": "summary in English",
  "category": "Technology",
  "tags": ["tag1", "tag2", "tag3"],
  "sentiment": "Neutral",
  "original_source": "https://example.com",
  "timestamp": "2024-01-15T10:00:00Z",
  "translations": {"en":"...", "es":"...", "fr":"...", "de":"...", "it":"...", "ja":"...", "ko":"...", "zh":"...", "ru":"...", "ar":"..."}
}

Title: ${post.title}
Content: ${sourceText}`;

    const result = await callGemini(prompt);

    if (result.error) {
      await supabase
        .from("posts")
        .update({ 
          status: "error", 
          error_message: result.error,
          retry_count: (post.retry_count || 0) + 1
        })
        .eq("id", post.id);
      results.push({ id: post.id, error: result.error });
      continue;
    }

    const extraData = {
      category: result.category,
      tags: JSON.stringify(result.tags),
      sentiment: result.sentiment,
      original_source: result.original_source,
      timestamp: result.timestamp
    };

    await supabase
      .from("posts")
      .update({
        summary: result.summary,
        translations: JSON.stringify(result.translations),
        category: result.category,
        tags: JSON.stringify(result.tags),
        sentiment: result.sentiment,
        original_source: result.original_source,
        timestamp: result.timestamp,
        status: "published",
        retry_count: (post.retry_count || 0) + 1
      })
      .eq("id", post.id);

    results.push({ id: post.id, success: true });
  }

  return new Response(JSON.stringify({ 
    processed: results.length, 
    results 
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
