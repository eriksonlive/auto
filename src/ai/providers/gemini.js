export async function callGemini({ model, system, user }) {
  const url = `${process.env.GEMINI_BASE_URL}/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${system}\n\n${user}` }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "";

  return {
    text,
    provider: "gemini",
    model,
    usage: data.usageMetadata || null,
    raw: data
  };
}