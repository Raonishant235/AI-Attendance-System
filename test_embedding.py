import cv2

from app.services.recognition_service import create_face_embedding


image = cv2.imread(
    "app/uploads/students/student_1.jpg"
)

embedding = create_face_embedding(image)

if embedding is None:
    print("No face detected")
else:
    print("Embedding generated!")
    print("Shape:", embedding.shape)
    print("First 10 values:", embedding[:10])