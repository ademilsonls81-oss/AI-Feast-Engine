import { supabase } from "../lib/supabaseClient.js";
import Parser from "rss-parser";

const parser = new Parser({ customFields: { item: [["content:encoded", "contentEncoded"]] } });

export interface ParseResult {
  posts: any[];
  success: boolean;
  latencyMs: number;
  error?: string;
  itemsCount: number;
}

export async function parseFeed(feed: any, itemsLimit: number): Promise<ParseResult> {
  const startTime = Date.now();
  try {
    const feedData = await parser.parseURL(feed.url);
    const latencyMs = Date.now() - startTime;
    const posts = (feedData.items.slice(0, itemsLimit) || []).map(item => ({
      title: item.title,
      link: item.link,
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      content_raw: (item as any).contentEncoded || item.content || item.contentSnippet || "",
      source_id: feed.id,
      category: feed.category || "General",
      status: "pending"
    }));
    return { posts, success: true, latencyMs, itemsCount: posts.length };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.message || "Parse failed";
    
    // Log error to system_errors table
    try {
      await supabase.from("system_errors").insert({
        error_type: "RSS_PARSE_ERROR",
        source: `feed:${feed.id}`,
        message: errorMsg,
        severity: "warning",
        endpoint: feed.url,
        retry_count: 0,
        resolved: false,
        metadata: { feed_name: feed.name, url: feed.url }
      });
    } catch (logErr) {
      console.error(`Failed to log RSS error: ${logErr}`);
    }
    
    return { posts: [], success: false, latencyMs, error: errorMsg, itemsCount: 0 };
  }
}

async function updateFeedHealth(feedId: string, result: ParseResult): Promise<void> {
  try {
    const healthData: any = {
      feed_id: feedId,
      last_latency_ms: result.latencyMs,
      last_status: result.success ? "success" : "error",
      last_error: result.error,
      last_success_at: result.success ? new Date().toISOString() : null,
      last_checked_at: new Date().toISOString(),
      items_fetched: result.itemsCount,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase.from("feed_health").select("*").eq("feed_id", feedId).single();

    if (existing) {
      const newSuccessCount = result.success ? existing.success_count + 1 : existing.success_count;
      const newErrorCount = result.success ? existing.error_count : existing.error_count + 1;
      const newTotalLatency = existing.total_latency_ms + result.latencyMs;
      const newConsecutiveErrors = result.success ? 0 : existing.consecutive_errors + 1;
      const avgLatency = Math.round(newTotalLatency / (newSuccessCount + newErrorCount));
      const successRate = newSuccessCount / (newSuccessCount + newErrorCount || 1);

      healthData.success_count = newSuccessCount;
      healthData.error_count = newErrorCount;
      healthData.total_latency_ms = newTotalLatency;
      healthData.avg_latency_ms = avgLatency;
      healthData.consecutive_errors = newConsecutiveErrors;
      healthData.health_score = Math.min(100, Math.round(successRate * 75 + (avgLatency < 5000 ? 25 : 10)));
    } else {
      healthData.success_count = result.success ? 1 : 0;
      healthData.error_count = result.success ? 0 : 1;
      healthData.total_latency_ms = result.latencyMs;
      healthData.avg_latency_ms = result.latencyMs;
      healthData.consecutive_errors = result.success ? 0 : 1;
      healthData.health_score = result.success ? 75 : 25;
    }
    await supabase.from("feed_health").upsert(healthData);
  } catch (err) {
    console.error("Health update error:", err);
  }
}

export async function runIngestion(): Promise<number> {
  console.log(">>> [IngestionService] Starting RSS scan...");
  const [{ data: feeds }, { data: existingPosts }] = await Promise.all([
    supabase.from("feeds").select("*"),
    supabase.from("posts").select("link")
  ]);

  if (!feeds) return 0;
  const existingLinks = new Set((existingPosts || []).map(p => p.link));
  let totalInserted = 0;

  for (const feed of feeds) {
    const result = await parseFeed(feed, 10);
    await updateFeedHealth(feed.id, result);

    const newPosts = result.posts.filter(p => !existingLinks.has(p.link));
    if (newPosts.length > 0) {
      const { error } = await supabase.from("posts").insert(newPosts);
      if (!error) totalInserted += newPosts.length;
    }
  }

  console.log(`>>> [IngestionService] Finished. Inserted ${totalInserted} new items.`);
  return totalInserted;
}
