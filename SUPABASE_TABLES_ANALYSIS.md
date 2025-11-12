# Supabase Tables Analysis
## Table Usage & Irrelevancy Check

**Analysis Date**: 2024  
**Purpose**: Identify unused, inconsistent, or irrelevant tables

---

## 📊 ALL TABLES FOUND IN CODEBASE

### ✅ **ACTIVELY USED TABLES** (Core Tables)

| Table Name | Usage Count | Status | Notes |
|------------|-------------|--------|-------|
| `profiles` | 80+ | ✅ **CRITICAL** | User profiles, authentication, roles |
| `subscriptions` | 50+ | ✅ **CRITICAL** | Subscription management, Stripe integration |
| `Customers` | 20+ | ✅ **CRITICAL** | Customer database (PascalCase naming) |
| `Workers` | 10+ | ✅ **CRITICAL** | Worker management (PascalCase naming) |
| `Queue` | 15+ | ✅ **CRITICAL** | Queue management (PascalCase naming) |
| `service_bookings` | 8+ | ✅ **CRITICAL** | Service booking system |
| `products` | 10+ | ✅ **CRITICAL** | Product/inventory management |
| `Contact_us` | 5+ | ✅ **ACTIVE** | Contact form submissions (PascalCase) |
| `user_preferences` | 8+ | ✅ **ACTIVE** | User settings and preferences |
| `activity_logs` | 5+ | ✅ **ACTIVE** | User activity tracking |
| `admin_codes` | 5+ | ✅ **ACTIVE** | Admin registration codes |
| `admin_screencode` | 4+ | ✅ **ACTIVE** | Legacy screen codes (legacy support) |
| `subscription_plans` | 2+ | ✅ **ACTIVE** | Subscription plan definitions |
| `plan_features` | 2+ | ✅ **ACTIVE** | Plan feature mappings |
| `Washing_packages` | 2+ | ✅ **ACTIVE** | Washing package definitions (PascalCase) |
| `package_features` | 2+ | ✅ **ACTIVE** | Package feature mappings |

### ⚠️ **INCONSISTENT NAMING** (Potential Issues)

| Table Name | Found As | Issue | Recommendation |
|------------|----------|-------|----------------|
| `feedback` | `feedback` (singular) | Used in analytics | **FIX**: Standardize to `feedbacks` |
| `feedbacks` | `feedbacks` (plural) | Used in feedback API | **CORRECT** - Use this |

**🔴 CRITICAL ISSUE**: Table name inconsistency detected!
- `app/api/analytics/reports/route.ts` uses `feedback` (singular)
- `app/api/feedback/route.ts` uses `feedbacks` (plural)
- **One of these is wrong and will cause errors!**

### 📦 **STORAGE BUCKETS** (Not Tables)

| Bucket Name | Usage | Status |
|-------------|-------|--------|
| `profile-images` | Profile & worker images | ✅ **ACTIVE** |

---

## 🔍 **POTENTIALLY UNUSED/IRRELEVANT TABLES**

### ❓ **TABLES NOT FOUND IN CODEBASE**

These tables might exist in your Supabase database but are **NOT referenced** in the code:

**Note**: Without direct database access, I cannot confirm these exist. Check your Supabase dashboard.

**Potential Unused Tables** (Check if these exist):
- Any table not listed above
- Old migration tables
- Test tables
- Backup tables

---

## 🚨 **CRITICAL ISSUES FOUND**

### 1. **Table Name Inconsistency** 🔴 **MUST FIX**

**Problem**:
```typescript
// app/api/analytics/reports/route.ts (Line 59)
adminSupabase.from('feedback').select('*', ...)  // ❌ WRONG - singular

// app/api/feedback/route.ts (Lines 87, 206)
adminSupabase.from('feedbacks').insert(...)  // ✅ CORRECT - plural
```

**Impact**: 
- Analytics reports will fail if table is `feedbacks`
- Or feedback creation will fail if table is `feedback`

**Fix Required**:
- [ ] Check actual table name in Supabase
- [ ] Update `app/api/analytics/reports/route.ts` to use correct name
- [ ] Verify both endpoints work

---

### 2. **Naming Convention Inconsistency** 🟡 **SHOULD FIX**

**Problem**: Mixed naming conventions:
- **PascalCase**: `Customers`, `Workers`, `Queue`, `Contact_us`, `Washing_packages`
- **snake_case**: `service_bookings`, `user_preferences`, `activity_logs`, `admin_codes`

**Impact**: 
- Confusing for developers
- Harder to maintain
- Potential errors

**Recommendation**:
- [ ] Standardize to **snake_case** (PostgreSQL convention)
- [ ] Create migration to rename tables
- [ ] Update all code references
- **OR** document the convention clearly

---

### 3. **Legacy Table** 🟡 **CONSIDER REMOVING**

**Table**: `admin_screencode`

**Status**: Legacy support for old admin codes

**Usage**: 
- Used in `app/api/validate-admin-code/route.ts` as fallback
- Used in `app/api/update-profile/route.ts`
- Used in `app/api/account/delete/route.ts`

**Recommendation**:
- [ ] Migrate all data to `admin_codes` table
- [ ] Remove fallback code
- [ ] Drop `admin_screencode` table
- **OR** keep for backward compatibility

---

## 📋 **TABLE USAGE SUMMARY**

### By Category

#### **Authentication & Users**
- `profiles` - User accounts, roles, authentication
- `user_preferences` - User settings
- `activity_logs` - User activity tracking

#### **Subscriptions & Payments**
- `subscriptions` - Active subscriptions
- `subscription_plans` - Plan definitions
- `plan_features` - Feature mappings

#### **Business Operations**
- `Customers` - Customer database
- `Workers` - Worker management
- `Queue` - Service queue
- `service_bookings` - Service bookings
- `products` - Product/inventory

#### **Communication**
- `Contact_us` - Contact form
- `feedbacks` - Customer feedback (⚠️ check naming)

#### **Admin & Security**
- `admin_codes` - Admin registration codes
- `admin_screencode` - Legacy admin codes (consider removing)

#### **Services**
- `Washing_packages` - Service packages
- `package_features` - Package features

---

## ✅ **RECOMMENDATIONS**

### Immediate Actions (Critical)

1. **Fix Table Name Inconsistency** 🔴
   ```bash
   # Check which table exists in Supabase:
   # - feedback (singular)
   # - feedbacks (plural)
   
   # Then update the incorrect reference
   ```

2. **Verify All Tables Exist**
   - Check Supabase dashboard
   - Ensure all referenced tables exist
   - Create missing tables if needed

3. **Test All Table References**
   - Run application
   - Test each feature
   - Check for database errors

### Short-term Actions (High Priority)

1. **Standardize Naming Convention**
   - Choose: snake_case or PascalCase
   - Create migration plan
   - Update all references

2. **Remove Legacy Tables**
   - Migrate `admin_screencode` data
   - Remove fallback code
   - Drop table

3. **Document Table Schema**
   - Create schema documentation
   - Document relationships
   - Create ER diagram

### Long-term Actions (Nice to Have)

1. **Database Migrations**
   - Create migration files
   - Version control schema
   - Automated migrations

2. **Table Auditing**
   - Regular review of unused tables
   - Archive old data
   - Optimize indexes

---

## 🔧 **HOW TO CHECK FOR UNUSED TABLES**

### Step 1: List All Tables in Supabase
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Step 2: Compare with Codebase
Compare the list from Step 1 with the tables listed above.

### Step 3: Identify Unused Tables
Any table in Supabase that's NOT in the "ACTIVELY USED TABLES" list above is potentially unused.

### Step 4: Verify Before Deleting
- [ ] Check if table has data
- [ ] Check if table is referenced in migrations
- [ ] Check if table is used in stored procedures
- [ ] Backup before deletion

---

## 📊 **TABLE USAGE STATISTICS**

| Category | Count | Status |
|----------|-------|--------|
| **Critical Tables** | 8 | ✅ Must keep |
| **Active Tables** | 8 | ✅ Should keep |
| **Inconsistent Naming** | 1 | ⚠️ Must fix |
| **Legacy Tables** | 1 | 🟡 Consider removing |
| **Storage Buckets** | 1 | ✅ Keep |

---

## 🎯 **ACTION ITEMS**

### Critical (Do First)
- [ ] **Fix `feedback` vs `feedbacks` inconsistency**
- [ ] **Verify all tables exist in Supabase**
- [ ] **Test all table queries**

### High Priority
- [ ] **Standardize naming convention**
- [ ] **Document table schema**
- [ ] **Create migration files**

### Medium Priority
- [ ] **Remove legacy `admin_screencode` table**
- [ ] **Audit for unused tables**
- [ ] **Optimize table indexes**

---

## 📝 **NOTES**

1. **Naming Convention**: The codebase uses mixed conventions. Consider standardizing to snake_case for PostgreSQL best practices.

2. **Legacy Support**: `admin_screencode` appears to be legacy. Consider migrating to `admin_codes` and removing.

3. **Table Verification**: Without direct database access, this analysis is based on code references. Verify actual tables in Supabase dashboard.

4. **Storage Buckets**: `profile-images` is a storage bucket, not a table. It's correctly used.

---

## 🔍 **NEXT STEPS**

1. **Check Supabase Dashboard**
   - List all tables
   - Compare with this analysis
   - Identify discrepancies

2. **Fix Critical Issues**
   - Resolve `feedback`/`feedbacks` naming
   - Test all endpoints

3. **Create Migration Plan**
   - Standardize naming
   - Document schema
   - Plan table cleanup

---

**Last Updated**: 2024  
**Status**: ⚠️ **Action Required** - Fix table naming inconsistency before production


