const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const UserNotification = require("../models/UserNotification");
const router = express.Router();

// Apply authentication to all quotation routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("quotations");
}

router.get("/", async (req, res) => {
  try {
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ createdAt: -1 })
      .toArray();
    // Ensure each doc has an `id` string for frontend consistency
    const normalized = docs.map((d) => {
      if (!d.id && d._id) d.id = String(d._id);
      return d;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    // Only persist expected fields to avoid accidental omission or injection
    const doc = {
      owner: req.user.sub,
      createdAt: new Date(),
      date: body.date || new Date().toISOString(),
      clientName: body.clientName || "",
      clientEmail: body.clientEmail || "",
      clientPhone: body.clientPhone || "",
      items: Array.isArray(body.items) ? body.items : [],
      services: Array.isArray(body.services) ? body.services : [],
      additionalCharges: Array.isArray(body.additionalCharges)
        ? body.additionalCharges
        : [],
      terms: Array.isArray(body.terms) ? body.terms : [],
      totalAmount: body.totalAmount || 0,
      status: body.status || "pending",
      mainEventDate: body.mainEventDate || "",
      showEventDateInPdf: body.showEventDateInPdf !== false,
      showTermsInPdf: body.showTermsInPdf !== false,
      showPaymentDetailsInPdf: body.showPaymentDetailsInPdf !== false,
      showQrCodeInPdf: body.showQrCodeInPdf !== false,
      // keep any id passed by client (used by frontend generated ids)
      id: body.id || undefined,
    };

    const result = await col().insertOne(doc);
    // Ensure stored document has an id field (use provided id or insertedId)
    const insertedId = result.insertedId;
    const returned = result.ops ? result.ops[0] : { _id: insertedId, ...doc };
    if (!returned.id && insertedId) {
      // update the document to include the string id for future lookups
      try {
        await col().updateOne(
          { _id: insertedId },
          { $set: { id: String(insertedId) } },
        );
        returned.id = String(insertedId);
      } catch (e) {
        // ignore non-critical error
      }
    }

    // Create notification for new quotation
    try {
      await UserNotification.create({
        user: req.user.sub,
        type: "quotation",
        referenceId: insertedId,
        referenceModel: "Quotation",
        title: "New Quotation Created",
        message: `Quotation for ${doc.clientName || "client"} has been created successfully.`,
        icon: "quotation",
        actionUrl: `/quotations?id=${returned.id}`,
        actionLabel: "View Quotation",
      });
    } catch (notificationError) {
      console.error(
        "Failed to create quotation notification:",
        notificationError,
      );
    }

    res.status(201).json(returned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    const doc = await col().findOne(query);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    // Build update object - only include fields that are actually provided
    const update = {};

    if (body.date !== undefined) update.date = body.date;
    if (body.clientName !== undefined) update.clientName = body.clientName;
    if (body.clientEmail !== undefined) update.clientEmail = body.clientEmail;
    if (body.clientPhone !== undefined) update.clientPhone = body.clientPhone;
    if (body.items !== undefined)
      update.items = Array.isArray(body.items) ? body.items : [];
    if (body.services !== undefined)
      update.services = Array.isArray(body.services) ? body.services : [];
    if (body.additionalCharges !== undefined) {
      update.additionalCharges = Array.isArray(body.additionalCharges)
        ? body.additionalCharges
        : [];
    }
    if (body.terms !== undefined)
      update.terms = Array.isArray(body.terms) ? body.terms : [];
    if (body.totalAmount !== undefined) update.totalAmount = body.totalAmount;
    if (body.status !== undefined) update.status = body.status;
    if (body.mainEventDate !== undefined)
      update.mainEventDate = body.mainEventDate;
    if (body.showEventDateInPdf !== undefined)
      update.showEventDateInPdf = body.showEventDateInPdf !== false;
    if (body.showTermsInPdf !== undefined)
      update.showTermsInPdf = body.showTermsInPdf !== false;
    if (body.showPaymentDetailsInPdf !== undefined)
      update.showPaymentDetailsInPdf = body.showPaymentDetailsInPdf !== false;
    if (body.showQrCodeInPdf !== undefined)
      update.showQrCodeInPdf = body.showQrCodeInPdf !== false;
    if (body.id !== undefined) update.id = body.id;

    const result = await col().findOneAndUpdate(
      query,
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result.value) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Normalize id if missing
    if (result.value && !result.value.id && result.value._id) {
      try {
        await col().updateOne(
          { _id: result.value._id },
          { $set: { id: String(result.value._id) } },
        );
        result.value.id = String(result.value._id);
      } catch (e) {
        // ignore
      }
    }
    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    await col().deleteOne(query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
