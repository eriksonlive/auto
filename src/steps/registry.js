import { runGoto } from "./goto.js";
import { runWait } from "./wait.js";
import { runScreenshot } from "./screenshot.js";
import { runExtract } from "./extract.js";
import { runAct } from "./act.js";
import { runDebugDom } from "./debugDom.js";
import { runWaitForSelector } from "./waitForSelector.js";
import { runFill } from "./fill.js";
import { runClick } from "./click.js";
import { runSelect } from "./select.js";
import { runWaitForOptions } from "./waitForOptions.js";
import { runGetFrameUrl } from "./getFrameUrl.js";
import { runGotoFromOutput } from "./gotoFromOutput.js";
import { runDebugFrames } from "./debugFrames.js";
// opcionales
import { runClickLocator } from "./clickLocator.js";
import { runFillLocator } from "./fillLocator.js";
import { runMenuClickAnyFrame } from './menuClickAnyFrame.js';
import { runMenuPathAnyFrame } from './menuPathAnyFrame.js';
import { runGotoMedicosInMainFrame } from './gotoMedicosInMainFrame.js';
import { runScreenshotSelector } from './screenshotSelector.js';
import { runGotoMenuRouteFromMainUrl } from './gotoMenuRouteFromMainUrl.js';
import { runClickButtonInRow } from './clickButtonInRow.js';
import { runClickLinkInRow } from './clickLinkInRow.js';
import { runSelectAutocompleteOption } from "./selectAutocompleteOption.js";
import { runSelectMuiOptionByText } from "./selectMuiOptionByText.js";
import { clickText } from "./clickText.js";
import { runTypeAndPress } from "./typeAndPress.js";
import { runPressKeys } from "./pressKeys.js";
import { runSelectDownshiftOption } from "./selectDownshiftOption.js";
import { runClickBelowSelector } from "./clickBelowSelector.js";
import { runSelectDownshiftMenuOption } from "./selectDownshiftMenuOption.js";
import { runDrawOnCanvas } from "./drawOnCanvas.js";
import { runSelectAutocompleteFirstOption } from "./selectAutocompleteFirstOption.js";
import { runToggleAllSwitches } from "./toggleAllSwitches.js";
import { runSelectAutocompleteFirstOptionByLabel } from "./selectAutocompleteFirstOptionByLabel.js";

const handlers = {
  goto: runGoto,
  wait: runWait,
  screenshot: runScreenshot,
  extract: runExtract,
  act: runAct,
  debugDom: runDebugDom,
  waitForSelector: runWaitForSelector,
  fill: runFill,
  click: runClick,
  selectAutocompleteOption: runSelectAutocompleteOption,
  select: runSelect,
  waitForOptions: runWaitForOptions,
  getFrameUrl: runGetFrameUrl,
  gotoFromOutput: runGotoFromOutput,
  debugFrames: runDebugFrames,
  clickLocator: runClickLocator,
  fillLocator: runFillLocator,
  menuClickAnyFrame: runMenuClickAnyFrame,
  menuPathAnyFrame: runMenuPathAnyFrame,
  gotoMedicosInMainFrame: runGotoMedicosInMainFrame,
  screenshotSelector: runScreenshotSelector,
  gotoMenuRouteFromMainUrl: runGotoMenuRouteFromMainUrl,
  clickButtonInRow: runClickButtonInRow,
  clickLinkInRow: runClickLinkInRow,
  selectMuiOptionByText: runSelectMuiOptionByText,
  clickText: clickText,
  typeAndPress: runTypeAndPress,
  pressKeys: runPressKeys,
  selectDownshiftOption: runSelectDownshiftOption,
  clickBelowSelector: runClickBelowSelector,
  selectDownshiftMenuOption: runSelectDownshiftMenuOption,
  drawOnCanvas: runDrawOnCanvas,
  selectAutocompleteFirstOption: runSelectAutocompleteFirstOption,
  toggleAllSwitches: runToggleAllSwitches,
  selectAutocompleteFirstOptionByLabel: runSelectAutocompleteFirstOptionByLabel,
};

export async function executeStep(step, ctx, i) {
  const handler = handlers[step.type];
  if (!handler) {
    throw new Error(`Step type no soportado: ${step.type}`);
  }

  return await handler(step, ctx, i);
}