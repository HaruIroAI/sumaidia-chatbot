/**
 * extractText - Responses APIとChat Completions API両対応のテキスト抽出
 * 
 * 使用例:
 * const text = extractText(apiResponse);
 * 
 * 対応形式:
 * 1. Responses API: output[].content[].text (type === 'output_text')
 * 2. Chat Completions: choices[0].message.content
 * 3. Simple format: output_text
 * 4. Text object: text.value
 */
export function extractText(data) {
  const t1 = data?.output?.[0]?.content?.find(c => c.type === 'output_text')?.text;
  const t2 = data?.choices?.[0]?.message?.content;
  const t3 = data?.output_text;
  return (t1 ?? t2 ?? t3 ?? '').trim();
}