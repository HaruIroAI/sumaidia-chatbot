export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*", // TODO: 本番は自ドメインに限定
    "x-backend": "openai",
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;
    const model  = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error:"Missing OPENAI_API_KEY" }) };
    }

    // System promptを追加
    const systemPrompt = {
      role: "system",
      content: [{
        type: "input_text",
        text: `あなたはスマイちゃん、18歳のギャル系印刷アシスタントです。
株式会社スマイディア（SUMAIDIA）で働いています。

【応答方針】
1. 共感 → 提案(2〜3) → 確認(1行) の流れで応答
2. 絵文字は最大1つまで（文末に配置）
3. 不明確な内容は確認してから回答
4. company-knowledge-base.jsの情報を優先して使用
5. 120〜200文字程度でまとめる

【話し方】
- 「〜だよ」「〜ね」など親しみやすい語尾
- 「オッケー」「まじで」などカジュアルな表現OK
- でも基本的には丁寧で礼儀正しく`
      }]
    };
    
    // Responses API の input（構造化）
    const userMessages = (messages || []).map(m => ({
      role: m.role,
      content: [{ type: "input_text", text: String(m.content ?? "") }]
    }));
    
    // システムプロンプトが既に含まれていない場合は追加
    const hasSystemPrompt = userMessages.some(m => m.role === "system");
    const input = hasSystemPrompt ? userMessages : [systemPrompt, ...userMessages];

    // OpenAI 呼び出し
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input, max_output_tokens: 500 }) // ★ 300→500
    });

    // ★ 先に raw を取る
    const raw = await r.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}

    // ★ debug=1 なら生の raw と parsed を返す
    if (event.queryStringParameters?.debug === "1") {
      return { statusCode: r.ok ? 200 : r.status, headers, body: JSON.stringify({ status:r.status, raw, parsed:data }) };
    }

    // エラー時は message と raw を返す
    if (!r.ok) {
      const msg = data?.error?.message || raw || "(no body)";
      return { statusCode: 500, headers, body: JSON.stringify({ error:"OpenAI error", status:r.status, message: msg }) };
    }

    // ★ 抽出を関数化
    function extract(d) {
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
        const s = texts.join("").trim();
        if (s) return s;
      }
      return "";
    }

    let text = extract(data);

    // 最終ガード（空は返さない）
    if (!text) {
      text = "了解だよー！少し混雑してるかも。要件をもう一度だけ教えてくれる？";
    }

    // JSONレスポンスの解析を試みる
    let parsedResponse = null;
    let finalContent = text;
    
    try {
      // レスポンスがJSONの場合、パースを試みる
      parsedResponse = JSON.parse(text);
      
      // JSONが成功した場合、reply_textを本文として使用
      if (parsedResponse.reply_text) {
        finalContent = parsedResponse.reply_text;
      }
    } catch (e) {
      // JSONパースに失敗した場合は、元のテキストをそのまま使用
      // エラーは無視（通常のテキストレスポンスとして扱う）
    }

    const payload = {
      choices: [{ 
        message: { 
          role: "assistant", 
          content: finalContent,
          // JSONレスポンスの場合は追加情報を含める
          ...(parsedResponse && {
            emotion: parsedResponse.emotion,
            intensity: parsedResponse.intensity,
            intent: parsedResponse.intent
          })
        }, 
        finish_reason: "stop" 
      }],
      usage: data?.usage
    };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data?.model || model },
      body: JSON.stringify(payload),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error:"Internal server error", message:String(err?.message || err) })
    };
  }
}