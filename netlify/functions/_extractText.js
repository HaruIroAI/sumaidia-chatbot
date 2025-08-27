export function extractText(data) {
  if (Array.isArray(data?.output)) {
    const parts = data.output
      .filter(p => p?.type === "output_text" && typeof p.text === "string")
      .map(p => p.text);
    if (parts.length) return parts.join("\n");
  }
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (typeof data?.output_text === "string") return data.output_text;
  return "";
}