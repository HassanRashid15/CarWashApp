This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev 
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend Email Configuration
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Email Configuration (Resend)

### Setting Up Domain Verification

To send emails to any email address (not just verified test emails), you need to verify a domain in Resend:

1. **Go to Resend Dashboard**
   - Visit https://resend.com/domains
   - Click "Add Domain"

2. **Enter Your Domain**
   - Enter your domain (e.g., `yourdomain.com`)
   - Click "Add"

3. **Configure DNS Records**
   - Resend will provide you with DNS records to add:
     - **SPF Record**: Prevents email spoofing
     - **DKIM Record**: Adds cryptographic signature
     - **DMARC Record** (optional but recommended): Email authentication policy
   
   Add these records to your domain's DNS settings (usually in your domain registrar or hosting provider).

4. **Wait for Verification**
   - DNS propagation can take a few minutes to 48 hours
   - Resend will automatically verify your domain once DNS records are detected

5. **Set Environment Variable**
   - Once verified, add to your `.env.local`:
     ```
     RESEND_FROM_EMAIL=noreply@yourdomain.com
     ```
   - Or use any email address from your verified domain (e.g., `support@yourdomain.com`, `hello@yourdomain.com`)

6. **Deploy to Vercel**
   - Add the same `RESEND_FROM_EMAIL` environment variable in your Vercel project settings
   - Go to: Project Settings → Environment Variables

### Testing Email Configuration

- **Development**: Without `RESEND_FROM_EMAIL`, emails will only work for verified recipients (usually the account owner)
- **Production**: With a verified domain and `RESEND_FROM_EMAIL` set, emails will work for all recipients

You can test your email configuration by calling the `/api/test-email` endpoint.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
