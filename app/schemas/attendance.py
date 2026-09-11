from pydantic import BaseModel
from datetime import date, datetime

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    date: date
    time: datetime | None = None
    status: str

    class config:
        from_attributes = True