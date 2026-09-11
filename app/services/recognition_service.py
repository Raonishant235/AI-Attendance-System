import cv2
from pathlib import Path
import numpy as np
from app.models.face_embedding import FaceEmbedding

MODEL_DIR = Path("ai_models")

FACE_PROTO = str(MODEL_DIR / "deploy.prototxt")
FACE_MODEL = str(MODEL_DIR / "res10_300x300_ssd_iter_140000.caffemodel")
RECOGNITION_MODEL = str(MODEL_DIR / "nn4.small2.v1.t7")

face_net = cv2.dnn.readNetFromCaffe(FACE_PROTO, FACE_MODEL)

recognition_net = cv2.dnn.readNetFromTorch(RECOGNITION_MODEL)

def generate_embedding(face):

    blob = cv2.dnn.blobFromImage(face, 1.0/255, (96,96), (0,0,0), swapRB=True, crop=False)
    recognition_net.setInput(blob)
    embedding = recognition_net.forward()

    return embedding.flatten()

def extract_face(image):
    h, w = image.shape[:2]

    blob = cv2.dnn.blobFromImage(image, 1.0, (300,300), (104,117,123), swapRB=False, crop=False)
    face_net.setInput(blob)
    detections = face_net.forward()

    best_face = None
    best_confidence = 0

    for i in range(detections.shape[2]):
        confidence = detections[0,0,i,2]

        if confidence > best_confidence:
            box = detections[0,0,i,3:7]

            x1 = int(box[0] * w)
            y1 = int(box[1] * h)
            x2 = int(box[2] * w)
            y2 = int(box[3] * h)

            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            best_face = image[y1:y2, x1:x2]
            best_confidence = confidence
    
    return best_face

def create_face_embedding(image):
    face = extract_face(image)

    if face is None:
        return None

    return generate_embedding(face)

def embedding_to_bytes(embedding):
    return embedding.astype(np.float32).tobytes()

def bytes_to_embedding(data):
    return np.frombuffer(data, dtype=np.float32)

def generate_and_store_embedding(db, student):
    image = cv2.imread(student.photo_path)

    if image is None:
        return False

    embedding = create_face_embedding(image)

    if embedding is None:
        return False

    student.face_encoding = embedding_to_bytes(embedding)

    db.commit()
    db.refresh(student)

    return True

def compare_embeddings(embedding1, embedding2):
    return np.linalg.norm(embedding1-embedding2)

def find_matching_student(db, query_embedding, students, threshold=0.6):
    best_student = None
    best_distance = float("inf")

    for student in students:
        if student.face_encoding is None:
            continue

        stored_embedding = bytes_to_embedding(student.face_encoding)
        distance = compare_embeddings(query_embedding, stored_embedding)

        if distance < best_distance:
            best_distance = distance
            best_student = student

    if best_distance > threshold:
        return None, best_distance

    return best_student, best_distance

def extract_all_faces(image):
    h, w = image.shape[:2]

    blob = cv2.dnn.blobFromImage(image, 1.0, (300,300), (104,117,123), swapRB=False, crop=False)
    face_net.setInput(blob)

    detections = face_net.forward()
    faces = []

    for i in range(detections.shape[2]):
        confidence = detections[0,0,i,2]

        if confidence < 0.5:
            continue

        box = detections[0,0,i,3:7]

        x1 = max(0, int(box[0] * w))
        y1 = max(0, int(box[1] * h))
        x2 = min(w, int(box[2] * w))
        y2 = min(h, int(box[3] * h))

        face = image[y1:y2, x1:x2]

        if face.size == 0:
            continue

        faces.append({"face": face,
                      "box": (x1, y1, x2, y2)})
    return faces

def recognize_face(query_embedding, students, db, threshold=0.6):
    best_student = None
    best_distance = float("inf")

    for student in students:
        embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).all()

        for face_embedding in embeddings:
            stored_embedding = bytes_to_embedding(face_embedding.embedding)

            distance = compare_embeddings(query_embedding, stored_embedding)

            if distance < best_distance:
                best_distance = distance
                best_student = student

    if best_student is None:
        return None, best_distance
    if best_distance > threshold:
        return None, best_distance

    return best_student, best_distance