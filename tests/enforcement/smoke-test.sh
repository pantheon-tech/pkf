#!/usr/bin/env bash
# PKF Enforcement Layer Smoke Tests
# Simple validation that enforcement scripts work

set -e

echo "=== PKF Enforcement Layer Smoke Tests ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Test helper function
test_command() {
  local name="$1"
  local command="$2"
  local should_pass="$3"  # "pass" or "fail"

  echo -n "Testing: $name... "

  if eval "$command" &>/dev/null; then
    if [ "$should_pass" = "pass" ]; then
      echo -e "${GREEN}✓ PASS${NC}"
      PASS=$((PASS + 1))
    else
      echo -e "${RED}✗ FAIL${NC} (expected to fail but passed)"
      FAIL=$((FAIL + 1))
    fi
  else
    if [ "$should_pass" = "fail" ]; then
      echo -e "${GREEN}✓ PASS${NC} (correctly failed)"
      PASS=$((PASS + 1))
    else
      echo -e "${RED}✗ FAIL${NC} (expected to pass but failed)"
      FAIL=$((FAIL + 1))
    fi
  fi
}

echo "1. Testing pkf:build script"
test_command "pkf:build exists" "grep -q 'pkf:build' package.json" "pass"

echo ""
echo "2. Testing validation scripts exist"
test_command "pkf:validate exists" "grep -q 'pkf:validate' package.json" "pass"
test_command "pkf:validate:config exists" "grep -q 'pkf:validate:config' package.json" "pass"
test_command "pkf:validate:structure exists" "grep -q 'pkf:validate:structure' package.json" "pass"
test_command "pkf:validate:frontmatter exists" "grep -q 'pkf:validate:frontmatter' package.json" "pass"
test_command "pkf:validate:links exists" "grep -q 'pkf:validate:links' package.json" "pass"
test_command "pkf:validate:prose exists" "grep -q 'pkf:validate:prose' package.json" "pass"

echo ""
echo "3. Testing configuration files"
test_command ".remarkrc.mjs exists" "[ -f .remarkrc.mjs ]" "pass"
test_command ".vale.ini exists" "[ -f .vale.ini ]" "pass"
test_command ".husky/pre-commit exists" "[ -f .husky/pre-commit ]" "pass"
test_command "pre-commit is executable" "[ -x .husky/pre-commit ]" "pass"
test_command "GitHub Actions workflow exists" "[ -f .github/workflows/pkf-validate.yml ]" "pass"

echo ""
echo "4. Testing remark configuration"
test_command "remark config is valid JS" "node --check .remarkrc.mjs" "pass"

echo ""
echo "5. Testing package dependencies"
test_command "ajv-cli installed" "[ -f node_modules/.bin/ajv ]" "pass"
test_command "remark installed" "[ -f node_modules/.bin/remark ]" "pass"
test_command "husky installed" "[ -d node_modules/husky ]" "pass"
test_command "lint-staged installed" "[ -f node_modules/.bin/lint-staged ]" "pass"

echo ""
echo "=== Summary ==="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
