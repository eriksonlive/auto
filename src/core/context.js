// src/core/context.js
import { doScreenshot, doWait } from '../lib/actions.js';
import { debugDom } from '../dom/debug.js';
import {
  waitForSelectorAny,
  fillAny,
  clickAny,
  selectAny,
  waitForOptionsAny,
} from '../dom/selectors.js';
import { normalizeFrameTarget, getFrameDocUrl } from '../dom/frame-chain.js';
import { captureStepScreenshot } from '../lib/step-screenshot.js';

export function createRunContext({
  test,
  page,
  stagehand,
  outDir,
  logs,
  result,
  baseUrl,
}) {
  return {
    test,
    page,
    stagehand,
    outDir,
    logs,
    result,
    baseUrl,

    state: {
      lastWaitForOptionsSelector: null,
    },

    helpers: {
      doScreenshot: (step) => doScreenshot({ page, outDir, step }),
      doWait: (step) => doWait({ step }),
      debugDom: (saveAs = 'debug') => debugDom({ page, result, saveAs }),

      captureStepScreenshot: ({ index, type, phase }) =>
        captureStepScreenshot({
          page,
          outDir,
          index,
          type,
          phase,
        }),

      waitForSelectorAny: (step, selector, options) =>
        waitForSelectorAny(page, step, selector, options),

      fillAny: (step, selector, value) => fillAny(page, step, selector, value),

      clickAny: (step, selector) => clickAny(page, step, selector),

      selectAny: (step, selector, choice, options) =>
        selectAny(page, step, selector, choice, options),

      waitForOptionsAny: (step, selector, options) =>
        waitForOptionsAny(page, step, selector, options),

      getFrameUrl: async (step) => {
        const target = normalizeFrameTarget(step);

        const isUsableUrl = (value) => {
          const url = String(value || '').trim();
          if (!url) return false;
          if (url === 'about:blank') return false;

          try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        };

        if (target.frameName) {
          const frames = await page.frames();

          for (const frame of frames) {
            let name = null;
            let url = null;

            try {
              name =
                typeof frame.name === 'function' ? frame.name() : frame.name;
            } catch {}

            try {
              url = typeof frame.url === 'function' ? frame.url() : frame.url;
            } catch {}

            if (name === target.frameName && isUsableUrl(url)) {
              return url;
            }
          }
        }

        if (target.kind === 'none') {
          const currentUrl = await page.url();
          return isUsableUrl(currentUrl) ? currentUrl : null;
        }

        const nestedUrl = await getFrameDocUrl(
          page,
          target.chain,
          target.frameName,
        );
        return isUsableUrl(nestedUrl) ? nestedUrl : null;
      },
    },
  };
}
