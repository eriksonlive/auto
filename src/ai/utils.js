export function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("extractJson: el texto está vacío o no es string");
  }

  let cleaned = text.trim();

  // Quita ```json ... ```
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`extractJson: no encontré un objeto JSON válido en: ${text}`);
  }

  return cleaned.slice(start, end + 1);
}