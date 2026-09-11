from sqlalchemy import Column, Integer, String, LargeBinary
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    roll_number = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    email = Column(String, unique=True, nullable=False)
    photo_path = Column(String, nullable=True)
    face_encoding = Column(LargeBinary, nullable=True)