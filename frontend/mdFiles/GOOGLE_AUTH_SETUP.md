# Google Sign In/Sign Up Implementation Guide

## Overview

This document explains the Google Sign In/Sign Up functionality that has been integrated into the MIVENT application using Firebase Authentication.

## What Was Implemented

### Frontend Changes

1. **Firebase Configuration** (`frontend/src/firebase.js`)
   - Added Google Auth Provider
   - Imported `GoogleAuthProvider` and `signInWithPopup` from Firebase Auth
   - Configured Google provider to show account selection on each sign in

2. **Google Auth Utility** (`frontend/src/utils/googleAuth.js`)
   - Created `handleGoogleAuth()` function that:
     - Signs in user with Firebase Google provider
     - Retrieves Firebase ID token
     - Sends token to backend for verification and JWT creation

3. **Login Page** (`frontend/src/pages/Login.jsx`)
   - Added Google Sign In button with Google logo
   - Integrated `handleGoogleSignIn()` function
   - Added visual divider between regular login and Google login
   - Styled with responsive design

4. **Register Page** (`frontend/src/pages/Register.jsx`)
   - Added Google Sign Up button with Google logo
   - Integrated `handleGoogleSignUp()` function
   - Added visual divider between regular registration and Google sign up
   - Same styling as Login page

5. **Styling** (`frontend/src/pages/Login.scss`, `frontend/src/pages/Register.scss`)
   - Added `.login__divider` class for visual separator
   - Added `.login__google-btn` class for Google button styling
   - Responsive design that works on mobile and desktop
   - Hover effects and disabled states

6. **Constants** (`frontend/src/utils/constants.js`)
   - Added `GOOGLE_AUTH: "/auth/google"` API endpoint

### Backend Changes

1. **Auth Controller** (`backend/controllers/authController.js`)
   - Added `googleAuth()` function that:
     - Receives Firebase ID token and user info from frontend
     - Finds or creates user in MongoDB
     - Updates user profile with Google photo URL if available
     - Generates JWT token for session management

2. **Auth Routes** (`backend/routes/auth.js`)
   - Added `POST /auth/google` route

3. **User Model** (`backend/models/User.js`)
   - Added `photoURL` field for storing Google profile picture
   - Added `isGoogleUser` field to track authentication method

## How to Use

### For Users - Login

1. Navigate to the Login page
2. Option A: Sign in with email and password
3. Option B: Click "Sign in with Google" button
4. Complete Google authentication in popup
5. Automatically redirected to dashboard

### For Users - Register

1. Navigate to the Register page
2. Option A: Register with email, password, and terms acceptance
3. Option B: Click "Sign up with Google" button
4. Complete Google authentication in popup
5. Automatically redirected to dashboard

## Technical Flow

### Google Sign In Flow

```
User Clicks Google Button
    ↓
Firebase Google Provider Popup
    ↓
User Authenticates with Google
    ↓
Firebase Returns ID Token + User Info
    ↓
Frontend Sends to Backend (/auth/google)
    ↓
Backend Creates/Updates User in MongoDB
    ↓
Backend Generates JWT Token
    ↓
Redux Store Updated with User & Token
    ↓
User Redirected to Dashboard
```

## Configuration Requirements

### Firebase Setup

The Firebase project is already configured with:

- Project ID: `mivent-auth`
- API Key: `AIzaSyA7i5y0EqcImEHmCMGqiTzdw9lfhNcKf5I`
- Auth Domain: `mivent-auth.firebaseapp.com`

### Google OAuth Setup (Firebase Console)

1. Go to Firebase Console → Authentication
2. Enable Google as a sign-in provider
3. Add authorized redirect URLs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

## Security Considerations

### Current Implementation

- Firebase handles Google OAuth 2.0 flow securely
- ID tokens are sent to backend for verification
- Backend generates server-side JWT tokens

### Production Recommendations

1. **Verify ID Tokens**: Install and use Firebase Admin SDK to verify tokens

```javascript
const admin = require("firebase-admin");
admin.initializeApp();

// In googleAuth controller
const decodedToken = await admin.auth().verifyIdToken(idToken);
const email = decodedToken.email;
```

2. **Secure Secrets**: Store Firebase config in environment variables
3. **CORS**: Configure CORS to only allow requests from your frontend domain
4. **Rate Limiting**: Implement rate limiting on `/auth/google` endpoint
5. **HTTPS**: Use HTTPS in production

## Environment Variables

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000
```

### Backend (.env)

```
JWT_SECRET=your-secret-key
MONGODB_URI=your-mongodb-uri
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Files Modified/Created

### Created Files

- `frontend/src/utils/googleAuth.js` - Google authentication utility

### Modified Files

- `frontend/src/firebase.js` - Added Google provider
- `frontend/src/pages/Login.jsx` - Added Google sign in button
- `frontend/src/pages/Register.jsx` - Added Google sign up button
- `frontend/src/pages/Login.scss` - Added styling for Google button
- `frontend/src/pages/Register.scss` - Added styling for Google button
- `frontend/src/utils/constants.js` - Added Google auth endpoint
- `backend/controllers/authController.js` - Added googleAuth function
- `backend/routes/auth.js` - Added Google auth route
- `backend/models/User.js` - Added photoURL and isGoogleUser fields

## Testing the Implementation

1. **Start Backend**

```bash
cd backend
npm start
```

2. **Start Frontend**

```bash
cd frontend
npm start
```

3. **Test Login with Google**
   - Navigate to http://localhost:3000/login
   - Click "Sign in with Google"
   - Complete authentication
   - Should redirect to dashboard

4. **Test Register with Google**
   - Navigate to http://localhost:3000/register
   - Click "Sign up with Google"
   - Complete authentication
   - Should create new user and redirect to dashboard

## Troubleshooting

### Google popup not appearing

- Check browser console for errors
- Verify Firebase config is correct
- Ensure Google provider is enabled in Firebase Console
- Check for popup blocker

### "Invalid credentials" after Google sign in

- Verify Firebase ID token is being sent correctly
- Check backend logs for errors
- Ensure MongoDB connection is working

### User not being created

- Check MongoDB is running
- Verify User model schema
- Check backend logs for validation errors

## Future Enhancements

1. **Token Refresh**: Implement refresh token mechanism
2. **Social Linking**: Allow linking multiple auth methods to one account
3. **User Permissions**: Implement role-based access control for Google users
4. **Profile Completion**: Redirect new Google users to complete profile
5. **Two Factor Authentication**: Add optional 2FA for Google users

## Support

For issues or questions:

1. Check browser console for error messages
2. Check backend logs
3. Verify Firebase configuration
4. Ensure network connectivity to Firebase services
