export const STEP_CATALOG = [
  // ── Navegación ──────────────────────────────────────────────────────────────
  {
    type: "goto",
    required: ["type"],
    optional: ["waitUntil", "timeoutMs"],
    description: "Abre la URL inicial del caso. waitUntil: 'load' | 'domcontentloaded' | 'networkidle'."
  },
  {
    type: "gotoFromOutput",
    required: ["type", "key"],
    optional: ["waitUntil", "timeoutMs"],
    description: "Navega a una URL guardada previamente con saveAs. key = nombre guardado."
  },
  {
    type: "gotoMenuRouteFromMainUrl",
    required: ["type", "fromKey", "action", "level"],
    optional: ["timeoutMs"],
    description: "Construye URL de menú legacy concatenando parámetros a mainUrl. fromKey = clave del output con la URL base."
  },

  // ── Esperas ──────────────────────────────────────────────────────────────────
  {
    type: "wait",
    required: ["type", "ms"],
    description: "Pausa fija. ms = milisegundos."
  },
  {
    type: "waitForSelector",
    required: ["type", "selector"],
    optional: ["frame", "state", "timeoutMs"],
    description: "Espera a que un selector aparezca. state: 'visible' | 'attached' | 'hidden'. frame = selector CSS del iframe."
  },
  {
    type: "waitForOptions",
    required: ["type", "selector"],
    optional: ["frame", "minOptions", "timeoutMs"],
    description: "Espera a que un select HTML tenga opciones cargadas. minOptions = mínimo de opciones esperadas (default 1)."
  },

  // ── Click ─────────────────────────────────────────────────────────────────────
  {
    type: "click",
    required: ["type", "selector"],
    optional: ["frame", "timeoutMs"],
    description: "Click en un selector CSS. frame = selector CSS del iframe contenedor."
  },
  {
    type: "clickText",
    required: ["type", "text"],
    optional: ["timeoutMs"],
    description: "Click en el primer elemento visible que contenga el texto dado."
  },
  {
    type: "clickButtonByText",
    required: ["type", "text"],
    optional: ["timeoutMs"],
    description: "Click en un botón (button/input[type=submit]) buscando por texto exacto o parcial."
  },
  {
    type: "clickLocator",
    required: ["type", "locator"],
    optional: ["timeoutMs"],
    description: "Click usando un locator Playwright (ej: 'text=Guardar', 'role=button[name=OK]')."
  },
  {
    type: "clickFrame",
    required: ["type", "frame", "selector"],
    optional: ["timeoutMs"],
    description: "Click en un selector dentro de un iframe. frame = selector CSS del iframe."
  },
  {
    type: "clickBelowSelector",
    required: ["type", "aboveSelector", "belowText"],
    optional: ["timeoutMs"],
    description: "Click en un elemento justo debajo de otro, identificado por texto. Útil para tablas sin IDs estables."
  },
  {
    type: "clickButtonInRow",
    required: ["type", "rowText", "buttonText"],
    optional: ["frame", "timeoutMs"],
    description: "Click en un botón dentro de la fila de tabla que contenga rowText."
  },
  {
    type: "clickLinkInRow",
    required: ["type", "rowText", "linkText"],
    optional: ["frame", "timeoutMs"],
    description: "Click en un enlace dentro de la fila de tabla que contenga rowText."
  },

  // ── Escritura / inputs ────────────────────────────────────────────────────────
  {
    type: "fill",
    required: ["type", "selector", "value"],
    optional: ["frame", "timeoutMs"],
    description: "Llena un input o textarea. value = texto a escribir. frame = selector CSS del iframe."
  },
  {
    type: "fillLocator",
    required: ["type", "locator", "value"],
    optional: ["timeoutMs"],
    description: "Llena un campo usando un locator Playwright."
  },
  {
    type: "fillFrame",
    required: ["type", "frame", "selector", "value"],
    optional: ["timeoutMs"],
    description: "Llena un campo dentro de un iframe. frame = selector CSS del iframe."
  },
  {
    type: "typeAndPress",
    required: ["type", "selector", "value", "key"],
    optional: ["frame", "timeoutMs"],
    description: "Escribe texto y luego presiona una tecla (ej: key='Enter'). Útil para búsquedas."
  },
  {
    type: "pressKeys",
    required: ["type", "keys"],
    optional: ["selector", "timeoutMs"],
    description: "Presiona una combinación de teclas (ej: keys='Tab', 'Escape', 'Control+a'). selector = enfocar antes de presionar."
  },

  // ── Select / combos ──────────────────────────────────────────────────────────
  {
    type: "select",
    required: ["type", "selector"],
    optional: ["value", "text", "frame", "timeoutMs"],
    description: "Selecciona una opción en un <select> HTML nativo. Usa value o text (el texto visible de la opción)."
  },
  {
    type: "selectNth",
    required: ["type", "selector", "index"],
    optional: ["frame", "timeoutMs"],
    description: "Selecciona la opción N (0-based) de un <select> HTML nativo."
  },
  {
    type: "selectAutocompleteOption",
    required: ["type", "inputSelector", "searchText", "optionText"],
    optional: ["frame", "timeoutMs"],
    description: "Selecciona opción en MUI/React Autocomplete. Escribe searchText, espera el dropdown y elige optionText."
  },
  {
    type: "selectAutocompleteFirstOption",
    required: ["type", "inputSelector", "searchText"],
    optional: ["frame", "timeoutMs"],
    description: "Como selectAutocompleteOption pero selecciona automáticamente la primera opción del dropdown."
  },
  {
    type: "selectAutocompleteFirstOptionByLabel",
    required: ["type", "label", "searchText"],
    optional: ["timeoutMs"],
    description: "Localiza un Autocomplete MUI por su label y selecciona la primera opción tras buscar searchText."
  },
  {
    type: "selectMuiOptionByText",
    required: ["type", "text"],
    optional: ["timeoutMs"],
    description: "Selecciona una opción en el popper MUI (.MuiAutocomplete-popper) buscando por texto exacto."
  },
  {
    type: "selectDownshiftOption",
    required: ["type", "inputSelector", "searchText", "optionText"],
    optional: ["timeoutMs"],
    description: "Selecciona opción en componentes Downshift (dropdown controlado por aria-activedescendant)."
  },
  {
    type: "selectDownshiftMenuOption",
    required: ["type", "menuSelector", "optionText"],
    optional: ["timeoutMs"],
    description: "Selecciona opción de un menú Downshift ya abierto, por su texto."
  },

  // ── Iframes ──────────────────────────────────────────────────────────────────
  {
    type: "getFrameUrl",
    required: ["type", "frame", "frameName", "saveAs"],
    optional: ["timeoutMs"],
    description: "Obtiene la URL del documento dentro de un iframe y la guarda. frameName = nombre del frame (frame.name()). saveAs = clave para usar en gotoFromOutput."
  },
  {
    type: "findFormFrame",
    required: ["type"],
    optional: ["formSelector", "saveAs", "timeoutMs"],
    description: "Busca en todos los frames cuál contiene un formulario y guarda su índice."
  },
  {
    type: "menuClickAnyFrame",
    required: ["type", "selector"],
    optional: ["timeoutMs"],
    description: "Busca y hace click en un selector buscando en todos los frames disponibles."
  },
  {
    type: "menuPathAnyFrame",
    required: ["type", "path"],
    optional: ["timeoutMs"],
    description: "Navega por un menú jerárquico (array de textos) buscando en todos los frames. path = ['Módulo', 'Submenú']."
  },

  // ── Descargas ────────────────────────────────────────────────────────────────
  {
    type: "clickAndDownload",
    required: ["type", "selector"],
    optional: ["frame", "saveAs", "timeoutMs"],
    description: "Click nativo con intercepción del evento download del browser. Ideal para PDFs, certificados y cualquier archivo con Content-Disposition: attachment. frame = selector CSS del iframe. saveAs = nombre del archivo en evidence/."
  },
  {
    type: "clickFrameAndDownload",
    required: ["type", "frameIndex"],
    optional: ["selector", "linkText", "saveAs", "timeoutMs"],
    description: "Intercepta descarga disparada por click dentro de un frame usando page.route(). frameIndex = índice numérico del frame. Alternativa cuando clickAndDownload no funciona."
  },
  {
    type: "httpDownload",
    required: ["type", "url"],
    optional: ["method", "params", "saveAs", "timeoutMs"],
    description: "Descarga directa GET/POST usando las cookies de sesión del browser. url = URL completa. params = query params o body POST. saveAs = nombre del archivo."
  },
  {
    type: "submitFormDownload",
    required: ["type", "frameIndex"],
    optional: ["formSelector", "extraFields", "saveAs", "timeoutMs"],
    description: "Lee un formulario del frame, lo envía vía HTTP con las cookies del browser y guarda la respuesta. extraFields = campos a sobreescribir."
  },

  // ── Extracción AI ────────────────────────────────────────────────────────────
  {
    type: "extract",
    required: ["type", "prompt"],
    optional: ["saveAs", "timeoutMs"],
    description: "Extrae información de la página usando AI (Stagehand). prompt = qué extraer en lenguaje natural. saveAs = clave donde guardar el resultado."
  },
  {
    type: "act",
    required: ["type", "prompt"],
    optional: ["timeoutMs"],
    description: "Ejecuta una acción en la página usando AI (Stagehand). prompt = qué hacer en lenguaje natural. Usar solo cuando no hay selector disponible."
  },

  // ── Evidencia / debug ────────────────────────────────────────────────────────
  {
    type: "screenshot",
    required: ["type"],
    optional: ["name"],
    description: "Captura screenshot de la página. name = nombre de archivo en evidence/screenshots/."
  },
  {
    type: "screenshotSelector",
    required: ["type", "selector", "name"],
    optional: ["frame", "timeoutMs"],
    description: "Captura screenshot de un elemento específico. name = nombre del archivo."
  },
  {
    type: "debugDom",
    required: ["type"],
    optional: ["selector", "name"],
    description: "Guarda el HTML del DOM (o de un selector) para depuración. name = nombre del archivo en evidence/html/."
  },
  {
    type: "debugFrames",
    required: ["type"],
    description: "Imprime información de todos los frames activos en los logs. Útil para diagnosticar estructuras de iframes."
  },

  // ── Estado / sesión ───────────────────────────────────────────────────────────
  {
    type: "loadStorage",
    required: ["type", "path"],
    optional: [],
    description: "Carga cookies y storage de sesión desde un archivo JSON. path = ruta al archivo de sesión."
  },
  {
    type: "toggleAllSwitches",
    required: ["type"],
    optional: ["selector", "value", "timeoutMs"],
    description: "Activa o desactiva todos los switches/checkboxes que coincidan con selector. value = true | false."
  },
  {
    type: "drawOnCanvas",
    required: ["type"],
    optional: ["selector", "timeoutMs"],
    description: "Dibuja un trazo sobre un canvas. Usado para captura de firma en modales."
  }
];
