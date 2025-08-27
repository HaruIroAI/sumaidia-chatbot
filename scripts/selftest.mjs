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

async function runSelfTest() {
  console.log("🔍 Netlify Functions セルフテスト開始...");
  console.log(`📍 対象サイト: ${SITE_URL}`);
  console.log("");

  try {
    // 1. selftest エンドポイントのテスト
    console.log("1️⃣ /selftest エンドポイントをテスト中...");
    const selftestResponse = await fetch(`${SITE_URL}/.netlify/functions/selftest`);
    const selftestData = await selftestResponse.json();

    if (!selftestResponse.ok) {
      throw new Error(`selftest failed: ${selftestResponse.status} - ${JSON.stringify(selftestData)}`);
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

    const chatData = await chatResponse.json();
    const xModel = chatResponse.headers.get("x-model");

    if (!chatResponse.ok) {
      throw new Error(`chat failed: ${chatResponse.status} - ${JSON.stringify(chatData)}`);
    }

    console.log("✅ chat レスポンス:");
    console.log(`   - Status: ${chatResponse.status}`);
    console.log(`   - x-model: ${xModel}`);
    console.log(`   - Response: ${JSON.stringify(chatData, null, 2)}`);

    // レスポンスの検証
    const content = chatData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("chat response has no content");
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

    process.exit(0);

  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error.message);
    console.error("\n💡 ヒント:");
    console.error("1. 環境変数 OPENAI_API_KEY が設定されているか確認");
    console.error("2. TROUBLESHOOTING.md でエラーメッセージを確認");
    console.error("3. Netlify Functions logs でサーバーログを確認");
    
    process.exit(1);
  }
}

// 実行
runSelfTest();