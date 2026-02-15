# Password Reset Email Setup Guide

This guide will help you configure email functionality for the password reset feature in MIVENT.

## Overview

The password reset feature allows users to:

1. Request a password reset link via their registered email
2. Receive an email with a secure reset link
3. Reset their password using the link (valid for 1 hour)

## Prerequisites

- A Gmail account (or other email service)
- Access to generate App-specific passwords (for Gmail)

---

## Step 1: Set Up Gmail App Password (Recommended)

### For Gmail Users:

1. **Enable 2-Step Verification**

   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click on "2-Step Verification" and follow the setup process
   - Complete the verification setup

2. **Generate App Password**

   - Visit [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → Enter "MIVENT Backend"
   - Click **Generate**
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

3. **Update Your .env File**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### For Other Email Services:

If you're using a different email service (like Outlook, Yahoo, etc.), update the configuration:

```env
# For Outlook
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password

# For Yahoo
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-password

# For custom SMTP
EMAIL_SERVICE=
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

---

## Step 2: Configure Backend Environment

1. **Edit the `.env` file** in the `backend` folder:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:3000
```

2. **For Production**, update `FRONTEND_URL`:

```env
FRONTEND_URL=https://your-production-domain.com
```

---

## Step 3: Test the Email Configuration

### Option 1: Test via Backend Directly

1. Start the backend server:

   ```bash
   cd backend
   npm start
   ```

2. Send a test request using curl or Postman:

   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. Check the console output for email sending status

### Option 2: Test via Frontend

1. Start both backend and frontend
2. Navigate to: `http://localhost:3000/forgot-password`
3. Enter a registered email address
4. Click "Send Reset Link"
5. Check your email inbox (and spam folder)

---

## How It Works

### 1. User Requests Password Reset

- User enters their email on the forgot password page
- Backend generates a unique reset token
- Token is hashed and stored in the database with 1-hour expiration
- Email is sent with reset link containing the original token

### 2. Email Content

The email includes:

- Professional MIVENT-branded template
- Clickable reset button
- Plain text link (as backup)
- 1-hour expiration notice
- Security note about ignoring if not requested

### 3. User Clicks Reset Link

- Link format: `http://localhost:3000/reset-password/{token}`
- Frontend verifies token validity with backend
- If valid, shows password reset form
- If expired/invalid, shows error with link to request new one

### 4. Password Reset

- User enters new password (min 6 characters)
- Password must match confirmation
- Backend validates token again
- Password is hashed with bcrypt (10 rounds)
- Token is cleared from database
- User redirected to login page

---

## Security Features

✅ **Token Hashing**: Reset tokens are hashed before database storage  
✅ **Expiration**: Tokens expire after 1 hour  
✅ **Single Use**: Tokens are deleted after successful reset  
✅ **Password Hashing**: Passwords hashed with bcrypt  
✅ **No Email Disclosure**: Generic response whether email exists or not

---

## Troubleshooting

### Email Not Sending

**Problem**: Console shows "Email service not configured"

- **Solution**: Check that `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`

**Problem**: "Invalid login" or authentication error

- **Solution**: For Gmail, ensure you're using an App Password, not your regular password

**Problem**: Email goes to spam

- **Solution**: Add sender email to contacts, or configure SPF/DKIM for production

### Token Issues

**Problem**: "Invalid or expired token"

- **Solution**: Token may have expired (1 hour limit). Request a new reset link

**Problem**: Token verification fails

- **Solution**: Ensure frontend and backend are both running and `FRONTEND_URL` is correct

### General Issues

**Problem**: CORS errors

- **Solution**: Check `FRONTEND_URL` in backend `.env` matches frontend URL

**Problem**: Email template not rendering

- **Solution**: Email client may not support HTML. Plain text version is included as fallback

---

## Email Template Customization

To customize the email template, edit `backend/utils/emailService.js`:

```javascript
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: email,
  subject: "Password Reset Request - MIVENT",
  html: `
    <!-- Your custom HTML template here -->
  `,
  text: `
    Your custom plain text version here
  `,
};
```

---

## Production Deployment

### Environment Variables to Set:

```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Important Notes:

1. **Use environment variables** for sensitive data (never commit `.env`)
2. **Configure SPF/DKIM** records for better email deliverability
3. **Monitor email sending** (consider services like SendGrid for production)
4. **Test thoroughly** before going live
5. **Set up email logging** to track delivery issues

---

## Alternative Email Services

### SendGrid (Recommended for Production)

```javascript
// Install: npm install @sendgrid/mail

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: "noreply@mivent.com",
  subject: "Password Reset Request - MIVENT",
  html: emailTemplate,
};

await sgMail.send(msg);
```

### AWS SES

```javascript
// Install: npm install @aws-sdk/client-ses

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({ region: "us-east-1" });
const params = {
  Source: "noreply@mivent.com",
  Destination: { ToAddresses: [email] },
  Message: {
    Subject: { Data: "Password Reset Request - MIVENT" },
    Body: { Html: { Data: emailTemplate } },
  },
};

await sesClient.send(new SendEmailCommand(params));
```

---

## API Reference

### POST /api/auth/forgot-password

Request password reset email

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

### GET /api/auth/verify-reset-token/:token

Verify if reset token is valid

**Response (200):**

```json
{
  "message": "Token is valid"
}
```

**Response (400):**

```json
{
  "message": "Invalid or expired reset token"
}
```

### POST /api/auth/reset-password

Reset password using token

**Request:**

```json
{
  "token": "abc123...",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response (200):**

```json
{
  "message": "Password has been successfully reset. Please login with your new password."
}
```

---

## Support

If you encounter issues:

1. Check the backend console for error messages
2. Verify all environment variables are set correctly
3. Test email configuration with a simple nodemailer test
4. Check email service status (Gmail, SendGrid, etc.)
5. Review the troubleshooting section above

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0
