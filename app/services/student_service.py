from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.student import Student
from app.schemas.student import StudentCreate

def create_student(db: Session, student: StudentCreate):
    existing_email = db.query(Student).filter(
        Student.email == student.email
    ).first()

    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    existing_roll = db.query(Student).filter(
        Student.roll_number == student.roll_number
    ).first()

    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already exists")

    new_student = Student(
        name = student.name,
        roll_number = student.roll_number,
        department = student.department,
        year = student.year,
        email = student.email
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return new_student

def get_students(db: Session):
    return db.query(Student).all()

def get_student_by_id(db: Session, student_id: int):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

def update_student(db: Session, student_id: int, student_data: StudentCreate):
    student = get_student_by_id(db, student_id)

    # Check whether another student already uses this email
    existing_email = db.query(Student).filter(
        Student.email == student_data.email,
        Student.id != student_id
    ).first()

    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Check whether another student already uses this roll number
    existing_roll = db.query(Student).filter(
        Student.roll_number == student_data.roll_number,
        Student.id != student_id
    ).first()

    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already exists")

    student.name = student_data.name
    student.roll_number = student_data.roll_number
    student.department = student_data.department
    student.year = student_data.year
    student.email = student_data.email

    db.commit()
    db.refresh(student)
    return student

def delete_student(db: Session, student_id: int):
    from pathlib import Path
    from app.models.attendance import Attendance
    from app.models.face_embedding import FaceEmbedding

    student = get_student_by_id(db, student_id)

    photo_path = student.photo_path
    try:
        db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).delete(synchronize_session=False)
        db.query(Attendance).filter(Attendance.student_id == student_id).delete(synchronize_session=False)
        db.delete(student)
        db.commit()
    except Exception:
        db.rollback()
        raise

    photo_deleted = False
    if photo_path:
        path = Path(photo_path)

        if path.exists() and path.is_file():
            try:
                path.unlink()
                photo_deleted = True
            except OSError:
                pass
    return {
        "message" : "Student deleted successfully",
        "student_id": student_id,
        "photo_deleted": photo_deleted
        }