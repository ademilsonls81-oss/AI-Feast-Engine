import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabaseClient";

export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — Bearer token required" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { data: userData } = await supabase
      .from("users").select("role").eq("id", user.id).single();

    if (userData?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    (req as any).user = { id: user.id };
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication failed" });
  }
}
