# Email Configuration Guide - Password Reset

## Overview

The password reset functionality now sends actual emails to users. Follow this guide to configure email sending.

## Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Factor Authentication

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and **Windows Computer** (or your device)
3. Google will generate a 16-character password
4. Copy this password (without spaces)

### Step 3: Update .env File

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
FRONTEND_URL=http://localhost:3000
```

### Step 4: Restart Backend Server

```bash
npm start
```

## Testing Password Reset

1. Go to the login page and click "Forgot Password"
2. Enter your email address
3. Check your email inbox for the password reset link
4. Click the link to reset your password

## Production Email Services

### SendGrid

```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Mailgun

```env
EMAIL_SERVICE=mailgun
EMAIL_USER=your-mailgun-domain
EMAIL_PASSWORD=your-mailgun-api-key
```

### Office 365

```env
EMAIL_SERVICE=office365
EMAIL_USER=your-email@company.com
EMAIL_PASSWORD=your-office365-password
```

## Troubleshooting

### "Email service not configured"

- Make sure `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`
- Check that the values don't have extra spaces

### "Invalid login credentials"

- For Gmail: Verify you're using an App Password, not your regular password
- For Gmail: Ensure 2-Factor Authentication is enabled
- Check that credentials are copied correctly (no extra spaces)

### "Email not received"

- Check spam/junk folder
- Verify email address is correct
- Check server logs for sending errors
- Test with a different email service

## Email Template Customization

Edit `backend/utils/emailService.js` to customize:

- Email subject line
- HTML template
- Sender name
- Additional content

## Security Notes

⚠️ **NEVER commit `.env` file with real credentials**

- `.env` is already in `.gitignore`
- Use environment variables in production
- Rotate credentials regularly
- Use app-specific passwords instead of main account passwords
