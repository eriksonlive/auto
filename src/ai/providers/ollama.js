export async function callOllama({ model, system, user }) {
  const res = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt: `${system}\n\n${user}`,
      stream: false
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  return {
    text: data.response || "",
    provider: "ollama",
    model,
    usage: null,
    raw: data
  };
}