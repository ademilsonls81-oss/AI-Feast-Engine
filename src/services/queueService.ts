import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const MAX_CONCURRENT_POSTS = Number(process.env.MAX_CONCURRENT_POSTS) || 1;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 15000;
const MAX_RETRIES = 3;

class QueueService {
  private queue: string[] = [];
  private processingCount = 0;
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
  
  private openai = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY || "",
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
    await this.supabase.from("posts").update({ status: "processing" }).eq("id", postId);

    const { data: post, error: fetchError } = await this.supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (fetchError || !post) throw new Error(`Post ${postId} não encontrado`);

    const result = await this.processWithOpenRouter(post);
    const retryCount = (post.retry_count || 0) + 1;

    if (result.error) {
      if (retryCount >= 3) {
        await this.supabase.from("posts").update({
          status: "failed",
          error_message: result.error,
          retry_count: retryCount
        }).eq("id", postId);
        console.log(`[QueueService] Post ${postId} falhou definitivamente após ${retryCount} tentativas`);
      } else {
        await this.supabase.from("posts").update({
          status: "pending",
          error_message: result.error,
          retry_count: retryCount
        }).eq("id", postId);
        console.log(`[QueueService] Post ${postId} marcado para retry (${retryCount}/3)`);
      }
      return;
    }

    await this.supabase.from("posts").update({
      summary: result.summary,
      translations: result.translations,
      status: "published",
      retry_count: retryCount
    }).eq("id", postId);

    console.log(`[QueueService] Processado: ${post.title}`);
  }

  private async processWithOpenRouter(post: any) {
    const rawContent = post.content_raw || post.title || "";
    const sourceText = rawContent.length > 3000 ? rawContent.substring(0, 3000) + "..." : rawContent;
    
    const prompt = `Summarize this news article in Portuguese (max 3 paragraphs). Also provide translations in: en, es, fr, de, it, ja, ko, zh, ru, ar.

IMPORTANT: Respond with ONLY this JSON structure, no other text:
{"summary": "resumo aqui", "translations": {"en": "...", "es": "...", "fr": "...", "de": "...", "it": "...", "ja": "...", "ko": "...", "zh": "...", "ru": "...", "ar": "..."}}

Title: ${post.title}
Content: ${sourceText}`;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        
        const responseText = completion.choices[0].message.content || "";
        
        let jsonStr = responseText.trim();
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed.summary && parsed.translations) {
            return parsed;
          }
        }
        
        console.log(`[Groq] Invalid JSON response, retrying...`);
        if (retry < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return { error: "Invalid JSON response format" };
      } catch (err: any) {
        const is429 = err.message?.includes("429") || err.status === 429;
        if (is429 && retry < MAX_RETRIES - 1) {
          const waitTime = Math.pow(2, retry) * 2000;
          console.log(`[Groq] Rate limited, retry in ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        console.error(`[Groq Error] ${err.message}`);
        return { error: err.message };
      }
    }
    return { error: "Max retries exceeded" };
  }
}

export const queueService = new QueueService();

