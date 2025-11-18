from pathlib import Path  # Provides an object-oriented interface for filesystem paths
from typing import List, Optional, Tuple

import cv2  # OpenCV library for computer vision tasks
import numpy as np  # NumPy for numerical operations on image arrays
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


def load_reference_face(directory: Path) -> Tuple[np.ndarray, Path]:  # Load and preprocess the enrolled face image
    images = sorted(directory.glob("*.png"))  # Gather PNG files in the capture directory
    if not images:
        raise RuntimeError(f"No reference face images found in {directory}")  # Ensure at least one reference face exists
    if len(images) > 1:
        raise RuntimeError(f"Multiple reference images found in {directory}. Keep only one PNG.")  # Enforce a single reference face

    reference_path = images[0]  # Select the sole reference image path
    reference_image = cv2.imread(reference_path.as_posix())  # Load the reference image from disk
    if reference_image is None:
        raise RuntimeError(f"Failed to read reference image at {reference_path}")  # Fail if the image cannot be read

    reference_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)  # Convert reference image to grayscale
    reference_face = cv2.resize(reference_gray, (100, 100))  # Normalize the reference face to a fixed size
    reference_face = cv2.GaussianBlur(reference_face, (5, 5), 0)  # Blur to reduce noise before comparison
    return reference_face, reference_path  # Return the prepared face template and its path


def compare_faces(frame: np.ndarray, reference_face: np.ndarray, match_threshold: float, face_cascade: cv2.CascadeClassifier) -> Tuple[bool, List[dict]]:
    grayscale = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(grayscale, scaleFactor=1.2, minNeighbors=5)

    matches = []
    authenticated = False

    for (x, y, width, height) in faces:
        face_region = grayscale[y : y + height, x : x + width]
        if face_region.size == 0:
            continue

        resized_face = cv2.resize(face_region, (100, 100))
        resized_face = cv2.GaussianBlur(resized_face, (5, 5), 0)

        diff = cv2.absdiff(reference_face, resized_face)
        score = float(np.mean(diff))

        is_match = score < match_threshold
        authenticated = authenticated or is_match

        matches.append(
            {
                "box": {"x": int(x), "y": int(y), "width": int(width), "height": int(height)},
                "score": score,
                "matchThreshold": match_threshold,
                "authenticated": is_match,
            }
        )

    return authenticated, matches


app = FastAPI(title="Face Recognition Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REFERENCE_FACE: Optional[np.ndarray] = None
REFERENCE_PATH: Optional[Path] = None
FACE_CASCADE: Optional[cv2.CascadeClassifier] = None
MATCH_THRESHOLD = 50.0


@app.on_event("startup")
def on_startup() -> None:
    global REFERENCE_FACE, REFERENCE_PATH, FACE_CASCADE

    capture_dir = Path(__file__).resolve().parent / "captures"
    capture_dir.mkdir(parents=True, exist_ok=True)

    REFERENCE_FACE, REFERENCE_PATH = load_reference_face(capture_dir)

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
    if FACE_CASCADE.empty():
        raise RuntimeError(f"Failed to load face cascade from {cascade_path}")


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "reference": REFERENCE_PATH.as_posix() if REFERENCE_PATH else None,
    }


@app.post("/detect")
async def detect_face(file: UploadFile = File(...)) -> JSONResponse:
    if REFERENCE_FACE is None or FACE_CASCADE is None:
        raise HTTPException(status_code=503, detail="Service not initialised")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    frame_array = np.frombuffer(contents, dtype=np.uint8)
    frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    authenticated, matches = compare_faces(frame, REFERENCE_FACE, MATCH_THRESHOLD, FACE_CASCADE)

    if matches:
        lowest_score = min(match["score"] for match in matches)
        print(
            "[detect] matches=", len(matches),
            "lowest_score=", round(lowest_score, 2),
            "threshold=", MATCH_THRESHOLD,
            "authenticated=", authenticated,
            flush=True,
        )
    else:
        print("[detect] no faces detected", flush=True)

    return JSONResponse(
        {
            "authenticated": authenticated,
            "matches": matches,
            "reference": REFERENCE_PATH.as_posix() if REFERENCE_PATH else None,
        }
    )


def run(host: str = "0.0.0.0", port: int = 5001, reload: bool = False) -> None:
    uvicorn.run("main:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    run()
