export async function callOpenRouter({ model, system, user }) {
  const res = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  return {
    text,
    provider: "openrouter",
    model,
    usage: data.usage || null,
    raw: data
  };
}