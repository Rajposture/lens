const STEPS = [
  "Preprocess",
  "Vision Inference",
  "Feature Extraction",
  "Frame Mapping",
];

/**
 * Small visual trace of the actual processing pipeline: client-side image
 * preprocessing -> Gemini multimodal inference -> structured JSON parsing ->
 * rule-based frame-shape mapping (this last step happens inside the model's
 * own structured response). Purely a status indicator, not a separate model.
 */
export default function PipelineTrace({ status }) {
  const activeIndex =
    status === "loading" ? 1 : status === "success" ? STEPS.length : status === "error" ? 1 : -1;

  if (status === "idle") return null;

  return (
    <div className="pipeline-trace" role="status" aria-label="Processing pipeline">
      {STEPS.map((label, i) => (
        <span key={label} style={{ display: "contents" }}>
          {i > 0 && <span className="pipeline-trace__connector" aria-hidden="true" />}
          <span
            className={
              "pipeline-trace__step" +
              (status === "success" && i < STEPS.length ? " pipeline-trace__step--done" : "") +
              (status === "loading" && i === activeIndex ? " pipeline-trace__step--active" : "")
            }
          >
            <span className="pipeline-trace__index">
              {status === "success" ? "✓" : i + 1}
            </span>
            <span className="pipeline-trace__label">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
