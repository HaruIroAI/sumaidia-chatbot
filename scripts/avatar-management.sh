#!/bin/bash
set -e

# ============================================
# Avatar Management Automation Script
# ============================================
# This script automates:
# 1. Detection of missing required avatar files
# 2. Creation of cleanup PRs for unnecessary files
# 3. Verification after deployment
# 
# UPDATED: Now manages 30 required files (10 existing + 20 new)
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Required avatar files (30 total: 10 existing + 20 new)
# Existing 10 files
EXISTING_FILES=(
  "smaichan.png"           # Base version - ALWAYS KEEP
  "smaichan_happy.png"
  "smaichan_excited.png"
  "smaichan_surprised.png"
  "smaichan_confused.png"
  "smaichan_thinking.png"
  "smaichan_sleepy.png"
  "smaichan_wink.png"
  "smaichan_shy.png"
  "smaichan_motivated.png"
)

# New 20 files
NEW_FILES=(
  "smaichan_laughing.png"
  "smaichan_cool.png"
  "smaichan_angry.png"
  "smaichan_sad.png"
  "smaichan_love.png"
  "smaichan_star_eyes.png"
  "smaichan_peace.png"
  "smaichan_determined.png"
  "smaichan_playful.png"
  "smaichan_worried.png"
  "smaichan_proud.png"
  "smaichan_curious.png"
  "smaichan_grateful.png"
  "smaichan_confident.png"
  "smaichan_focused.png"
  "smaichan_embarrassed.png"
  "smaichan_relaxed.png"
  "smaichan_mischievous.png"
  "smaichan_supportive.png"
  "smaichan_sparkle.png"
)

# Combine all required files (30 total)
REQUIRED_FILES=("${EXISTING_FILES[@]}" "${NEW_FILES[@]}")

# Function: Check current avatar status
check_avatar_status() {
  echo -e "${BLUE}📊 Avatar Status Check${NC}"
  echo "======================================"
  echo "Required: 30 files (10 existing + 20 new)"
  echo ""
  
  # Count current files
  local current_count=$(ls logo/*.png 2>/dev/null | wc -l | xargs)
  echo "Current PNG files: $current_count"
  echo ""
  
  # Check existing files status
  echo -e "${BLUE}Existing files (10):${NC}"
  local existing_present=0
  local existing_missing=0
  for file in "${EXISTING_FILES[@]}"; do
    if [ -f "logo/$file" ]; then
      echo -e "  ✅ $file"
      ((existing_present++))
    else
      echo -e "  ❌ $file"
      ((existing_missing++))
    fi
  done
  echo "  Status: $existing_present/10 present"
  echo ""
  
  # Check new files status
  echo -e "${BLUE}New files (20):${NC}"
  local new_present=0
  local new_missing=0
  for file in "${NEW_FILES[@]}"; do
    if [ -f "logo/$file" ]; then
      echo -e "  ✅ $file"
      ((new_present++))
    else
      echo -e "  ❌ $file"
      ((new_missing++))
    fi
  done
  echo "  Status: $new_present/20 present"
  echo ""
  
  # Total summary
  local total_present=$((existing_present + new_present))
  local total_missing=$((existing_missing + new_missing))
  
  echo -e "${BLUE}📊 Overall Summary:${NC}"
  echo "  Required: 30 files"
  echo "  Present: $total_present/30"
  echo "  Missing: $total_missing/30"
  
  if [ $total_present -eq 30 ]; then
    echo -e "  ${GREEN}✅ All required files present (30/30)${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Missing $total_missing files${NC}"
  fi
  echo ""
  
  # Check for unnecessary files
  local extra_files=()
  for file in logo/*.png; do
    [ ! -f "$file" ] && continue
    
    local filename=$(basename "$file")
    local is_required=false
    
    for required in "${REQUIRED_FILES[@]}"; do
      if [ "$filename" = "$required" ]; then
        is_required=true
        break
      fi
    done
    
    if [ "$is_required" = false ]; then
      extra_files+=("$filename")
    fi
  done
  
  if [ ${#extra_files[@]} -gt 0 ]; then
    echo -e "${YELLOW}🗑️  Unnecessary files (${#extra_files[@]}):${NC}"
    for file in "${extra_files[@]}"; do
      echo "  - $file"
    done
  else
    echo -e "${GREEN}✅ No unnecessary files${NC}"
  fi
  echo ""
  
  return $total_missing
}

# Function: Validate deletion safety
validate_deletion_safety() {
  local file="$1"
  local filename=$(basename "$file")
  
  # CRITICAL: Never delete required files
  for required in "${REQUIRED_FILES[@]}"; do
    if [ "$filename" = "$required" ]; then
      echo -e "${RED}❌ SAFETY: Cannot delete required file: $filename${NC}"
      return 1
    fi
  done
  
  # Special protection for smaichan.png
  if [ "$filename" = "smaichan.png" ]; then
    echo -e "${RED}❌ SAFETY: Cannot delete base file: smaichan.png${NC}"
    return 1
  fi
  
  return 0
}

# Function: Create cleanup PR
create_cleanup_pr() {
  echo -e "${BLUE}🧹 Creating Cleanup PR${NC}"
  echo "======================================"
  
  local branch_name="cleanup/avatars-$(date +%Y%m%d-%H%M%S)"
  
  # Create branch
  git fetch origin main
  git checkout -b "$branch_name" origin/main
  
  # Collect files to remove with safety check
  local files_to_remove=()
  local protected_count=0
  
  for file in logo/*.png; do
    [ ! -f "$file" ] && continue
    
    local filename=$(basename "$file")
    local is_required=false
    
    for required in "${REQUIRED_FILES[@]}"; do
      if [ "$filename" = "$required" ]; then
        is_required=true
        break
      fi
    done
    
    if [ "$is_required" = false ]; then
      # Double-check with safety validation
      if validate_deletion_safety "$file"; then
        files_to_remove+=("$file")
      else
        ((protected_count++))
      fi
    fi
  done
  
  if [ ${#files_to_remove[@]} -eq 0 ]; then
    echo "No files to remove"
    git checkout main
    git branch -d "$branch_name"
    return 0
  fi
  
  if [ $protected_count -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Protected $protected_count files from deletion${NC}"
  fi
  
  # Remove files
  local removed_count=0
  for file in "${files_to_remove[@]}"; do
    git rm "$file"
    ((removed_count++))
    echo "  Removed: $(basename "$file")"
  done
  
  # Create detailed commit message
  local commit_message="cleanup: remove $removed_count unnecessary avatar files

Keeping 30 required avatar files:
- 10 existing: smaichan.png (base), happy, excited, surprised, confused, thinking, sleepy, wink, shy, motivated
- 20 new: laughing, cool, angry, sad, love, star_eyes, peace, determined, playful, worried, proud, curious, grateful, confident, focused, embarrassed, relaxed, mischievous, supportive, sparkle

Safety checks applied: Required files protected from deletion.
See PR description for full details."
  
  git commit -m "$commit_message"
  
  # Push
  git push origin "$branch_name"
  
  echo -e "${GREEN}✅ Branch pushed: $branch_name${NC}"
  echo "Create PR at: https://github.com/HaruIroAI/sumaidia-chatbot/compare/main...$branch_name"
  echo ""
  echo -e "${YELLOW}⚠️  Safety reminder: PR will need 'do-not-merge' label if any required files are included${NC}"
}

# Function: Generate verification script
generate_verification_script() {
  cat << 'EOF'
// Browser Console Verification Script - 30 Required Files
// Copy and run in browser console after deployment

(async function verifyAvatars() {
  // 10 existing + 20 new = 30 total required files
  const REQUIRED = [
    // Existing 10
    'smaichan.png', 'smaichan_happy.png', 'smaichan_excited.png', 
    'smaichan_surprised.png', 'smaichan_confused.png', 'smaichan_thinking.png',
    'smaichan_sleepy.png', 'smaichan_wink.png', 'smaichan_shy.png', 'smaichan_motivated.png',
    // New 20
    'smaichan_laughing.png', 'smaichan_cool.png', 'smaichan_angry.png',
    'smaichan_sad.png', 'smaichan_love.png', 'smaichan_star_eyes.png',
    'smaichan_peace.png', 'smaichan_determined.png', 'smaichan_playful.png',
    'smaichan_worried.png', 'smaichan_proud.png', 'smaichan_curious.png',
    'smaichan_grateful.png', 'smaichan_confident.png', 'smaichan_focused.png',
    'smaichan_embarrassed.png', 'smaichan_relaxed.png', 'smaichan_mischievous.png',
    'smaichan_supportive.png', 'smaichan_sparkle.png'
  ];
  
  console.log(`Checking ${REQUIRED.length} required files...`);
  const results = await Promise.all(
    REQUIRED.map(async f => {
      const r = await fetch(`${location.origin}/logo/${f}`, {method:'HEAD'});
      return {file: f, status: r.status, ok: r.ok};
    })
  );
  
  console.table(results);
  const ok = results.filter(r => r.ok).length;
  console.log(`✅ ${ok}/${REQUIRED.length} files OK`);
  
  if (ok < REQUIRED.length) {
    console.log('❌ Missing:', results.filter(r => !r.ok).map(r => r.file));
  } else {
    console.log('🎉 All 30 required avatar files are present!');
  }
})();
EOF
}

# Function: Check PR for required file deletion (GitHub CLI helper)
check_pr_safety() {
  local pr_number="$1"
  
  echo -e "${BLUE}🔍 Checking PR #$pr_number for required file deletions${NC}"
  echo "======================================"
  
  # This would need GitHub CLI or API access
  # For now, output the files that should never be deleted
  echo -e "${YELLOW}Required files that must NOT be deleted:${NC}"
  echo ""
  echo "Existing 10:"
  for file in "${EXISTING_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo "New 20:"
  for file in "${NEW_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo -e "${RED}⚠️  If any of these appear in PR's deleted files, add 'do-not-merge' label${NC}"
}

# Main menu
show_menu() {
  echo -e "${BLUE}🎨 Avatar Management Tool${NC}"
  echo "======================================"
  echo "Managing 30 required avatar files (10 existing + 20 new)"
  echo ""
  echo "1) Check avatar status (30 files)"
  echo "2) Create cleanup PR (with safety guards)"
  echo "3) Show verification script"
  echo "4) Check PR safety (list protected files)"
  echo "5) Full automation (check → cleanup if safe)"
  echo "6) Exit"
  echo ""
  read -p "Select option: " choice
  
  case $choice in
    1)
      check_avatar_status
      ;;
    2)
      create_cleanup_pr
      ;;
    3)
      echo -e "${BLUE}📋 Verification Script (30 files):${NC}"
      echo "======================================"
      generate_verification_script
      ;;
    4)
      read -p "Enter PR number: " pr_num
      check_pr_safety "$pr_num"
      ;;
    5)
      check_avatar_status
      if [ $? -gt 0 ]; then
        echo "Missing required files detected. Upload missing files before cleanup."
      else
        echo "Would you like to create a cleanup PR? (y/n)"
        read -p "> " confirm
        if [ "$confirm" = "y" ]; then
          create_cleanup_pr
        fi
      fi
      ;;
    6)
      echo "Goodbye!"
      exit 0
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# Parse command line arguments
if [ "$1" = "check" ]; then
  check_avatar_status
elif [ "$1" = "cleanup" ]; then
  create_cleanup_pr
elif [ "$1" = "verify" ]; then
  generate_verification_script
elif [ "$1" = "safety" ]; then
  check_pr_safety "$2"
elif [ "$1" = "auto" ]; then
  check_avatar_status
  if [ $? -eq 0 ]; then
    echo "All 30 required files present. Checking for cleanup..."
    create_cleanup_pr
  else
    echo "Missing required files. Please upload them first."
  fi
else
  show_menu
fi