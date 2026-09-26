# Frame Finder — AI Eyewear Advisor

A micro-project for **Fundamentals of AIML** (Diploma, 3rd Year Computer Engineering).

Frame Finder is an AI agent that looks at a photo of your face and recommends eyeglass
frame shapes, colors, and styling tips suited to your face shape — using **Google's
Gemini API** for the reasoning (no model training required).

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **AI:** Gemini API (`gemini-1.5-flash`, free tier), called from the backend so your
  API key is never exposed to the browser
- **No dataset, no training** — Gemini's vision + reasoning does the analysis at request time

---

## How it works

1. You take a photo (webcam) or upload one in the browser.
2. The React frontend sends the photo to the Express backend.
3. The backend sends the photo to Gemini with a structured prompt asking it to act as
   an optician: identify face shape, then recommend frame shapes, colors, and a styling tip.
4. Gemini returns structured JSON, which the backend validates and forwards to the frontend.
5. The frontend displays the results in a clean, diagnostic-style readout.

```
Browser (React) ──image──▶ Express backend ──image + prompt──▶ Gemini API
                                                                     │
Browser (React) ◀──JSON result── Express backend ◀──JSON response───┘
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A **free Gemini API key** — get one at https://aistudio.google.com/app/apikey
  (sign in with any Google account, click "Create API key" — no credit card needed
  for the free tier)

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and paste your Gemini key:

```
GEMINI_API_KEY=your_actual_key_here
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
npm start
```

You should see:

```
Glasses Advisor backend running on http://localhost:5000
```

Verify it's healthy by visiting http://localhost:5000/api/health in your browser —
it should show `{"status":"ok","geminiConfigured":true}`.

### 2. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
cp .env.example .env
```

The default `.env` already points to `http://localhost:5000`, so no edits are needed
unless you changed the backend port.

Start the frontend:

```bash
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

---

## Using the app

1. Click **Use camera** (allow camera permission) or **Upload photo**.
2. Take/select a clear, front-facing, well-lit photo.
3. The right panel shows your face shape, recommended frame shapes with reasoning,
   frame shapes to avoid, suggested finishes/colors, and a styling tip.
4. Click **Retake / choose another photo** to try again.

---

## Project structure

```
glasses-advisor/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   └── analyze.js         # POST /api/analyze — handles upload + validation
│   ├── services/
│   │   └── geminiService.js   # Gemini prompt + call + response parsing
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                       # Layout + state management
    │   ├── components/
    │   │   ├── PhotoCapture.jsx          # Webcam + upload UI
    │   │   └── AnalysisReadout.jsx       # Results display
    │   ├── api/
    │   │   └── analyzeApi.js             # fetch() wrapper for the backend
    │   └── index.css                     # Design system / styling
    ├── .env.example
    └── package.json
```

---

## Design notes for your report

- **Why Gemini and not a trained model?** Building an accurate face-shape classifier
  from scratch would need a labeled dataset (thousands of face images per shape
  category) and a CNN training pipeline — well beyond a micro-project's scope. Gemini's
  vision model already understands facial geometry from its own training, so we use it
  as a reasoning engine via prompting instead of training anything ourselves.
- **Why a backend at all, if the frontend could call Gemini directly?** Calling Gemini
  directly from the browser would expose your API key to anyone who opens dev tools.
  The backend keeps the key server-side and only forwards the final image.
- **Prompt engineering:** The backend asks Gemini to return **strict JSON** matching a
  fixed schema, so the frontend can render structured results reliably instead of
  parsing free-form text.
- **Error handling:** The app handles no-face-detected photos, invalid file types,
  oversized files, invalid/missing API keys, and Gemini rate limits — each with a
  distinct, user-facing message.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Could not reach the server" | Make sure `npm start` is running in `backend/` |
| "Invalid or unauthorized Gemini API key" | Double-check `GEMINI_API_KEY` in `backend/.env`, no extra spaces/quotes |
| "Gemini API rate limit reached" | Free tier has a per-minute limit; wait ~60 seconds and retry |
| Camera doesn't open | Use HTTPS or `localhost` (browsers block camera on plain HTTP for other hosts); or use **Upload photo** instead |
| "No face detected" | Use a clear, front-facing, well-lit photo with only one face |

---

## Limitations (worth noting in your viva/report)

- Recommendations are stylistic suggestions from an AI model, not professional optical
  fitting advice.
- Accuracy depends on photo quality (lighting, angle, obstructions like hair/hands).
- Uses the Gemini free tier, which has rate limits — not intended for high-traffic
  production use as-is.
