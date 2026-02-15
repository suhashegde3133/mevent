const express = require("express");
const router = express.Router();
const TeamMember = require("../models/TeamMember");
const { authenticateToken } = require("../middleware/auth");

// Apply authentication to all team routes
router.use(authenticateToken);

// GET /api/team - Get all team members
router.get("/", async (req, res) => {
  try {
    const teamMembers = await TeamMember.find({ owner: req.user.sub }).sort({
      name: 1,
    });
    res.json(teamMembers);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

// POST /api/team - Create a new team member
router.post("/", async (req, res) => {
  try {
    const { name, role, phone, email, avatar, payments } = req.body;

    console.log("Creating team member with data:", {
      name,
      role,
      phone,
      email,
      avatar,
      payments,
    });

    // Validation
    if (!name || !role || !email) {
      return res
        .status(400)
        .json({ error: "Name, role, and email are required" });
    }

    // Check if email already exists
    const existingMember = await TeamMember.findOne({
      email,
      owner: req.user.sub,
    });
    if (existingMember) {
      return res
        .status(400)
        .json({ error: "A team member with this email already exists" });
    }

    const newMember = new TeamMember({
      name: name.trim(),
      role: role.trim(),
      phone: phone ? phone.trim() : "",
      email: email.trim().toLowerCase(),
      avatar,
      payments: payments || [],
      owner: req.user.sub,
      ownerEmail: req.user.email || "",
      ownerName: req.user.name || "",
    });

    const savedMember = await newMember.save();
    res.status(201).json(savedMember);
  } catch (err) {
    console.error("Error creating team member:", err.message);
    console.error("Full error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to create team member" });
  }
});

// GET /api/team/:id - Get a specific team member
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Team member ID is required" });
    }

    const member = await TeamMember.findOne({ _id: id, owner: req.user.sub });
    if (!member) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(member);
  } catch (err) {
    console.error("Error fetching team member:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid team member ID" });
    }
    res.status(500).json({ error: "Failed to fetch team member" });
  }
});

// PUT /api/team/:id - Update a team member
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "Team member ID is required" });
    }

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;

    // Update updatedAt
    updates.updatedAt = new Date();

    // If email is being updated, check for uniqueness
    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
      const existingMember = await TeamMember.findOne({
        email: updates.email,
        _id: { $ne: id },
        owner: req.user.sub,
      });
      if (existingMember) {
        return res
          .status(400)
          .json({ error: "A team member with this email already exists" });
      }
    }

    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.role) updates.role = updates.role.trim();
    if (updates.phone) updates.phone = updates.phone.trim();

    const updatedMember = await TeamMember.findOneAndUpdate(
      { _id: id, owner: req.user.sub },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedMember) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(updatedMember);
  } catch (err) {
    console.error("Error updating team member:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid team member ID" });
    }
    res.status(500).json({ error: "Failed to update team member" });
  }
});

// DELETE /api/team/:id - Delete a team member
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Team member ID is required" });
    }

    const deletedMember = await TeamMember.findOneAndDelete({
      _id: id,
      owner: req.user.sub,
    });

    if (!deletedMember) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json({ message: "Team member deleted successfully" });
  } catch (err) {
    console.error("Error deleting team member:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid team member ID" });
    }
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

module.exports = router;
