// 改善版：コンテキスト認識型ChatGPT呼び出し関数

// 会話の文脈を分析して必要な情報を判定
function analyzeContext(message) {
    const contexts = {
        pricing: ['価格', '料金', '値段', 'いくら', '見積', '費用'],
        delivery: ['納期', 'いつ', '急ぎ', '特急', '日数'],
        services: ['名刺', 'チラシ', 'ポスター', 'web', 'サイト', '動画'],
        company: ['会社', '住所', '営業時間', '場所', 'アクセス'],
        technical: ['データ', '入稿', 'cmyk', 'rgb', '解像度', 'pdf']
    };
    
    const detectedContexts = [];
    for (const [context, keywords] of Object.entries(contexts)) {
        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            detectedContexts.push(context);
        }
    }
    
    return detectedContexts;
}

// 関連情報を収集
function gatherRelevantInfo(contexts, userMessage) {
    let relevantInfo = {};
    
    contexts.forEach(context => {
        switch(context) {
            case 'pricing':
                relevantInfo.pricing = {
                    businessCards: companyKnowledge.services.printing.businessCards,
                    flyers: companyKnowledge.services.printing.flyers,
                    payment: companyKnowledge.faq.payment
                };
                break;
            case 'delivery':
                relevantInfo.delivery = companyKnowledge.faq.delivery;
                relevantInfo.workflow = companyKnowledge.businessInfo.workflow;
                break;
            case 'services':
                // メッセージに含まれる具体的なサービスを検索
                const searchResults = searchKnowledge(userMessage);
                relevantInfo.specificServices = searchResults;
                break;
            case 'company':
                relevantInfo.companyInfo = companyKnowledge.companyInfo;
                relevantInfo.locations = companyKnowledge.locations;
                break;
            case 'technical':
                relevantInfo.dataRequirements = companyKnowledge.faq.data;
                relevantInfo.glossary = {};
                // 関連する用語だけを抽出
                Object.entries(companyKnowledge.glossary).forEach(([term, def]) => {
                    if (userMessage.toLowerCase().includes(term.toLowerCase())) {
                        relevantInfo.glossary[term] = def;
                    }
                });
                break;
        }
    });
    
    return relevantInfo;
}

// 改善版ChatGPT呼び出し関数
async function callChatGPTEnhanced(message) {
    try {
        // 1. 文脈を分析
        const contexts = analyzeContext(message);
        
        // 2. 関連情報を収集
        const relevantInfo = gatherRelevantInfo(contexts, message);
        
        // 3. 会話履歴から関連する過去のやり取りを抽出
        const relevantHistory = conversationHistory
            .slice(-10) // 最新10件から
            .filter(msg => {
                // 現在の文脈に関連する会話のみ
                return contexts.some(ctx => 
                    msg.content.toLowerCase().includes(ctx)
                );
            })
            .slice(-4); // 最大4件まで
        
        // 4. システムプロンプトを構築
        const systemContent = `あなたは「スマイちゃん」という、株式会社スマイディア（SUMAIDIA）で働く18歳のギャル系AIアシスタントです。

【基本設定】
- 明るく元気でフレンドリー、お客様想いで親身
- 語尾に「〜」「✨」「💕」「！」などを使用
- 「はろー」「オッケー」「まじで」などカジュアルな表現
- でも基本的には敬語を使い、失礼にならないように

【現在の文脈】
${contexts.join(', ')}についての問い合わせ

【関連情報】
${JSON.stringify(relevantInfo, null, 2)}

【重要】
- 上記の関連情報を活用して具体的に回答
- 不明な点は「確認しますね〜」と対応
- 数字や価格は正確に伝える
- 楽しく分かりやすく説明`;

        const messages = [
            {
                role: 'system',
                content: systemContent
            }
        ];
        
        // 5. 関連する会話履歴を追加
        relevantHistory.forEach(msg => {
            messages.push({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content
            });
        });
        
        // 6. 現在のメッセージを追加
        messages.push({ role: 'user', content: message });
        
        // 7. API呼び出し
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('netlify.com');
        
        let apiUrl = 'https://api.openai.com/v1/chat/completions';
        let headers = {
            'Content-Type': 'application/json'
        };
        
        const body = {
            messages: messages,
            max_tokens: 300 // 少し増やす
        };
        
        if (isNetlify) {
            apiUrl = '/.netlify/functions/chat';
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
            body.model = 'gpt-4o-mini';
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('ChatGPT API Error:', error);
        return null;
    }
}

// 会話履歴の管理を改善
class ConversationManager {
    constructor() {
        this.history = [];
        this.topics = new Set();
        this.customerInfo = {};
    }
    
    addMessage(message, isUser) {
        this.history.push({
            content: message,
            isUser: isUser,
            timestamp: new Date(),
            contexts: isUser ? analyzeContext(message) : []
        });
        
        // トピックを追跡
        if (isUser) {
            analyzeContext(message).forEach(ctx => this.topics.add(ctx));
        }
        
        // 顧客情報を抽出・保存（例：数量、納期など）
        if (isUser) {
            this.extractCustomerInfo(message);
        }
    }
    
    extractCustomerInfo(message) {
        // 数量の抽出
        const quantityMatch = message.match(/(\d+)[枚部個]/);
        if (quantityMatch) {
            this.customerInfo.quantity = parseInt(quantityMatch[1]);
        }
        
        // 納期の抽出
        if (message.includes('急ぎ') || message.includes('特急')) {
            this.customerInfo.urgent = true;
        }
        
        // サービスタイプの抽出
        ['名刺', 'チラシ', 'ポスター', 'カタログ'].forEach(service => {
            if (message.includes(service)) {
                this.customerInfo.serviceType = service;
            }
        });
    }
    
    getRelevantContext() {
        return {
            recentTopics: Array.from(this.topics).slice(-3),
            customerInfo: this.customerInfo,
            conversationLength: this.history.length
        };
    }
}

// 使用例
const conversationManager = new ConversationManager();

// 既存のsendMessage関数を改善
async function sendMessageEnhanced(message) {
    // 会話履歴に追加
    conversationManager.addMessage(message, true);
    
    // コンテキストを考慮した応答を取得
    let response;
    if (currentMode === 'online' && (isNetlify || apiKey)) {
        response = await callChatGPTEnhanced(message);
    }
    
    if (!response) {
        // オフラインモードでもコンテキストを活用
        const contexts = analyzeContext(message);
        response = generateContextAwareResponse(message, contexts);
    }
    
    // 応答を会話履歴に追加
    conversationManager.addMessage(response, false);
    
    return response;
}

// オフラインモードでのコンテキスト認識応答
function generateContextAwareResponse(message, contexts) {
    // conversation-patterns.jsの既存ロジックに
    // コンテキスト情報を追加して応答生成
    if (window.generateResponse) {
        // 既存の関数を拡張
        return window.generateResponse(message, {
            contexts: contexts,
            customerInfo: conversationManager.customerInfo
        });
    }
    
    return 'お問い合わせありがとうございます〜！詳しく教えてもらえる？💕';
}