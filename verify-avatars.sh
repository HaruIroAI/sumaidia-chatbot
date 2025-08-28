#!/bin/bash

# Deploy Preview and Production verification script

echo "=== Avatar Deployment Verification Script ==="
echo ""

# Function to check URLs
check_urls() {
  local base_url=$1
  local env_name=$2
  
  echo "🔍 Checking $env_name: $base_url"
  echo "================================================"
  
  ids="laughing cool angry sad love star_eyes peace determined playful worried proud curious grateful confident focused embarrassed relaxed mischievous supportive sparkle"
  
  success=0
  failed=0
  
  for id in $ids; do
    url="$base_url/logo/smaichan_${id}.png"
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "Cache-Control: no-cache" -I "$url")
    
    if [ "$code" = "200" ]; then
      echo "✅ $code  smaichan_${id}.png"
      ((success++))
    else
      echo "❌ $code  smaichan_${id}.png"
      ((failed++))
    fi
  done
  
  echo ""
  echo "📊 Summary for $env_name:"
  echo "  ✅ Success: $success/20"
  echo "  ❌ Failed: $failed/20"
  echo ""
  
  return $failed
}

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <deploy-preview-url> [production-url]"
  echo ""
  echo "Example:"
  echo "  $0 https://deploy-preview-123--cute-frangipane-efe657.netlify.app"
  echo "  $0 DP https://cute-frangipane-efe657.netlify.app"
  exit 1
fi

# Deploy Preview check
DP_URL=$1
check_urls "$DP_URL" "Deploy Preview"
dp_failures=$?

# Production check (if provided)
if [ ! -z "$2" ]; then
  PROD_URL=$2
  check_urls "$PROD_URL" "Production"
  prod_failures=$?
else
  PROD_URL="https://cute-frangipane-efe657.netlify.app"
  echo "ℹ️  To check production, run:"
  echo "  $0 $DP_URL $PROD_URL"
  prod_failures=0
fi

# JavaScript console test
echo "📝 Browser Console Test (paste this in DevTools):"
echo ""
cat << 'EOF'
const ids=["laughing","cool","angry","sad","love","star_eyes","peace","determined","playful","worried","proud","curious","grateful","confident","focused","embarrassed","relaxed","mischievous","supportive","sparkle"];
Promise.all(ids.map(id =>
  fetch(`/logo/smaichan_${id}.png`, { method:'HEAD', cache:'no-store' })
    .then(r => ({ id, ok:r.ok, status:r.status }))
    .catch(() => ({ id, ok:false, status:'ERR' }))
)).then(results => {
  console.table(results);
  const success = results.filter(r => r.ok).length;
  console.log(`✅ Success: ${success}/20`);
  console.log(`❌ Failed: ${20-success}/20`);
});
EOF

echo ""
echo "=============================================="
echo "🎯 FINAL RESULTS:"

if [ $dp_failures -eq 0 ]; then
  echo "  ✅ Deploy Preview: ALL PASS (20/20)"
else
  echo "  ❌ Deploy Preview: $dp_failures files failed"
fi

if [ ! -z "$2" ]; then
  if [ $prod_failures -eq 0 ]; then
    echo "  ✅ Production: ALL PASS (20/20)"
  else
    echo "  ❌ Production: $prod_failures files failed"
  fi
fi

exit $(($dp_failures + $prod_failures))