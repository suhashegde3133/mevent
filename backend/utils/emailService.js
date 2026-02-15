const nodemailer = require("nodemailer");

// Email service configuration
let transporter;

// Initialize email transporter
const initializeEmailTransporter = () => {
  // Using Gmail SMTP for demo (you can replace with your email service)
  // For production, use environment variables for sensitive data
  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;

  if (!emailUser || !emailPassword) {
    console.warn(
      "⚠️  Email credentials not configured. Password reset emails will not be sent.",
    );
    console.warn(
      "    Please set EMAIL_USER and EMAIL_PASSWORD in your .env file.",
    );
    console.warn(
      "    See backend/PASSWORD_RESET_SETUP.md for setup instructions.",
    );
    return null;
  }

  // Custom SMTP configuration
  if (emailHost && emailPort) {
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort),
      secure: emailPort === "465", // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    console.log(
      `✅ Email transporter initialized with custom SMTP: ${emailHost}:${emailPort}`,
    );
  } else {
    // Use email service (gmail, outlook, etc.)
    transporter = nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    console.log(
      `✅ Email transporter initialized with ${emailService} service`,
    );
  }

  return transporter;
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      transporter = initializeEmailTransporter();
    }

    if (!transporter) {
      console.log(
        `⚠️  Password reset requested for ${email} but email is not configured.`,
      );
      console.log(`    Reset link (for testing): ${resetUrl}`);
      console.log(
        `    Configure email service to send actual emails. See PASSWORD_RESET_SETUP.md`,
      );
      return {
        success: false,
        message: "Email service not configured",
      };
    }

    const mailOptions = {
      from: `"MIVENT Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code - MIVENT",
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">MIVENT</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">Elevate Your Event Experience</p>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin: 0 auto;">
            <h2 style="color: #111827; text-align: center; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="text-align: center; color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your MIVENT account. Use the secure code below to complete the process:
            </p>
            
            <div style="text-align: center; margin: 35px 0; padding: 25px; background-color: #f3f4f6; border-radius: 12px; border: 1px dashed #d1d5db;">
              <div style="font-family: 'Courier New', Courier, monospace; color: #4f46e5; font-size: 38px; font-weight: bold; letter-spacing: 8px; margin-bottom: 10px;">
                ${resetToken}
              </div>
              <p style="color: #6b7280; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                Expires in 60 minutes
              </p>
            </div>
            
            <p style="text-align: center; color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 10px;">
              If you didn't request this change, you can safely ignore this email. Your password will remain unchanged.
            </p>
            <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 12px;">
            <p>&copy; 2026 MIVENT Inc. All rights reserved.</p>
           </div>
          </div>
        </div>
      `,
      text: `Password Reset Code - MIVENT\n\nHello,\n\nWe received a request to reset your password for your MIVENT account. Please use the following code to reset your password:\n\n${resetToken}\n\nThis code will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\n© 2026 MIVENT. All rights reserved.`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Password reset email sent to ${email}`);
    return {
      success: true,
      message: "Password reset email sent successfully",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("\n❌ GMAIL ERROR DETECTED:");
    console.error(`   ${error.message}`);

    if (error.message.includes("BadCredentials") || error.code === "EAUTH") {
      console.error("\n💡 FIX FOR GMAIL LOGIN ERROR:");
      console.error("   1. You cannot use your regular Gmail password.");
      console.error("   2. You MUST use a 16-character 'App Password'.");
      console.error("   3. Go to: myaccount.google.com/apppasswords");
      console.error(
        "   4. Update EMAIL_PASSWORD in backend/.env with the new code.\n",
      );
    } else if (error.code === "ECONNECTION") {
      console.error(
        "   Connection failed. Check your internet connection and email service status.",
      );
    }
    return {
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    };
  }
};

module.exports = {
  initializeEmailTransporter,
  sendPasswordResetEmail,
};
