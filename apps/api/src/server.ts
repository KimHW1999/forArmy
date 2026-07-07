import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { warmCsvCache } from "./modules/cache/cache.repository";
import { mmaRouter } from "./modules/mma/mma.routes";
import { recommendationRouter } from "./modules/recommendations/recommendation.routes";
import { recruitmentRouter } from "./modules/recruitment/recruitment.routes";
import { specialtyRouter } from "./modules/specialties/specialty.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "military-application-guide-api"
  });
});

app.use("/api/mma", mmaRouter);
app.use("/api/specialties", specialtyRouter);
app.use("/api/recruitment", recruitmentRouter);
app.use("/api/recommendations", recommendationRouter);

const webDistDir = process.env.WEB_DIST_DIR ?? resolve(getProjectRoot(), "apps/web/dist");

if (existsSync(webDistDir)) {
  app.use(express.static(webDistDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(resolve(webDistDir, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});

function getProjectRoot() {
  const cwd = process.cwd().replaceAll("\\", "/");
  return cwd.endsWith("/apps/api") ? resolve(process.cwd(), "../..") : process.cwd();
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    res.status(statusCode).json({
      message
    });
  }
);

app.listen(env.port, env.host, () => {
  console.log(`API server listening on http://${env.host}:${env.port}`);
});

warmCsvCache()
  .then(() => {
    console.log("CSV cache warmed");
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown CSV cache warm error";
    console.warn(`CSV cache warm skipped: ${message}`);
  });
