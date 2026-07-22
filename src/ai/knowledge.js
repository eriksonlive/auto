import { readFileSync } from 'fs';

// Conocimiento por defecto para SGM Salud.
// Para otros sitios, usar KNOWLEDGE_CONTEXT (string) o KNOWLEDGE_FILE (ruta a archivo .md/.txt) en .env.
export const APP_KNOWLEDGE = `
La aplicación objetivo es SGM Salud.

Reglas importantes:
- El login vive dentro de #iframeLogin.
- Después del login se obtiene mainUrl con getFrameUrl usando frameName=main_window.
- Los MUI Autocomplete renderizan opciones fuera del formulario, normalmente en body .MuiAutocomplete-popper.
- Las pestañas "2 Datos adicionales" y "3 Servicios / Facturación" aparecen después de hacer submit en la pestaña 1.
- Los formularios suelen usar name estables como patient[...], additionalData[...] y header[...].
- Para inputs normales se debe usar fill.
- Para MUI autocomplete se debe usar selectAutocompleteOption.
- Los modales de foto y firma se renderizan a nivel del body.
- El modal de foto tiene un flujo CAPTURE -> SAVE.
- La firma se dibuja en canvas dentro de un modal.
- Siempre preferir selectores por name, role, data-testid o estructura estable.
- No inventar steps que no existan.
- Para selects HTML nativos, si se proporciona contexto DOM con options, usar siempre text o value reales tomados de ese contexto.
- Nunca generar select con value vacio.
- Si necesitas navegar después del login legacy, usa getFrameUrl y luego gotoFromOutput.
`.trim();

/**
 * Returns the knowledge base to inject into AI prompts.
 * Priority: KNOWLEDGE_CONTEXT env var > KNOWLEDGE_FILE path > default SGM Salud.
 */
export function getKnowledge() {
  if (process.env.KNOWLEDGE_CONTEXT) {
    return process.env.KNOWLEDGE_CONTEXT.trim();
  }
  if (process.env.KNOWLEDGE_FILE) {
    return readFileSync(process.env.KNOWLEDGE_FILE, 'utf8').trim();
  }
  return APP_KNOWLEDGE;
}
