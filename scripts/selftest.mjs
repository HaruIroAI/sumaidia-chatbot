#!/usr/bin/env node

/**
 * Netlify Functions セルフテストスクリプト
 * 
 * 使用方法:
 * node scripts/selftest.mjs
 * 
 * 環境変数:
 * SITE_URL - テスト対象のサイトURL（デフォルト: https://cute-frangipane-efe657.netlify.app）
 */

const SITE_URL = process.env.SITE_URL || "https://cute-frangipane-efe657.netlify.app";

// 終了コードの定義
const EXIT_CODES = {
  SUCCESS: 0,
  HTTP_ERROR: 1,        // 200以外のHTTPステータス
  EMPTY_RESPONSE: 2,    // 空文字の応答
  JSON_ERROR: 3,        // JSON解析エラー
  CONTENT_ERROR: 4,     // contentが存在しない
  GENERAL_ERROR: 5      // その他のエラー
};

async function runSelfTest() {
  console.log("🔍 Netlify Functions セルフテスト開始...");
  console.log(`📍 対象サイト: ${SITE_URL}`);
  console.log("");

  try {
    // 1. selftest エンドポイントのテスト
    console.log("1️⃣ /selftest エンドポイントをテスト中...");
    const selftestResponse = await fetch(`${SITE_URL}/.netlify/functions/selftest`);
    
    if (!selftestResponse.ok) {
      console.error(`❌ HTTPエラー: ${selftestResponse.status}`);
      process.exit(EXIT_CODES.HTTP_ERROR);
    }

    const selftestText = await selftestResponse.text();
    if (!selftestText) {
      console.error("❌ 空の応答が返されました");
      process.exit(EXIT_CODES.EMPTY_RESPONSE);
    }

    let selftestData;
    try {
      selftestData = JSON.parse(selftestText);
    } catch (e) {
      console.error("❌ JSON解析エラー:", selftestText);
      process.exit(EXIT_CODES.JSON_ERROR);
    }

    console.log("✅ selftest レスポンス:", JSON.stringify(selftestData, null, 2));

    if (!selftestData.ok) {
      throw new Error(`selftest returned ok:false - ${selftestData.hint || selftestData.error}`);
    }

    // 2. chat エンドポイントのテスト
    console.log("\n2️⃣ /chat エンドポイントをテスト中...");
    const chatResponse = await fetch(`${SITE_URL}/.netlify/functions/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "『pong』と1語だけ返す" },
          { role: "user", content: "ping" }
        ]
      })
    });

    const xModel = chatResponse.headers.get("x-model");

    if (!chatResponse.ok) {
      console.error(`❌ Chat HTTPエラー: ${chatResponse.status}`);
      const errorText = await chatResponse.text();
      console.error("エラー内容:", errorText);
      process.exit(EXIT_CODES.HTTP_ERROR);
    }

    const chatText = await chatResponse.text();
    if (!chatText) {
      console.error("❌ Chat: 空の応答が返されました");
      process.exit(EXIT_CODES.EMPTY_RESPONSE);
    }

    let chatData;
    try {
      chatData = JSON.parse(chatText);
    } catch (e) {
      console.error("❌ Chat JSON解析エラー:", chatText);
      process.exit(EXIT_CODES.JSON_ERROR);
    }

    console.log("✅ chat レスポンス:");
    console.log(`   - Status: ${chatResponse.status}`);
    console.log(`   - x-model: ${xModel}`);
    console.log(`   - Response: ${JSON.stringify(chatData, null, 2)}`);

    // レスポンスの検証
    const content = chatData?.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
      console.error("❌ Chat: contentが存在しません");
      console.error("Response structure:", JSON.stringify(chatData, null, 2));
      process.exit(EXIT_CODES.CONTENT_ERROR);
    }
    
    if (content === "") {
      console.error("❌ Chat: contentが空文字です");
      process.exit(EXIT_CODES.EMPTY_RESPONSE);
    }

    if (content.trim().toLowerCase() !== "pong") {
      console.warn(`⚠️  期待値 'pong' に対して '${content}' が返されました`);
    }

    // 3. サマリー
    console.log("\n✨ すべてのテストが完了しました！");
    console.log("📊 サマリー:");
    console.log(`   - API モデル: ${selftestData.model || xModel}`);
    console.log(`   - selftest: ${selftestData.ok ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`   - chat: ${chatResponse.ok ? "✅ PASS" : "❌ FAIL"}`);
    console.log("\n🎉 Netlify Functions は正常に動作しています！");

    process.exit(EXIT_CODES.SUCCESS);

  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error.message);
    console.error("\n💡 ヒント:");
    console.error("1. 環境変数 OPENAI_API_KEY が設定されているか確認");
    console.error("2. TROUBLESHOOTING.md でエラーメッセージを確認");
    console.error("3. Netlify Functions logs でサーバーログを確認");
    
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }
}

// 実行
runSelfTest();