# Resend Domain Verification Setup Guide

This guide will help you verify your domain in Resend so that verification emails can be sent to **any email address**, not just test emails.

## Current Issue

Right now, emails only work for `hassanrashid0018@gmail.com` because:
- You're using `onboarding@resend.dev` (Resend's test email)
- Test emails only work for verified recipients (usually the account owner)
- Other email addresses are blocked by Resend for security

## 🆓 Free Testing Options (Before Domain Verification)

### Option A: Add Test Recipients (Recommended for Free Testing)

You can add multiple email addresses as "test recipients" in Resend - **completely free**!

1. **Go to Resend Dashboard**
   - Visit: https://resend.com/settings/recipients
   - Or: https://resend.com → Settings → Recipients

2. **Click "Add Recipient"**

3. **Add Email Addresses**
   - Enter each email you want to test with
   - Example: `test@gmail.com`, `test2@yahoo.com`, etc.
   - You can add multiple recipients

4. **Verify Each Email**
   - Resend will send a verification email to each address
   - Click the verification link in the email
   - Once verified, you can send emails to that address!

5. **Use as Normal**
   - Keep using `onboarding@resend.dev` as your `RESEND_FROM_EMAIL`
   - Or leave `RESEND_FROM_EMAIL` empty in `.env.local`
   - Emails will now work for all verified test recipients!

**Note**: This is perfect for development/testing. For production, you'll still want to verify a domain.

### Option B: Use Resend Test Email Addresses

Resend provides special test email addresses that simulate different scenarios:

- `delivered@resend.dev` - Simulates successful delivery
- `bounced@resend.dev` - Simulates bounced email
- `complained@resend.dev` - Simulates spam complaint

These work immediately without verification, but they're only for testing email flow, not actual delivery.

---

## Solution: Verify Your Domain (For Production)

Once you verify a domain, you can send emails to **any email address** without adding them as test recipients.

---

## Step-by-Step Setup

### Step 1: Get a Domain (If You Don't Have One)

If you don't have a domain yet, you can get one from:
- **Namecheap** (https://www.namecheap.com) - ~$8-15/year
- **GoDaddy** (https://www.godaddy.com) - ~$12-20/year
- **Google Domains** (https://domains.google) - ~$12/year
- **Cloudflare** (https://www.cloudflare.com/products/registrar/) - At cost price

**Common options for email:**
- `yourdomain.com`
- `yourbusiness.com`
- `carwashapp.com` (if available)

---

### Step 2: Add Domain in Resend Dashboard

1. **Go to Resend Dashboard**
   - Visit: https://resend.com/domains
   - Or: https://resend.com → Login → Domains

2. **Click "Add Domain"**
   - Enter your domain (e.g., `yourdomain.com`)
   - **Do NOT** include `www` or `http://`
   - Just the domain: `yourdomain.com`

3. **Click "Add"**

---

### Step 3: Add DNS Records

After adding the domain, Resend will show you DNS records to add. You'll see something like:

#### **SPF Record** (Text/TXT record)
```
Type: TXT
Name: @ (or yourdomain.com)
Value: v=spf1 include:resend.com ~all
TTL: 3600 (or Auto)
```

#### **DKIM Record** (Text/TXT record)
```
Type: TXT
Name: resend._domainkey (or resend._domainkey.yourdomain.com)
Value: [Resend will provide a long string]
TTL: 3600 (or Auto)
```

#### **DMARC Record** (Optional but Recommended)
```
Type: TXT
Name: _dmarc (or _dmarc.yourdomain.com)
Value: v=DMARC1; p=none; rua=mailto:youremail@yourdomain.com
TTL: 3600 (or Auto)
```

---

### Step 4: Where to Add DNS Records

#### **If your domain is registered with:**
- **Namecheap**: Go to Domain List → Manage → Advanced DNS
- **GoDaddy**: Go to My Products → DNS → Manage DNS
- **Google Domains**: Go to DNS → Custom Records
- **Cloudflare**: Go to DNS → Records → Add Record

#### **If you use Cloudflare for DNS:**
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add Record**
5. Add each record as shown in Resend

---

### Step 5: Wait for Verification

- **DNS Propagation**: Usually takes 5 minutes to 48 hours
- **Resend Checks Automatically**: Check status in Resend dashboard
- **Status Shows**: "Pending" → "Verified" (green checkmark)

**Tip**: You can check DNS propagation status using:
- https://dnschecker.org
- Search for your domain's TXT records

---

### Step 6: Configure Environment Variable

Once verified (green checkmark in Resend):

1. **Open your `.env.local` file**

2. **Add or update this line:**
   ```env
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

   **You can use any email from your verified domain:**
   - `noreply@yourdomain.com` (recommended)
   - `support@yourdomain.com`
   - `hello@yourdomain.com`
   - `verify@yourdomain.com`

3. **Save the file**

4. **Restart your development server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Step 7: Configure Vercel (For Production)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → Environment Variables**

3. **Add Variable:**
   - **Name**: `RESEND_FROM_EMAIL`
   - **Value**: `noreply@yourdomain.com` (or your chosen email)
   - **Environment**: Production, Preview, Development (select all)

4. **Click "Save"**

5. **Redeploy** (or wait for auto-deploy)

---

### Step 8: Test It!

1. **Test in Development:**
   ```bash
   # Visit this URL or use your app
   http://localhost:3000/api/test-email
   ```
   Send a test email to any address!

2. **Test Signup Flow:**
   - Try signing up with a different email (not hassanrashid0018@gmail.com)
   - You should receive the verification code!

---

## Troubleshooting

### ❌ "Invalid sender" or "Domain not verified"
- Make sure DNS records are added correctly
- Wait for DNS propagation (can take up to 48 hours)
- Check DNS records using https://dnschecker.org

### ❌ "Email not sending"
- Check that `RESEND_FROM_EMAIL` is set in `.env.local`
- Restart your dev server after updating `.env.local`
- Check server console for detailed error messages

### ❌ "Still only works for one email"
- Verify domain shows "Verified" (green) in Resend dashboard
- Make sure `RESEND_FROM_EMAIL` is set to an email from your verified domain
- Check that environment variable is loaded: visit `/api/env-check`

---

## Quick Checklist

- [ ] Domain purchased/available
- [ ] Domain added in Resend dashboard
- [ ] DNS records (SPF, DKIM) added to domain
- [ ] Domain verified (green checkmark in Resend)
- [ ] `RESEND_FROM_EMAIL` added to `.env.local`
- [ ] Dev server restarted
- [ ] `RESEND_FROM_EMAIL` added to Vercel environment variables
- [ ] Tested with a different email address

---

## Need Help?

If you're stuck:
1. Check Resend Dashboard → Domains → Status
2. Check your domain's DNS records
3. Check server console logs (detailed errors are now logged)
4. Visit `/api/env-check` to verify environment variables

Once your domain is verified, verification emails will work for **all email addresses**! 🎉

