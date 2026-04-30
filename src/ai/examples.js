export const EXAMPLES = [
  {
    input: "Ir al login, autenticarse y seleccionar sede y posición",
    output: {
      name: "Login y selección de sede",
      url: "https://sistemasintegrales.sgmsalud.com.co/",
      steps: [
        {
          type: "goto",
          waitUntil: "load",
          timeoutMs: 60000
        },
        {
          type: "waitForSelector",
          selector: "#password",
          frame: "#iframeLogin",
          timeoutMs: 30000
        },
        {
          type: "fill",
          selector: "#username",
          value: "frente",
          frame: "#iframeLogin",
          timeoutMs: 30000
        },
        {
          type: "fill",
          selector: "#password",
          value: "TecINsgm2026*",
          frame: "#iframeLogin",
          timeoutMs: 30000
        },
        {
          type: "click",
          selector: "button.btn-login",
          frame: "#iframeLogin",
          timeoutMs: 30000
        }
      ]
    }
  },
  {
    input: "Seleccionar cliente en un MUI autocomplete",
    output: {
      name: "Seleccionar cliente",
      steps: [
        {
          type: "selectAutocompleteOption",
          inputSelector: "div[role='combobox'][name='header[customer]'] input",
          searchText: "prueba",
          optionText: "SGM001 - EMPRESA PRUEBAS SGM",
          optionSelector: "body .MuiAutocomplete-popper [role='option']",
          match: "includes",
          timeoutMs: 30000,
          waitMs: 1200
        }
      ]
    }
  }
];