import { extractText } from "./_extractText.js";

export async function handler() {
  // Force rebuild: v2
  const apiKey = process.env.OPENAI_API_KEY;
  const model  = process.env.OPENAI_MODEL || "gpt-5-mini";
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "content-type":"application/json", "access-control-allow-origin":"*" },
      body: JSON.stringify({ ok:false, error:"Missing OPENAI_API_KEY" })
    };
  }
  const payload = {
    model,
    input: [
      { role:"system", content:[{ type:"input_text", text:"「pong」と1語だけ返す" }] },
      { role:"user",   content:[{ type:"input_text", text:"ping" }] }
    ],
    max_output_tokens: 100
  };
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type":"application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    const text = extractText(data).trim();
    const ok = text.toLowerCase() === "pong";
    return {
      statusCode: ok ? 200 : 500,
      headers: { 
        "content-type":"application/json", 
        "access-control-allow-origin":"*",
        "x-model": data.model || model 
      },
      body: JSON.stringify({
        ok,
        model: data.model || model,
        sample: text,
        debug: ok ? undefined : { status:r.status, snippet: JSON.stringify(data).slice(0,500) }
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 
        "content-type":"application/json", 
        "access-control-allow-origin":"*" 
      },
      body: JSON.stringify({ ok:false, error:"Selftest exception", message:e.message })
    };
  }
}