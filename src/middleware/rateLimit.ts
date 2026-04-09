import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function getIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() 
    || (req.headers["x-real-ip"] as string)
    || "unknown";
}

export const globalIpLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT) || 100,
  message: { 
    error: "Too many requests from this IP",
    code: 429 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIp(req as any),
});

export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  keyGenerator: (req) => {
    const apiKey = (req.header("X-API-Key") || (req.query as any).key) as string;
    if (apiKey) return apiKey;
    return getIp(req as any);
  },
  max: async (req) => {
    const apiKey = (req.header("X-API-Key") || (req.query as any).key) as string;
    if (!apiKey) return 10;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("rate_limit")
        .eq("api_key", apiKey as string)
        .single();
      
      if (error || !data) return 10;
      return data.rate_limit;
    } catch {
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
