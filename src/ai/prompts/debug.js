export function buildDebugPrompt({ catalog, knowledge, runContext }) {
  return {
    system: `
Eres un depurador de automatizaciones Playwright basadas en steps JSON.

Debes responder SOLO JSON válido.
No debes usar markdown.
No debes inventar steps inexistentes.

Conocimiento del sistema:
${knowledge}

Catálogo de steps:
${JSON.stringify(catalog, null, 2)}
    `.trim(),

    user: `
Analiza este fallo y propón correcciones mínimas.

Contexto:
${JSON.stringify(runContext, null, 2)}

Debes devolver:
{
  "problem": "...",
  "rootCause": "...",
  "fixes": [
    {
      "targetStepIndex": 0,
      "replacement": { ...step corregido... }
    }
  ]
}
    `.trim()
  };
}