#!/bin/bash
set -e

# ============================================
# 🚀 Automated Image Deployment Pipeline
# ============================================
# This script automates the entire process:
# 1. Create branch
# 2. Add images
# 3. Create PR
# 4. Verify Deploy Preview
# 5. Auto-merge after verification
# ============================================

# Load environment
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN not set"
  echo "Please set token in .env.local or export GITHUB_TOKEN"
  exit 1
fi

# Configuration
REPO="HaruIroAI/sumaidia-chatbot"
BASE_URL="https://cute-frangipane-efe657.netlify.app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <image-directory> [branch-name]"
  echo ""
  echo "Example:"
  echo "  $0 ./new-avatars feat/new-expressions"
  echo ""
  echo "This will:"
  echo "  1. Copy images from <image-directory> to logo/"
  echo "  2. Create branch and PR"
  echo "  3. Wait for Deploy Preview"
  echo "  4. Verify all images load correctly"
  echo "  5. Auto-merge if verification passes"
  exit 1
fi

IMAGE_DIR="$1"
BRANCH_NAME="${2:-feat/images-$(date +%Y%m%d-%H%M%S)}"

echo -e "${BLUE}🚀 Starting Automated Image Deployment${NC}"
echo "========================================="
echo "Image directory: $IMAGE_DIR"
echo "Branch name: $BRANCH_NAME"
echo ""

# Step 1: Validate images
echo -e "${YELLOW}Step 1: Validating images...${NC}"
if [ ! -d "$IMAGE_DIR" ]; then
  echo -e "${RED}❌ Directory not found: $IMAGE_DIR${NC}"
  exit 1
fi

image_count=$(find "$IMAGE_DIR" -name "*.png" -type f | wc -l)
echo "Found $image_count PNG files"

if [ "$image_count" -eq 0 ]; then
  echo -e "${RED}❌ No PNG files found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Images validated${NC}"
echo ""

# Step 2: Create branch
echo -e "${YELLOW}Step 2: Creating branch...${NC}"
git fetch origin main
git checkout -b "$BRANCH_NAME" origin/main
echo -e "${GREEN}✅ Branch created: $BRANCH_NAME${NC}"
echo ""

# Step 3: Copy images
echo -e "${YELLOW}Step 3: Copying images to logo/...${NC}"
cp "$IMAGE_DIR"/*.png logo/ 2>/dev/null || true
git add logo/*.png
added_files=$(git diff --cached --name-only | grep "^logo/" | wc -l)
echo "Added $added_files files to git"
echo -e "${GREEN}✅ Images staged${NC}"
echo ""

# Step 4: Commit
echo -e "${YELLOW}Step 4: Creating commit...${NC}"
commit_message="feat(images): add $(echo $added_files) new images

Added images:
$(git diff --cached --name-only | grep "^logo/" | sed 's/logo\//- /')"

git commit -m "$commit_message"
echo -e "${GREEN}✅ Committed${NC}"
echo ""

# Step 5: Push branch
echo -e "${YELLOW}Step 5: Pushing branch...${NC}"
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/${REPO}.git"
git push -u origin "$BRANCH_NAME"
echo -e "${GREEN}✅ Branch pushed${NC}"
echo ""

# Step 6: Create PR using GitHub API
echo -e "${YELLOW}Step 6: Creating Pull Request...${NC}"

pr_title="feat(images): add $added_files new images"
pr_body="## 🎨 Image Update

### Summary
- Added $added_files new images to \`/logo/\`
- Branch: \`$BRANCH_NAME\`

### Files Added
$(git diff origin/main --name-only | grep "^logo/" | sed 's/^/- /')

### Verification
- [ ] Deploy Preview builds successfully
- [ ] All images return HTTP 200
- [ ] No 404 errors in console

### Auto-merge
This PR will be automatically merged after successful verification.
"

# Create PR via API
pr_response=$(curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/pulls" \
  -d "{
    \"title\": \"$pr_title\",
    \"body\": \"$pr_body\",
    \"head\": \"$BRANCH_NAME\",
    \"base\": \"main\"
  }")

pr_number=$(echo "$pr_response" | grep -o '"number":[0-9]*' | cut -d: -f2)
pr_url=$(echo "$pr_response" | grep -o '"html_url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$pr_number" ]; then
  echo -e "${RED}❌ Failed to create PR${NC}"
  echo "$pr_response" | head -20
  exit 1
fi

echo -e "${GREEN}✅ PR created: #$pr_number${NC}"
echo "URL: $pr_url"
echo ""

# Step 7: Wait for Deploy Preview
echo -e "${YELLOW}Step 7: Waiting for Deploy Preview...${NC}"
echo "This may take 1-3 minutes..."

deploy_preview_url=""
max_wait=180  # 3 minutes
elapsed=0

while [ $elapsed -lt $max_wait ]; do
  # Check PR comments for Deploy Preview URL
  comments=$(curl -s \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${REPO}/issues/${pr_number}/comments")
  
  # Look for Netlify bot comment
  deploy_url=$(echo "$comments" | grep -o "https://deploy-preview-[^\"]*netlify.app" | head -1)
  
  if [ -n "$deploy_url" ]; then
    deploy_preview_url="$deploy_url"
    break
  fi
  
  echo -n "."
  sleep 10
  elapsed=$((elapsed + 10))
done

echo ""
if [ -z "$deploy_preview_url" ]; then
  echo -e "${YELLOW}⚠️  Deploy Preview not found yet${NC}"
  echo "Please check PR manually: $pr_url"
  deploy_preview_url="$BASE_URL"  # Fallback to production for testing
else
  echo -e "${GREEN}✅ Deploy Preview ready: $deploy_preview_url${NC}"
fi
echo ""

# Step 8: Verify images
echo -e "${YELLOW}Step 8: Verifying images...${NC}"

# Get list of new images
new_images=$(git diff origin/main --name-only | grep "^logo/.*\.png$")
failed=0
success=0

for image_path in $new_images; do
  image_name=$(basename "$image_path")
  url="${deploy_preview_url}/${image_path}"
  
  # Check with HEAD request
  status=$(curl -s -o /dev/null -w "%{http_code}" -I "$url")
  
  if [ "$status" = "200" ]; then
    echo -e "✅ $status $image_name"
    ((success++))
  else
    echo -e "❌ $status $image_name"
    ((failed++))
  fi
done

echo ""
echo -e "${BLUE}📊 Verification Results:${NC}"
echo "  ✅ Success: $success"
echo "  ❌ Failed: $failed"
echo ""

# Step 9: Auto-merge if successful
if [ $failed -eq 0 ] && [ $success -gt 0 ]; then
  echo -e "${YELLOW}Step 9: Auto-merging PR...${NC}"
  
  # Approve PR (optional, if you have permissions)
  # curl -s -X POST \
  #   -H "Authorization: Bearer $GITHUB_TOKEN" \
  #   "https://api.github.com/repos/${REPO}/pulls/${pr_number}/reviews" \
  #   -d '{"event":"APPROVE"}'
  
  # Merge PR
  merge_response=$(curl -s -X PUT \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${REPO}/pulls/${pr_number}/merge" \
    -d '{
      "commit_title": "'"$pr_title"'",
      "merge_method": "squash"
    }')
  
  if echo "$merge_response" | grep -q '"merged":true'; then
    echo -e "${GREEN}✅ PR merged successfully!${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not auto-merge. Please merge manually.${NC}"
    echo "PR: $pr_url"
  fi
else
  echo -e "${YELLOW}⚠️  Verification failed or no images found${NC}"
  echo "Please check the PR manually: $pr_url"
fi

echo ""
echo "========================================="
echo -e "${GREEN}🎉 Deployment Pipeline Complete!${NC}"
echo "========================================="
echo "Branch: $BRANCH_NAME"
echo "PR: $pr_url"
echo "Images: $success deployed successfully"
echo ""

# Cleanup - return to main
git checkout main 2>/dev/null || true