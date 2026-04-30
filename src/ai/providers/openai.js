export async function callOpenAI({ model, system, user }) {
  const res = await fetch(`${process.env.OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  const text =
    data.output_text ??
    data.output?.map(x => x?.content?.map(c => c?.text || "").join("")).join("\n") ??
    "";

  return {
    text,
    provider: "openai",
    model,
    usage: data.usage || null,
    raw: data
  };
}