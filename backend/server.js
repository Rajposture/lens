require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const analyzeRouter = require("./routes/analyze");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

// Basic rate limiting to protect the free Gemini quota from abuse.
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a few minutes." },
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.use("/api/analyze", analyzeLimiter, analyzeRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Central error handler (catches any synchronous errors not already handled)
app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Unexpected server error." });
});

// Vercel runs this file as a serverless function (see vercel.json) instead of
// a long-lived process, so it imports and invokes the exported `app` directly
// rather than calling .listen(). We still call .listen() for local dev / any
// other host that expects a normal Node server, guarded so it's skipped when
// running on Vercel.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Glasses Advisor backend running on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️  GEMINI_API_KEY not set — set it in backend/.env before analyzing photos.");
    }
  });
}

module.exports = app;
