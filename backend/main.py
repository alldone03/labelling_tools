from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
from PIL import Image
import io

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

# Load YOLO model
model = None

@app.on_event("startup")
async def startup_event():
    global model
    model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    print(f"Loading YOLO model from: {model_path}")
    try:
        model = YOLO(model_path)
        print("YOLO model loaded successfully!")
    except Exception as e:
        print(f"Error loading YOLO model: {e}")

@app.get("/")
async def root():
    return {"message": "Make-Sense Backend API", "status": "running"}

@app.post("/annotate")
async def annotate_image(file: UploadFile = File(...)):
    """
    Endpoint to perform object detection on an uploaded image.
    Returns bounding boxes, labels, and confidence scores.
    """
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert PIL Image to numpy array for YOLO
        img_array = np.array(image)
        
        # Run YOLO inference
        results = model(img_array)
        
        # Extract predictions
        annotations = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates (x, y, width, height)
                x, y, w, h = box.xywh[0].tolist()
                
                # Get class name and confidence
                class_id = int(box.cls[0])
                class_name = result.names[class_id]
                confidence = float(box.conf[0])
                
                annotations.append({
                    "bbox": [x, y, w, h],  # [x_center, y_center, width, height]
                    "class": class_name,
                    "score": confidence
                })
        
        return {
            "success": True,
            "annotations": annotations,
            "count": len(annotations)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "annotations": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
