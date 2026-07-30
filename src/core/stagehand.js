// src/core/stagehand.js
import { Stagehand } from "@browserbasehq/stagehand";
import { requiredEnv } from "./env.js";

export function createStagehand(test) {
  return new Stagehand({
    env: "LOCAL",
    headless: test.stagehand?.headless ?? true,
    model: test.stagehand?.model ?? "google/gemini-2.5-flash-lite",
    modelApiKey: test.stagehand?.modelApiKey ?? requiredEnv("MODEL_API_KEY"),
    localBrowserLaunchOptions: {
      headless: test.stagehand?.headless ?? true,
      args: [
        "--no-sandbox",
        "--ignore-certificate-errors",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });
}