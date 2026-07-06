import cors from "cors";
import express from "express";
import { assertEnv, env } from "./config/env";
import { mmaRouter } from "./modules/mma/mma.routes";
import { recommendationRouter } from "./modules/recommendations/recommendation.routes";
import { recruitmentRouter } from "./modules/recruitment/recruitment.routes";
import { specialtyRouter } from "./modules/specialties/specialty.routes";

assertEnv();

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

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const message = error instanceof Error ? error.message : "Unknown server error";

    res.status(500).json({
      message
    });
  }
);

app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`);
});
