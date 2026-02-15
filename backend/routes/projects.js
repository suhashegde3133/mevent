const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all project routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("projects");
}

router.get("/", async (req, res) => {
  try {
    console.log("[GET /projects] Fetching projects for user:", req.user.sub);
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ createdAt: -1 })
      .toArray();
    console.log("[GET /projects] Found", docs.length, "projects");
    res.json(docs);
  } catch (err) {
    console.error("[GET /projects] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    body.owner = req.user.sub;
    body.createdAt = new Date();
    console.log(
      "[POST /projects] Creating project for user:",
      req.user.sub,
      "Body:",
      body
    );
    const result = await col().insertOne(body);
    console.log("[POST /projects] Created project with ID:", result.insertedId);
    res.status(201).json({ _id: result.insertedId, ...body });
  } catch (err) {
    console.error("[POST /projects] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: new Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    console.log("[GET /projects/:id] Query:", query);
    const doc = await col().findOne(query);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("[GET /projects/:id] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    // Don't allow changing the owner field
    delete body.owner;
    delete body._id;
    delete body.createdAt;
    body.updatedAt = new Date();
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: new Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    console.log(
      "[PUT /projects/:id] Query:",
      query,
      "Body keys:",
      Object.keys(body)
    );
    const result = await col().findOneAndUpdate(
      query,
      { $set: body },
      { returnDocument: "after" }
    );
    console.log("[PUT /projects/:id] Result:", result);
    if (!result.value) {
      console.log(
        "[PUT /projects/:id] Project not found for user:",
        req.user.sub,
        "ID:",
        id
      );
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(result.value);
  } catch (err) {
    console.error("[PUT /projects/:id] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: new Types.ObjectId(id), owner: req.user.sub };
    } catch (e) {
      query = { id, owner: req.user.sub };
    }
    console.log("[DELETE /projects/:id] Query:", query);
    const result = await col().deleteOne(query);
    console.log("[DELETE /projects/:id] Delete result:", result);
    if (result.deletedCount === 0) {
      console.log(
        "[DELETE /projects/:id] Project not found for user:",
        req.user.sub,
        "ID:",
        id
      );
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /projects/:id] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
