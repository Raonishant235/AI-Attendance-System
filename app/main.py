from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routers import student_router
from app.routers import attendance_router

from app.models.student import Student
from app.models.attendance import Attendance
from app.models.face_embedding import FaceEmbedding

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title= "AI Attendance System",
    description= "AI Powered Attendance Management using FastAPI",
    version= "1.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(student_router.router)
app.include_router(attendance_router.router)

@app.get("/")
def home():
    return {"message": "Welcome to AI Attendance System"}