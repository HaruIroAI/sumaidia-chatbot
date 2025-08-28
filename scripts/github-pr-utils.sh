#!/bin/bash

# ============================================
# GitHub PR Utility Functions
# ============================================
# Collection of reusable functions for PR automation
# Source this file in other scripts:
#   source ./scripts/github-pr-utils.sh
# ============================================

# Load environment
load_github_token() {
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
  fi
  
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set"
    return 1
  fi
  return 0
}

# Create a PR via GitHub API
create_pr() {
  local branch="$1"
  local title="$2"
  local body="$3"
  local repo="${4:-HaruIroAI/sumaidia-chatbot}"
  
  local response=$(curl -s -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${repo}/pulls" \
    -d "{
      \"title\": \"$title\",
      \"body\": \"$body\",
      \"head\": \"$branch\",
      \"base\": \"main\"
    }")
  
  echo "$response"
}

# Get Deploy Preview URL from PR
get_deploy_preview() {
  local pr_number="$1"
  local repo="${2:-HaruIroAI/sumaidia-chatbot}"
  local max_wait="${3:-180}"
  
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    local comments=$(curl -s \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      "https://api.github.com/repos/${repo}/issues/${pr_number}/comments")
    
    local deploy_url=$(echo "$comments" | grep -o "https://deploy-preview-[^\"]*netlify.app" | head -1)
    
    if [ -n "$deploy_url" ]; then
      echo "$deploy_url"
      return 0
    fi
    
    sleep 10
    elapsed=$((elapsed + 10))
  done
  
  return 1
}

# Verify images at URL
verify_images() {
  local base_url="$1"
  shift
  local images=("$@")
  
  local failed=0
  local success=0
  
  for image in "${images[@]}"; do
    local url="${base_url}/logo/${image}"
    local status=$(curl -s -o /dev/null -w "%{http_code}" -I "$url")
    
    if [ "$status" = "200" ]; then
      echo "✅ $status $image"
      ((success++))
    else
      echo "❌ $status $image"
      ((failed++))
    fi
  done
  
  echo ""
  echo "Results: ✅ $success / ❌ $failed"
  
  return $failed
}

# Merge PR via API
merge_pr() {
  local pr_number="$1"
  local repo="${2:-HaruIroAI/sumaidia-chatbot}"
  local method="${3:-squash}"
  
  local response=$(curl -s -X PUT \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${repo}/pulls/${pr_number}/merge" \
    -d "{
      \"merge_method\": \"$method\"
    }")
  
  if echo "$response" | grep -q '"merged":true'; then
    return 0
  else
    return 1
  fi
}

# List PRs
list_prs() {
  local repo="${1:-HaruIroAI/sumaidia-chatbot}"
  local state="${2:-open}"
  
  curl -s \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${repo}/pulls?state=${state}" \
    | grep -E '"number"|"title"|"html_url"' \
    | sed 'N;N;s/\n/ /g' \
    | sed 's/.*"number": \([0-9]*\).*"title": "\([^"]*\)".*"html_url": "\([^"]*\)".*/PR #\1: \2\n  URL: \3\n/'
}

# Check CI status
check_ci_status() {
  local pr_number="$1"
  local repo="${2:-HaruIroAI/sumaidia-chatbot}"
  
  local response=$(curl -s \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${repo}/pulls/${pr_number}")
  
  local sha=$(echo "$response" | grep -o '"sha":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  local status=$(curl -s \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${repo}/commits/${sha}/status" \
    | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
  
  echo "$status"
}