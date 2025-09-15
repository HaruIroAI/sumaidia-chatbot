/**
 * Question Limiter
 * 複数質問を防止し、1つずつ質問するように強制
 */

/**
 * Check if response contains multiple questions
 */
export function hasMultipleQuestions(response) {
  if (!response) return false;
  
  // 質問マーク（？）の数をカウント
  const questionMarks = (response.match(/？/g) || []).length;
  
  // 「と」「あと」「それから」などの接続詞
  const connectors = [
    '何部？いつまで',
    'いつまで？デザイン',
    'デザイン？イメージ',
    '何枚？.*納期',
    '納期？.*デザイン',
    'ところで.*？.*？',
    'あと.*？',
    'それから.*？',
    'ついでに.*？'
  ];
  
  // 複数質問のパターンをチェック
  for (const pattern of connectors) {
    if (new RegExp(pattern, 'i').test(response)) {
      return true;
    }
  }
  
  // 2つ以上の質問マークがある
  if (questionMarks >= 2) {
    return true;
  }
  
  return false;
}

/**
 * Extract first question only
 */
export function extractFirstQuestion(response) {
  if (!response) return response;
  
  // 最初の質問だけを抽出
  const firstQuestion = response.match(/^[^？]+？/);
  
  if (firstQuestion) {
    // 最初の質問に絵文字を追加
    return firstQuestion[0] + '✨';
  }
  
  // 質問が見つからない場合はそのまま返す
  return response;
}

/**
 * Fix multiple questions in response
 */
export function fixMultipleQuestions(response, context) {
  if (!hasMultipleQuestions(response)) {
    return response;
  }
  
  // 文脈に基づいて適切な単一質問に変換
  if (context?.type === 'businessCard') {
    // 名刺の場合
    if (!context.sessionInfo?.quantity) {
      return '魅力的な名刺作るね〜！何枚必要？✨';
    } else if (!context.sessionInfo?.deadline) {
      return `${context.sessionInfo.quantity}枚ね！いつまでに必要？✨`;
    } else if (!context.sessionInfo?.design) {
      return '了解〜！デザインはどうする？💕';
    }
  }
  
  // デフォルトは最初の質問だけを抽出
  return extractFirstQuestion(response);
}

/**
 * Generate single question based on context
 */
export function generateSingleQuestion(context) {
  const { type, sessionInfo } = context;
  
  if (type === 'businessCard') {
    if (!sessionInfo?.quantity) {
      return {
        question: '何枚必要？',
        emotion: 'curious',
        options: [
          { text: '100枚', value: '100枚お願いします' },
          { text: '500枚', value: '500枚お願いします' },
          { text: '1000枚', value: '1000枚お願いします' },
          { text: '相談したい', value: '枚数を相談したいです' }
        ]
      };
    } else if (!sessionInfo?.deadline) {
      return {
        question: 'いつまでに必要？',
        emotion: 'curious',
        options: [
          { text: '1週間以内', value: '1週間以内に必要です' },
          { text: '2週間くらい', value: '2週間くらいで大丈夫です' },
          { text: '1ヶ月以内', value: '1ヶ月以内ならOKです' },
          { text: '急ぎじゃない', value: '特に急いでません' }
        ]
      };
    } else if (!sessionInfo?.design) {
      return {
        question: 'デザインはどうする？',
        emotion: 'helpful',
        options: [
          { text: 'テンプレートでOK', value: 'テンプレートデザインでお願いします' },
          { text: '一緒に考えたい', value: 'デザインを相談しながら決めたいです' },
          { text: 'データ持込', value: 'デザインデータを持ち込みます' },
          { text: 'お任せ', value: 'デザインはお任せします' }
        ]
      };
    }
  }
  
  return null;
}

export default {
  hasMultipleQuestions,
  extractFirstQuestion,
  fixMultipleQuestions,
  generateSingleQuestion
};