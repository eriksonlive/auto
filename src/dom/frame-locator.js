// src/dom/frame-locator.js

export function getFrameChain(step) {
  return Array.isArray(step.frameChain) && step.frameChain.length
    ? step.frameChain
    : step.frame
    ? [step.frame]
    : [];
}

export function buildFrameLocator(page, step) {
  const chain = getFrameChain(step);

  if (!chain.length) return page;

  let current = page.frameLocator(chain[0]);

  for (let i = 1; i < chain.length; i++) {
    current = current.frameLocator(chain[i]);
  }

  return current;
}

export function buildDeepSelector(step, selector) {
  const chain = getFrameChain(step);

  if (!chain.length) return selector;

  return [...chain, selector].join(" >> ");
}