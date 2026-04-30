export const STEP_CATALOG = [
  {
    type: "goto",
    required: ["type"],
    description: "Abre la URL inicial del caso."
  },
  {
    type: "waitForSelector",
    required: ["type", "selector"],
    description: "Espera a que un selector exista o sea visible."
  },
  {
    type: "fill",
    required: ["type", "selector", "value"],
    description: "Llena un input o textarea."
  },
  {
    type: "click",
    required: ["type", "selector"],
    description: "Hace click en un selector."
  },
  {
    type: "clickText",
    required: ["type", "text"],
    description: "Hace click en un elemento visible por texto."
  },
  {
    type: "select",
    required: ["type", "selector"],
    description: "Selecciona un valor en un select HTML nativo."
  },
  {
    type: "wait",
    required: ["type", "ms"],
    description: "Espera fija."
  },
  {
    type: "getFrameUrl",
    required: ["type", "frame", "frameName", "saveAs"],
    description: "Obtiene la URL de un iframe y la guarda."
  },
  {
    type: "gotoFromOutput",
    required: ["type", "key"],
    description: "Abre una URL guardada previamente."
  },
  {
    type: "gotoMenuRouteFromMainUrl",
    required: ["type", "fromKey", "action", "level"],
    description: "Navega a una ruta legacy desde mainUrl."
  },
  {
    type: "selectAutocompleteOption",
    required: ["type", "inputSelector", "searchText", "optionText"],
    description: "Selecciona una opción en MUI/React autocomplete."
  },
  {
    type: "clickButtonByText",
    required: ["type", "text"],
    description: "Busca un botón por texto y le hace click."
  },
  {
    type: "drawOnCanvas",
    required: ["type"],
    description: "Dibuja un garabato en un canvas, útil para firma."
  },
  {
    type: "screenshotSelector",
    required: ["type", "selector", "name"],
    description: "Toma evidencia visual."
  },
  {
    type: "debugDom",
    required: ["type", "selector", "name"],
    description: "Guarda HTML para depuración."
  }
];