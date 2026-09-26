import { useState, useCallback } from "react";
import PhotoCapture from "./components/PhotoCapture";
import AnalysisReadout from "./components/AnalysisReadout";
import { analyzeImage } from "./api/analyzeApi";

function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleImageReady = useCallback(async (file) => {
    if (!file) {
      setStatus("idle");
      setAnalysis(null);
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const result = await analyzeImage(file);
      setAnalysis(result);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__mark" aria-hidden="true">
          <svg viewBox="0 0 40 24" width="36" height="22">
            <circle cx="10" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="30" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <line x1="19" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </div>
        <div>
          <div className="app-header__title-row">
            <h1 className="app-header__title">Frame&nbsp;Finder</h1>
            <span className="model-badge">
              <span className="model-badge__dot" aria-hidden="true"></span>
              Multimodal Vision Model
            </span>
          </div>
          <p className="app-header__subtitle">
            Facial-geometry classification &amp; eyewear recommendation engine
          </p>
        </div>
      </header>

      <main className="app-main">
        <section className="panel panel--capture">
          <h2 className="panel__title">01 · Face scan</h2>
          <PhotoCapture onImageReady={handleImageReady} disabled={status === "loading"} />
        </section>

        <section className="panel panel--results">
          <h2 className="panel__title">02 · Recommendation</h2>
          <AnalysisReadout status={status} analysis={analysis} error={error} />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Photos are analyzed on demand and are not stored. Recommendations are stylistic
          suggestions, not professional optical fitting advice.
        </p>
      </footer>
    </div>
  );
}

export default App;
