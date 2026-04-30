import { z } from 'zod';

const GotoStepSchema = z.object({
  type: z.literal('goto'),
  waitUntil: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const WaitForSelectorStepSchema = z.object({
  type: z.literal('waitForSelector'),
  selector: z.string(),
  frame: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const FillStepSchema = z.object({
  type: z.literal('fill'),
  selector: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  frame: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const ClickStepSchema = z.object({
  type: z.literal('click'),
  selector: z.string(),
  frame: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const ClickTextStepSchema = z.object({
  type: z.literal('clickText'),
  text: z.string(),
  frame: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const ClickButtonByTextStepSchema = z.object({
  type: z.literal('clickButtonByText'),
  text: z.string(),
  frame: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const SelectStepSchema = z
  .object({
    type: z.literal('select'),
    selector: z.string(),
    text: z.string().optional(),
    value: z.string().optional(),
    frame: z.string().optional(),
    timeoutMs: z.number().optional(),
  })
  .refine((data) => !!data.text || !!data.value, {
    message: 'select requiere text o value',
  });

const WaitStepSchema = z.object({
  type: z.literal('wait'),
  ms: z.number(),
});

const GetFrameUrlStepSchema = z.object({
  type: z.literal('getFrameUrl'),
  frame: z.string(),
  frameName: z.string(),
  saveAs: z.string(),
  timeoutMs: z.number().optional(),
});

const GotoFromOutputStepSchema = z.object({
  type: z.literal('gotoFromOutput'),
  key: z.string(),
  waitUntil: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const GotoMenuRouteFromMainUrlStepSchema = z.object({
  type: z.literal('gotoMenuRouteFromMainUrl'),
  fromKey: z.string(),
  action: z.string(),
  level: z.string(),
  saveAs: z.string().optional(),
  waitUntil: z.string().optional(),
  timeoutMs: z.number().optional(),
  waitMs: z.number().optional(),
});

const SelectAutocompleteOptionStepSchema = z.object({
  type: z.literal('selectAutocompleteOption'),
  inputSelector: z.string(),
  searchText: z.string(),
  optionText: z.string(),
  optionSelector: z.string().optional(),
  match: z.enum(['exact', 'includes']).optional(),
  timeoutMs: z.number().optional(),
  waitMs: z.number().optional(),
});

const DrawOnCanvasStepSchema = z.object({
  type: z.literal('drawOnCanvas'),
  selector: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const ScreenshotSelectorStepSchema = z.object({
  type: z.literal('screenshotSelector'),
  selector: z.string(),
  name: z.string(),
  timeoutMs: z.number().optional(),
});

const DebugDomStepSchema = z.object({
  type: z.literal('debugDom'),
  selector: z.string(),
  name: z.string(),
  timeoutMs: z.number().optional(),
});

export const StepSchema = z.discriminatedUnion('type', [
  GotoStepSchema,
  WaitForSelectorStepSchema,
  FillStepSchema,
  ClickStepSchema,
  ClickTextStepSchema,
  ClickButtonByTextStepSchema,
  SelectStepSchema,
  WaitStepSchema,
  GetFrameUrlStepSchema,
  GotoFromOutputStepSchema,
  GotoMenuRouteFromMainUrlStepSchema,
  SelectAutocompleteOptionStepSchema,
  DrawOnCanvasStepSchema,
  ScreenshotSelectorStepSchema,
  DebugDomStepSchema,
]);

export const TestCaseSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1).optional(),
  assumptions: z.array(z.string()).optional(),
  steps: z.array(StepSchema).min(1),
});

export const DebugFixSchema = z.object({
  targetStepIndex: z.number().int().nonnegative(),
  replacement: StepSchema,
});

export const DebugResponseSchema = z.object({
  problem: z.string().min(1),
  rootCause: z.string().min(1),
  fixes: z.array(DebugFixSchema),
});
