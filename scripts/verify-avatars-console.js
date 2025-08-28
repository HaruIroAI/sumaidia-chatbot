// Avatar Verification Script for Browser Console
// Copy and paste this into the browser console on the deployed site

(async function verifyAvatars() {
  const REQUIRED_AVATARS = [
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
    'smaichan_curious.png',
    'smaichan_grateful.png',
    'smaichan_confident.png',
    'smaichan_focused.png',
    'smaichan_embarrassed.png',
    'smaichan_relaxed.png',
    'smaichan_mischievous.png',
    'smaichan_supportive.png',
    'smaichan_sparkle.png'
  ];
  
  console.log('🔍 Verifying Avatar Files...\n');
  console.log(`Base URL: ${window.location.origin}`);
  console.log(`Checking ${REQUIRED_AVATARS.length} required files\n`);
  
  const results = [];
  
  for (const filename of REQUIRED_AVATARS) {
    const url = `${window.location.origin}/logo/${filename}`;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      results.push({
        File: filename,
        Status: response.status,
        Result: response.ok ? '✅ OK' : '❌ MISSING',
        Size: response.headers.get('content-length') || 'N/A',
        Type: response.headers.get('content-type') || 'N/A'
      });
    } catch (error) {
      results.push({
        File: filename,
        Status: 'ERROR',
        Result: '❌ ERROR',
        Size: 'N/A',
        Type: 'N/A'
      });
    }
  }
  
  // Display as table
  console.table(results);
  
  // Summary
  const successful = results.filter(r => r.Result === '✅ OK').length;
  const missing = results.filter(r => r.Result.includes('❌')).length;
  
  console.log('\n📊 Summary:');
  console.log(`✅ Found: ${successful}/${REQUIRED_AVATARS.length}`);
  console.log(`❌ Missing: ${missing}/${REQUIRED_AVATARS.length}`);
  
  if (missing > 0) {
    console.log('\n❌ Missing files:');
    results.filter(r => r.Result.includes('❌')).forEach(r => {
      console.log(`  - ${r.File}`);
    });
  }
  
  if (successful === REQUIRED_AVATARS.length) {
    console.log('\n🎉 All required avatar files are present!');
  }
  
  return results;
})();