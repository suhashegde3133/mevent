const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// POST /api/uploads - Upload files
router.post("/", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const files = req.files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    // Return an absolute URL so frontend fetches from backend origin
    url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
    size: file.size,
  }));
  res.json({
    message: "Files uploaded successfully",
    files: files,
  });
});

// Helper: basic content-type mapping for common media
function getContentType(ext) {
  ext = (ext || "").toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

// GET /api/uploads/:filename - Serve uploaded files (supports range requests)
router.get("/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  const filePath = path.join(uploadsDir, filename);

  // Prevent path traversal
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(400).send("Invalid file path");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).json({ message: "File not found" });
    }

    const range = req.headers.range;
    const ext = path.extname(filename);
    const contentType = getContentType(ext);

    if (range) {
      // Range header example: 'bytes=0-'
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= stats.size) {
        return res
          .status(416)
          .set({ "Content-Range": `bytes */${stats.size}` })
          .end();
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
      stream.on("error", () => res.status(500).end());
    } else {
      // Full file
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", () => res.status(500).end());
    }
  });
});

module.exports = router;
