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

    const raw = await r.text(); // ★ raw で受ける
    let data = null;
    try { data = JSON.parse(raw); } catch {}

    const extract = (d) => {
      if (!d) return "";
      if (typeof d.output_text === "string" && d.output_text.trim()) return d.output_text.trim();
      if (Array.isArray(d.output)) {
        const texts = [];
        for (const p of d.output) {
          const parts = Array.isArray(p?.content) ? p.content : [];
          for (const c of parts) {
            if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") {
              texts.push(c.text);
            }
          }
        }
        return texts.join("").trim();
      }
      return "";
    };

    const text = extract(data);
    const ok = text.trim().toLowerCase() === "pong";

    return {
      statusCode: r.ok && ok ? 200 : 500,
      headers,
      body: JSON.stringify({ ok, model: (data?.model || model), sample: text, debug: !ok ? { status:r.status, raw } : undefined })
    };
  } catch (e) {
    return { statusCode:500, headers, body: JSON.stringify({ ok:false, error:String(e?.message||e) }) };
  }
}