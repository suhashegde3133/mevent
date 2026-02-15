# 🔐 Password Reset Setup - Quick Start

This guide will help you set up the functional forgot/reset password feature with real email delivery.

## ⚡ Quick Setup (5 minutes)

### Step 1: Configure Email Credentials

1. **Open** `backend/.env`
2. **Update** the following lines with your email credentials:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
```

### Step 2: Get Gmail App Password

If using Gmail:

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Generate an app password for "Mail"
3. Copy the 16-character password
4. Paste it in `EMAIL_PASSWORD` (remove spaces)

**Example:**

```env
EMAIL_USER=myemail@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

### Step 3: Test Email Configuration

```bash
cd backend
npm run test-email your-email@example.com
```

**Expected output:**

```
✅ Email configuration verified successfully!
✅ Test email sent successfully!
```

### Step 4: Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm start
```

### Step 5: Test Password Reset

1. Navigate to: `http://localhost:3000/forgot-password`
2. Enter a registered email address
3. Click "Send Reset Link"
4. Check your email inbox
5. Click the reset link
6. Enter new password

## ✅ What You Get

### 1. Professional Email Template

- Branded MIVENT design
- Clickable reset button
- Plain text fallback
- Mobile responsive

### 2. Secure Token System

- Cryptographically secure tokens
- 1-hour expiration
- Single-use tokens
- Hashed storage

### 3. User-Friendly Flow

- Email validation
- Token verification
- Password strength requirements
- Success/error notifications

### 4. Security Features

- ✅ Bcrypt password hashing
- ✅ Token expiration
- ✅ No email enumeration
- ✅ HTTPS ready

## 📧 Supported Email Services

### Pre-configured Services:

- ✅ Gmail (recommended for testing)
- ✅ Outlook/Office365
- ✅ Yahoo
- ✅ Custom SMTP

### Production Services:

- ✅ SendGrid
- ✅ AWS SES
- ✅ Mailgun
- ✅ Postmark

## 🔧 Configuration Options

### Using Gmail (Default)

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Using Outlook

```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Using Custom SMTP

```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
```

## 🐛 Troubleshooting

### Email Not Sending?

**Check Console Output:**

```bash
# Should see:
✅ Email transporter initialized with gmail service
📧 Sending password reset email to: user@example.com
✅ Password reset email sent to user@example.com
```

**Common Issues:**

1. **"Email credentials not configured"**

   - Set `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

2. **Authentication failed**

   - For Gmail: Use App Password, not regular password
   - Enable 2-Step Verification first

3. **Email goes to spam**

   - Add sender to contacts
   - Check SPF/DKIM for production

4. **Invalid or expired token**
   - Token expires after 1 hour
   - Request a new reset link

### Still Having Issues?

1. **Run email test:**

   ```bash
   npm run test-email your-email@example.com
   ```

2. **Check logs:**

   - Backend console shows detailed error messages
   - Look for emoji indicators (✅, ❌, ⚠️)

3. **Verify setup:**
   - `.env` file exists in `backend/` folder
   - Email credentials are correct
   - Both frontend and backend are running

## 📚 Detailed Documentation

For more detailed information, see:

- **[PASSWORD_RESET_SETUP.md](backend/PASSWORD_RESET_SETUP.md)** - Complete setup guide
- **[EMAIL_SETUP_GUIDE.md](backend/EMAIL_SETUP_GUIDE.md)** - Email configuration details

## 🔐 API Endpoints

### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Verify Token

```http
GET /api/auth/verify-reset-token/:token
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

## 🚀 Production Deployment

Before deploying to production:

1. **Update environment variables:**

   ```env
   NODE_ENV=production
   FRONTEND_URL=https://your-domain.com
   EMAIL_USER=noreply@your-domain.com
   ```

2. **Use professional email service** (SendGrid, AWS SES)

3. **Configure SPF/DKIM** records

4. **Enable HTTPS** on frontend

5. **Test thoroughly** with real emails

## ✨ Features

- ✅ **Functional** - Sends real emails
- ✅ **Secure** - Industry-standard encryption
- ✅ **User-friendly** - Clear instructions and feedback
- ✅ **Production-ready** - Complete error handling
- ✅ **Customizable** - Easy to modify templates
- ✅ **Well-documented** - Comprehensive guides

## 🎉 You're All Set!

Your password reset feature is now fully functional. Users can:

1. Request password reset via email
2. Receive professional reset emails
3. Securely reset their passwords
4. Login with new credentials

---

**Need Help?** See [backend/PASSWORD_RESET_SETUP.md](backend/PASSWORD_RESET_SETUP.md) for detailed troubleshooting.

**Last Updated:** December 2, 2025
