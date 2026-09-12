from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.attendance import Attendance
from app.models.student import Student

def mark_attendance(db: Session, student_id: int):
    today = datetime.now().strftime("%Y-%m-%d")

    existing = db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.date == today).first()

    if existing:
        return existing, False

    attendance = Attendance(student_id=student_id, date = today, status = "Present")

    db.add(attendance)

    try:
        db.commit()
        db.refresh(attendance)
        return attendance, True
    except IntegrityError:
        db.rollback()

        existing = db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.date == today).first()
        if existing:
            return existing, False
        raise

def get_all_attendance(db: Session):
    return db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id).all()

def get_today_attendance(db: Session):
    today = datetime.now().strftime("%Y-%m-%d")
    return db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id).filter(Attendance.date == today).all()

def get_student_attendance(db: Session, student_id: int):
    return db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id).filter(Attendance.student_id == student_id).all()

def get_attendance_by_date(db: Session, date: str):
    return db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id).filter(Attendance.date == date).all()

def get_today_statistics(db: Session):
    today = datetime.now().strftime("%Y-%m-%d")

    total_students = db.query(Student).count()
    present_today = db.query(Attendance).filter(Attendance.date == today, Attendance.status == "Present").count()
    absent_today = total_students - present_today

    if total_students > 0:
        attendance_percentage = (present_today / total_students)*100
    else:
        attendance_percentage = 0

    return {
        "Total students": total_students,
        "Present today": present_today,
        "Absent today": absent_today,
        "Attendance percentage": round(attendance_percentage, 2)
    }