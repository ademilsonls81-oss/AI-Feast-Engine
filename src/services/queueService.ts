import { supabaseAdmin as supabase } from "../lib/supabaseAdmin";
import OpenAI from "openai";

const MAX_CONCURRENT_POSTS = Number(process.env.MAX_CONCURRENT_POSTS) || 1;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 15000;
const MAX_RETRIES = 5;

function cleanJSON(text: string): string {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .trim();
}

class QueueService {
  private queue: string[] = [];
  private processingCount = 0;
  private supabaseClient = supabase;
  
  private openai = new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  constructor() {
    console.log(`[QueueService] Inicializado. Concorrência: ${MAX_CONCURRENT_POSTS}, Delay: ${BATCH_DELAY_MS}ms`);
  }

  public addTasks(postIds: string[]) {
    const uniqueIds = postIds.filter(id => !this.queue.includes(id));
    this.queue.push(...uniqueIds);
    console.log(`[QueueService] +${uniqueIds.length} tarefas. Total na fila: ${this.queue.length}`);
    this.processQueue();
  }

  private async processQueue() {
    if (this.processingCount >= MAX_CONCURRENT_POSTS || this.queue.length === 0) return;

    const postId = this.queue.shift();
    if (!postId) return;

    this.processingCount++;
    
    try {
      await this.processPost(postId);
    } catch (err: any) {
      console.error(`[QueueService] Erro no post ${postId}:`, err.message);
    } finally {
      this.processingCount--;
      setTimeout(() => this.processQueue(), BATCH_DELAY_MS);
    }
  }

  private async processPost(postId: string) {
    await this.supabaseClient.from("posts").update({ status: "processing" }).eq("id", postId);

    const { data: post, error: fetchError } = await this.supabaseClient
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (fetchError || !post) throw new Error(`Post ${postId} não encontrado`);

    const result = await this.processWithAI(post);
    const retryCount = (post.retry_count || 0) + 1;

    if (result.error) {
      if (retryCount >= 5) {
        await this.supabaseClient.from("posts").update({
          status: "error",
          error_message: result.error,
          retry_count: retryCount
        }).eq("id", postId);
        console.log(`[QueueService] Post ${postId} falhou definitivamente após ${retryCount} tentativas`);
      } else {
        await this.supabaseClient.from("posts").update({
          status: "pending",
          error_message: result.error,
          retry_count: retryCount
        }).eq("id", postId);
        console.log(`[QueueService] Post ${postId} marcado para retry (${retryCount}/5)`);
      }
      return;
    }

    await this.supabaseClient.from("posts").update({
      summary: result.summary,
      translations: result.translations,
      status: "published",
      retry_count: retryCount
    }).eq("id", postId);

    console.log(`[QueueService] Processado: ${post.title}`);
  }

  private async processWithAI(post: any) {
    const rawContent = post.content_raw || post.title || "";
    
    if (!rawContent || rawContent.length < 10) {
      return { error: "Conteúdo insuficiente" };
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

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: process.env.MODEL || "gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a JSON-only API. Return ONLY valid JSON with no extra text, markdown, or explanations." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        });

        const responseText = completion.choices[0].message.content || "";

        let jsonStr = cleanJSON(responseText);

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = cleanJSON(jsonMatch[0]);
        }

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (parseError: any) {
          console.log(`[AI Service] JSON parse error: ${parseError.message}`);
          console.log(`[AI Service] Raw response (first 200 chars): ${responseText.substring(0, 200)}`);
          throw new Error(`JSON inválido após limpeza: ${parseError.message}`);
        }

        if (parsed.summary && parsed.translations && typeof parsed.summary === 'string') {
          const requiredLangs = ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ru', 'ar'];
          const allTranslationsPresent = requiredLangs.every(lang => parsed.translations[lang] && parsed.translations[lang].length > 0);

          if (allTranslationsPresent) {
            return parsed;
          } else {
            const missing = requiredLangs.filter(lang => !parsed.translations[lang] || parsed.translations[lang].length === 0);
            console.log(`[AI Service] Missing translations: ${missing.join(', ')}`);
          }
        }

        if (retry < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return { error: "Invalid JSON response after " + MAX_RETRIES + " retries" };
      } catch (err: any) {
        const is429 = err.message?.includes("429") || err.status === 429;
        if (is429 && retry < MAX_RETRIES - 1) {
          const waitTime = Math.pow(2, retry) * 3000;
          console.log(`[AI Service] Rate limited, retry in ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        console.error(`[DETALHE ERRO 400]:`, err.response?.data || err.message);
        return { error: err.message };
      }
    }
    return { error: "Max retries exceeded" };
  }
}

export const queueService = new QueueService();
