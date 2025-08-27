export function extractText(data) {
  // 1. output配列から抽出を試みる
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      // type: "output_text"の場合
      if (item?.type === "output_text" && typeof item.text === "string") {
        return item.text;
      }
      // content配列がある場合
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (content?.type === "output_text" && typeof content.text === "string") {
            return content.text;
          }
        }
      }
    }
  }
  
  // 2. choices形式（Chat Completions互換）
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  
  // 3. トップレベルのoutput_text
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }
  
  // 4. テキストオブジェクトがある場合
  if (data?.text?.value) {
    return data.text.value;
  }
  
  return "";
}