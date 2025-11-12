# AquaVance - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │   Mobile     │  │   Tablet     │     │
│  │   (React)    │  │   (React)    │  │   (React)    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    NEXT.JS APPLICATION                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MIDDLEWARE LAYER                        │   │
│  │  • Authentication Check                              │   │
│  │  • Route Protection                                  │   │
│  │  • Session Management                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              APP ROUTER                              │   │
│  │  • Public Pages (Home, Services, Contact)           │   │
│  │  • Auth Pages (Login, Signup, Verify)               │   │
│  │  • Dashboard Pages (Protected)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API ROUTES                              │   │
│  │  • /api/customers                                    │   │
│  │  • /api/queue                                        │   │
│  │  • /api/subscriptions                                │   │
│  │  • /api/service-bookings                             │   │
│  │  • /api/admin/*                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    EXTERNAL SERVICES                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   SUPABASE   │  │    STRIPE    │  │    BREVO     │       │
│  │             │  │              │  │              │       │
│  │ • Database  │  │ • Payments   │  │ • Email      │       │
│  │ • Auth      │  │ • Webhooks   │  │ • Templates  │       │
│  │ • Storage   │  │ • Subscriptions│ │ • Delivery  │       │
│  │ • Realtime  │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐                                            │
│  │    SENTRY    │                                            │
│  │              │                                            │
│  │ • Error Tracking                                          │
│  │ • Performance Monitoring                                  │
│  │ • Alerts                                                  │
│  └──────────────┘                                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────┐
│   Client    │
│  Component  │
└──────┬──────┘
       │
       │ 1. User Action
       ▼
┌─────────────────────┐
│  Next.js API Route  │
│  (Server Component) │
└──────┬──────────────┘
       │
       │ 2. Validate Request
       │    • Authentication
       │    • Authorization
       │    • Input Validation
       ▼
┌─────────────────────┐
│  Supabase Client     │
│  (Database Query)    │
└──────┬──────────────┘
       │
       │ 3. Execute Query
       ▼
┌─────────────────────┐
│   Supabase Database │
│   (PostgreSQL)       │
└──────┬──────────────┘
       │
       │ 4. Return Data
       ▼
┌─────────────────────┐
│  API Response       │
│  (JSON)             │
└──────┬──────────────┘
       │
       │ 5. Update UI
       ▼
┌─────────────┐
│   Client    │
│  Component  │
└─────────────┘
```

## Authentication Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Login Request
       ▼
┌─────────────────────┐
│  Login Form          │
│  (Email + Password) │
└──────┬──────────────┘
       │
       │ 2. Submit Credentials
       ▼
┌─────────────────────┐
│  Supabase Auth      │
│  (Verify Credentials)│
└──────┬──────────────┘
       │
       │ 3. Create Session
       ▼
┌─────────────────────┐
│  Session Cookie      │
│  (JWT Token)         │
└──────┬──────────────┘
       │
       │ 4. Middleware Check
       ▼
┌─────────────────────┐
│  Route Protection   │
│  (Validate Session) │
└──────┬──────────────┘
       │
       │ 5. Grant Access
       ▼
┌─────────────┐
│  Dashboard  │
└─────────────┘
```

## Subscription Flow

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ 1. Select Plan
       ▼
┌─────────────────────┐
│  Plan Selection      │
│  (Starter/Pro/Ent)   │
└──────┬──────────────┘
       │
       │ 2. Create Checkout
       ▼
┌─────────────────────┐
│  Stripe Checkout    │
│  (Payment Form)     │
└──────┬──────────────┘
       │
       │ 3. Payment Success
       ▼
┌─────────────────────┐
│  Stripe Webhook     │
│  (Payment Event)    │
└──────┬──────────────┘
       │
       │ 4. Create Subscription
       ▼
┌─────────────────────┐
│  Database Update     │
│  (Subscription Record)│
└──────┬──────────────┘
       │
       │ 5. Approval (if needed)
       ▼
┌─────────────────────┐
│  Super Admin        │
│  (Approve/Reject)   │
└──────┬──────────────┘
       │
       │ 6. Activate Access
       ▼
┌─────────────┐
│  Dashboard  │
│  (Full Access)│
└─────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────┐
│         Root Layout                     │
│  (Theme Provider, Toaster)              │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                      │
┌───▼──────────┐   ┌──────▼──────────┐
│  Public      │   │  Protected      │
│  Layout      │   │  Layout         │
│              │   │  (Dashboard)    │
└───┬──────────┘   └──────┬──────────┘
    │                     │
    │                     │
┌───▼──────────┐   ┌──────▼──────────┐
│  Navbar      │   │  Sidebar        │
│  Footer      │   │  Dashboard      │
│  Home Page   │   │  Components     │
│  Services    │   │  Stats Cards    │
│  Contact     │   │  Charts         │
└──────────────┘   └─────────────────┘
```

## Database Schema Overview

```
┌─────────────────┐
│    profiles     │
│  (Users)        │
├─────────────────┤
│ • id            │
│ • email         │
│ • role          │
│ • subscription  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│customers│ │subscriptions│
└───────┘ └───────────┘
    │
┌───▼──────────┐
│service_bookings│
└──────────────┘
    │
┌───▼────┐
│ queue  │
└────────┘
```

## Security Layers

```
┌─────────────────────────────────────┐
│      CLIENT-SIDE SECURITY           │
│  • Input Validation (Zod)           │
│  • XSS Protection (React)           │
│  • CSRF Tokens                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      MIDDLEWARE SECURITY             │
│  • Authentication Check              │
│  • Route Protection                  │
│  • Session Validation                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      API SECURITY                    │
│  • Authorization Checks              │
│  • Input Sanitization                │
│  • Rate Limiting                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      DATABASE SECURITY               │
│  • Row Level Security (RLS)          │
│  • Parameterized Queries              │
│  • Connection Encryption              │
└──────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────┐
│         VERCEL PLATFORM              │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Next.js Application         │  │
│  │   • Edge Functions            │  │
│  │   • Serverless Functions     │  │
│  │   • CDN Distribution         │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼──────────┐   ┌──────▼──────────┐
│  Supabase    │   │  Stripe         │
│  (Database)  │   │  (Payments)     │
└──────────────┘   └─────────────────┘
```

## Technology Stack Visualization

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER               │
│  Next.js 16 | React 19 | TypeScript     │
│  Tailwind CSS | Framer Motion           │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         APPLICATION LAYER               │
│  Next.js API Routes | Middleware        │
│  React Components | Hooks               │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         DATA LAYER                      │
│  Supabase (PostgreSQL)                   │
│  Supabase Auth | Storage | Realtime     │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         EXTERNAL SERVICES               │
│  Stripe | Brevo | Sentry                │
└─────────────────────────────────────────┘
```

---

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md)


