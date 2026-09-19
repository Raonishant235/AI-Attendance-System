# AI Attendance System

An attendance management application that combines a React interface with a FastAPI backend and face recognition. It supports day-to-day student and attendance management while using facial embeddings to identify registered students and record attendance automatically.

The project was built as a practical full-stack computer-vision application: it covers the user-facing workflow, API security, database integrity, and a usable reporting interface rather than treating face recognition as an isolated demo.

> **Note:** This repository is intended for local use and portfolio demonstration. Deployment is deliberately out of scope for the current version.

## Highlights

- Register, search, view, update, and remove student records
- Upload and update student photographs
- Capture and manage multiple face samples per student
- Create facial embeddings with the OpenFace `nn4.small2.v1.t7` model
- Recognize registered faces from camera/image input
- Mark attendance automatically after successful recognition
- Mark attendance manually from a student profile (admin only)
- Prevent duplicate attendance records for the same student and day
- View today’s attendance, student-wise history, date-wise data, attendance percentage, and reports
- JWT-based login with Argon2 password hashing
- Role-based access for **Admin** and **Teacher** users
- Protected FastAPI routes and a role-aware React interface
- SQLite foreign-key enforcement and validation to avoid attendance records for deleted or invalid students

## Built With

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite, SQLAlchemy |
| Authentication | JWT, Argon2 password hashing |
| Computer Vision | OpenCV DNN, OpenFace `nn4.small2.v1.t7` |

## How It Works

```text
Camera / uploaded image
          |
          v
Face detection (OpenCV DNN)
          |
          v
OpenFace embedding generation
          |
          v
Compare with saved student embeddings
          |
          +--> Match found: identify student and record today's attendance
          |
          +--> No match: do not create an attendance record
```

Each student can have multiple face samples. The system generates and stores an embedding for a registered face, then uses embeddings to compare a detected face with the known students. Attendance is recorded only once per student per day; repeated recognition or a second manual attempt returns the existing attendance state instead of creating a duplicate.

## Roles and Access

The interface adapts to the signed-in user, but permission checks are also enforced by the backend.

| Capability | Admin | Teacher |
| --- | :---: | :---: |
| View students, attendance, reports, and recognition tools | Yes | Yes |
| Add, edit, or delete students | Yes | No |
| Update photos and manage face samples/embeddings | Yes | No |
| Mark attendance manually | Yes | No |

Newly registered users are assigned the `teacher` role. Admin-only API operations validate the JWT and role server-side, so hiding a control in the frontend is not the only protection.

## Project Structure

The project follows this backend/frontend layout:

```text
AI-Attendance-System/
|
├── backend/
│   ├── app/
│   │   ├── auth/                 # JWT and role-security helpers
│   │   ├── models/               # SQLAlchemy database models
│   │   ├── routers/              # Auth, student, attendance, and CV routes
│   │   ├── schemas/              # Request/response validation models
│   │   ├── services/             # Attendance, auth, and face-recognition logic
│   │   ├── database.py           # SQLite/SQLAlchemy configuration
│   │   └── main.py               # FastAPI application entry point
│   ├── requirements.txt
│   └── attendance.db             # Created locally at runtime
|
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main React application UI
│   │   └── App.css               # Application styles
│   ├── package.json
│   └── vite.config.js
|
├── models/                       # OpenCV/OpenFace model files, if kept in the repo
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later with npm
- A webcam for live recognition and face-sample capture
- The OpenFace `nn4.small2.v1.t7` model file configured at the path used by the backend

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd AI-Attendance-System
```

### 2. Start the backend

Open a terminal in the backend folder:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install the dependencies and run FastAPI:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`, and FastAPI’s interactive documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### 3. Start the frontend

Open a second terminal in the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local URL (commonly `http://localhost:5173`). Open it in a browser after the backend is running.

### 4. Configure the face-recognition model

Ensure the OpenFace `nn4.small2.v1.t7` file is present at the location expected by the backend’s face-recognition service. If you keep model files outside version control, document the local path in your project configuration before running recognition.

## Typical Workflow

1. Register or sign in to the application.
2. As an admin, add a student and upload a clear face photograph.
3. Capture one or more face samples and generate the student’s embedding.
4. Open the recognition screen and provide camera/image input.
5. When the student is recognized, the system marks attendance for the day.
6. Review the result from the dashboard, attendance history, or reports.

Admins can also use **Mark Present** from a student profile when manual attendance is needed. Teachers can view attendance-related information but cannot change student, face-registration, or manual-attendance data.

## API Overview

FastAPI automatically provides complete, testable API documentation at `/docs`. The main API areas are:

| Area | Example endpoints | Purpose |
| --- | --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login` | Create teacher accounts and obtain JWT access tokens |
| Students | `/students/`, `/students/{student_id}` | Manage and retrieve student records; modification is admin-only |
| Attendance | `POST /attendance/{student_id}`, `GET /attendance/student/{student_id}` | Record manual attendance and retrieve student attendance history |
| Statistics and reports | Attendance/statistics routes | Provide today’s totals, percentages, date-wise data, and reporting views |
| Face recognition | Face sample, embedding, and recognition routes | Register biometric samples and identify known students |

For protected requests, send the JWT returned by login as a Bearer token:

```http
Authorization: Bearer <access_token>
```

## Data Integrity and Security Notes

- Passwords are stored as Argon2 hashes, not plain text.
- JWTs identify the signed-in user and carry role information used for authorization.
- Admin-only endpoints reject authenticated non-admin users with `403 Forbidden`.
- Manual attendance verifies that the student exists before creating a record.
- Attendance is checked per student per day to prevent duplicate entries.
- SQLite foreign keys are enabled so attendance cannot reference a nonexistent student.

## Screenshots

Add real screenshots before publishing the repository. A simple `screenshots/` folder keeps the README clean and makes the project easier to evaluate at a glance.

## Future Improvements

These are ideas for a future version, not features claimed by the current project:

- Face liveness / anti-spoofing checks
- PostgreSQL support for multi-user or larger-scale use
- Exportable attendance reports
- Improved recognition thresholds and model evaluation tools
- Audit logs for administrative actions
- Automated tests for the API and recognition workflow

## Project Notes

This project was created as a portfolio-focused exercise in combining full-stack development with applied computer vision. The goal was to build a complete attendance workflow—from authentication and student management to recognition, reporting, and role-based protection—while keeping the local setup approachable.

## Author

**Nishant**

If you found this project useful or have feedback, feel free to connect through the links on the GitHub profile hosting this repository.

