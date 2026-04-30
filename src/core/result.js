// src/core/result.js
export function createInitialResult({ name, url }) {
  return {
    meta: {
      name,
      url,
      startedAt: new Date().toISOString(),
      status: "running",
    },
    outputs: {},
    steps: [],
  };
}

export function finalizeResult(result) {
  result.meta.status = result.steps.some((s) => s.ok === false)
    ? "failed"
    : "passed";

  result.meta.finishedAt = new Date().toISOString();
}