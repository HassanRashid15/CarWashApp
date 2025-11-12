# AquaVance - Car Wash Management System
## Professional Documentation for Client Presentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technology Stack](#technology-stack)
4. [Key Features](#key-features)
5. [System Architecture](#system-architecture)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Subscription Plans](#subscription-plans)
8. [Core Modules](#core-modules)
9. [API Documentation](#api-documentation)
10. [Security Features](#security-features)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Development Setup](#development-setup)
13. [Future Enhancements](#future-enhancements)

---

## Executive Summary

**AquaVance** is a comprehensive, cloud-based car wash management system designed to streamline operations for car wash businesses of all sizes. The platform provides a complete solution for managing customers, workers, service bookings, queue management, subscriptions, and business analytics.

### Key Highlights
- **Modern Tech Stack**: Built with Next.js 16, React 19, and TypeScript
- **Scalable Architecture**: Serverless architecture with Supabase backend
- **Subscription-Based**: Flexible pricing tiers (Starter, Professional, Enterprise)
- **Secure & Compliant**: Enterprise-grade security with 2FA, role-based access control
- **Payment Integration**: Seamless Stripe integration for subscription management
- **Real-time Updates**: Live queue management and booking system
- **Mobile Responsive**: Fully responsive design for all devices

---

## Project Overview

AquaVance is a full-stack web application that enables car wash businesses to:
- Manage customer relationships and service bookings
- Track and manage worker assignments
- Handle queue management for service operations
- Process payments and manage subscriptions
- Generate analytics and business reports
- Handle customer feedback and contact queries
- Manage products and inventory

### Business Value
- **Operational Efficiency**: Automate booking and queue management
- **Customer Management**: Centralized customer database with contact information
- **Revenue Tracking**: Integrated payment processing and subscription management
- **Scalability**: Support businesses from small operations to large enterprises
- **Data-Driven Decisions**: Comprehensive analytics and reporting

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Theme**: Dark/Light mode support (next-themes)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

### Third-Party Services
- **Payments**: Stripe (subscription management, checkout)
- **Email**: Brevo (transactional emails)
- **Monitoring**: Sentry (error tracking and performance monitoring)
- **Analytics**: Custom analytics tracking system

### Development Tools
- **Testing**: Vitest
- **Linting**: ESLint
- **Build Tool**: Turbopack (Next.js 16)
- **Package Manager**: npm

---

## Key Features

### 1. Authentication & Authorization
- **Multi-factor Authentication (2FA)**: TOTP-based two-factor authentication
- **Email Verification**: Secure email verification flow
- **Password Reset**: Secure password recovery system
- **Role-Based Access Control**: Super Admin, Admin, Worker, Customer roles
- **Session Management**: Secure session handling with Supabase

### 2. Dashboard & Analytics
- **Real-time Dashboard**: Live statistics and activity monitoring
- **Service Bookings Management**: View and manage all service bookings
- **Activity Tracking**: User activity logs and history
- **Performance Metrics**: Login counts, security scores, account status
- **Subscription Status**: Current plan information and usage

### 3. Customer Management
- **Customer Database**: Comprehensive customer profiles
- **Contact Management**: Customer contact information and history
- **Service History**: Track all services provided to customers
- **Customer Limits**: Plan-based customer limits (15/50/Unlimited)

### 4. Queue Management
- **Real-time Queue**: Live queue updates for service operations
- **Status Tracking**: Pending, In Progress, Completed statuses
- **Public Queue View**: Public-facing queue display
- **Queue Analytics**: Queue performance metrics

### 5. Worker Management
- **Worker Profiles**: Complete worker information management
- **Image Upload**: Worker profile images
- **Assignment Tracking**: Worker-to-service assignments
- **Performance Monitoring**: Worker activity tracking

### 6. Service Booking System
- **Service Packages**: Predefined washing packages (Basic, Premium, Full Detail)
- **Custom Bookings**: Custom service requests
- **Status Management**: Track booking status (Pending, Contacted, Confirmed, Completed, Cancelled)
- **Admin Notes**: Internal notes for booking management
- **Customer Communication**: Direct contact integration

### 7. Subscription Management
- **Three-Tier Plans**: Starter ($29/mo), Professional ($79/mo), Enterprise ($199/mo)
- **Trial System**: Automatic trial subscription for new admins
- **Stripe Integration**: Secure payment processing
- **Plan Upgrades/Downgrades**: Seamless plan changes
- **Renewal Management**: Automatic renewal handling
- **Approval Workflow**: Super admin approval for subscriptions

### 8. Products & Inventory
- **Product Management**: Add, edit, and manage products
- **Inventory Tracking**: Track product availability (Professional+ plans)
- **Product Categories**: Organize products by category

### 9. Feedback & Contact
- **Customer Feedback**: Collect and manage customer feedback
- **Contact Queries**: Handle customer inquiries
- **Email Notifications**: Automated email responses

### 10. Security & Monitoring
- **Sentry Integration**: Error tracking and performance monitoring
- **Security Alerts**: Automated security notifications
- **Activity Logging**: Comprehensive audit trails
- **Admin Code System**: Secure admin registration codes

---

## System Architecture

### Application Structure

```
CarWashApp/
├── app/                    # Next.js App Router
│   ├── (home)/            # Public pages (home, about, services, contact)
│   ├── auth/              # Authentication pages (login, signup, verify)
│   ├── dashboard/         # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components (navbar, footer)
│   ├── subscription/      # Subscription management components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client configuration
│   ├── utils/             # Helper functions
│   ├── email/             # Email templates and services
│   ├── analytics/         # Analytics tracking
│   └── monitoring/        # Sentry configuration
├── hooks/                 # Custom React hooks
├── public/                # Static assets
└── supabase/              # Database migrations
```

### Data Flow

1. **Client Request** → Next.js Middleware (Authentication Check)
2. **Authenticated Request** → API Route Handler
3. **API Route** → Supabase Client (Database Operations)
4. **Response** → Client Component (UI Update)

### Authentication Flow

```
User Login → Supabase Auth → Session Creation → 
Middleware Validation → Dashboard Access
```

### Subscription Flow

```
Plan Selection → Stripe Checkout → Webhook Processing → 
Subscription Creation → Approval (if required) → Access Granted
```

---

## User Roles & Permissions

### Super Admin
- **Full System Access**: Complete control over all features
- **Subscription Approval**: Approve/reject subscription requests
- **User Management**: Create, edit, and manage all users
- **System Configuration**: Access to all system settings
- **Bypass Limits**: No subscription limits or restrictions

### Admin (Business Owner)
- **Dashboard Access**: Full dashboard with all features
- **Customer Management**: Add, edit, and manage customers
- **Worker Management**: Manage workers and assignments
- **Service Bookings**: Create and manage service bookings
- **Queue Management**: Full queue control
- **Subscription Management**: View and manage subscription
- **Plan-Based Limits**: Subject to subscription plan limits

### Worker
- **Limited Dashboard**: Access to assigned tasks
- **Queue View**: View and update queue status
- **Customer Interaction**: Limited customer information access

### Customer
- **Public Interface**: Access to public pages
- **Service Booking**: Submit service booking requests
- **Queue View**: View public queue status

---

## Subscription Plans

### Starter Plan - $29/month
**Target**: Small businesses
- Up to 15 customers
- Basic queue management
- Worker management
- Email support
- Basic reports

### Professional Plan - $79/month
**Target**: Growing businesses
- Up to 50 customers
- Advanced queue system
- Full worker management
- Inventory tracking
- Payment processing
- Priority support
- Advanced analytics
- Monitoring dashboard
- Customer feedback system
- Multi-location support

### Enterprise Plan - $199/month
**Target**: Large enterprises
- Unlimited customers
- Everything in Professional
- Multi-location support
- Custom integrations
- Dedicated account manager
- 24/7 phone support
- Custom reporting
- API access
- White-label options

### Trial Plan (Free)
- Up to 2 customers
- Basic queue management
- Worker management
- Limited features for evaluation

---

## Core Modules

### 1. Authentication Module (`app/auth/`)
- Login/Signup forms with validation
- Email verification
- Password reset flow
- 2FA setup and verification
- Admin code validation

### 2. Dashboard Module (`app/dashboard/`)
- Main dashboard with statistics
- Service bookings management
- Customer management
- Worker management
- Queue management
- Analytics and reports
- Subscription management
- Settings and profile

### 3. API Module (`app/api/`)
- **Authentication APIs**: Login, signup, verification
- **Customer APIs**: CRUD operations for customers
- **Worker APIs**: Worker management endpoints
- **Queue APIs**: Queue operations and public queue
- **Subscription APIs**: Plan management, checkout, webhooks
- **Service Booking APIs**: Booking creation and management
- **Admin APIs**: User management, subscription approval
- **Analytics APIs**: Tracking and reporting

### 4. Public Pages (`app/(home)/`)
- Homepage with service showcase
- About page
- Services page
- Contact page
- Queue public view

### 5. Component Library (`components/`)
- Reusable UI components (buttons, cards, dialogs)
- Form components with validation
- Dashboard-specific components
- Subscription management components
- Layout components (navbar, footer)

---

## API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
Authenticate user and create session.

#### `POST /api/auth/signup`
Register new user account.

#### `POST /api/auth/verify`
Verify email address.

#### `POST /api/auth/reset-password`
Request password reset.

### Customer Endpoints

#### `GET /api/customers`
Get all customers (paginated).

#### `POST /api/customers`
Create new customer.

#### `GET /api/customers/[id]`
Get customer by ID.

#### `PUT /api/customers/[id]`
Update customer information.

#### `DELETE /api/customers/[id]`
Delete customer.

### Queue Endpoints

#### `GET /api/queue`
Get queue items.

#### `POST /api/queue`
Add item to queue.

#### `GET /api/queue/public`
Get public queue view.

#### `PUT /api/queue/[id]`
Update queue item status.

### Subscription Endpoints

#### `GET /api/subscriptions`
Get user's subscription information.

#### `POST /api/subscriptions/create-checkout`
Create Stripe checkout session.

#### `POST /api/subscriptions/verify-checkout`
Verify checkout completion.

#### `POST /api/subscriptions/request-cancellation`
Request subscription cancellation.

### Service Booking Endpoints

#### `GET /api/service-bookings`
Get all service bookings.

#### `POST /api/service-booking`
Create new service booking.

#### `PUT /api/service-bookings/[id]`
Update booking status and notes.

### Admin Endpoints

#### `GET /api/admin/users`
Get all users (super admin only).

#### `GET /api/admin/pending-subscriptions`
Get pending subscription approvals.

#### `POST /api/admin/approve-subscription`
Approve subscription request.

### Analytics Endpoints

#### `POST /api/analytics/track`
Track user analytics events.

#### `GET /api/analytics/reports`
Get analytics reports.

---

## Security Features

### Authentication Security
- **Secure Password Hashing**: Supabase handles password hashing
- **JWT Tokens**: Secure session tokens
- **Email Verification**: Required for account activation
- **2FA Support**: Optional two-factor authentication
- **Session Management**: Secure cookie-based sessions

### Authorization
- **Role-Based Access Control (RBAC)**: Granular permission system
- **Route Protection**: Middleware-based route protection
- **API Security**: Server-side authorization checks
- **Admin Code System**: Secure admin registration

### Data Security
- **Database Security**: Row-level security policies (Supabase)
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: React's built-in XSS protection

### Payment Security
- **Stripe Integration**: PCI-compliant payment processing
- **Webhook Verification**: Secure webhook signature verification
- **No Card Storage**: Cards stored securely by Stripe

### Monitoring & Logging
- **Error Tracking**: Sentry integration for error monitoring
- **Activity Logging**: User activity audit trails
- **Security Alerts**: Automated security notifications

---

## Deployment & Infrastructure

### Hosting Platform
- **Vercel**: Primary hosting platform (recommended)
- **Next.js Optimizations**: Automatic optimizations for production
- **Edge Functions**: Serverless function support
- **CDN**: Global content delivery network

### Database
- **Supabase**: Managed PostgreSQL database
- **Automatic Backups**: Daily database backups
- **Connection Pooling**: Optimized connection management
- **Real-time Subscriptions**: Live data updates

### Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key

# Sentry
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Super Admin
SUPER_ADMIN_EMAIL=your_super_admin_email
```

### Build & Deployment Process

1. **Build**: `npm run build`
2. **Test**: `npm run test`
3. **Deploy**: Push to main branch (auto-deploy on Vercel)
4. **Environment Setup**: Configure environment variables
5. **Database Migration**: Run Supabase migrations
6. **Stripe Webhook**: Configure webhook endpoint

---

## Development Setup

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Supabase account
- Stripe account (for payment features)

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd CarWashApp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Fill in all required environment variables

4. **Database Setup**
   - Create Supabase project
   - Run database migrations (if available)
   - Configure Row Level Security policies

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access Application**
   - Open `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage

### Development Guidelines

- **Code Style**: Follow ESLint configuration
- **Type Safety**: Use TypeScript for all new code
- **Component Structure**: Follow existing component patterns
- **API Routes**: Use Next.js API route handlers
- **Error Handling**: Implement proper error boundaries
- **Testing**: Write tests for critical functionality

---

## Future Enhancements

### Planned Features
1. **Mobile Application**: Native iOS and Android apps
2. **Advanced Reporting**: Custom report builder
3. **SMS Notifications**: Twilio integration for SMS alerts
4. **Multi-language Support**: Internationalization (i18n)
5. **Advanced Analytics**: Machine learning insights
6. **API Documentation**: OpenAPI/Swagger documentation
7. **Webhook System**: Custom webhook integrations
8. **Loyalty Program**: Customer loyalty points system
9. **Appointment Scheduling**: Advanced scheduling system
10. **Inventory Management**: Enhanced inventory tracking

### Technical Improvements
- **Performance Optimization**: Further optimization for large datasets
- **Caching Strategy**: Implement Redis caching
- **GraphQL API**: Alternative API layer
- **Microservices**: Break down into microservices (if needed)
- **Containerization**: Docker support for local development

---

## Support & Maintenance

### Support Channels
- **Email Support**: Available for Professional and Enterprise plans
- **Priority Support**: Available for Professional and Enterprise plans
- **24/7 Phone Support**: Available for Enterprise plan
- **Documentation**: Comprehensive documentation (this file)

### Maintenance Schedule
- **Regular Updates**: Monthly feature updates
- **Security Patches**: Immediate security updates
- **Database Backups**: Daily automated backups
- **Performance Monitoring**: 24/7 monitoring via Sentry

### Version Information
- **Current Version**: 0.1.0
- **Framework**: Next.js 16.0.1
- **React**: 19.2.0
- **TypeScript**: 5.x

---

## Conclusion

AquaVance is a robust, scalable, and feature-rich car wash management system designed to meet the needs of businesses of all sizes. With its modern technology stack, comprehensive feature set, and flexible subscription model, it provides an excellent foundation for managing car wash operations efficiently.

The system is built with best practices in mind, including security, scalability, and maintainability. Regular updates and improvements ensure that the platform continues to evolve with the needs of the business.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Prepared For**: Client Presentation  
**Contact**: Development Team


