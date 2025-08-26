// デバッグスクリプト - Consoleで実行してください

console.log('=== デバッグ診断開始 ===');

// 1. 基本的な変数の確認
console.log('1. グローバル変数チェック:');
console.log('- window.currentMode:', typeof window.currentMode);
console.log('- window.ConversationManager:', typeof window.ConversationManager);
console.log('- window.analyzeContext:', typeof window.analyzeContext);
console.log('- window.companyKnowledge:', typeof window.companyKnowledge);
console.log('- window.generateResponse:', typeof window.generateResponse);

// 2. DOM要素の確認
console.log('\n2. DOM要素チェック:');
console.log('- chatBubble:', document.getElementById('chatBubble'));
console.log('- chatWindow:', document.getElementById('chatWindow'));
console.log('- messagesContainer:', document.getElementById('messagesContainer'));
console.log('- chatForm:', document.getElementById('chatForm'));

// 3. スクリプトタグの確認
console.log('\n3. スクリプトタグ:');
const scripts = document.querySelectorAll('script');
scripts.forEach((script, index) => {
    if (script.src) {
        console.log(`- Script ${index}: ${script.src}`);
    } else {
        console.log(`- Script ${index}: インラインスクリプト (${script.textContent.length}文字)`);
    }
});

// 4. エラーの確認
console.log('\n4. コンソールエラーチェック:');
console.log('ブラウザのコンソールに赤いエラーメッセージがあるか確認してください。');

// 5. Three.jsの確認
console.log('\n5. Three.js:');
console.log('- THREE:', typeof window.THREE);

console.log('\n=== 診断完了 ===');