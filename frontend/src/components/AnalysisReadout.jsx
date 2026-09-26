import PipelineTrace from "./PipelineTrace";

export default function AnalysisReadout({ status, analysis, error }) {
  if (status === "idle") {
    return (
      <div className="readout readout--empty">
        <p className="readout__eyebrow">Frame match</p>
        <p className="readout__empty-text">
          Capture or upload a front-facing photo to get your face-shape classification and frame
          recommendations.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="readout readout--loading" role="status" aria-live="polite">
        <p className="readout__eyebrow">Running inference</p>
        <PipelineTrace status={status} />
        <div className="scan-pulse" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p className="readout__loading-text">Classifying facial geometry…</p>
        <div className="readout__loading-log" aria-hidden="true">
          <span>&gt; encoding image (client-side)</span>
          <span>&gt; sending to vision-language model</span>
          <span>&gt; awaiting structured output…</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="readout readout--error" role="alert">
        <p className="readout__eyebrow">Scan failed</p>
        <PipelineTrace status={status} />
        <p className="readout__error-text">{error}</p>
      </div>
    );
  }

  if (status === "success" && analysis) {
    const scores = analysis.shapeScores;
    const sortedScores = scores
      ? Object.entries(scores)
          .filter(([, v]) => typeof v === "number" || !isNaN(parseInt(v, 10)))
          .map(([shape, v]) => [shape, typeof v === "number" ? v : parseInt(v, 10)])
          .sort((a, b) => b[1] - a[1])
      : null;

    return (
      <div className="readout readout--success">
        <p className="readout__eyebrow">Frame match</p>

        <PipelineTrace status={status} />

        <div className="readout__shape">
          <span className="readout__shape-value">{analysis.faceShape}</span>
          <span className={`confidence confidence--${(analysis.faceShapeConfidence || "").toLowerCase()}`}>
            {analysis.faceShapeConfidence} confidence
            {typeof analysis.faceShapeConfidencePercent === "number" &&
              ` · ${analysis.faceShapeConfidencePercent}%`}
          </span>
        </div>

        {sortedScores && sortedScores.length > 0 && (
          <div className="readout__section">
            <h3 className="readout__section-title">Classification scores</h3>
            <div className="class-scores">
              {sortedScores.map(([shape, value], i) => (
                <div
                  key={shape}
                  className={"class-scores__row" + (i === 0 ? " class-scores__row--top" : "")}
                >
                  <span className="class-scores__label">{shape}</span>
                  <span className="class-scores__track">
                    <span
                      className="class-scores__fill"
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </span>
                  <span className="class-scores__value">{value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.keyFeatures && (
          <dl className="readout__features">
            <div className="readout__feature">
              <dt>Jawline</dt>
              <dd>{analysis.keyFeatures.jawline}</dd>
            </div>
            <div className="readout__feature">
              <dt>Forehead</dt>
              <dd>{analysis.keyFeatures.foreheadWidth}</dd>
            </div>
            <div className="readout__feature">
              <dt>Proportion</dt>
              <dd>{analysis.keyFeatures.faceLengthRatio}</dd>
            </div>
          </dl>
        )}

        {Array.isArray(analysis.recommendedFrameShapes) && (
          <div className="readout__section">
            <h3 className="readout__section-title">Recommended frames</h3>
            <ul className="frame-list">
              {analysis.recommendedFrameShapes.map((frame, i) => (
                <li key={i} className="frame-list__item">
                  <span className="frame-list__shape">{frame.shape}</span>
                  <p className="frame-list__reason">{frame.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.framesToAvoid && (
          <div className="readout__section readout__section--avoid">
            <h3 className="readout__section-title">Steer clear of</h3>
            <p className="frame-avoid__shape">{analysis.framesToAvoid.shape}</p>
            <p className="frame-avoid__reason">{analysis.framesToAvoid.reason}</p>
          </div>
        )}

        {Array.isArray(analysis.colorSuggestions) && analysis.colorSuggestions.length > 0 && (
          <div className="readout__section">
            <h3 className="readout__section-title">Finishes to try</h3>
            <div className="color-chips">
              {analysis.colorSuggestions.map((color, i) => (
                <span key={i} className="color-chip">
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.stylingTip && (
          <div className="readout__tip">
            <p>{analysis.stylingTip}</p>
          </div>
        )}

        <p className="readout__meta">
          model: {analysis._model || "gemini"} · inference: single-pass multimodal
        </p>
      </div>
    );
  }

  return null;
}
