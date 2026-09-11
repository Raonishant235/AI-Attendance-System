from pydantic import BaseModel, EmailStr

class StudentCreate(BaseModel):
    name: str
    roll_number: str
    department: str
    year: int
    email: EmailStr

class StudentResponse(StudentCreate):
    id: int
    photo_path: str | None=None

    class Config:
        from_attributes = True