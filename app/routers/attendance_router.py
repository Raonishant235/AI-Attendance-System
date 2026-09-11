from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import cv2
import numpy as np

from app.database import get_db
from app.services import (attendance_service, recognition_service, student_service)
from app.schemas.attendance import AttendanceResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/recognize")
def recognize_and_mark_attendance(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = file.file.read()

    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    faces = recognition_service.extract_all_faces(image)
    if not faces:
        raise HTTPException(status_code=400, detail="No faces detected")

    students = student_service.get_students(db)
    recognized_students = []

    for detected_face in faces:
        face = detected_face["face"]
        embedding = recognition_service.generate_embedding(face)

        student, distance = recognition_service.recognize_face(embedding, students, db)

        if student is None:
            continue

        attendance, created = (attendance_service.mark_attendance(db, student.id))

        recognized_students.append({
            "student_id": student.id,
            "name": student.name,
            "distance": float(distance),
            "status": attendance.status,
            "new_attendance": created
        })
    return {
        "faces_detected": len(faces),
        "recognized_students": recognized_students
    }

@router.get("/statistics")
def get_attendance_statistics(db: Session = Depends(get_db)):
    return attendance_service.get_today_statistics(db)

@router.post("/{student_id}")
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

@router.get("/", response_model=list[AttendanceResponse])
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

@router.get("/today", response_model=list[AttendanceResponse])
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

@router.get("/student/{student_id}", response_model=list[AttendanceResponse])
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

@router.get("/date/{date}", response_model=list[AttendanceResponse])
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