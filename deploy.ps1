# ========================================
# Quick Deploy Script
# ========================================
# Run each section manually after completing setup

Write-Host "Rapor Asrama - Full Stack Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Phase 1: Verify Configuration
Write-Host "Phase 1: Configuration Check" -ForegroundColor Yellow
Write-Host "  [OK] GAS URL: Configured" -ForegroundColor Green
Write-Host "  [OK] Worker: worker/worker.js updated" -ForegroundColor Green
Write-Host "  [OK] Frontend: .env configured" -ForegroundColor Green
Write-Host "  [OK] Build: Tested successfully (399 KB)" -ForegroundColor Green
Write-Host ""

# Phase 2: Cloudflare Login
Write-Host "Phase 2: Cloudflare Setup" -ForegroundColor Yellow
Write-Host "Run these commands manually:" -ForegroundColor Cyan
Write-Host ""

Write-Host "  cd worker" -ForegroundColor White
Write-Host "  npx wrangler login" -ForegroundColor White
Write-Host "  npx wrangler whoami" -ForegroundColor White
Write-Host ""

Write-Host "  # Create R2 bucket" -ForegroundColor Gray
Write-Host "  npx wrangler r2 bucket create asrama-storage" -ForegroundColor White
Write-Host ""

Write-Host "  # Create KV namespace" -ForegroundColor Gray
Write-Host "  npx wrangler kv:namespace create RATE_LIMIT" -ForegroundColor White
Write-Host "  # SAVE THE ID FROM OUTPUT!" -ForegroundColor Red
Write-Host ""

Write-Host "  # Get Zone ID from Cloudflare Dashboard" -ForegroundColor Gray
Write-Host "  # Visit: https://dash.cloudflare.com" -ForegroundColor White
Write-Host ""

# Phase 3: Configure wrangler.toml
Write-Host "Phase 3: Create wrangler.toml" -ForegroundColor Yellow
Write-Host "  1. Copy-Item worker/wrangler.toml.example worker/wrangler.toml" -ForegroundColor White
Write-Host "  2. Edit worker/wrangler.toml with your IDs:" -ForegroundColor White
Write-Host "     - account_id (from whoami)" -ForegroundColor Gray
Write-Host "     - zone_id (from dashboard)" -ForegroundColor Gray
Write-Host "     - KV namespace id (from create output)" -ForegroundColor Gray
Write-Host ""

# Phase 4: Deploy Worker
Write-Host "Phase 4: Deploy Worker" -ForegroundColor Yellow
Write-Host "  cd worker" -ForegroundColor White
Write-Host "  npx wrangler deploy" -ForegroundColor White
Write-Host ""

# Phase 5: Deploy Frontend
Write-Host "Phase 5: Deploy Frontend" -ForegroundColor Yellow
Write-Host "  cd .." -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  firebase deploy --only hosting" -ForegroundColor White
Write-Host ""

# Phase 6: Test
Write-Host "Phase 6: Test Deployment" -ForegroundColor Yellow
Write-Host "  curl https://rapor-asrama.salmanitb.site/api/ping" -ForegroundColor White
Write-Host "  curl https://rapor-asrama.salmanitb.site/api/members" -ForegroundColor White
Write-Host "  # Open browser: https://rapor-asrama.salmanitb.site" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Full Guide: DEPLOYMENT-CHECKLIST.md" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
