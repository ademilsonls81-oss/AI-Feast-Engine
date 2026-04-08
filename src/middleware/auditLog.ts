import { createClient } from "@supabase/supabase-js";
import { Request } from "express";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Utility to log administrative actions to the audit_logs table.
 */
export async function logAuditAction(userId: string, action: string, req: Request, details: any = {}) {
  try {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString();
    const userAgent = (req.headers["user-agent"] || "").toString();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action: action,
      ip: ip,
      user_agent: userAgent,
      details: details
    });

    if (error) {
      console.error(`❌ Audit Log Error: ${error.message}`);
    } else {
      console.log(`📝 Audit: ${action} by user ${userId}`);
    }
  } catch (err) {
    console.error("❌ Fatal error in audit logger:", err);
  }
}
