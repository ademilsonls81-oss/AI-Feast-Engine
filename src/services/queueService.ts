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

    if (result.error) {
      await this.supabase.from("posts").update({
        status: "error",
        error_message: result.error
      }).eq("id", postId);
      return;
    }

    await this.supabase.from("posts").update({
      summary: result.summary,
      translations: result.translations,
      status: "published"
    }).eq("id", postId);

    console.log(`[QueueService] Processado: ${post.title}`);
  }

  private async processWithOpenRouter(post: any) {
    const sourceText = post.content_raw || post.title;
    
    const prompt = `Você é um motor de processamento de notícias de alta performance.
Resuma o seguinte conteúdo em português (máximo 3 parágrafos).
Forneça traduções do resumo para: en, es, fr, de, it, ja, ko, zh, ru, ar.

Retorne APENAS um JSON válido:
{
  "summary": "resumo em pt",
  "translations": { "en": "...", "es": "...", "fr": "...", "de": "...", "it": "...", "ja": "...", "ko": "...", "zh": "...", "ru": "...", "ar": "..." }
}

Conteúdo:
Título: ${post.title}
Corpo: ${sourceText}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "google/gemma-3-27b-it:free",
        messages: [{ role: "user", content: prompt }],
      });
      
      const responseText = completion.choices[0].message.content || "{}";
      return JSON.parse(responseText);
    } catch (err: any) {
      console.error(`[OpenRouter Error] ${err.message}`);
      return { error: err.message };
    }
  }
}

export const queueService = new QueueService();

