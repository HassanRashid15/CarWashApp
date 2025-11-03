# Car Wash App - Folder Structure

This document describes the organization and purpose of each directory in the project.

## 📁 Root Directory

```
CarWashApp/
├── app/                    # Next.js App Router (Pages & Routes)
├── components/             # React Components
├── lib/                    # Shared Libraries & Utilities
├── public/                 # Static Assets
├── supabase/               # Database Migrations
├── middleware.ts           # Next.js Middleware
└── Configuration Files     # package.json, tsconfig.json, etc.
```

---

## 📂 `/app` - Next.js App Directory

Next.js 13+ App Router structure containing pages, layouts, and API routes.

### `/app/(home)/` - Public Home Routes
- `page.tsx` - Homepage
- `home-page-client.tsx` - Client-side home page component
- `layout.tsx` - Layout wrapper for home routes
- `about/page.tsx` - About page
- `contact/page.tsx` - Contact page
- `services/page.tsx` - Services page
- `queue/page.tsx` - Public queue view

### `/app/auth/` - Authentication Pages
- `layout.tsx` - Auth layout wrapper
- `login/page.tsx` - Login page
- `signup/page.tsx` - Sign up page
- `verify/page.tsx` - Email verification page
- `reset-password/page.tsx` - Password reset request page
- `new-password/page.tsx` - New password creation page

### `/app/dashboard/` - Protected Dashboard Pages
- `layout.tsx` - Dashboard layout with navigation
- `page.tsx` - Dashboard homepage
- `profile/page.tsx` - User profile management
- `settings/page.tsx` - Application settings
- `customers/page.tsx` - Customer management
- `workers/page.tsx` - Worker management
- `queue/page.tsx` - Queue management

### `/app/api/` - API Routes (Backend Endpoints)

#### Customer Management
- `customers/route.ts` - GET/POST customers
- `customers/[id]/route.ts` - GET/PUT/DELETE specific customer

#### Worker Management
- `workers/route.ts` - GET/POST workers
- `workers/[id]/route.ts` - GET/PUT/DELETE specific worker
- `upload-worker-image/route.ts` - Upload worker profile images

#### Queue Management
- `queue/route.ts` - GET/POST queue entries
- `queue/[id]/route.ts` - PUT/DELETE specific queue entry
- `queue/public/route.ts` - Public queue API

#### Authentication & Profile
- `check-duplicates/route.ts` - Check for duplicate emails/contacts
- `check-profile/route.ts` - Check user profile existence
- `update-profile/route.ts` - Update user profile
- `upload-profile/route.ts` - Upload profile images

#### Code Management (Admin/Screen/Recovery Codes)
- `generate-codes/route.ts` - Generate user codes
- `store-admin-code/route.ts` - Store admin codes
- `validate-admin-code/route.ts` - Validate admin codes
- `validate-screen-code/route.ts` - Validate screen codes
- `validate-recovery-code/route.ts` - Validate recovery codes

#### Email
- `resend/route.ts` - Resend verification/reset emails

### Other App Files
- `layout.tsx` - Root layout
- `globals.css` - Global styles
- `favicon.ico` - Site favicon

---

## 📂 `/components` - React Components

Reusable UI components organized by feature.

### `/components/auth/` - Authentication Components
- `auth-form.tsx` - Base authentication form
- `login-form.tsx` - Login form component
- `signup-form.tsx` - Sign up form component
- `verify-form.tsx` - Email verification form
- `reset-password-form.tsx` - Password reset form
- `new-password-form.tsx` - New password form
- `admin-code-modal.tsx` - Admin code entry modal

### `/components/dashboard/` - Dashboard Components
- `dashboard-layout.tsx` - Main dashboard layout wrapper
- `welcome-section.tsx` - Welcome banner component
- `stats-card.tsx` - Statistics card component
- `chart-card.tsx` - Chart wrapper component
- `placeholder-chart.tsx` - Placeholder chart component
- `activity-list.tsx` - Activity feed component
- `user-menu.tsx` - User menu dropdown

### `/components/layout/` - Layout Components
- `navbar.tsx` - Server-side navbar
- `navbar-client.tsx` - Client-side navbar
- `footer.tsx` - Footer component

### `/components/theme/` - Theme Components
- `theme-provider.tsx` - Theme context provider
- `theme-toggle.tsx` - Dark/light mode toggle

### `/components/ui/` - UI Primitives (shadcn/ui)
Base UI components built on Radix UI:
- `alert.tsx` - Alert component
- `avatar.tsx` - Avatar component
- `button.tsx` - Button component
- `card.tsx` - Card component
- `form.tsx` - Form wrapper with react-hook-form
- `input.tsx` - Input field component
- `label.tsx` - Label component
- `separator.tsx` - Separator/divider
- `sonner.tsx` - Toast notification provider
- `switch.tsx` - Toggle switch
- `tabs.tsx` - Tabs component

---

## 📂 `/lib` - Shared Libraries & Utilities

Shared code, utilities, and helper functions.

### `/lib/supabase/` - Supabase Client Configuration
- `client.ts` - Browser-side Supabase client
- `server.ts` - Server-side Supabase client & admin client
- `middleware.ts` - Supabase middleware for session management

### `/lib/email/` - Email Utilities
- `brevo.ts` - Brevo email service integration
- `email-html.ts` - HTML email template generators

### `/lib/emails/` - Email Templates (React Email)
- `welcome-email.tsx` - Welcome email template
- `verification-email.tsx` - Email verification template
- `reset-password-email.tsx` - Password reset email template
- `password-reset-confirmation-email.tsx` - Password reset confirmation template

### `/lib/utils/` - Utility Functions
- `auth-helpers.ts` - Authentication helper functions
- `admin-helpers.ts` - Admin code generation utilities
- `validation.ts` - Zod validation schemas
- `utils.ts` - General utilities (cn function for className merging)

---

## 📂 `/public` - Static Assets

Static files served directly:
- `herocar.png` - Hero image asset

---

## 📂 `/supabase` - Database Migrations

SQL migration files for Supabase database schema:

### `/supabase/migrations/`
- `supabase-customers-table.sql` - Customers table schema
- `supabase-workers-table.sql` - Workers table schema
- `supabase-queue-table.sql` - Queue table schema
- `supabase-queue-public-access.sql` - Queue table public access policies
- `supabase-add-missing-columns.sql` - Migration to add missing columns to Workers table

---

## 🔧 Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration
- `components.json` - shadcn/ui configuration
- `middleware.ts` - Next.js middleware for auth routing
- `.env.local` - Environment variables (not in repo)

---

## 📝 Best Practices

### Import Paths
- Use `@/` alias for root imports (configured in `tsconfig.json`)
- Example: `import { createClient } from '@/lib/supabase/client'`

### Component Organization
- Place page-specific components near their pages
- Shared components go in `/components`
- UI primitives stay in `/components/ui`

### File Naming
- Components: PascalCase (e.g., `UserMenu.tsx`)
- Utilities: kebab-case (e.g., `auth-helpers.ts`)
- API routes: `route.ts` (Next.js convention)

### Type Safety
- Use TypeScript for all files
- Define types in the same file or create `/lib/types/` for shared types

---

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables in `.env.local`
3. Run database migrations in Supabase dashboard
4. Start development server: `npm run dev`

---

## 📚 Additional Notes

- The project uses **Next.js 15** with App Router
- **Supabase** for authentication and database
- **shadcn/ui** for UI components
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **React Email** for email templates
- **Resend** and **Brevo** for email delivery


