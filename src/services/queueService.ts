import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const MAX_CONCURRENT_POSTS = Number(process.env.MAX_CONCURRENT_POSTS) || 3;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 3000;

class QueueService {
  private queue: string[] = [];
  private processingCount = 0;
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
  private openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  constructor() {
    console.log(`[QueueService] Active. Concurrency: ${MAX_CONCURRENT_POSTS}, Delay: ${BATCH_DELAY_MS}ms`);
  }

  public addTasks(postIds: string[]) {
    const uniqueIds = postIds.filter(id => !this.queue.includes(id));
    this.queue.push(...uniqueIds);
    console.log(`[QueueService] Added ${uniqueIds.length} tasks. Total: ${this.queue.length}`);
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
      console.error(`[QueueService] Error on post ${postId}:`, err.message);
    } finally {
      this.processingCount--;
      setTimeout(() => this.processQueue(), BATCH_DELAY_MS);
    }
  }

  private async processPost(postId: string) {
    await this.supabase.from("posts").update({ status: "processing" }).eq("id", postId);
    const { data: post, error: fetchError } = await this.supabase
      .from("posts").select("*").eq("id", postId).single();
    if (fetchError || !post) throw new Error(`Post ${postId} not found`);
    const result = await this.processWithOpenRouter(post);
    if (result.error) {
      await this.supabase.from("posts").update({
        status: "error",
        error_message: result.error
      }).eq("id", postId);
      return;
    }
    const { error: updateError } = await this.supabase.from("posts").update({
      summary: result.summary,
      translations: result.translations,
      status: "published"
    }).eq("id", postId);
    if (updateError) {
      console.error(`[QueueService] Update Error for ${postId}:`, updateError.message);
    } else {
      console.log(`[QueueService] Published: ${post.title}`);
    }
  }

  private async processWithOpenRouter(post: any) {
    const sourceText = post.content_raw || post.title;
    const prompt = `Você é um motor de processamento de notícias de alta performance.
Resuma o seguinte conteúdo de notícia em português de forma concisa (máximo 3 parágrafos).
Foque nos fatos principais e mantenha um tom profissional.

Além disso, forneça traduções desse resumo para: en, es, fr, de, it, ja, ko, zh, ru, ar.

Retorne APENAS um JSON válido no formato:
{
  "summary": "resumo em português",
  "translations": {
    "en": "summary in english",
    "es": "resumen en español",
    "fr": "résumé en français",
    "de": "Zusammenfassung auf Deutsch",
    "it": "riassunto in italiano",
    "ja": "??????",
    "ko": "??? ??",
    "zh": "????",
    "ru": "?????? ?? ???????",
    "ar": "???? ????????"
  }
}

Título: ${post.title}
Corpo: ${sourceText}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "openrouter/auto",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const responseText = completion.choices[0].message.content || "{}";
      return JSON.parse(responseText);
    } catch (err: any) {
      console.error(`[OpenRouter Error] Post ${post.id}: ${err.message}`);
      return { error: err.message };
    }
  }

  public getStats() {
    return { queueSize: this.queue.length, processingCount: this.processingCount };
  }
}

export const queueService = new QueueService();
