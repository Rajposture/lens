const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "[geminiService] GEMINI_API_KEY is not set. Requests to Gemini will fail until it is provided in backend/.env"
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// gemini-1.5-flash was retired by Google. We now try a short list of current,
// free-tier, multimodal (image-capable) models in order, and fall back to the
// next one automatically if a model name has been deprecated/renamed again in
// the future — this keeps the app from hard-breaking on the next model churn.
const MODEL_CANDIDATES = [
  "gemini-flash-latest", // rolling alias Google keeps pointed at its current best Flash model
  "gemini-3.1-flash-lite", // stable Gemini 3 tier, free-tier eligible, no shutdown scheduled
  "gemini-2.5-flash", // stable fallback (still free-tier eligible)
];

const ANALYSIS_PROMPT = `You are an expert optician and eyewear stylist with 20 years of experience fitting glasses to faces.

Look carefully at the face in the provided photo and analyze it for eyewear recommendation purposes ONLY. Do not comment on attractiveness, age, gender, emotion, or identity. Focus strictly on facial geometry relevant to glasses fitting: face shape, jawline, forehead width, cheekbone width, and face length-to-width ratio.

Respond with STRICT, VALID JSON ONLY — no markdown fences, no commentary before or after. Use exactly this schema:

{
  "faceShape": "one of: Oval, Round, Square, Heart, Diamond, Oblong, Triangle",
  "faceShapeConfidence": "High | Medium | Low",
  "faceShapeConfidencePercent": "your honest confidence in this classification as an integer 0-100, calibrated (e.g. an unclear or partially occluded face should score lower)",
  "shapeScores": {
    "Oval": "integer 0-100, how well the face matches an Oval shape",
    "Round": "integer 0-100, how well the face matches a Round shape",
    "Square": "integer 0-100, how well the face matches a Square shape",
    "Heart": "integer 0-100, how well the face matches a Heart shape",
    "Diamond": "integer 0-100, how well the face matches a Diamond shape",
    "Oblong": "integer 0-100, how well the face matches an Oblong shape",
    "Triangle": "integer 0-100, how well the face matches a Triangle shape"
  },
  "keyFeatures": {
    "jawline": "short description, e.g. 'Soft, rounded jawline'",
    "foreheadWidth": "short description, e.g. 'Wider than cheekbones'",
    "faceLengthRatio": "short description, e.g. 'Length roughly equal to width'"
  },
  "recommendedFrameShapes": [
    {
      "shape": "e.g. Rectangular / Angular",
      "reason": "1-2 sentence explanation of why this frame shape balances this face shape"
    },
    {
      "shape": "second recommended shape",
      "reason": "1-2 sentence explanation"
    },
    {
      "shape": "third recommended shape",
      "reason": "1-2 sentence explanation"
    }
  ],
  "framesToAvoid": {
    "shape": "frame shape that would clash with this face shape",
    "reason": "1-2 sentence explanation of why"
  },
  "colorSuggestions": ["2-4 short color/finish suggestions, e.g. 'Tortoiseshell', 'Matte black', 'Rose gold'"],
  "stylingTip": "One friendly, practical closing tip (1-2 sentences) about proportions, lens size, or bridge fit."
}

If no clear human face is visible in the image, respond with exactly this JSON instead:
{ "error": "NO_FACE_DETECTED" }

Return ONLY the JSON object, nothing else.`;

/**
 * Sends a base64 image to Gemini and returns a parsed face/frame analysis.
 * @param {string} base64Data - raw base64 image data (no data: prefix)
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<object>} parsed analysis object
 */
async function analyzeFaceForGlasses(base64Data, mimeType) {
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([ANALYSIS_PROMPT, imagePart]);
      const text = result.response.text();
      const cleaned = stripCodeFences(text);

      try {
        const parsed = JSON.parse(cleaned);
        parsed._model = modelName; // trace which model actually served this inference
        return parsed;
      } catch (err) {
        throw new GeminiParseError(
          "Gemini returned a response that could not be parsed as JSON.",
          cleaned
        );
      }
    } catch (err) {
      lastError = err;
      // Only fall through to the next candidate on a "model not found /
      // not supported" style error. Anything else (bad key, rate limit,
      // malformed request) should surface immediately.
      const isModelUnavailable =
        err?.status === 404 ||
        /not found|not supported/i.test(err?.message || "");
      if (!isModelUnavailable) {
        throw err;
      }
      console.warn(`[geminiService] "${modelName}" unavailable, trying next candidate…`);
    }
  }

  throw lastError;
}

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

class GeminiParseError extends Error {
  constructor(message, raw) {
    super(message);
    this.name = "GeminiParseError";
    this.raw = raw;
  }
}

module.exports = { analyzeFaceForGlasses, GeminiParseError };
