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
  port: Number(process.env.API_PORT ?? 4000),
  mmaServiceKey: process.env.MMA_SERVICE_KEY ?? ""
};

export function assertEnv() {
  if (!env.mmaServiceKey) {
    throw new Error("MMA_SERVICE_KEY is required");
  }
}
