import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.get("/lmstudio/config", async (req: Request, res: Response): Promise<void> => {
  const url = process.env.LM_STUDIO_URL ?? null;
  res.json({ url });
});

router.post("/lmstudio/probe", async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url) { res.status(400).json({ error: "URL is required" }); return; }

  let base = url.trim().replace(/\/$/, "");
  if (!base.endsWith("/v1")) base = `${base}/v1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${base}/models`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({ error: `LM Studio returned ${response.status}` });
      return;
    }

    const data = await response.json() as { data?: { id: string }[] };
    const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
    res.json({ models, baseUrl: base });
  } catch (err: any) {
    if (err.name === "AbortError") {
      res.status(504).json({ error: "Connection timed out. Check the URL and make sure LM Studio is running." });
    } else {
      res.status(502).json({ error: "Could not reach LM Studio. Check the URL and try again." });
    }
  }
});

export default router;
