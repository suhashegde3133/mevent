const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

function col(name) {
  return mongoose.connection.db.collection(name);
}

// GET /api/dashboard - generic dashboard object
router.get("/", async (req, res) => {
  try {
    const stats = await computeStats(req.user.sub);
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/stats - return aggregated counters and revenue
router.get("/stats", async (req, res) => {
  try {
    const stats = await computeStats(req.user.sub);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function computeStats(owner) {
  const eventsCol = col("events");
  const quotationsCol = col("quotations");
  const billingCol = col("billing");

  const ownerFilter = { owner };

  // Count documents (safe: if collection doesn't exist, collection methods still work)
  const totalEvents = await eventsCol
    .countDocuments(ownerFilter)
    .catch(() => 0);
  const totalQuotations = await quotationsCol
    .countDocuments(ownerFilter)
    .catch(() => 0);
  const totalBills = await billingCol
    .countDocuments(ownerFilter)
    .catch(() => 0);

  // Sum revenue (try common fields: paid, amountPaid, amount)
  const revenueAgg = await billingCol
    .aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $toDouble: { $ifNull: ["$paid", "$amountPaid", "$amount", 0] },
            },
          },
        },
      },
    ])
    .toArray()
    .catch(() => []);

  const revenue = (revenueAgg && revenueAgg[0] && revenueAgg[0].totalPaid) || 0;

  return {
    totalEvents,
    totalQuotations,
    totalBills,
    revenue,
  };
}

module.exports = router;
