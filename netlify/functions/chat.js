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

    // System promptを追加してJSON形式での応答を促す
    const systemPrompt = {
      role: "system",
      content: [{
        type: "input_text",
        text: `あなたはスマイちゃん、18歳のギャル系印刷アシスタントです。
以下のJSON形式で応答してください：
{
  "reply_text": "実際の返答内容",
  "emotion": "normal|happy|thinking|confused|excited|shy|sleepy|surprised|motivated",
  "intensity": 0.0～1.0の数値,
  "intent": "greeting|question|confirmation|suggestion|error|other"
}
ただし、JSONパースに失敗した場合は通常のテキスト応答でも構いません。`
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

    // OpenAI 呼び出し（最小パラメータのみ）
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 300
      }),
    });

    const data = await r.json().catch(() => ({}));

    // デバッグ: ?debug=1 なら生レス返却
    if (event.queryStringParameters?.debug === "1") {
      return { statusCode: r.status, headers, body: JSON.stringify(data) };
    }

    if (!r.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error:"OpenAI error", status:r.status, message: msg })
      };
    }

    // 出力抽出（output_text 優先 → output[*].content[*].text(type=output_text)）
    let text = typeof data.output_text === "string" ? data.output_text : "";
    if (!text && Array.isArray(data.output)) {
      const parts = data.output.flatMap(p => p?.content ?? []);
      const outTexts =
        parts.filter(c => c?.type === "output_text").map(c => c.text)
             .concat(parts.filter(c => c?.type === "text").map(c => c.text)); // 保険
      text = outTexts.join("").trim();
    }
    // 最終ガード：空文字は安全文に
    if (!text || !text.trim()) {
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
      usage: data.usage
    };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
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