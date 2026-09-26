const express = require("express");
const multer = require("multer");
const { analyzeFaceForGlasses, GeminiParseError } = require("../services/geminiService");

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Vercel serverless functions cap the request body at 4.5MB on the Hobby plan.
// Keep some headroom below that ceiling for multipart overhead.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
  },
});

router.post("/", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      if (err.message === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({
          error: "Unsupported file type. Please upload a JPEG, PNG, or WEBP image.",
        });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Image is too large. Please upload a photo under 4MB.",
        });
      }
      return res.status(400).json({ error: "Could not process the uploaded file." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image was provided." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "Server is missing GEMINI_API_KEY. Add it to backend/.env and restart the server.",
      });
    }

    try {
      const base64Data = req.file.buffer.toString("base64");
      const analysis = await analyzeFaceForGlasses(base64Data, req.file.mimetype);

      if (analysis && analysis.error === "NO_FACE_DETECTED") {
        return res.status(422).json({
          error: "We couldn't detect a clear face in that photo. Try a well-lit, front-facing photo.",
        });
      }

      return res.status(200).json({ analysis });
    } catch (err) {
      console.error("[/api/analyze] error:", err);

      if (err instanceof GeminiParseError) {
        return res.status(502).json({
          error: "The AI response was malformed. Please try again.",
        });
      }

      // Gemini SDK errors carry an HTTP-like `status` from the API response.
      if (err.status === 429) {
        return res.status(429).json({
          error: "Gemini API rate limit reached. Please wait a moment and try again.",
        });
      }

      if (err.status === 401 || err.status === 403) {
        return res.status(500).json({
          error: "Invalid or unauthorized Gemini API key. Check GEMINI_API_KEY in backend/.env.",
        });
      }

      if (err.status === 400) {
        return res.status(502).json({
          error: "Gemini rejected the request. The photo may be an unsupported format.",
        });
      }

      return res.status(500).json({
        error: "Something went wrong while analyzing the photo. Please try again.",
      });
    }
  });
});

module.exports = router;
