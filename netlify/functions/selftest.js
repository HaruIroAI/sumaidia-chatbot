export async function handler() {
  const headers = { "content-type":"application/json", "access-control-allow-origin":"*" };
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model  = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) return { statusCode:500, headers, body: JSON.stringify({ ok:false, error:"Missing OPENAI_API_KEY" }) };

    const input = [
      { role:"system", content:[{type:"input_text", text:"『pong』と1語だけ返す"}] },
      { role:"user",   content:[{type:"input_text", text:"ping"}] }
    ];

    const r = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{ "content-type":"application/json", "authorization":`Bearer ${apiKey}` },
      body: JSON.stringify({ model, input, max_output_tokens: 30 })
    });
    const data = await r.json();

    if (!r.ok) return { statusCode:500, headers, body: JSON.stringify({ ok:false, model, status:r.status, message:data?.error?.message||data }) };

    let text = data.output_text || "";
    if (!text && Array.isArray(data.output)) {
      text = data.output.flatMap(p=>p?.content??[]).filter(c=>c?.type==="output_text").map(c=>c.text).join("").trim();
    }

    return { statusCode:200, headers, body: JSON.stringify({ ok: text.trim().toLowerCase()==="pong", model: data.model||model, sample: text }) };
  } catch (e) {
    return { statusCode:500, headers, body: JSON.stringify({ ok:false, error:String(e?.message||e) }) };
  }
}