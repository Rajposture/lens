const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Sends an image file to the backend for face-shape/frame analysis.
 * @param {File|Blob} imageFile
 * @returns {Promise<object>} the analysis object from Gemini
 * @throws {Error} with a user-friendly message on failure
 */
export async function analyzeImage(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the server. Make sure the backend is running and try again."
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server sent an unexpected response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(data?.error || "Something went wrong. Please try again.");
  }

  return data.analysis;
}
