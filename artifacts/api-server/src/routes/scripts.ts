import { Router, type IRouter } from "express";
import { getAvailableScripts, getScriptById } from "@workspace/scripts-data";

const router: IRouter = Router();

router.get("/scripts", (_req, res): void => {
  res.json({ scripts: getAvailableScripts() });
});

router.get("/scripts/:id", (req, res): void => {
  const { id } = req.params;
  const result = getScriptById(id);
  if (!result) {
    res.status(404).json({ error: "Script not found" });
    return;
  }
  res.json({ meta: result.meta, content: result.content });
});

export default router;
