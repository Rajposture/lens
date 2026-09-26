import { useRef, useState, useCallback, useEffect } from "react";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // keep in sync with backend/routes/analyze.js
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoCapture({ onImageReady, disabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState("idle"); // idle | camera | preview
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setValidationError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      // video element mounts on next render; attach stream after
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission, or upload a photo instead."
          : "Couldn't access your camera. Try uploading a photo instead."
      );
    }
  }, []);

  const finalizeImage = useCallback(
    (file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setValidationError("Please use a JPEG, PNG, or WEBP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError("That image is too large. Please use a photo under 4MB.");
        return;
      }
      setValidationError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setMode("preview");
      onImageReady(file);
    },
    [onImageReady]
  );

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        finalizeImage(file);
      },
      "image/jpeg",
      0.92
    );

    stopCamera();
  }, [stopCamera, finalizeImage]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) finalizeImage(file);
      e.target.value = "";
    },
    [finalizeImage]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) finalizeImage(file);
    },
    [finalizeImage, disabled]
  );

  const reset = useCallback(() => {
    stopCamera();
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMode("idle");
    setCameraError(null);
    setValidationError(null);
    onImageReady(null);
  }, [onImageReady, stopCamera]);

  return (
    <div className="photo-capture">
      <div className="scan-frame">
        {mode === "idle" && (
          <div
            className="scan-frame__empty"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <svg viewBox="0 0 64 64" className="scan-frame__icon" aria-hidden="true">
              <circle cx="22" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="42" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="32" y1="32" x2="32" y2="32" stroke="currentColor" strokeWidth="2" />
              <path d="M12 32 L4 28" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M52 32 L60 28" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <p className="scan-frame__label">No scan yet</p>
            <p className="scan-frame__hint">Drop a photo here, or use the options below</p>
          </div>
        )}

        {mode === "camera" && (
          <div className="scan-frame__video-wrap">
            <video ref={videoRef} autoPlay playsInline muted className="scan-frame__video" />
            <div className="scan-frame__guide" aria-hidden="true" />
          </div>
        )}

        {mode === "preview" && previewUrl && (
          <div className="scan-frame__preview-wrap">
            <img src={previewUrl} alt="Your uploaded photo for analysis" className="scan-frame__preview" />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {(cameraError || validationError) && (
        <p className="capture-error" role="alert">
          {cameraError || validationError}
        </p>
      )}

      <div className="capture-actions">
        {mode === "idle" && (
          <>
            <button type="button" className="btn btn--primary" onClick={startCamera} disabled={disabled}>
              Use camera
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Upload photo
            </button>
          </>
        )}

        {mode === "camera" && (
          <>
            <button type="button" className="btn btn--primary" onClick={capturePhoto}>
              Capture
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Cancel
            </button>
          </>
        )}

        {mode === "preview" && (
          <button type="button" className="btn btn--ghost" onClick={reset} disabled={disabled}>
            Retake / choose another photo
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
