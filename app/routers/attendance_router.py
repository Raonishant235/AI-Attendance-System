from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import cv2
import numpy as np

from app.database import get_db
from app.services import (attendance_service, recognition_service, student_service)
from app.schemas.attendance import AttendanceResponse
from app.auth.security import get_current_user
from app.auth.role_security import require_admin

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(get_current_user)])

@router.post("/recognize", dependencies=[Depends(get_current_user)])
def recognize_and_mark_attendance(file: UploadFile = File(...), db: Session = Depends(get_db)):

    MAX_FILE_SIZE = 5*1024*1024
    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(contents)>MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Image file is too large. Maximum size is 5 MB.")

    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    try:
        faces = recognition_service.extract_all_faces(image)
    except Exception as error:
        print(f"Face detection error: {error}")
        raise HTTPException(status_code=500, detail="Face detection failed")

    if not faces:
        raise HTTPException(status_code=400, detail="No faces detected")

    students = student_service.get_students(db)
    if not students:
        raise HTTPException(status_code=404, detail="No students are registered in the system.")
    recognized_students = []
    recognized_student_ids = set()

    for detected_face in faces:
        face = detected_face.get("face")
        if face is None:
            continue
        try:
            embedding = recognition_service.generate_embedding(face)
        except Exception as error:
            print(f"Embedding generation error: {error}")
            continue

        if embedding is None:
            continue
        try:
            student, distance = recognition_service.recognize_face(embedding, students, db)
        except Exception as error:
            print(f"Face recognition error: {error}")
            continue

        if student is None:
            continue

        if student.id in recognized_student_ids:
            continue
        recognized_student_ids.add(student.id)

        try:
            attendance, created = attendance_service.mark_attendance(db, student.id)
        except Exception as error:
            db.rollback()
            print(f"Attendance error for student {student.id}: {error}")
            continue

        recognized_students.append({
            "student_id": student.id,
            "name": student.name,
            "distance": float(distance),
            "status": attendance.status,
            "new_attendance": created
        })
    return {
        "faces_detected": len(faces),
        "recognized_count": len(recognized_students),
        "recognized_students": recognized_students
    }

@router.get("/statistics", dependencies=[Depends(get_current_user)])
def get_attendance_statistics(db: Session = Depends(get_db)):
    return attendance_service.get_today_statistics(db)

@router.post("/{student_id}", dependencies=[Depends(require_admin)])
def mark_student_attendance(student_id: int, db: Session = Depends(get_db)):
    attendance, created = attendance_service.mark_attendance(db, student_id)

    return {
        "message":"Attendance marked" if created else "Attendance already marked today",
        "student_id":attendance.student_id,
        "date":attendance.date,
        "time":attendance.time,
        "status":attendance.status,
        "new_attendance": created
    }

@router.get("/", response_model=list[AttendanceResponse], dependencies=[Depends(get_current_user)])
def get_all_attendance(db: Session = Depends(get_db)):
    records = attendance_service.get_all_attendance(db)
    return [
        {
            "id": attendance.id,
            "student_id": attendance.student_id,
            "student_name": student_name,
            "date": attendance.date,
            "time": attendance.time,
            "status": attendance.status
        }
        for attendance, student_name in records
    ]

@router.get("/today", response_model=list[AttendanceResponse], dependencies=[Depends(get_current_user)])
def get_today_attendance(db: Session = Depends(get_db)):
    records = attendance_service.get_today_attendance(db)
    return [
        {  
            "id": attendance.id,
            "student_id": attendance.student_id,
            "student_name": student_name,
            "date": attendance.date,
            "time": attendance.time,
            "status": attendance.status
        }
        for attendance, student_name in records
    ]

@router.get("/student/{student_id}", response_model=list[AttendanceResponse], dependencies=[Depends(get_current_user)])
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    records = attendance_service.get_student_attendance(db, student_id)
    return [
        {
            "id": attendance.id,
            "student_id": attendance.student_id,
            "student_name": student_name,
            "date": attendance.date,
            "time": attendance.time,
            "status": attendance.status
        }
        for attendance, student_name in records
    ]

@router.get("/date/{date}", response_model=list[AttendanceResponse], dependencies=[Depends(get_current_user)])
def get_attendance_by_date(date: str, db: Session = Depends(get_db)):
    records = attendance_service.get_attendance_by_date(db, date)
    return [
        {
            "id": attendance.id,
            "student_id": attendance.student_id,
            "student_name": student_name,
            "date": attendance.date,
            "time": attendance.time,
            "status": attendance.status
        }
        for attendance, student_name in records
    ]