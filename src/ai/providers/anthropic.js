export async function callAnthropic({ model, system, user }) {
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 4000,
      messages: [
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.map(c => c.text || "").join("\n") || "";

  return {
    text,
    provider: "anthropic",
    model,
    usage: data.usage || null,
    raw: data
  };
}