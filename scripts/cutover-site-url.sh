#!/usr/bin/env bash
# Cutover script — flip PUBLIC_SITE_URL on Netlify + GitHub Actions in one go.
#
# Usage:
#   NETLIFY_AUTH_TOKEN=xxx ./scripts/cutover-site-url.sh
#   NETLIFY_AUTH_TOKEN=xxx ./scripts/cutover-site-url.sh --rollback
#
# Requirements:
#   - gh CLI authenticated (gh auth login)
#   - NETLIFY_AUTH_TOKEN env var (Personal Access Token from
#     https://app.netlify.com/user/applications#personal-access-tokens)
#   - curl + jq

set -euo pipefail

NETLIFY_SITE_NAME="ma-papeterie-v1"
GH_REPO="Neo52000/ma-papeterie-v1"

NEW_URL="https://ma-papeterie.fr"
ROLLBACK_URL="https://ma-papeterie-v1.netlify.app"

if [[ "${1:-}" == "--rollback" ]]; then
  TARGET_URL="$ROLLBACK_URL"
  echo "🔄 ROLLBACK mode — flipping back to $TARGET_URL"
else
  TARGET_URL="$NEW_URL"
  echo "🚀 CUTOVER mode — flipping to $TARGET_URL"
fi

if [[ -z "${NETLIFY_AUTH_TOKEN:-}" ]]; then
  echo "❌ NETLIFY_AUTH_TOKEN env var missing."
  echo "   Create one at: https://app.netlify.com/user/applications#personal-access-tokens"
  echo "   Then re-run: NETLIFY_AUTH_TOKEN=xxx $0"
  exit 1
fi

command -v gh >/dev/null || { echo "❌ gh CLI missing"; exit 1; }
command -v python >/dev/null || { echo "❌ python missing"; exit 1; }

# Tiny JSON helper — extracts a key from stdin JSON. Usage: echo '{...}' | json_get '.key'
json_get() {
  python -c "import sys,json; d=json.load(sys.stdin)
try:
    out=eval('d$1')
except Exception:
    out=''
print(out if out is not None else '')"
}

echo ""
echo "── Step 1/4: resolve Netlify site ID ──"
SITE_ID=$(curl -sf -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  "https://api.netlify.com/api/v1/sites?name=$NETLIFY_SITE_NAME" \
  | json_get "[0]['id']")

if [[ -z "$SITE_ID" ]]; then
  echo "❌ Could not find Netlify site '$NETLIFY_SITE_NAME'"
  exit 1
fi
echo "✓ Site ID: $SITE_ID"

echo ""
echo "── Step 2/4: update Netlify env var PUBLIC_SITE_URL ──"
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.netlify.com/api/v1/accounts/_/env/PUBLIC_SITE_URL?site_id=$SITE_ID" \
  -d "{\"key\":\"PUBLIC_SITE_URL\",\"values\":[{\"context\":\"all\",\"value\":\"$TARGET_URL\"}]}" \
  || true)

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "⚠ PATCH returned $HTTP_CODE — trying alternate endpoint (site-scoped env)"
  curl -sf \
    -X PUT \
    -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/env/PUBLIC_SITE_URL" \
    -d "{\"key\":\"PUBLIC_SITE_URL\",\"values\":[{\"context\":\"all\",\"value\":\"$TARGET_URL\"}]}" \
    > /dev/null
fi
echo "✓ Netlify env var updated"

echo ""
echo "── Step 3/4: update GitHub Actions secret ──"
echo -n "$TARGET_URL" | gh secret set PUBLIC_SITE_URL --repo "$GH_REPO"
echo "✓ GitHub secret updated"

echo ""
echo "── Step 4/4: trigger Netlify redeploy (clear cache) ──"
DEPLOY_ID=$(curl -sf -X POST \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/builds" \
  -d '{"clear_cache":true}' \
  | json_get "['deploy_id'] if 'deploy_id' in d else d.get('id', '')")

if [[ -n "$DEPLOY_ID" ]]; then
  echo "✓ Redeploy triggered — deploy ID: $DEPLOY_ID"
  echo "  Watch: https://app.netlify.com/sites/$NETLIFY_SITE_NAME/deploys/$DEPLOY_ID"
else
  echo "⚠ Redeploy trigger returned no deploy ID — verify manually:"
  echo "  https://app.netlify.com/sites/$NETLIFY_SITE_NAME/deploys"
fi

echo ""
echo "✅ Done. PUBLIC_SITE_URL = $TARGET_URL on both Netlify + GitHub."
echo ""
echo "Next manual steps (not scripted):"
echo "  1. Wait for Netlify deploy ✓ green (~3 min)"
echo "  2. curl -I $TARGET_URL  → expect 200"
echo "  3. Shopify Return URL: https://admin.shopify.com/store/ma-papeterie52/settings/checkout"
echo "  4. Supabase Auth Site URL: https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr/auth/url-configuration"
echo "  5. Trigger one cron workflow to validate: https://github.com/$GH_REPO/actions/workflows/abandoned-cart.yml"
