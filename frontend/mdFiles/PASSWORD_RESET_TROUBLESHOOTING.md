# 🔧 Password Reset Troubleshooting Guide

Quick solutions for common issues with the password reset feature.

---

## 🚨 Email Not Sending

### Symptom

User requests password reset but no email is received.

### Console Shows:

```
⚠️  Email credentials not configured. Password reset emails will not be sent.
```

### Solution

1. Open `backend/.env`
2. Set these variables:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
3. Restart backend server

### Test It:

```bash
cd backend
npm run test-email your-email@example.com
```

---

## 🔐 Authentication Failed

### Symptom

Console shows email authentication error.

### Console Shows:

```
❌ Error sending password reset email
   Authentication failed. Check your EMAIL_USER and EMAIL_PASSWORD.
   For Gmail, ensure you're using an App Password
```

### Solution - For Gmail Users:

**You MUST use an App Password, NOT your regular Gmail password!**

1. **Enable 2-Step Verification:**

   - Go to: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Generate App Password:**

   - Go to: https://myaccount.google.com/apppasswords
   - App: Mail
   - Device: Other (Custom name) → "MIVENT"
   - Copy the 16-character password

3. **Update .env:**

   ```env
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

   (Use the app password, not your Gmail password)

4. **Restart backend and test**

---

## 📬 Email Goes to Spam

### Symptom

Email is sent successfully but user finds it in spam folder.

### Console Shows:

```
✅ Password reset email sent to user@example.com
   Message ID: <abc123@gmail.com>
```

### Solutions:

**Immediate:**

- Ask user to check spam/junk folder
- Add sender email to contacts
- Mark email as "Not Spam"

**Long-term (Production):**

- Use professional email service (SendGrid, AWS SES)
- Configure SPF records for your domain
- Configure DKIM signatures
- Configure DMARC policy
- Use dedicated sending domain

---

## ⏰ Invalid or Expired Token

### Symptom

User clicks reset link and sees "Invalid or expired token" error.

### Possible Causes:

**1. Token Expired (after 1 hour)**

```
Solution: Request a new password reset link
```

**2. Token Already Used**

```
Solution: Request a new password reset link
(Tokens are single-use for security)
```

**3. Backend was restarted after sending email**

```
Solution: Request a new password reset link
(Token is in database, check MongoDB connection)
```

### How to Fix:

1. Go to `/forgot-password`
2. Request new reset link
3. Check email (should arrive within seconds)
4. Use new link within 1 hour

---

## 🌐 CORS Errors

### Symptom

Browser console shows CORS error when making API requests.

### Browser Console Shows:

```
Access to fetch at 'http://localhost:5000/api/auth/forgot-password'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

### Solution:

1. Check `FRONTEND_URL` in `backend/.env`:

   ```env
   FRONTEND_URL=http://localhost:3000
   ```

2. Restart backend server

3. Make sure backend CORS is configured (already done in index.js)

---

## 🔗 Reset Link Not Working

### Symptom

Clicking reset link in email doesn't open the page.

### Possible Causes:

**1. Frontend not running**

```bash
# Check if frontend is running on port 3000
# If not, start it:
cd frontend
npm start
```

**2. Wrong URL in email**

```
Check backend/.env:
FRONTEND_URL=http://localhost:3000

For production:
FRONTEND_URL=https://your-domain.com
```

**3. Link copied incorrectly**

```
Make sure entire link is copied, including the token
Format: http://localhost:3000/reset-password/abc123def456...
```

---

## 🔄 Backend Not Running

### Symptom

Frontend can't connect to backend API.

### Browser Console Shows:

```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```

### Solution:

```bash
# Start backend
cd backend
npm start

# Should see:
# ✅ Connected to MongoDB
# 📧 Email transporter initialized
# Server running on port 5000
```

---

## 💾 Database Connection Failed

### Symptom

Backend can't save reset token to database.

### Console Shows:

```
auth.forgotPassword error MongoError: ...
```

### Solution:

1. Check `MONGODB_URI` in `backend/.env`
2. Verify MongoDB connection string is correct
3. Check if MongoDB Atlas/server is accessible
4. Check IP whitelist (for MongoDB Atlas)

---

## 📧 Test Email Command Fails

### Symptom

Running `npm run test-email` fails.

### Error: "Please provide a test email address"

```bash
# Wrong:
npm run test-email

# Correct:
npm run test-email your-email@example.com
```

### Error: "Email credentials missing"

```
Set EMAIL_USER and EMAIL_PASSWORD in backend/.env
See DO_THIS_FIRST.md for instructions
```

### Error: "Authentication failed"

```
For Gmail: Use App Password, not regular password
See "Authentication Failed" section above
```

---

## 🎨 Email Template Not Rendering

### Symptom

Email arrives but looks like plain text or broken HTML.

### Cause:

Some email clients don't support HTML or have images disabled.

### Solution:

This is normal! The email includes both:

- **HTML version** (for modern email clients)
- **Plain text version** (fallback for all clients)

Users will see whichever their email client supports.

---

## 🔐 Password Validation Errors

### "Password must be at least 6 characters"

```
Enter a password with 6 or more characters
```

### "Passwords do not match"

```
Make sure both password fields have the same value
```

### "Password is required"

```
Fill in both password fields
```

---

## 🚫 Cannot Access Routes

### Symptom

Navigating to `/forgot-password` or `/reset-password/:token` shows 404.

### Solution:

1. **Make sure frontend is running:**

   ```bash
   cd frontend
   npm start
   ```

2. **Clear browser cache** (Ctrl+Shift+Delete)

3. **Hard refresh** (Ctrl+F5)

4. **Try accessing directly:**
   ```
   http://localhost:3000/forgot-password
   ```

---

## 🔄 Token Verification Keeps Failing

### Symptom

Reset password page always shows "Invalid or expired token".

### Debugging Steps:

1. **Check console for errors:**

   - Open browser DevTools (F12)
   - Look for red errors in Console tab

2. **Verify backend is running:**

   ```bash
   cd backend
   npm start
   ```

3. **Check backend logs:**

   - Look for token verification attempts
   - Check for database errors

4. **Request fresh reset link:**
   - Go to `/forgot-password`
   - Request new link
   - Use it immediately (don't wait)

---

## 🆕 Fresh Start (Nuclear Option)

If nothing else works, try a complete reset:

```bash
# 1. Stop all running processes (Ctrl+C in terminals)

# 2. Clear node modules and reinstall
cd backend
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules
npm install

# 3. Check .env file has correct values
cd ../backend
# Edit .env - make sure EMAIL_USER and EMAIL_PASSWORD are set

# 4. Start fresh
cd backend
npm start

# In new terminal
cd frontend
npm start

# 5. Test email configuration
cd backend
npm run test-email your-email@example.com
```

---

## 📊 Verify Your Setup

Run through this checklist:

```
□ MongoDB is running and accessible
□ Backend .env has all required variables
□ EMAIL_USER is set to your email
□ EMAIL_PASSWORD is set (App Password for Gmail)
□ FRONTEND_URL is set correctly
□ Backend server is running (npm start)
□ Frontend app is running (npm start)
□ Can access http://localhost:3000/login
□ Can access http://localhost:3000/forgot-password
□ Test email command works
```

---

## 🆘 Still Having Issues?

### Enable Detailed Logging

1. **Backend Console:**

   - Look for emoji indicators:
     - ✅ Success
     - ❌ Error
     - ⚠️ Warning
     - 📧 Email operation

2. **Frontend Console:**

   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Test Components Individually:**

   ```bash
   # Test email only
   npm run test-email your@email.com

   # Test database connection
   # (backend will log on startup)
   npm start
   ```

### Common Console Messages

**✅ Good:**

```
✅ Connected to MongoDB
✅ Email transporter initialized with gmail service
📧 Sending password reset email to: user@example.com
✅ Password reset email sent to user@example.com
✅ Password successfully reset for user: user@example.com
```

**❌ Bad:**

```
❌ MongoDB connection error
⚠️  Email credentials not configured
❌ Error sending password reset email
auth.forgotPassword error
```

---

## 📞 Get Help

If you're still stuck:

1. **Check the main guides:**

   - `DO_THIS_FIRST.md` - Basic setup
   - `PASSWORD_RESET_QUICKSTART.md` - Quick start
   - `PASSWORD_RESET_SETUP.md` - Detailed setup

2. **Run diagnostics:**

   ```bash
   npm run test-email your@email.com
   ```

3. **Check backend console output** when:

   - Server starts
   - User requests password reset
   - User submits new password

4. **Check browser console** (F12) when:
   - Loading forgot password page
   - Submitting email
   - Loading reset password page
   - Submitting new password

---

**Last Updated:** December 2, 2025  
**Quick Help:** Run `npm run test-email` to diagnose email issues
