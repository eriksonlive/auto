export function normalizeCase(testCase) {
  const next = structuredClone(testCase);

  next.steps = next.steps.map((step) => {
    switch (step.type) {
      case "goto":
        return {
          waitUntil: "load",
          timeoutMs: 60000,
          ...step
        };

      case "waitForSelector":
      case "fill":
      case "click":
      case "clickText":
      case "clickButtonByText":
      case "select":
      case "screenshotSelector":
      case "debugDom":
        return {
          timeoutMs: 30000,
          ...step
        };

      case "getFrameUrl":
        return {
          timeoutMs: 45000,
          ...step
        };

      case "gotoFromOutput":
        return {
          waitUntil: "load",
          timeoutMs: 60000,
          ...step
        };

      case "gotoMenuRouteFromMainUrl":
        return {
          waitUntil: "domcontentloaded",
          timeoutMs: 60000,
          waitMs: 2500,
          ...step
        };

      case "selectAutocompleteOption":
        return {
          optionSelector: "body .MuiAutocomplete-popper [role='option']",
          match: "includes",
          timeoutMs: 30000,
          waitMs: 1200,
          ...step
        };

      case "drawOnCanvas":
        return {
          timeoutMs: 30000,
          ...step
        };

      default:
        return step;
    }
  });

  return next;
}