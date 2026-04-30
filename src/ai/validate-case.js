import { TestCaseSchema, DebugResponseSchema } from "./schema.js";

export function validateCaseOrThrow(data) {
  const result = TestCaseSchema.safeParse(data);

  if (!result.success) {
    console.error("\n===== ERROR DE VALIDACION =====\n");
    console.error(JSON.stringify(result.error.format(), null, 2));

    if (data?.steps && Array.isArray(data.steps)) {
      console.error("\n===== TYPES RECIBIDOS =====\n");
      console.error(data.steps.map((s, i) => ({
        index: i,
        type: s?.type
      })));
    }

    throw new Error("El caso generado por IA no cumple el schema");
  }

  return result.data;
}

export function validateDebugResponseOrThrow(data) {
  const result = DebugResponseSchema.safeParse(data);

  if (!result.success) {
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error("La respuesta de debug no cumple el schema");
  }

  return result.data;
}