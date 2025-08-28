#!/usr/bin/env node

import https from 'https';
import http from 'http';

const SITE_URL = process.env.SITE_URL || 'https://cute-frangipane-efe657.netlify.app';

// All 31 expressions to verify
const EXPRESSIONS = [
  'smaichan.png', // neutral
  'smaichan_happy.png',
  'smaichan_thinking.png',
  'smaichan_excited.png',
  'smaichan_confused.png',
  'smaichan_wink.png',
  'smaichan_shy.png',
  'smaichan_sleepy.png',
  'smaichan_surprised.png',
  'smaichan_motivated.png',
  'smaichan_laughing.png',
  'smaichan_cool.png',
  'smaichan_angry.png',
  'smaichan_sad.png',
  'smaichan_love.png',
  'smaichan_star_eyes.png',
  'smaichan_peace.png',
  'smaichan_determined.png',
  'smaichan_playful.png',
  'smaichan_worried.png',
  'smaichan_proud.png',
  'smaichan_grateful.png',
  'smaichan_curious.png',
  'smaichan_confident.png',
  'smaichan_embarrassed.png',
  'smaichan_focused.png',
  'smaichan_relaxed.png',
  'smaichan_mischievous.png',
  'smaichan_supportive.png',
  'smaichan_sparkle.png'
];

/**
 * Check if a URL returns 200 OK using HEAD request
 */
async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        ok: res.statusCode === 200
      });
    }).on('error', (err) => {
      resolve({
        url,
        status: 0,
        ok: false,
        error: err.message
      });
    }).end();
  });
}

/**
 * Test expression API endpoint
 */
async function testExpressionAPI(emotionId) {
  const apiUrl = `${SITE_URL}/.netlify/functions/chat`;
  const testPayload = {
    messages: [
      {
        role: 'system',
        content: `You are Smaichan. End your response with [[emo:${emotionId}]]`
      },
      {
        role: 'user',
        content: 'Hello!'
      }
    ]
  };

  return new Promise((resolve) => {
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const hasEmoTag = response.content?.includes(`[[emo:${emotionId}]]`);
          resolve({
            emotionId,
            status: res.statusCode,
            ok: res.statusCode === 200 && hasEmoTag,
            hasTag: hasEmoTag
          });
        } catch (e) {
          resolve({
            emotionId,
            status: res.statusCode,
            ok: false,
            error: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        emotionId,
        status: 0,
        ok: false,
        error: err.message
      });
    });

    req.write(JSON.stringify(testPayload));
    req.end();
  });
}

/**
 * Main verification flow
 */
async function main() {
  console.log('🚀 Deployment Verification Script');
  console.log('==================================\n');
  console.log(`Site URL: ${SITE_URL}\n`);

  // Step 1: Verify all avatar images are accessible
  console.log('📸 Step 1: Verifying Avatar Images (HEAD requests)');
  console.log('------------------------------------------------');
  
  let successCount = 0;
  const failures = [];
  
  for (const filename of EXPRESSIONS) {
    const url = `${SITE_URL}/logo/${filename}`;
    process.stdout.write(`Checking ${filename}... `);
    
    const result = await checkUrl(url);
    if (result.ok) {
      process.stdout.write('✅\n');
      successCount++;
    } else {
      process.stdout.write(`❌ (${result.status})\n`);
      failures.push(filename);
    }
  }
  
  console.log('\n📊 Image Verification Summary:');
  console.log(`  ✅ Successful: ${successCount}/31`);
  console.log(`  ❌ Failed: ${failures.length}/31`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failed images:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  
  // Step 2: Check preloader functionality
  console.log('\n🔄 Step 2: Checking Avatar Preloader');
  console.log('-------------------------------------');
  console.log('Note: To verify preloading, check browser console for:');
  console.log('  "Preloaded 30/30 avatar assets in background"');
  console.log('  or "Already loaded: X/30"');
  
  // Step 3: Test expression switching via API
  console.log('\n🎭 Step 3: Testing Expression API with 3 emotions');
  console.log('------------------------------------------------');
  
  const testEmotions = ['happy', 'worried', 'proud'];
  
  for (const emotion of testEmotions) {
    process.stdout.write(`Testing [[emo:${emotion}]]... `);
    const result = await testExpressionAPI(emotion);
    
    if (result.ok) {
      process.stdout.write('✅ Tag present in response\n');
    } else {
      process.stdout.write(`❌ ${result.error || 'Tag not found'}\n`);
    }
  }
  
  // Final report
  console.log('\n' + '='.repeat(50));
  console.log('📋 DEPLOYMENT VERIFICATION REPORT');
  console.log('='.repeat(50));
  
  const allImagesOk = successCount === 31;
  
  console.log(`\n🖼️  Avatar Images: ${allImagesOk ? '✅ ALL OK' : `⚠️  ${failures.length} MISSING`}`);
  console.log('🔄 Preloader: Check browser console manually');
  console.log('🎭 Expression API: Tested 3 emotions');
  
  if (allImagesOk) {
    console.log('\n✨ Deployment verification PASSED! All avatars are accessible.');
  } else {
    console.log('\n⚠️  Some issues detected. Please review the failures above.');
    console.log('\nSuggested actions:');
    console.log('1. Ensure all PNG files are committed and pushed');
    console.log('2. Check Netlify deployment logs');
    console.log('3. Verify file paths and naming conventions');
  }
  
  process.exit(allImagesOk ? 0 : 1);
}

// Run verification
main().catch(console.error);