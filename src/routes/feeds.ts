import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    res.json({ feeds: [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch feeds" });
  }
});

export default router;