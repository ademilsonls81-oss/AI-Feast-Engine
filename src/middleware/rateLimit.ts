import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase for middleware (Service Role to bypass RLS)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Global Rate Limit: 100 requests per minute per IP
 */
export const globalIpLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.GLOBAL_RATE_LIMIT) || 100,
  message: { 
    error: "Too many requests from this IP",
    code: 429 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API Key Rate Limit: Dynamic based on user plan
 * Free: 10 req/min
 * Pro: 100 req/min
 */
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    return (req.header("X-API-Key") || req.query.key || req.ip) as string;
  },
  max: async (req) => {
    const apiKey = req.header("X-API-Key") || req.query.key;
    if (!apiKey) return 10; // Default to free limit for identification

    try {
      const { data, error } = await supabase
        .from("users")
        .select("rate_limit")
        .eq("api_key", apiKey)
        .single();
      
      if (error || !data) return 10;
      return data.rate_limit;
    } catch (err) {
      return 10;
    }
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "API rate limit exceeded",
      message: "Upgrade to Pro for higher limits",
      code: 429
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
