import cv2
from pathlib import Path

MODEL_DIR = Path("ai_models")
FACE_PROTO = str(MODEL_DIR / "deploy.prototxt")
FACE_MODEL = str(MODEL_DIR / "res10_300x300_ssd_iter_140000.caffemodel")

face_net = cv2.dnn.readNetFromCaffe(FACE_PROTO, FACE_MODEL)

def detect_faces(image):
    h, w = image.shape[:2]

    blob = cv2.dnn.blobFromImage(image, 1.0, (300,300), (104,117,123), swapRB=False, crop=False)

    face_net.setInput(blob)
    detections = face_net.forward()
    face_count = 0

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        if confidence > 0.5:
            box = detections[0, 0, i, 3:7]

            x1 = int(box[0] * w)
            y1 = int(box[1] * h)
            x2 = int(box[2] * w)
            y2 = int(box[3] * h)

            cv2.rectangle(image, (x1, y1), (x2, y2), (0,255,0), 2)

            face_count += 1
    return image, face_count