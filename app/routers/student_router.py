from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pathlib import Path
import shutil
from sqlalchemy.orm import Session
import cv2
import numpy as np
from fastapi.responses import Response, FileResponse

from app.database import get_db
from app.schemas.student import StudentCreate, StudentResponse
from app.services import (student_service, face_service, recognition_service, embedding_service)

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("/", response_model=StudentResponse)
def create_student(
    student : StudentCreate,
    db : Session = Depends(get_db)
):
    return student_service.create_student(db, student)


@router.get("/", response_model=list[StudentResponse])
def get_students(db: Session = Depends(get_db)):
    return student_service.get_students(db)


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    return student_service.get_student_by_id(db, student_id)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, student_data: StudentCreate, db: Session = Depends(get_db)):
    return student_service.update_student(db, student_id, student_data)


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    return student_service.delete_student(db, student_id)


@router.post("/{student_id}/photo")
def upload_student_photo(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG and WEBP images are allowed")

    contents =  file.file.read()
    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")
    
    upload_dir = Path("app/uploads/students")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"student_{student_id}.jpg"

    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    student.photo_path = str(file_path)

    db.commit()
    db.refresh(student)

    return {
        "message": "Student photo uploaded successfully",
        "photo_path": student.photo_path}

@router.get("/{student_id}/photo")
def get_student_photo(student_id: int, db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)
    if not student.photo_path:
        raise HTTPException(status_code=404, detail="Student does not have a photo")

    photo_path = Path(student.photo_path)

    if not photo_path.exists():
        raise HTTPException(status_code=404, detail="Student photo file not found")

    return FileResponse(path = photo_path, media_type="image/jpeg")


@router.post("/{student_id}/detect-face")
def detect_student_face(student_id: int, db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)

    if not student.photo_path:
        raise HTTPException(status_code=400, detail="Student does not have a photo")

    image = cv2.imread(student.photo_path)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not read student photo")

    processed_image, face_count = face_service.detect_faces(image)
    success, encoded_image = cv2.imencode(".jpg", processed_image)

    if not success:
        raise HTTPException(status_code=500, detail="Could not encode processed image")

    return Response(content=encoded_image.tobytes(), media_type="image/jpeg", headers={"X-Face-Count": str(face_count)})


@router.post("/{student_id}/generate-embedding")
def generate_student_embedding(student_id: int, db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)

    if not student.photo_path:
        raise HTTPException(status_code=400, detail="Student does not have a photo")

    success = recognition_service.generate_and_store_embedding(db, student)

    if not success:
        raise HTTPException(status_code=400, detail="Could not generate face embedding")

    return {"message": "Face embedding generated and stored successfully"}

@router.get("/{student_id}/face-status")
def get_face_status(student_id: int, db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)

    if not student.photo_path:
        return {
            "student_id": student_id,
            "photo_uploaded": False,
            "face_registered": False,
            "embedding_count": 0
        }

    embeddings = embedding_service.get_student_embeddings(db, student_id)

    return {
        "student_id": student_id,
        "photo_uploaded": True,
        "face_registered": len(embeddings)>0,
        "embedding_count": len(embeddings)
    }

@router.post("/{student_id}/face-sample")
def add_face_sample(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = student_service.get_student_by_id(db, student_id)

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file")

    image_array = np.frombuffer(contents, np.uint8)

    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    faces = recognition_service.extract_all_faces(image)

    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected. Please position your face clearly inside the camera.")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Only one person should be visible during face registration.")

    detected_face = faces[0]
    face = detected_face["face"]
    x1, y1, x2, y2 = detected_face["box"]
    face_width = x2 - x1
    face_height = y2 - y1

    if face_width < 60 or face_height < 60:
        raise HTTPException(status_code=400, detail="Face is too small. Please move closer to the camera and try again.")

    embedding = recognition_service.generate_embedding(face)
    if embedding is None:
        raise HTTPException(status_code=400, detail="Could not generate a face embedding from the detected face.")

    face_embedding = embedding_service.add_embedding(db, student.id, embedding)

    return {
        "message": "Face sample added successfully",
        "student_id": student.id,
        "embedding_id": face_embedding.id,
        "validation": {"faces_detected": 1, "face_width": face_width, "face_height": face_height}
    }

@router.get("/{student_id}/face-samples")
def get_face_samples(student_id: int, db: Session = Depends(get_db)):
    student_service.get_student_by_id(db, student_id)

    embeddings = embedding_service.get_student_embeddings(db, student_id)
    return {
        "student_id": student_id,
        "embedding_count": len(embeddings),
        "samples": [{"id": embedding.id} for embedding in embeddings]
    }

@router.delete("/{student_id}/face-samples/{embedding_id}")
def delete_face_sample(student_id: int, embedding_id: int, db: Session = Depends(get_db)):
    student_service.get_student_by_id(db, student_id)

    embeddings = embedding_service.get_student_embeddings(db, student_id)

    face_embedding = next((embedding for embedding in embeddings if embedding.id == embedding_id), None)
    if face_embedding is None:
        raise HTTPException(status_code=404, detail="Face sample not found for this student")

    db.delete(face_embedding)
    db.commit()

    remaining_count = len(embeddings) - 1

    return {
        "message": "Face sample deleted successfully",
        "student_id": student_id,
        "deleted_embedding_id": embedding_id,
        "remaining_samples": remaining_count
    }

@router.delete("/{student_id}/face-samples")
def delete_all_face_samples(student_id: int, db: Session = Depends(get_db)):
    student_service.get_student_by_id(db, student_id)

    embeddings = embedding_service.get_student_embeddings(db, student_id)
    deleted_count = len(embeddings)

    for embedding in embeddings:
        db.delete(embedding)
    db.commit()

    return {
        "message": "All face samples deleted successfullly",
        "student_id": student_id,
        "deleted_samples": deleted_count,
        "remaining_samples": 0
    }

@router.post("/recognize-test")
def recognize_test(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = file.file.read()

    image_array = np.frombuffer(
        contents,
        np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    query_embedding = recognition_service.create_face_embedding(
        image
    )

    if query_embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No face detected"
        )

    students = student_service.get_students(db)

    student, distance = recognition_service.find_matching_student(
        db,
        query_embedding,
        students
    )

    if student is None:
        return {
            "recognized": False,
            "distance": float(distance),
            "message": "Unknown person"
        }

    return {
        "recognized": True,
        "student_id": student.id,
        "name": student.name,
        "distance": float(distance)
    }