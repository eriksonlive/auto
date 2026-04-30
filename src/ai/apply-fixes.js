export function applyFixesToCase(testCase, debugResponse) {
  const next = structuredClone(testCase);

  for (const fix of debugResponse.fixes) {
    if (
      typeof fix.targetStepIndex !== "number" ||
      fix.targetStepIndex < 0 ||
      fix.targetStepIndex >= next.steps.length
    ) {
      continue;
    }

    next.steps[fix.targetStepIndex] = fix.replacement;
  }

  return next;
}