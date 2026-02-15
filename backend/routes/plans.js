const express = require("express");
const router = express.Router();
const PlanSettings = require("../models/PlanSettings");

// Get public plan settings (no auth required)
router.get("/settings", async (req, res) => {
  try {
    let plans = await PlanSettings.find({ isActive: true }).lean();

    // If no plans exist, return defaults
    if (plans.length === 0) {
      plans = [
        {
          planId: "silver",
          name: "Silver",
          price: 999,
          originalPrice: 999,
          discountPercentage: 0,
          offerEnabled: false,
          offerLabel: "",
          features: [
            "Add Unlimited Services",
            "Chat with Team Members",
            "Add Unlimited Team Members",
            "Unlimited Events Creation and Tracking",
            "Unlimited Projects Creation and Tracking",
          ],
          billingCycle: "yearly",
          isActive: true,
        },
        {
          planId: "gold",
          name: "Gold",
          price: 1999,
          originalPrice: 1999,
          discountPercentage: 0,
          offerEnabled: false,
          offerLabel: "",
          features: [
            "All Silver Benefits",
            "Unlimited policy Creation",
            "High priority Email support",
            "Unlimited Bill Creation and Tracking",
            "Unlimited Quotation Creation and Tracking",
          ],
          billingCycle: "yearly",
          isActive: true,
        },
      ];
    }

    // Calculate effective prices and check if offers are active
    const now = new Date();
    const processedPlans = plans.map((plan) => {
      let isOfferActive = false;
      let effectivePrice = plan.originalPrice || plan.price;

      if (plan.offerEnabled && plan.discountPercentage > 0) {
        const start = plan.offerStartDate
          ? new Date(plan.offerStartDate)
          : null;
        const end = plan.offerEndDate ? new Date(plan.offerEndDate) : null;

        // Check if offer is within valid date range
        if ((!start || now >= start) && (!end || now <= end)) {
          isOfferActive = true;
          effectivePrice = Math.round(
            plan.originalPrice * (1 - plan.discountPercentage / 100),
          );
        }
      }

      return {
        planId: plan.planId,
        name: plan.name,
        price: effectivePrice,
        originalPrice: plan.originalPrice,
        discountPercentage: isOfferActive ? plan.discountPercentage : 0,
        offerLabel: isOfferActive ? plan.offerLabel : "",
        isOfferActive,
        features: plan.features,
        billingCycle: plan.billingCycle,
      };
    });

    res.json({ plans: processedPlans });
  } catch (error) {
    console.error("Error fetching public plan settings:", error);
    res
      .status(500)
      .json({ message: "Error fetching plan settings", error: error.message });
  }
});

module.exports = router;
