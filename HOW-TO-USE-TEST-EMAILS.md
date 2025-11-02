# 📧 How to Use Resend Test Email Addresses

Resend provides special test email addresses that work **immediately without domain verification**. These are perfect for testing your email functionality!

---

## 🎯 Quick Start

### Step 1: Test Email API Endpoint

I've updated your `/api/test-email` endpoint to support test addresses. You can now test in 3 ways:

#### **Option A: Use Test Addresses Directly**

Send a POST request to `/api/test-email`:

```json
{
  "email": "delivered@resend.dev"
}
```

Or use:
- `delivered@resend.dev` - Simulates successful delivery ✅
- `bounced@resend.dev` - Simulates bounced email ❌
- `complained@resend.dev` - Simulates spam complaint 🚫

#### **Option B: Use Test Type Parameter**

```json
{
  "email": "any@email.com",
  "testType": "delivered"
}
```

Available test types:
- `"delivered"` → Uses `delivered@resend.dev`
- `"bounced"` → Uses `bounced@resend.dev`
- `"complained"` → Uses `complained@resend.dev`

#### **Option C: Check Available Test Addresses**

Visit: `http://localhost:3000/api/test-email` (GET request)

This shows all available test addresses and usage instructions.

---

## 🧪 How to Test

### Method 1: Using Browser/Postman

1. **Open your browser or Postman**
2. **POST to**: `http://localhost:3000/api/test-email`
3. **Body (JSON)**:
   ```json
   {
     "email": "delivered@resend.dev"
   }
   ```
4. **Check Response** - Should return success!

### Method 2: Using cURL

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "delivered@resend.dev"}'
```

### Method 3: Using Your App (For Signup Flow)

**Update your signup form temporarily** to use test addresses:

In your signup form, you can test with:
- Email: `delivered@resend.dev`
- This will send the verification email to the test address

**Note**: Test addresses don't receive actual emails, but Resend logs the result in your dashboard.

---

## 📊 Viewing Test Results

### Check Resend Dashboard

1. **Go to**: https://resend.com/emails
2. **Check Logs** - You'll see:
   - ✅ `delivered@resend.dev` → Shows as "delivered"
   - ❌ `bounced@resend.dev` → Shows as "bounced"
   - 🚫 `complained@resend.dev` → Shows as "complained"

### Check API Response

The test endpoint returns:
```json
{
  "success": true,
  "messageId": "xxx",
  "recipient": "delivered@resend.dev",
  "testType": "delivered",
  "note": "Using Resend test address: delivered@resend.dev. Check Resend dashboard logs..."
}
```

---

## 💡 Understanding Test Addresses

### `delivered@resend.dev`
- ✅ **Use for**: Testing successful email delivery
- ✅ **Shows in logs**: Email marked as "delivered"
- ✅ **Use case**: Verify your email code works correctly

### `bounced@resend.dev`
- ❌ **Use for**: Testing error handling when emails bounce
- ❌ **Shows in logs**: Email marked as "bounced" (SMTP 550 error)
- ❌ **Use case**: Test your error handling code

### `complained@resend.dev`
- 🚫 **Use for**: Testing spam complaint scenarios
- 🚫 **Shows in logs**: Email marked as "complained"
- 🚫 **Use case**: Test how your app handles spam reports

---

## 🔄 Testing Your Verification Flow

### Quick Test Steps:

1. **Start your dev server**: `npm run dev`

2. **Test with delivered address**:
   ```bash
   curl -X POST http://localhost:3000/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "delivered@resend.dev"}'
   ```

3. **Check Resend Dashboard**: https://resend.com/emails
   - Look for the email in logs
   - Status should be "delivered"

4. **Test signup flow** (optional):
   - Go to your signup page
   - Use email: `delivered@resend.dev`
   - Submit form
   - Check Resend dashboard for verification email

---

## ⚠️ Important Notes

1. **Test addresses don't receive real emails**
   - They only simulate email delivery in Resend logs
   - You won't get an actual email in your inbox
   - Check Resend dashboard to see results

2. **Use for development/testing only**
   - Perfect for testing email functionality
   - Not for production/real users
   - For production, verify a domain

3. **Your account email still works**
   - `hassanrashid0018@gmail.com` will receive real emails
   - This is your verified account email

---

## 🚀 Example: Testing Verification Emails

To test your verification email flow:

1. **Temporarily update your test**:
   ```javascript
   // In your signup form, for testing:
   const testEmail = 'delivered@resend.dev';
   ```

2. **Or use the API directly**:
   ```bash
   # Test verification email
   curl -X POST http://localhost:3000/api/resend \
     -H "Content-Type: application/json" \
     -d '{
       "type": "verification",
       "email": "delivered@resend.dev",
       "password": "test123"
     }'
   ```

3. **Check Resend Dashboard**:
   - Go to https://resend.com/emails
   - See the verification email in logs
   - Check status and content

---

## 📝 Summary

- ✅ **Test addresses work immediately** - No domain needed!
- ✅ **Perfect for development** - Test email flow easily
- ✅ **Check dashboard logs** - See results in Resend
- ⚠️ **For production** - Verify a domain to send to real emails

Happy testing! 🎉

