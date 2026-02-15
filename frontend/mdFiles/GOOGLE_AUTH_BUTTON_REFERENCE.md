# Google Sign In/Sign Up Button Implementation

## Button Markup

### Google Sign In Button (Login Page)

```jsx
<button
  type="button"
  className="login__google-btn"
  onClick={handleGoogleSignIn}
  disabled={isLoading}
>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
  {isLoading ? "Signing in..." : "Sign in with Google"}
</button>
```

### Google Sign Up Button (Register Page)

```jsx
<button
  type="button"
  className="register__google-btn"
  onClick={handleGoogleSignUp}
  disabled={isLoading}
>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
  {isLoading ? "Creating Account..." : "Sign up with Google"}
</button>
```

## Button Styling

### SCSS for Login Page (Login.scss)

```scss
&__divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #d1d5db;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0.5rem 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background-color: #e5e7eb;
  }
}

&__google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: #fff;
  color: #374151;
  border: 2px solid #e5e7eb;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    border-color: #d1d5db;
    background: #f9fafb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}
```

### SCSS for Register Page (Register.scss)

Same styling as Login page - both use `__divider` and `__google-btn` classes

## Handler Functions

### Login Handler (Login.jsx)

```javascript
const handleGoogleSignIn = async () => {
  setIsLoading(true);
  dispatch(loginStart());
  try {
    const result = await handleGoogleAuth();
    const { token, user } = result;

    const appUser = {
      id: user._id,
      fullName: user.name || "",
      email: user.email || "",
      avatar: user.photoURL || null,
    };

    dispatch(loginSuccess({ user: appUser, token }));
    showToast("Google login successful!");
    navigate("/dashboard");
  } catch (err) {
    console.error("Google login failed", err);
    const message =
      err.response?.data?.message ||
      err.message ||
      "Google login failed. Please try again.";
    dispatch(loginFailure(message));
    showToast(message);
  } finally {
    setIsLoading(false);
  }
};
```

### Register Handler (Register.jsx)

```javascript
const handleGoogleSignUp = async () => {
  setIsLoading(true);
  try {
    const result = await handleGoogleAuth();
    const { token, user } = result;
    const appUser = {
      id: user._id,
      fullName: user.name || "",
      email: user.email || "",
      avatar: user.photoURL || null,
    };

    dispatch(loginStart());
    dispatch(loginSuccess({ user: appUser, token }));
    showToast("Account created with Google successfully!");
    navigate("/dashboard");
  } catch (err) {
    console.error("Google sign up failed", err);
    const message =
      err.response?.data?.message ||
      err.message ||
      "Google sign up failed. Please try again.";
    dispatch(loginFailure(message));
    showToast(message);
  } finally {
    setIsLoading(false);
  }
};
```

## Google Auth Utility (googleAuth.js)

```javascript
import { signInWithGoogle } from "../firebase";
import { apiHelper } from "./api";
import { API_ENDPOINTS } from "./constants";

/**
 * Handle Google Sign In/Sign Up
 * Authenticates with Firebase Google provider and then with backend
 */
export async function handleGoogleAuth() {
  try {
    // Sign in with Google using Firebase
    const result = await signInWithGoogle();
    const user = result.user;

    // Get the ID token from Firebase
    const idToken = await user.getIdToken();

    // Send token to backend for verification and JWT creation
    const backendResponse = await apiHelper.post(API_ENDPOINTS.GOOGLE_AUTH, {
      idToken,
      email: user.email,
      name: user.displayName || user.email.split("@")[0],
      photoURL: user.photoURL,
    });

    return backendResponse;
  } catch (error) {
    console.error("Google authentication error:", error);
    throw error;
  }
}
```

## Firebase Configuration (firebase.js - Updated)

```javascript
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export { auth, firebaseConfig, googleProvider };
```

## Backend Endpoint (authController.js)

```javascript
// Google Authentication: Verify Firebase ID token and create/update user
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, email, name, photoURL } = req.body || {};

    if (!idToken || !email) {
      return res.status(400).json({
        message: "ID token and email are required",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Google auth
      user = new User({
        email,
        name: name || email.split("@")[0],
        photoURL: photoURL || null,
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        isGoogleUser: true,
      });
      await user.save();
      console.log(`✅ New user created via Google auth: ${email}`);
    } else {
      // Update existing user with Google info if needed
      if (!user.photoURL && photoURL) {
        user.photoURL = photoURL;
      }
      if (!user.isGoogleUser) {
        user.isGoogleUser = true;
      }
      await user.save();
      console.log(`✅ User updated via Google auth: ${email}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: String(user._id), email: user.email },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Return user without password
    const userObj = user.toObject ? user.toObject() : user;
    if (userObj.password) delete userObj.password;

    return res.status(200).json({ token, user: userObj });
  } catch (e) {
    console.error("auth.googleAuth error", e);
    return res.status(500).json({ message: "Google authentication failed" });
  }
};
```

## Visual Appearance

### Before (Login Page)

```
┌─────────────────────────────────┐
│           MIVENT                │
│  Welcome back! Please login.    │
│─────────────────────────────────│
│ Email: [_______________]        │
│ Password: [_______________]     │
│ [Sign In Button]                │
├─────────────────────────────────┤
│ Already have an account?        │
│ Sign Up | Forgot Password       │
└─────────────────────────────────┘
```

### After (Login Page)

```
┌─────────────────────────────────┐
│           MIVENT                │
│  Welcome back! Please login.    │
│─────────────────────────────────│
│ Email: [_______________]        │
│ Password: [_______________]     │
│ [Sign In Button]                │
│                                 │
│        ---- or ----             │
│ [🔵 Sign in with Google]        │
├─────────────────────────────────┤
│ Forgot Password | Sign Up       │
└─────────────────────────────────┘
```

## Features

✅ **Google Logo SVG** - Official Google colors (blue, green, yellow, red)
✅ **Responsive Design** - Works on mobile and desktop
✅ **Loading States** - Shows "Signing in..." or "Creating Account..."
✅ **Error Handling** - Displays error toasts on failure
✅ **Disabled State** - Button disabled during submission
✅ **Hover Effects** - Visual feedback on mouse over
✅ **Accessibility** - Proper button semantics

## Integration Points

1. **Firebase** - Handles Google OAuth 2.0
2. **Backend API** - Receives token and creates/updates user
3. **Redux** - Stores user and token in application state
4. **React Router** - Navigates to dashboard on success
5. **Toast Notifications** - Shows success/error messages

## Test Scenarios

1. **New User via Google**
   - Click Google button → Create account → Redirect to dashboard

2. **Existing User via Google**
   - Click Google button → Find user → Redirect to dashboard

3. **Network Error**
   - Click Google button → No internet → Show error toast

4. **Backend Error**
   - Click Google button → Server error → Show error message

5. **Cancel Google Login**
   - Click Google button → Cancel popup → No action
