export async function handler(event) {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "x-backend": "openai",
  };

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) 
      };
    }

    // 最小構成のリクエストボディ
    const requestBody = {
      model: model,
      input: messages.map(m => ({ 
        role: m.role, 
        content: m.content 
      })),
      max_output_tokens: 500
    };

    // OpenAI Responses APIを呼び出し
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // エラー時はOpenAIのstatusをそのまま返す
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...headers, "x-model": data.model || model },
        body: JSON.stringify({ error: "OpenAI error", ...data })
      };
    }

    // レスポンスからテキストを抽出
    let text = "";
    
    // 1. data.output[0].contentからtype==="output_text"を探す
    if (data.output && Array.isArray(data.output) && data.output[0]) {
      const content = data.output[0].content;
      if (Array.isArray(content)) {
        const outputText = content.find(item => item.type === "output_text");
        if (outputText && outputText.text) {
          text = outputText.text;
        }
      }
    }
    
    // 2. フォールバック: data.choices[0].message.content
    if (!text && data.choices?.[0]?.message?.content) {
      text = data.choices[0].message.content;
    }

    // 返却形式
    const responseBody = {
      choices: [{
        message: {
          content: text || ""
        }
      }]
    };

    return {
      statusCode: 200,
      headers: { ...headers, "x-model": data.model || model },
      body: JSON.stringify(responseBody)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: String(err?.message || err) 
      })
    };
  }
}