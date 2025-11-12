# PowerShell script to help set up Stripe keys
# Run this script to get a template for your .env.local file

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stripe Keys Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Get your Stripe API keys" -ForegroundColor Yellow
Write-Host "1. Go to: https://stripe.com → Developers → API keys" -ForegroundColor White
Write-Host "2. Make sure 'Test mode' is ON" -ForegroundColor White
Write-Host "3. Copy your Publishable key (pk_test_...)" -ForegroundColor White
Write-Host "4. Click 'Reveal test key' and copy Secret key (sk_test_...)" -ForegroundColor White
Write-Host ""

Write-Host "Step 2: Create products in Stripe" -ForegroundColor Yellow
Write-Host "1. Go to: Stripe Dashboard → Products" -ForegroundColor White
Write-Host "2. Create 3 products with monthly prices:" -ForegroundColor White
Write-Host "   - Test Plan: $29/month" -ForegroundColor White
Write-Host "   - Professional Plan: $79/month" -ForegroundColor White
Write-Host "   - Enterprise Plan: $199/month" -ForegroundColor White
Write-Host "3. Copy the Price IDs (price_...)" -ForegroundColor White
Write-Host ""

$stripeSecretKey = Read-Host "Enter your Stripe Secret Key (sk_test_...)"
$stripePublishableKey = Read-Host "Enter your Stripe Publishable Key (pk_test_...)"
$starterPriceId = Read-Host "Enter Starter Plan Price ID (price_...)"
$professionalPriceId = Read-Host "Enter Professional Plan Price ID (price_...)"
$enterprisePriceId = Read-Host "Enter Enterprise Plan Price ID (price_...)"

Write-Host ""
Write-Host "Add these to your .env.local file:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "STRIPE_SECRET_KEY=$stripeSecretKey"
Write-Host "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$stripePublishableKey"
Write-Host "STRIPE_PRICE_ID_STARTER=$starterPriceId"
Write-Host "STRIPE_PRICE_ID_PROFESSIONAL=$professionalPriceId"
Write-Host "STRIPE_PRICE_ID_ENTERPRISE=$enterprisePriceId"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "After adding these, restart your dev server!" -ForegroundColor Yellow



