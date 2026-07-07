import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];

for (const path of envFiles) {
  if (existsSync(path)) {
    config({ path, override: false });
  }
}

export const env = {
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  mmaServiceKey: process.env.MMA_SERVICE_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.2"
};

export function assertEnv() {
  if (!env.mmaServiceKey) {
    throw new Error("MMA_SERVICE_KEY is required");
  }
}
