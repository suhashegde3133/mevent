/**
 * Email Configuration Test Script
 *
 * This script tests your email configuration without running the full app.
 * Run with: node test-email.js <your-email@example.com>
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

const testEmail = process.argv[2];

if (!testEmail) {
  console.error("❌ Please provide a test email address");
  console.log("   Usage: node test-email.js your-email@example.com");
  process.exit(1);
}

const emailService = process.env.EMAIL_SERVICE || "gmail";
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const emailHost = process.env.EMAIL_HOST;
const emailPort = process.env.EMAIL_PORT;

console.log("\n🔍 Email Configuration Check\n");
console.log("━".repeat(50));
console.log(`EMAIL_SERVICE:  ${emailService || "(not set)"}`);
console.log(`EMAIL_USER:     ${emailUser || "(not set)"}`);
console.log(
  `EMAIL_PASSWORD: ${
    emailPassword ? "***" + emailPassword.slice(-4) : "(not set)"
  }`
);
console.log(`EMAIL_HOST:     ${emailHost || "(not set - using service)"}`);
console.log(`EMAIL_PORT:     ${emailPort || "(not set - using service)"}`);
console.log("━".repeat(50));
console.log();

if (!emailUser || !emailPassword) {
  console.error("❌ Email credentials missing!");
  console.log("   Please set EMAIL_USER and EMAIL_PASSWORD in your .env file");
  console.log("   See backend/PASSWORD_RESET_SETUP.md for setup instructions");
  process.exit(1);
}

async function testEmailConfiguration() {
  try {
    console.log("📧 Creating email transporter...");

    let transporter;

    // Custom SMTP or service
    if (emailHost && emailPort) {
      transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort),
        secure: emailPort === "465",
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      console.log(`✅ Using custom SMTP: ${emailHost}:${emailPort}`);
    } else {
      transporter = nodemailer.createTransport({
        service: emailService,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      console.log(`✅ Using ${emailService} service`);
    }

    console.log();
    console.log("🔐 Verifying email configuration...");

    await transporter.verify();
    console.log("✅ Email configuration verified successfully!");
    console.log();

    console.log(`📨 Sending test email to ${testEmail}...`);

    const info = await transporter.sendMail({
      from: emailUser,
      to: testEmail,
      subject: "MIVENT Email Configuration Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px;">
            <h2 style="margin: 0;">✅ Email Test Successful!</h2>
          </div>
          
          <div style="padding: 30px; background-color: #fff; border: 1px solid #e0e0e0; margin-top: 20px;">
            <p style="color: #666; font-size: 16px;">Congratulations!</p>
            
            <p style="color: #666; font-size: 16px;">
              Your MIVENT email configuration is working correctly. The password reset feature 
              will now be able to send emails to your users.
            </p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Configuration Details:</strong><br/>
              Service: ${emailService || emailHost}<br/>
              From: ${emailUser}<br/>
              Status: ✅ Working
            </div>
            
            <p style="color: #666; font-size: 14px;">
              You can now use the forgot password feature in your application.
            </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0; margin-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is a test email from MIVENT - ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: `
MIVENT Email Configuration Test

✅ Congratulations! Your email configuration is working correctly.

Configuration Details:
Service: ${emailService || emailHost}
From: ${emailUser}
Status: ✅ Working

You can now use the forgot password feature in your application.

This is a test email from MIVENT - ${new Date().toLocaleString()}
      `,
    });

    console.log("✅ Test email sent successfully!");
    console.log(`   Message ID: ${info.messageId}`);
    console.log();
    console.log("━".repeat(50));
    console.log("✅ EMAIL CONFIGURATION TEST PASSED");
    console.log("━".repeat(50));
    console.log();
    console.log("Next steps:");
    console.log("  1. Check your inbox at", testEmail);
    console.log("  2. If not in inbox, check spam/junk folder");
    console.log("  3. Start your backend server: npm start");
    console.log("  4. Test the forgot password feature");
    console.log();
  } catch (error) {
    console.error("❌ Email configuration test failed!");
    console.error();
    console.error("Error:", error.message);
    console.error();

    if (error.code === "EAUTH") {
      console.error("🔐 Authentication Error:");
      console.error("   Your email credentials are incorrect.");
      console.error();
      console.error("   For Gmail users:");
      console.error(
        "   1. Make sure you're using an App Password, not your regular password"
      );
      console.error("   2. Visit: https://myaccount.google.com/apppasswords");
      console.error('   3. Generate a new app password for "Mail"');
      console.error("   4. Update EMAIL_PASSWORD in your .env file");
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.error("🌐 Connection Error:");
      console.error("   Could not connect to email service.");
      console.error();
      console.error("   Troubleshooting:");
      console.error("   1. Check your internet connection");
      console.error(
        "   2. Verify your EMAIL_SERVICE is correct:",
        emailService
      );
      console.error(
        "   3. Check if your firewall is blocking SMTP connections"
      );
    } else {
      console.error("   See backend/PASSWORD_RESET_SETUP.md for help");
    }

    console.error();
    process.exit(1);
  }
}

testEmailConfiguration();
