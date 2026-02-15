const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");
const Payment = require("../models/Payment");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order
router.post("/order", authenticateToken, async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ message: "Could not create order", error });
  }
});

// Verify payment
router.post("/verify", authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment verified
      // Update user plan and set activation date
      const updateData = { plan };
      if (plan === "silver" || plan === "gold") {
        updateData.planActivatedAt = new Date();
      }
      await User.findByIdAndUpdate(req.user.sub, updateData);

      // Save payment record
      const payment = new Payment({
        userId: req.user.sub,
        amount: req.body.amount || 0,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan: plan,
      });
      await payment.save();

      return res.json({
        message: "Payment verified successfully",
        success: true,
      });
    } else {
      return res
        .status(400)
        .json({ message: "Invalid signature sent!", success: false });
    }
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).json({ message: "Internal Server Error!", success: false });
  }
});

module.exports = router;
