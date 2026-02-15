const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { authenticateToken } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Get all notes for the authenticated user
router.get("/", async (req, res) => {
  try {
    const { archived = "false" } = req.query;
    const filter = {
      userId: req.user.sub,
      archived: archived === "true",
    };

    const notes = await Note.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .lean();

    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res
      .status(500)
      .json({ message: "Error fetching notes", error: error.message });
  }
});

// Get a single note by ID
router.get("/:id", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    }).lean();

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    res
      .status(500)
      .json({ message: "Error fetching note", error: error.message });
  }
});

// Create a new note
router.post("/", async (req, res) => {
  try {
    const { title, content, type, checklist, color, pinned } = req.body;

    const note = new Note({
      userId: req.user.sub,
      title: title || "",
      content: content || "",
      type: type || "text",
      checklist: type === "checklist" ? checklist || [] : [],
      color: color || "#ffffff",
      pinned: pinned || false,
    });

    await note.save();
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res
      .status(500)
      .json({ message: "Error creating note", error: error.message });
  }
});

// Update a note
router.put("/:id", async (req, res) => {
  try {
    const { title, content, type, checklist, color, pinned, archived } =
      req.body;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(checklist !== undefined && { checklist }),
        ...(color !== undefined && { color }),
        ...(pinned !== undefined && { pinned }),
        ...(archived !== undefined && { archived }),
      },
      { new: true },
    ).lean();

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    res
      .status(500)
      .json({ message: "Error updating note", error: error.message });
  }
});

// Toggle pin status
router.patch("/:id/pin", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.pinned = !note.pinned;
    await note.save();

    res.json(note);
  } catch (error) {
    console.error("Error toggling pin:", error);
    res
      .status(500)
      .json({ message: "Error toggling pin", error: error.message });
  }
});

// Toggle archive status
router.patch("/:id/archive", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.archived = !note.archived;
    if (note.archived) {
      note.pinned = false; // Unpin when archiving
    }
    await note.save();

    res.json(note);
  } catch (error) {
    console.error("Error toggling archive:", error);
    res
      .status(500)
      .json({ message: "Error toggling archive", error: error.message });
  }
});

// Update checklist item
router.patch("/:id/checklist/:itemId", async (req, res) => {
  try {
    const { completed, text } = req.body;
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const item = note.checklist.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    if (completed !== undefined) item.completed = completed;
    if (text !== undefined) item.text = text;

    await note.save();
    res.json(note);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res
      .status(500)
      .json({ message: "Error updating checklist item", error: error.message });
  }
});

// Delete a note
router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res
      .status(500)
      .json({ message: "Error deleting note", error: error.message });
  }
});

module.exports = router;
