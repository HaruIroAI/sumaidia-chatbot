// 改善されたパターンマッチングシステム

// 優先度付きパターンマッチング
const PatternMatcher = {
    // 完全一致を優先
    exactMatch: function(userInput, patterns) {
        const normalized = userInput.trim().toLowerCase();
        for (const pattern of patterns) {
            if (normalized === pattern.toLowerCase()) {
                return true;
            }
        }
        return false;
    },
    
    // トークンベースのマッチング
    tokenMatch: function(userInput, patterns) {
        const tokens = userInput.split(/[\s、。！？,!?]+/).filter(t => t.length > 0);
        
        for (const pattern of patterns) {
            const patternTokens = pattern.split(/[\s、。！？,!?]+/);
            
            // すべてのパターントークンが含まれているかチェック
            const allTokensFound = patternTokens.every(pToken => 
                tokens.some(uToken => uToken.includes(pToken) || pToken.includes(uToken))
            );
            
            if (allTokensFound) {
                return true;
            }
        }
        return false;
    },
    
    // スコアベースのマッチング
    scoreMatch: function(userInput, patternGroups) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [category, data] of Object.entries(patternGroups)) {
            let score = 0;
            
            // 完全一致は最高スコア
            if (this.exactMatch(userInput, data.patterns)) {
                score = 100;
            }
            // トークンマッチは中スコア
            else if (this.tokenMatch(userInput, data.patterns)) {
                score = 50;
            }
            // 部分一致は低スコア
            else if (data.patterns.some(p => userInput.toLowerCase().includes(p.toLowerCase()))) {
                score = 10;
            }
            
            // カテゴリごとの重み付け
            if (data.priority) {
                score *= data.priority;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { category, data, score };
            }
        }
        
        return bestMatch;
    }
};

// 文脈を考慮した応答生成
const ContextAwareResponder = {
    // 会話の文脈を保持
    context: {
        topics: [],
        lastIntent: null,
        userProfile: {
            formalityLevel: 'casual', // casual, formal, unknown
            interactionCount: 0,
            interests: []
        }
    },
    
    // インテント（意図）の分類
    classifyIntent: function(userInput) {
        const intents = {
            greeting: {
                patterns: ['こんにちは', 'はろー', 'hello', 'やあ', 'よろしく'],
                priority: 2
            },
            identity: {
                patterns: ['誰', 'だれ', '名前', 'あなたは', '君は', 'お前は', '自己紹介'],
                priority: 2
            },
            capability: {
                patterns: ['できる', '機能', '何が', 'スキル', '得意'],
                priority: 1.5
            },
            order: {
                patterns: ['作りたい', '注文', '頼みたい', '欲しい', '印刷'],
                priority: 1.8
            },
            price: {
                patterns: ['いくら', '値段', '価格', '料金', '費用', 'コスト'],
                priority: 1.7
            },
            smalltalk: {
                patterns: ['元気', '調子', '天気', '最近', 'どう'],
                priority: 1
            }
        };
        
        const match = PatternMatcher.scoreMatch(userInput, intents);
        return match ? match.category : 'unknown';
    },
    
    // 応答の生成
    generateResponse: function(userInput, conversationHistory = []) {
        const intent = this.classifyIntent(userInput);
        this.context.lastIntent = intent;
        
        // インテントに基づいて適切な応答を選択
        switch (intent) {
            case 'greeting':
                return this.handleGreeting(userInput);
            case 'identity':
                return this.handleIdentity(userInput);
            case 'capability':
                return this.handleCapability(userInput);
            case 'order':
                return this.handleOrder(userInput);
            case 'price':
                return this.handlePrice(userInput);
            case 'smalltalk':
                return this.handleSmalltalk(userInput);
            default:
                return this.handleUnknown(userInput);
        }
    },
    
    // 各インテントのハンドラー
    handleIdentity: function(userInput) {
        const responses = [
            'スマイちゃんだよ〜！スマイディアの印刷案内AIアシスタント✨',
            'スマイディア印刷会社のスマイちゃんです！18歳のギャル系AI💕',
            '印刷のことなら何でも聞いて！スマイちゃんがお手伝いするよ〜'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    handleUnknown: function(userInput) {
        // より具体的な提案を含む応答
        return `ごめん、もうちょっと詳しく教えて？

こんなことできるよ！
☑️ 名刺・チラシの注文
☑️ 料金の見積もり
☑️ デザインの相談

どれか興味ある？`;
    }
};

// 使用例
console.log(ContextAwareResponder.generateResponse('あなたは誰？'));
// => "スマイちゃんだよ〜！スマイディアの印刷案内AIアシスタント✨"

console.log(ContextAwareResponder.generateResponse('名前は？'));
// => "スマイディア印刷会社のスマイちゃんです！18歳のギャル系AI💕"