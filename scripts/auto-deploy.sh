#!/bin/bash
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Automated Avatar Deployment Script${NC}"
echo "======================================="
echo ""

# Check for GH_TOKEN
if [ -z "$GH_TOKEN" ]; then
    echo -e "${RED}❌ Error: GH_TOKEN not set${NC}"
    echo "Please run: export GH_TOKEN='your-github-token'"
    exit 1
fi

echo -e "${GREEN}✅ GH_TOKEN detected${NC}"

# Step 1: Configure git with token
echo -e "\n${YELLOW}Step 1: Configuring git authentication...${NC}"
git remote set-url origin "https://${GH_TOKEN}@github.com/HaruIroAI/sumaidia-chatbot.git"
echo -e "${GREEN}✅ Git authentication configured${NC}"

# Step 2: Push branch
echo -e "\n${YELLOW}Step 2: Pushing avatars/30pack branch...${NC}"
git fetch origin
git checkout avatars/30pack 2>/dev/null || git checkout -b avatars/30pack
git push -u origin avatars/30pack
echo -e "${GREEN}✅ Branch pushed successfully${NC}"

# Step 3: Configure gh CLI
echo -e "\n${YELLOW}Step 3: Configuring GitHub CLI...${NC}"
echo "$GH_TOKEN" > ~/.gh-token
GITHUB_TOKEN="$GH_TOKEN" gh auth login --with-token < ~/.gh-token
rm ~/.gh-token
echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"

# Step 4: Create PR
echo -e "\n${YELLOW}Step 4: Creating Pull Request...${NC}"
PR_URL=$(gh pr create \
  --base main \
  --head avatars/30pack \
  --title "feat(avatars): add 20 new expression avatars" \
  --body "## 🎨 Avatar Update

### Summary
- Added 20 new Smaichan expression avatars
- Total expressions now: 31 (30 + neutral)
- All images follow naming convention: \`smaichan_[expression].png\`

### New Expressions
angry, confident, cool, curious, determined, embarrassed, focused, grateful, laughing, love, mischievous, peace, playful, proud, relaxed, sad, sparkle, star_eyes, supportive, worried

### Testing
- [x] All 31 files verified locally
- [x] Naming convention matches config
- [ ] Deploy preview pending
- [ ] Production deployment pending

### Verification Checklist
- [ ] All images load correctly (31/31)
- [ ] Preloader shows \"Preloaded 30/30\"
- [ ] Expression switching works with [[emo:]] tags" \
  2>&1 | grep -o "https://github.com/[^[:space:]]*" | head -1)

echo -e "${GREEN}✅ PR created: $PR_URL${NC}"

# Step 5: Auto-merge PR
echo -e "\n${YELLOW}Step 5: Auto-merging PR...${NC}"
gh pr merge --squash --auto "$PR_URL"
echo -e "${GREEN}✅ PR set to auto-merge${NC}"

# Step 6: Wait for merge
echo -e "\n${YELLOW}Step 6: Waiting for PR to merge...${NC}"
for i in {1..30}; do
    PR_STATE=$(gh pr view "$PR_URL" --json state -q .state)
    if [ "$PR_STATE" = "MERGED" ]; then
        echo -e "${GREEN}✅ PR merged successfully${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 7: Get Netlify URLs
echo -e "\n${YELLOW}Step 7: Getting deployment URLs...${NC}"
PROD_URL="https://cute-frangipane-efe657.netlify.app"
echo "Production URL: $PROD_URL"

# Step 8: Wait for Netlify deployment
echo -e "\n${YELLOW}Step 8: Waiting for Netlify deployment (up to 2 minutes)...${NC}"
for i in {1..24}; do
    if curl -s -I "$PROD_URL/logo/smaichan_happy.png" | grep -q "200 OK"; then
        echo -e "\n${GREEN}✅ Deployment detected${NC}"
        break
    fi
    echo -n "."
    sleep 5
done

# Step 9: Run verification
echo -e "\n${YELLOW}Step 9: Running deployment verification...${NC}"
echo ""

# Create inline verification script
cat << 'VERIFY_SCRIPT' > /tmp/verify-deploy.mjs
#!/usr/bin/env node
import https from 'https';

const SITE_URL = process.env.SITE_URL || 'https://cute-frangipane-efe657.netlify.app';
const EXPRESSIONS = [
  'smaichan.png',
  'smaichan_happy.png', 'smaichan_thinking.png', 'smaichan_excited.png',
  'smaichan_confused.png', 'smaichan_wink.png', 'smaichan_shy.png',
  'smaichan_sleepy.png', 'smaichan_surprised.png', 'smaichan_motivated.png',
  'smaichan_laughing.png', 'smaichan_cool.png', 'smaichan_angry.png',
  'smaichan_sad.png', 'smaichan_love.png', 'smaichan_star_eyes.png',
  'smaichan_peace.png', 'smaichan_determined.png', 'smaichan_playful.png',
  'smaichan_worried.png', 'smaichan_proud.png', 'smaichan_grateful.png',
  'smaichan_curious.png', 'smaichan_confident.png', 'smaichan_embarrassed.png',
  'smaichan_focused.png', 'smaichan_relaxed.png', 'smaichan_mischievous.png',
  'smaichan_supportive.png', 'smaichan_sparkle.png'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
    }).on('error', (err) => {
      resolve({ url, status: 0, ok: false, error: err.message });
    }).end();
  });
}

async function main() {
  console.log('📸 Verifying Avatar Images...\n');
  
  let successCount = 0;
  const failures = [];
  
  for (const filename of EXPRESSIONS) {
    const url = `${SITE_URL}/logo/${filename}`;
    const result = await checkUrl(url);
    
    if (result.ok) {
      process.stdout.write('✅');
      successCount++;
    } else {
      process.stdout.write('❌');
      failures.push({ file: filename, status: result.status });
    }
  }
  
  console.log('\n\n📊 Results:');
  console.log(`  ✅ Success: ${successCount}/31`);
  console.log(`  ❌ Failed: ${failures.length}/31`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failed images:');
    failures.forEach(f => console.log(`  - ${f.file} (HTTP ${f.status})`));
  }
  
  console.log('\n🔄 Preloader Check:');
  console.log('  To verify: Open browser console and look for:');
  console.log('  "Preloaded 30/30 avatar assets in background"');
  
  console.log('\n🎭 Expression Switching:');
  console.log('  Test with [[emo:happy]], [[emo:worried]], [[emo:proud]]');
  console.log('  in the chat interface');
  
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(console.error);
VERIFY_SCRIPT

SITE_URL="$PROD_URL" node /tmp/verify-deploy.mjs

# Step 10: Final summary
echo ""
echo "======================================="
echo -e "${BLUE}📋 DEPLOYMENT SUMMARY${NC}"
echo "======================================="
echo -e "Branch: ${GREEN}avatars/30pack${NC}"
echo -e "PR: ${GREEN}$PR_URL${NC}"
echo -e "Production: ${GREEN}$PROD_URL${NC}"
echo ""
echo -e "${GREEN}✨ Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open browser and check console for preloader messages"
echo "2. Test expression switching in chat"
echo "3. Verify all avatars are loading correctly"