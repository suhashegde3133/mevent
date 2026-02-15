import { signInWithGoogle } from "../firebase";
import { apiHelper } from "./api";
import { API_ENDPOINTS } from "./constants";
import logger from "./logger";

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
    logger.error("Google authentication error", error, "GoogleAuth");
    throw error;
  }
}
