const express = require("express");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication to all service routes
router.use(authenticateToken);

function col() {
  return mongoose.connection.db.collection("services");
}

router.get("/", async (req, res) => {
  try {
    const docs = await col()
      .find({ owner: req.user.sub })
      .sort({ name: 1 })
      .toArray();
    console.log("GET /services - Found", docs.length, "services");
    res.json(docs);
  } catch (err) {
    console.error("GET /services error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    body.owner = req.user.sub;
    body.createdAt = new Date();
    console.log(
      "POST /services - Creating service with body:",
      JSON.stringify(body, null, 2)
    );
    const result = await col().insertOne(body);
    const responseBody = { ...body, _id: result.insertedId };
    console.log(
      "POST /services - Created service:",
      JSON.stringify(responseBody, null, 2)
    );
    console.log(
      "POST /services - Service will be stored with _id:",
      result.insertedId,
      "and id:",
      body.id
    );
    res.status(201).json(responseBody);
  } catch (err) {
    console.error("POST /services error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("GET /services/:id - Fetching service with id:", id);
    const { Types } = mongoose;
    let query;
    try {
      query = { _id: new Types.ObjectId(id), owner: req.user.sub };
      console.log("GET /services/:id - Trying MongoDB _id query");
    } catch (e) {
      query = { id: id, owner: req.user.sub };
      console.log("GET /services/:id - Trying custom id query:", query);
    }
    const doc = await col().findOne(query);
    console.log("GET /services/:id - Found document:", doc ? "YES" : "NO");
    if (doc) {
      console.log(
        "GET /services/:id - Document structure:",
        JSON.stringify(doc, null, 2)
      );
    }
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("GET /services/:id - Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("PUT /services/:id - id param:", id);

    const body = req.body || {};
    delete body._id; // Remove _id if it exists in body
    body.owner = req.user.sub;
    body.updatedAt = new Date();

    const { Types } = mongoose;
    let mongoId;

    try {
      mongoId = new Types.ObjectId(id);
      console.log("PUT /services/:id - Parsed as MongoDB ObjectId");
    } catch (e) {
      console.log(
        "PUT /services/:id - ID is not a valid ObjectId, trying as string id"
      );
      // If not a valid ObjectId, query by custom id field instead
      return res
        .status(400)
        .json({
          error:
            "Invalid service ID format. Services must be queried by their MongoDB ID after creation.",
        });
    }

    const query = { _id: mongoId, owner: req.user.sub };
    console.log("PUT /services/:id - Query:", JSON.stringify(query, null, 2));
    console.log(
      "PUT /services/:id - Update body:",
      JSON.stringify(body, null, 2)
    );

    const result = await col().findOneAndUpdate(
      query,
      { $set: body },
      { returnDocument: "after" }
    );

    if (!result || !result.value) {
      console.log("PUT /services/:id - Service not found");
      return res.status(404).json({ message: "Service not found" });
    }

    console.log("PUT /services/:id - Updated successfully");
    res.json(result.value);
  } catch (err) {
    console.error("PUT /services/:id - Exception:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("DELETE /services/:id - id param:", id);

    const { Types } = mongoose;
    let mongoId;

    try {
      mongoId = new Types.ObjectId(id);
      console.log("DELETE /services/:id - Parsed as MongoDB ObjectId");
    } catch (e) {
      console.log("DELETE /services/:id - ID is not a valid ObjectId");
      return res.status(400).json({ error: "Invalid service ID format" });
    }

    const query = { _id: mongoId, owner: req.user.sub };
    console.log(
      "DELETE /services/:id - Query:",
      JSON.stringify(query, null, 2)
    );

    const result = await col().deleteOne(query);

    if (result.deletedCount === 0) {
      console.log(
        "DELETE /services/:id - Service not found or already deleted"
      );
      return res.status(404).json({ message: "Service not found" });
    }

    console.log("DELETE /services/:id - Deleted successfully");
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /services/:id - Exception:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
