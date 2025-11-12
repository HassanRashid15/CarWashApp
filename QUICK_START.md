# AquaVance - Quick Start Guide

## Overview
AquaVance is a comprehensive car wash management system built with Next.js, React, and Supabase.

## Key Features at a Glance

✅ **Customer Management** - Manage unlimited customers (plan-based limits)  
✅ **Service Bookings** - Complete booking system with status tracking  
✅ **Queue Management** - Real-time queue for service operations  
✅ **Worker Management** - Assign and track workers  
✅ **Subscription Plans** - Three-tier pricing (Starter/Professional/Enterprise)  
✅ **Payment Processing** - Stripe integration for secure payments  
✅ **Analytics Dashboard** - Business insights and reporting  
✅ **2FA Security** - Two-factor authentication support  
✅ **Email Notifications** - Automated email system  

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email**: Brevo (with Resend fallback)
- **Monitoring**: Vercel Logs (free, built-in)
- **Styling**: Tailwind CSS

## Subscription Plans

| Plan | Price | Customers | Features |
|------|-------|-----------|----------|
| **Starter** | $29/mo | Up to 15 | Basic features |
| **Professional** | $79/mo | Up to 50 | Advanced features |
| **Enterprise** | $199/mo | Unlimited | All features |

## User Roles

- **Super Admin**: Full system access
- **Admin**: Business owner with plan-based limits
- **Worker**: Limited access for service operations
- **Customer**: Public interface access

## Quick Setup

1. Install dependencies: `npm install`
2. Configure environment variables (see DOCUMENTATION.md)
3. Run development server: `npm run dev`
4. Access: `http://localhost:3000`

## Main Modules

- `/dashboard` - Main dashboard
- `/dashboard/customers` - Customer management
- `/dashboard/queue` - Queue management
- `/dashboard/workers` - Worker management
- `/dashboard/subscriptions` - Subscription management
- `/dashboard/analytics` - Analytics and reports

## API Endpoints

- `/api/customers` - Customer management
- `/api/queue` - Queue operations
- `/api/service-bookings` - Booking management
- `/api/subscriptions` - Subscription operations
- `/api/admin/*` - Admin operations

## Security Features

- Email verification
- 2FA support
- Role-based access control
- Secure payment processing
- Error monitoring (Sentry)

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md)


