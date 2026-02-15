const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const Session = require("../models/Session");
const SecuritySettings = require("../models/SecuritySettings");
const { sendPasswordResetEmail } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "photoflow-demo-secret";

// Helper: Log login attempt
const logLoginAttempt = async (email, ipAddress, status, reason, userAgent) => {
  try {
    await new LoginAttempt({
      email,
      ipAddress,
      status,
      reason,
      userAgent,
    }).save();
  } catch (err) {
    console.error("Error logging login attempt:", err);
  }
};

// Helper: Create session record
const createSession = async (userId, token, req) => {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await new Session({
      userId,
      token,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
      device: req.headers["user-agent"] || "unknown",
      expiresAt,
    }).save();
  } catch (err) {
    console.error("Error creating session:", err);
  }
};

// Login: find user by email and validate password (demo: plaintext). Returns JWT.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const userAgent = req.headers["user-agent"] || "unknown";
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await logLoginAttempt(
        email,
        ipAddress,
        "failed",
        "invalid_email",
        userAgent,
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user account is deactivated/inactive
    if (user.status === "inactive") {
      await logLoginAttempt(
        email,
        ipAddress,
        "failed",
        "account_deactivated",
        userAgent,
      );
      return res.status(403).json({
        message:
          "Your account has been terminated. Please contact the platform owner for assistance: miventsite@gmail.com",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      await logLoginAttempt(
        email,
        ipAddress,
        "failed",
        "account_locked",
        userAgent,
      );
      return res.status(403).json({
        message: "Account temporarily locked. Please try again later.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    // Get security settings
    const settings = (await SecuritySettings.findOne()) || {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
    };

    if (!valid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= settings.maxLoginAttempts) {
        user.lockoutUntil = new Date(
          Date.now() + settings.lockoutDuration * 60 * 1000,
        );
        await user.save();
        await logLoginAttempt(
          email,
          ipAddress,
          "failed",
          "max_attempts_reached",
          userAgent,
        );
        return res.status(403).json({
          message: `Too many failed attempts. Account locked for ${settings.lockoutDuration} minutes.`,
        });
      }

      await user.save();
      await logLoginAttempt(
        email,
        ipAddress,
        "failed",
        "invalid_password",
        userAgent,
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Success - reset attempts
    user.loginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    const token = jwt.sign(
      { sub: String(user._id), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Create session and log success
    await createSession(user._id, token, req);
    await logLoginAttempt(email, ipAddress, "success", null, userAgent);

    const userResponse = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
    };
    return res.json({ token, user: userResponse });
  } catch (e) {
    console.error("auth.login error", e);
    return res.status(500).json({ message: "Login failed" });
  }
};

// Register: create a new user in MongoDB and return JWT + user
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password before saving
    const hashed = await bcrypt.hash(password, 10);
    const doc = new User({
      email,
      password: hashed,
      name: name || "New User",
    });
    await doc.save();

    const token = jwt.sign(
      { sub: String(doc._id), email: doc.email, role: doc.role },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const userResponse = {
      _id: doc._id,
      email: doc.email,
      name: doc.name,
      role: doc.role,
      plan: doc.plan,
      status: doc.status,
      photoURL: doc.photoURL,
      createdAt: doc.createdAt,
    };

    return res.status(201).json({ token, user: userResponse });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("auth.register error", e);
    return res.status(500).json({ message: "Registration failed" });
  }
};

// Logout: client can simply discard JWT; server-side blacklisting omitted for demo
exports.logout = (req, res) => {
  return res.json({ message: "Logged out" });
};

// Forgot Password: Generate reset token and send to user
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token (6-digit OTP code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // LOG CODE VERY LOUDLY FOR TESTING
    console.log("\n" + "=".repeat(50));
    console.log(`🔥 [TESTING] RESET CODE FOR ${email}: ${resetToken}`);
    console.log("=".repeat(50) + "\n");

    // Send password reset email
    console.log(`📧 Attempting to send email to: ${email}`);
    const emailResult = await sendPasswordResetEmail(
      email,
      resetToken,
      null, // No reset URL needed for code flow
    );

    if (!emailResult.success) {
      console.warn(
        `⚠️  Failed to send password reset email to ${email}: ${emailResult.message}`,
      );
    }

    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset code has been sent",
      // For demo only - remove in production
      resetCode: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch (e) {
    console.error("auth.forgotPassword error", e);
    return res.status(500).json({ message: "Forgot password request failed" });
  }
};

// Reset Password: Validate token and update password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password, confirmPassword } = req.body || {};

    if (!email || !code || !password || !confirmPassword) {
      return res.status(400).json({
        message:
          "Email, code, password, and password confirmation are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the code to find user
    const hashedToken = crypto.createHash("sha256").update(code).digest("hex");
    const user = await User.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset code",
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    console.log(`✅ Password successfully reset for user: ${user.email}`);

    return res.status(200).json({
      message:
        "Password has been successfully reset. Please login with your new password.",
    });
  } catch (e) {
    console.error("auth.resetPassword error", e);
    return res.status(500).json({ message: "Password reset failed" });
  }
};

// Verify Reset Token: Check if token is valid
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params || {};

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    return res.status(200).json({ message: "Token is valid" });
  } catch (e) {
    console.error("auth.verifyResetToken error", e);
    return res.status(500).json({ message: "Token verification failed" });
  }
};

// Google Authentication: Verify Firebase ID token and create/update user
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, email, name, photoURL } = req.body || {};

    if (!idToken || !email) {
      return res.status(400).json({
        message: "ID token and email are required",
      });
    }

    // Verify the Firebase ID token (in production, you should verify this properly)
    // For now, we'll trust the frontend and create/update the user
    // TODO: Add proper Firebase token verification using admin SDK

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Google auth
      user = new User({
        email,
        name: name || email.split("@")[0],
        photoURL: photoURL || null,
        // Google users don't have a password set initially
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        isGoogleUser: true,
      });
      await user.save();
      console.log(`✅ New user created via Google auth: ${email}`);
    } else {
      // Check if user account is deactivated/inactive
      if (user.status === "inactive") {
        return res.status(403).json({
          message:
            "Your account has been terminated. Please contact the platform owner for assistance: miventsite@gmail.com",
          code: "ACCOUNT_DEACTIVATED",
        });
      }

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
