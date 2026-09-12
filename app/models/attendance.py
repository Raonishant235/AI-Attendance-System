from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    time = Column(DateTime, default=datetime.now, nullable=False)
    status = Column(String, default="Present", nullable=False)
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),)