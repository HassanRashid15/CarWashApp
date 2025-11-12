# SQL Queries for Subscription Management
## Fix Payment Processing Access

---

## 🔍 **1. CHECK YOUR CURRENT SUBSCRIPTION**

### Find Your User ID
```sql
-- Get your user ID from email
SELECT id, email, first_name, last_name, role
FROM profiles
WHERE email = 'your-email@example.com';
```

### Check Your Subscription Status
```sql
-- Replace 'YOUR_USER_ID' with your actual user_id from above
SELECT 
    id,
    user_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at,
    canceled_at,
    created_at,
    updated_at
FROM subscriptions
WHERE user_id = 'YOUR_USER_ID';
```

### Check All Subscriptions (Admin View)
```sql
-- View all subscriptions with user details
SELECT 
    s.id,
    s.user_id,
    p.email,
    p.first_name || ' ' || p.last_name as admin_name,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.trial_ends_at,
    s.created_at
FROM subscriptions s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC;
```

---

## ✅ **2. UPDATE TO PROFESSIONAL PLAN** (Has Payment Processing)

### Update Existing Subscription to Professional
```sql
-- Replace 'YOUR_USER_ID' with your actual user_id
UPDATE subscriptions
SET 
    plan_type = 'professional',
    status = 'active',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

### Update with Period Dates (Recommended)
```sql
-- Update to Professional with 30-day period
UPDATE subscriptions
SET 
    plan_type = 'professional',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🚀 **3. UPDATE TO ENTERPRISE PLAN** (Has All Features)

### Update to Enterprise
```sql
-- Replace 'YOUR_USER_ID' with your actual user_id
UPDATE subscriptions
SET 
    plan_type = 'enterprise',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🆕 **4. CREATE NEW SUBSCRIPTION** (If You Don't Have One)

### Create Professional Subscription
```sql
-- Replace 'YOUR_USER_ID' with your actual user_id
INSERT INTO subscriptions (
    user_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
)
VALUES (
    'YOUR_USER_ID',
    'professional',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
);
```

### Create Enterprise Subscription
```sql
-- Replace 'YOUR_USER_ID' with your actual user_id
INSERT INTO subscriptions (
    user_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
)
VALUES (
    'YOUR_USER_ID',
    'enterprise',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
);
```

---

## 📊 **5. PLAN TYPES REFERENCE**

### Available Plan Types:
- `trial` - Free trial (2 customers, no payment processing)
- `starter` - Starter plan ($29/mo, 15 customers, no payment processing)
- `professional` - Professional plan ($79/mo, 50 customers, **HAS payment processing** ✅)
- `enterprise` - Enterprise plan ($199/mo, unlimited, **HAS payment processing** ✅)

### Available Status Values:
- `trial` - Trial subscription
- `active` - Active paid subscription
- `pending` - Pending approval
- `canceled` - Canceled subscription
- `expired` - Expired subscription

---

## 🔧 **6. QUICK FIX - ONE COMMAND**

### Quick Update to Professional (Copy-Paste Ready)
```sql
-- Step 1: Get your user ID (replace email)
SELECT id FROM profiles WHERE email = 'your-email@example.com';

-- Step 2: Update subscription (replace USER_ID_HERE with result from step 1)
UPDATE subscriptions
SET plan_type = 'professional', status = 'active', updated_at = NOW()
WHERE user_id = 'USER_ID_HERE';

-- Step 3: Verify
SELECT plan_type, status FROM subscriptions WHERE user_id = 'USER_ID_HERE';
```

---

## 🎯 **7. COMPLETE EXAMPLE** (All-in-One)

```sql
-- Complete workflow: Find user and update to Professional
WITH user_info AS (
    SELECT id as user_id
    FROM profiles
    WHERE email = 'your-email@example.com'
    LIMIT 1
)
UPDATE subscriptions
SET 
    plan_type = 'professional',
    status = 'active',
    current_period_start = COALESCE(current_period_start, NOW()),
    current_period_end = COALESCE(current_period_end, NOW() + INTERVAL '30 days'),
    updated_at = NOW()
WHERE user_id = (SELECT user_id FROM user_info)
RETURNING *;
```

---

## ⚠️ **8. SAFETY CHECKS**

### Check Before Updating
```sql
-- See what you're about to change
SELECT 
    user_id,
    plan_type,
    status,
    current_period_start,
    current_period_end
FROM subscriptions
WHERE user_id = 'YOUR_USER_ID';
```

### Backup Before Updating (Optional)
```sql
-- Create backup of current subscription
CREATE TABLE subscriptions_backup AS
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
```

---

## 🔄 **9. REVERT CHANGES** (If Needed)

### Revert to Starter Plan
```sql
UPDATE subscriptions
SET 
    plan_type = 'starter',
    status = 'active',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

### Revert to Trial
```sql
UPDATE subscriptions
SET 
    plan_type = 'trial',
    status = 'trial',
    trial_ends_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

---

## 📝 **10. NOTES**

1. **After updating**, you may need to:
   - Clear browser cache
   - Refresh the page
   - Wait a few seconds for cache to clear

2. **Payment Processing** is available in:
   - ✅ Professional plan
   - ✅ Enterprise plan
   - ❌ NOT in Trial or Starter plans

3. **To use these queries**:
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Paste the query
   - Replace `YOUR_USER_ID` or `your-email@example.com` with your actual values
   - Run the query

---

## 🚀 **QUICKEST SOLUTION**

**For immediate access to Payment Processing:**

```sql
-- Replace 'your-email@example.com' with your email
UPDATE subscriptions
SET plan_type = 'professional', status = 'active', updated_at = NOW()
WHERE user_id = (
    SELECT id FROM profiles WHERE email = 'your-email@example.com'
);
```

Then refresh your browser and try updating the queue entry again!

---

**Last Updated**: 2024  
**Status**: Ready to use

