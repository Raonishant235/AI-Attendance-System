import cv2
from collections import Counter
from app.database import SessionLocal
from app.services import (student_service, recognition_service, attendance_service)

db = SessionLocal()

students = student_service.get_students(db)
if not students:
    print("No student found in database.")
    db.close()
    exit()

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Could not open camera.")
    db.close()
    exit()

MAX_HISTORY = 10
MIN_MATCHES = 6
recent_predictions = []
attendance_marked = set()

while True:
    ret, frame = cap.read()

    if not ret:
        print("Could not read frame.")
        break

    detected_faces = recognition_service.extract_all_faces(frame)
    frame_predictions = []

    for detected_face in detected_faces:
        face = detected_face["face"]
        x1, y1, x2, y2 = detected_face["box"]

        embedding = recognition_service.generate_embedding(face)
        student, distance = recognition_service.recognize_face(embedding, students, db)

        if student is not None:
            prediction = student.name
            frame_predictions.append(prediction)
        else:
            prediction = "Unknown"

        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,0), 2)
        cv2.putText(frame, prediction, (x1, y1-30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)

        if distance is not None:
            distance_text = f"Distance: {distance:.3f}"
        else:
            distance_text = "Distance: N/A"

        cv2.putText(frame, distance_text, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0), 2)

        if student is not None:
            recent_predictions.append(student.name)

            if len(recent_predictions) > MAX_HISTORY:
                recent_predictions.pop(0)
            most_common, match_count = Counter(recent_predictions).most_common(1)[0]

            if (most_common == student.name and match_count >= MIN_MATCHES):
                if student.id not in attendance_marked:
                    attendance, created = attendance_service.mark_attendance(db, student.id)
                    attendance_marked.add(student.id)

                    if created:
                        print(f"Attendance marked: {student.name}")
                    else:
                        print(f"{student.name} already marked present today.")

                cv2.putText(frame, "ATTENDANCE MARKED", (x1, y2 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0), 2)

    cv2.putText(frame, f"Faces: {len(detected_faces)}", (30,40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

    cv2.imshow("AI Attendance Camera", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
db.close()