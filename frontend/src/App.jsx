import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState('dashboard')

  const [statistics, setStatistics] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [students, setStudents] = useState([])

  const [studentSearch, setStudentSearch] = useState('')
  const [studentDepartment, setStudentDepartment] = useState('')
  const [studentYear, setStudentYear] = useState('')

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(false)

  const [studentAttendance, setStudentAttendance] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  const [embeddingGenerated, setEmbeddingGenerated] = useState(false)
  const [embeddingCount, setEmbeddingCount] = useState(0)
  const [generatingEmbedding, setGeneratingEmbedding] = useState(false)
  const [embeddingMessage, setEmbeddingMessage] = useState('')
  const [embeddingError, setEmbeddingError] = useState('')

  const [faceSamples, setFaceSamples] = useState([])
  const [loadingFaceSamples, setLoadingFaceSamples] = useState(false)
  const [deletingFaceSample, setDeletingFaceSample] = useState(false)

  const [faceSampleCameraRunning, setFaceSampleCameraRunning] = useState(false)
  const [capturingSample, setCapturingSample] = useState(false)
  const [faceSampleVideoReady, setFaceSampleVideoReady] = useState(false)
  const [sampleInstruction, setSampleInstruction] = useState('Look straight at the camera')

  const [cameraRunning, setCameraRunning] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [recognitionResult, setRecognitionResult] = useState(null)

  const [showAddStudent, setShowAddStudent] = useState(false)

  const [editingStudent, setEditingStudent] = useState(null)
  const [updatingStudent, setUpdatingStudent] = useState(false)

  const [studentForm, setStudentForm] = useState({
    name: '',
    roll_number: '',
    department: '',
    year: '',
    email: '',
    photo: null
  })

  const [studentMessage, setStudentMessage] = useState('')
  const [studentError, setStudentError] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)

  const [attendanceDate, setAttendanceDate] = useState('')
  const [attendanceStudent, setAttendanceStudent] = useState('')

  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [reportAttendance, setReportAttendance] = useState([])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const recognitionTimerRef = useRef(null)
  const recognitionInProgressRef = useRef(false)
  const studentRequestRef = useRef(0)

  const faceSampleVideoRef = useRef(null)
  const faceSampleStreamRef = useRef(null)
  const faceSampleCanvasRef = useRef(null)

  useEffect(() => {
    fetchStatistics()
    fetchAttendance()
    fetchStudents()
    fetchReport(reportDate)
  }, [])

  useEffect(() => {
    if (cameraRunning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraRunning])

  useEffect(() => {
    if (!faceSampleCameraRunning) {
      return
    }

    const video = faceSampleVideoRef.current
    const stream = faceSampleStreamRef.current

    if (!video || !stream) {
      return
    }

    video.srcObject = stream
    video.muted = true

    const startPlayback = async () => {
      try {
        await video.play()
        setFaceSampleVideoReady(
          video.videoWidth > 0 && video.videoHeight > 0
        )
      } catch (error) {
        console.error('Face sample video playback error:', error)
        setEmbeddingError(
          'Camera started, but the video preview could not be started. Please try again.'
        )
      }
    }

    const handleLoadedMetadata = () => {
      setFaceSampleVideoReady(
        video.videoWidth > 0 && video.videoHeight > 0
      )
      startPlayback()
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    if (video.readyState >= 1) {
      startPlayback()
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [faceSampleCameraRunning])

  useEffect(() => {
    if (!cameraRunning) {
      return
    }

    recognitionTimerRef.current = setInterval(() => {
      recognizeFace()
    }, 2000)

    return () => {
      clearInterval(recognitionTimerRef.current)
    }
  }, [cameraRunning])

  useEffect(() => {
    setSampleInstruction(getSampleInstruction(embeddingCount))
  }, [embeddingCount])

  const fetchStatistics = () => {
    fetch('http://127.0.0.1:8000/attendance/statistics')
      .then((response) => response.json())
      .then((data) => {
        setStatistics(data)
      })
      .catch((error) => {
        console.error('Error fetching statistics:', error)
      })
  }

  const fetchAttendance = () => {
    fetch('http://127.0.0.1:8000/attendance/today')
      .then((response) => response.json())
      .then((data) => {
        setAttendance(data)
      })
      .catch((error) => {
        console.error('Error fetching attendance:', error)
      })
  }

  const fetchAllAttendance = () => {
    fetch('http://127.0.0.1:8000/attendance/')
      .then((response) => response.json())
      .then((data) => {
        setAttendance(data)
      })
      .catch((error) => {
        console.error('Error fetching all attendance:', error)
      })
  }

  const fetchAttendanceByDate = (date) => {
    fetch(`http://127.0.0.1:8000/attendance/date/${date}`)
      .then((response) => response.json())
      .then((data) => {
        setAttendance(data)
      })
      .catch((error) => {
        console.error('Error fetching attendance by date:', error)
      })
  }

  const fetchAttendanceByStudent = (studentId) => {
    fetch(`http://127.0.0.1:8000/attendance/student/${studentId}`)
      .then((response) => response.json())
      .then((data) => {
        setAttendance(data)
      })
      .catch((error) => {
        console.error('Error fetching student attendance:', error)
      })
  }

  const fetchStudents = () => {
    fetch('http://127.0.0.1:8000/students/')
      .then((response) => response.json())
      .then((data) => {
        setStudents(data)
      })
      .catch((error) => {
        console.error('Error fetching students:', error)
      })
  }

  const filteredStudents = students.filter((student) => {
    const search = studentSearch.trim().toLowerCase()

    const matchesSearch =
      !search ||
      student.name.toLowerCase().includes(search) ||
      student.roll_number.toLowerCase().includes(search) ||
      student.department.toLowerCase().includes(search)

    const matchesDepartment =
      !studentDepartment ||
      student.department === studentDepartment

    const matchesYear =
      !studentYear ||
      String(student.year) === String(studentYear)

    return matchesSearch && matchesDepartment && matchesYear
  })

  const viewStudent = async (studentId) => {
    const requestId = ++studentRequestRef.current

    setLoadingStudent(true)
    setLoadingAttendance(true)
    setEmbeddingMessage('')
    setEmbeddingError('')

    try {
      const [studentResponse, statusResponse, attendanceResponse, samplesResponse] =
        await Promise.all([
          fetch(`http://127.0.0.1:8000/students/${studentId}`),
          fetch(`http://127.0.0.1:8000/students/${studentId}/face-status`),
          fetch(`http://127.0.0.1:8000/attendance/student/${studentId}`),
          fetch(`http://127.0.0.1:8000/students/${studentId}/face-samples`)
        ])

      const studentData = await studentResponse.json()
      const statusData = await statusResponse.json()
      const attendanceData = await attendanceResponse.json()
      const samplesData = await samplesResponse.json()

      if (!studentResponse.ok) {
        throw new Error(
          studentData.detail || 'Failed to fetch student details.'
        )
      }

      if (!statusResponse.ok) {
        throw new Error(
          statusData.detail || 'Failed to fetch face registration status.'
        )
      }

      if (!attendanceResponse.ok) {
        throw new Error(
          attendanceData.detail || 'Failed to fetch attendance.'
        )
      }

      if (!samplesResponse.ok) {
        throw new Error(
          samplesData.detail || 'Failed to fetch face samples.'
        )
      }

      // If the user clicked another student while these requests were
      // running, ignore this older response.
      if (requestId !== studentRequestRef.current) {
        return
      }

      setSelectedStudent(studentData)
      setEmbeddingGenerated(statusData.face_registered)
      setEmbeddingCount(statusData.embedding_count)
      setFaceSamples(samplesData.samples || [])
      setStudentAttendance(attendanceData)
    } catch (error) {
      if (requestId !== studentRequestRef.current) {
        return
      }

      console.error('Error fetching student:', error)
      setEmbeddingGenerated(false)
      setEmbeddingCount(0)
      setStudentAttendance([])
      alert(error.message)
    } finally {
      if (requestId === studentRequestRef.current) {
        setLoadingStudent(false)
        setLoadingAttendance(false)
      }
    }
  }

  const fetchFaceSamples = async (studentId) => {
  setLoadingFaceSamples(true)

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/students/${studentId}/face-samples`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || 'Failed to fetch face samples.'
      )
    }

    setFaceSamples(data.samples || [])
    setEmbeddingCount(data.embedding_count || 0)
    setEmbeddingGenerated((data.embedding_count || 0) > 0)
  } catch (error) {
    console.error('Error fetching face samples:', error)
    setEmbeddingError(error.message)
  } finally {
    setLoadingFaceSamples(false)
  }
}


const deleteFaceSample = async (embeddingId) => {
  if (!selectedStudent) {
    return
  }

  const confirmed = window.confirm(
    'Are you sure you want to delete this face sample?'
  )

  if (!confirmed) {
    return
  }

  setDeletingFaceSample(true)
  setEmbeddingMessage('')
  setEmbeddingError('')

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/students/${selectedStudent.id}/face-samples/${embeddingId}`,
      {
        method: 'DELETE'
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || 'Failed to delete face sample.'
      )
    }

    setEmbeddingMessage('Face sample deleted successfully.')

    await fetchFaceSamples(selectedStudent.id)

    setSampleInstruction(
      getSampleInstruction(data.remaining_samples)
    )
  } catch (error) {
    console.error('Delete face sample error:', error)
    setEmbeddingError(error.message)
  } finally {
    setDeletingFaceSample(false)
  }
}


const deleteAllFaceSamples = async () => {
  if (!selectedStudent) {
    return
  }

  if (faceSamples.length === 0) {
    setEmbeddingMessage('There are no face samples to delete.')
    return
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete all ${faceSamples.length} face samples for ${selectedStudent.name}?`
  )

  if (!confirmed) {
    return
  }

  setDeletingFaceSample(true)
  setEmbeddingMessage('')
  setEmbeddingError('')

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/students/${selectedStudent.id}/face-samples`,
      {
        method: 'DELETE'
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || 'Failed to delete face samples.'
      )
    }

    setFaceSamples([])
    setEmbeddingCount(0)
    setEmbeddingGenerated(false)
    setSampleInstruction(getSampleInstruction(0))

    setEmbeddingMessage(
      `All face samples deleted successfully. ${data.deleted_samples} sample${data.deleted_samples !== 1 ? 's' : ''} removed.`
    )
  } catch (error) {
    console.error('Delete all face samples error:', error)
    setEmbeddingError(error.message)
  } finally {
    setDeletingFaceSample(false)
  }
}

  const getSampleInstruction = (count) => {
    const instructions = [
      'Look straight at the camera',
      'Turn your head slightly to the left',
      'Turn your head slightly to the right',
      'Move slightly farther away from the camera',
      'Return to the center and use a natural expression'
    ]

    return instructions[count % instructions.length]
  }

  const startFaceSampleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      })

      faceSampleStreamRef.current = stream
      setFaceSampleVideoReady(false)
      setSampleInstruction(getSampleInstruction(embeddingCount))
      setEmbeddingError('')
      setFaceSampleCameraRunning(true)
    } catch (error) {
      console.error('Face sample camera error:', error)
      setEmbeddingError(
        'Unable to access the camera. Please allow camera permission.'
      )
    }
  }

  const stopFaceSampleCamera = () => {
    if (faceSampleStreamRef.current) {
      faceSampleStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      faceSampleStreamRef.current = null
    }

    if (faceSampleVideoRef.current) {
      faceSampleVideoRef.current.srcObject = null
    }

    setFaceSampleCameraRunning(false)
    setFaceSampleVideoReady(false)
    setCapturingSample(false)
  }

  const captureFaceSample = async () => {
    if (
      !selectedStudent ||
      !faceSampleVideoRef.current ||
      !faceSampleCanvasRef.current ||
      capturingSample
    ) {
      return
    }

    const video = faceSampleVideoRef.current

    if (
      !faceSampleVideoReady ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setEmbeddingError('Camera is still starting. Please wait a moment and try again.')
      return
    }

    setCapturingSample(true)
    setEmbeddingMessage('')
    setEmbeddingError('')

    const canvas = faceSampleCanvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setEmbeddingError('Could not capture the camera frame.')
        setCapturingSample(false)
        return
      }

      const formData = new FormData()
      formData.append('file', blob, 'face-sample.jpg')

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/students/${selectedStudent.id}/face-sample`,
          {
            method: 'POST',
            body: formData
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to save face sample.')
        }

        await fetchFaceSamples(selectedStudent.id)

        setEmbeddingMessage(
          'Face sample captured and embedding stored successfully.'
        )
      } catch (error) {
        console.error('Face sample error:', error)
        setEmbeddingError(error.message)
      } finally {
        setCapturingSample(false)
      }
    }, 'image/jpeg', 0.9)
  }

  const generateEmbedding = async () => {
    if (!selectedStudent) {
      return
    }

    setGeneratingEmbedding(true)
    setEmbeddingMessage('')
    setEmbeddingError('')

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/students/${selectedStudent.id}/generate-embedding`,
        {
          method: 'POST'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to generate face embedding.'
        )
      }

      setEmbeddingGenerated(true)
      setEmbeddingCount((previousCount) => previousCount + 1)
      setEmbeddingMessage(
        'Face embedding generated and stored successfully.'
      )

    } catch (error) {
      console.error('Embedding generation error:', error)
      setEmbeddingError(error.message)
    }

    setGeneratingEmbedding(false)
  }

  const fetchReport = (date) => {
    fetch(`http://127.0.0.1:8000/attendance/date/${date}`)
      .then((response) => response.json())
      .then((data) => {
        setReportAttendance(data)
      })
      .catch((error) => {
        console.error('Error fetching report:', error)
      })
  }

  const handleAttendanceDateChange = (event) => {
    const date = event.target.value

    setAttendanceDate(date)

    if (date) {
      setAttendanceStudent('')
      fetchAttendanceByDate(date)
    } else {
      fetchAllAttendance()
    }
  }

  const handleAttendanceStudentChange = (event) => {
    const studentId = event.target.value

    setAttendanceStudent(studentId)

    if (studentId) {
      setAttendanceDate('')
      fetchAttendanceByStudent(studentId)
    } else {
      fetchAllAttendance()
    }
  }

  const clearAttendanceFilters = () => {
    setAttendanceDate('')
    setAttendanceStudent('')
    fetchAllAttendance()
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      })

      streamRef.current = stream
      setCameraRunning(true)
      setRecognitionResult(null)

    } catch (error) {
      console.error('Camera error:', error)
      alert('Unable to access the camera. Please allow camera permission.')
    }
  }

  const stopCamera = () => {
    clearInterval(recognitionTimerRef.current)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })

      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraRunning(false)
    setRecognizing(false)
    setRecognitionResult(null)
  }

  const recognizeFace = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      recognitionInProgressRef.current
    ) {
      return
    }

    if (
      videoRef.current.readyState < 2 ||
      videoRef.current.videoWidth === 0
    ) {
      return
    }

    recognitionInProgressRef.current = true
    setRecognizing(true)

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(async (blob) => {
      if (!blob) {
        recognitionInProgressRef.current = false
        setRecognizing(false)
        return
      }

      const formData = new FormData()
      formData.append('file', blob, 'frame.jpg')

      try {
        const response = await fetch(
          'http://127.0.0.1:8000/attendance/recognize',
          {
            method: 'POST',
            body: formData
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || 'Recognition failed')
        }

        if (data.recognized_students.length === 0) {
          setRecognitionResult({
            success: false,
            message: 'No known student recognized.'
          })
        } else {
          const student = data.recognized_students[0]

          setRecognitionResult({
            success: true,
            name: student.name,
            distance: student.distance,
            newAttendance: student.new_attendance
          })

          fetchStatistics()
          fetchAttendance()
        }

      } catch (error) {
        console.error('Recognition error:', error)

        setRecognitionResult({
          success: false,
          message: error.message
        })
      }

      recognitionInProgressRef.current = false
      setRecognizing(false)

    }, 'image/jpeg')
  }

  const handleStudentChange = (event) => {
    const { name, value } = event.target

    setStudentForm({
      ...studentForm,
      [name]: value
    })
  }

  const handlePhotoChange = (event) => {
    setStudentForm({
      ...studentForm,
      photo: event.target.files[0]
    })
  }

  const startEditingStudent = () => {
    if (!selectedStudent) return

    setEditingStudent(selectedStudent)

    setStudentForm({
      name: selectedStudent.name,
      roll_number: selectedStudent.roll_number,
      department: selectedStudent.department,
      year: String(selectedStudent.year),
      email: selectedStudent.email,
      photo: null
    })

    setStudentMessage('')
    setStudentError('')
  }

  const updateStudent = async (event) => {
    event.preventDefault()

    if (!editingStudent) return

    setStudentMessage('')
    setStudentError('')
    setUpdatingStudent(true)

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/students/${editingStudent.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: studentForm.name,
            roll_number: studentForm.roll_number,
            department: studentForm.department,
            year: parseInt(studentForm.year),
            email: studentForm.email
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to update student.'
        )
      }

      setSelectedStudent(data)

      setStudentMessage(
        'Student information updated successfully.'
      )

      setEditingStudent(null)

      setStudentForm({
        name: '',
        roll_number: '',
        department: '',
        year: '',
        email: '',
        photo: null
      })

      fetchStudents()
    } catch (error) {
      console.error('Error updating student:', error)
      setStudentError(error.message)
    }

    setUpdatingStudent(false)
  }

  const addStudent = async (event) => {
    event.preventDefault()

    setStudentMessage('')
    setStudentError('')

    if (!studentForm.photo) {
      setStudentError('Please select a student photo.')
      return
    }

    setAddingStudent(true)

    try {
      const studentResponse = await fetch(
        'http://127.0.0.1:8000/students/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: studentForm.name,
            roll_number: studentForm.roll_number,
            department: studentForm.department,
            year: parseInt(studentForm.year),
            email: studentForm.email
          })
        }
      )

      const studentData = await studentResponse.json()

      if (!studentResponse.ok) {
        throw new Error(
          studentData.detail || 'Failed to create student.'
        )
      }

      const studentId = studentData.id

      const formData = new FormData()
      formData.append('file', studentForm.photo)

      const photoResponse = await fetch(
        `http://127.0.0.1:8000/students/${studentId}/photo`,
        {
          method: 'POST',
          body: formData
        }
      )

      const photoData = await photoResponse.json()

      if (!photoResponse.ok) {
        throw new Error(
          photoData.detail ||
          'Student created, but photo upload failed.'
        )
      }

      setStudentMessage(
        'Student and photo added successfully.'
      )

      setStudentForm({
        name: '',
        roll_number: '',
        department: '',
        year: '',
        email: '',
        photo: null
      })

      const photoInput = document.getElementById('student-photo')

      if (photoInput) {
        photoInput.value = ''
      }

      fetchStudents()
      fetchStatistics()

    } catch (error) {
      console.error('Error adding student:', error)
      setStudentError(error.message)
    }

    setAddingStudent(false)
  }

  return (
    <div className="app">

      <aside className="sidebar">

        <div className="logo-section">

          <div className="logo-icon">
            AI
          </div>

          <div>
            <h2>Attendance</h2>
            <span>AI System</span>
          </div>

        </div>

        <nav className="navigation">

          <button
            className={`nav-item ${
              page === 'dashboard' ? 'active' : ''
            }`}
            onClick={() => setPage('dashboard')}
          >
            📊 Dashboard
          </button>

          <button
            className={`nav-item ${
              page === 'students' ? 'active' : ''
            }`}
            onClick={() => setPage('students')}
          >
            👨‍🎓 Students
          </button>

          <button
            className={`nav-item ${
              page === 'live' ? 'active' : ''
            }`}
            onClick={() => setPage('live')}
          >
            📷 Live Attendance
          </button>

          <button
            className={`nav-item ${
              page === 'attendance' ? 'active' : ''
            }`}
            onClick={() => {
              setPage('attendance')
              fetchAllAttendance()
            }}
          >
            📋 Attendance
          </button>

          <button
            className={`nav-item ${
              page === 'reports' ? 'active' : ''
            }`}
            onClick={() => {
              setPage('reports')
              fetchReport(reportDate)
            }}
          >
            📈 Reports
          </button>

        </nav>

      </aside>

      <main className="main-content">

        {/* DASHBOARD */}

        {page === 'dashboard' && (

          <>

            <header className="top-header">

              <div>
                <h1>Dashboard</h1>

                <p>
                  AI-powered attendance management system
                </p>
              </div>

              <div className="header-date">

                <span>
                  Today
                </span>

                <strong>
                  {new Date().toLocaleDateString()}
                </strong>

              </div>

            </header>

            <section className="stats-grid">

              <div className="stat-card">

                <div className="stat-icon">
                  👨‍🎓
                </div>

                <div>

                  <p>
                    Total Students
                  </p>

                  <h2>
                    {statistics?.["Total students"] ?? 0}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  ✓
                </div>

                <div>

                  <p>
                    Present Today
                  </p>

                  <h2>
                    {statistics?.["Present today"] ?? 0}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  ✕
                </div>

                <div>

                  <p>
                    Absent Today
                  </p>

                  <h2>
                    {statistics?.["Absent today"] ?? 0}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  %
                </div>

                <div>

                  <p>
                    Attendance Rate
                  </p>

                  <h2>
                    {statistics?.["Attendance percentage"] ?? 0}%
                  </h2>

                </div>

              </div>

            </section>

            <section className="dashboard-grid">

              <div className="dashboard-card">

                <div className="card-header">

                  <div>

                    <h2>
                      Live Attendance
                    </h2>

                    <p>
                      Start the camera to recognize students
                    </p>

                  </div>

                  <span
                    className="status-badge"
                    style={{
                      background: cameraRunning
                        ? '#dcfce7'
                        : '#fee2e2',

                      color: cameraRunning
                        ? '#16a34a'
                        : '#dc2626'
                    }}
                  >
                    ● {cameraRunning ? 'Online' : 'Offline'}
                  </span>

                </div>

                <div className="camera-placeholder">

                  {!cameraRunning ? (

                    <>
                      <div className="camera-icon">
                        📷
                      </div>

                      <h3>
                        Camera is not running
                      </h3>

                      <p>
                        Start live attendance to begin face recognition.
                      </p>

                      <button
                        className="primary-button"
                        onClick={startCamera}
                      >
                        Start Camera
                      </button>
                    </>

                  ) : (

                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="camera-video"
                      />

                      {recognizing && (
                        <p>
                          Recognizing...
                        </p>
                      )}

                      <button
                        className="secondary-button"
                        onClick={stopCamera}
                      >
                        Stop Camera
                      </button>

                      {recognitionResult && (

                        <div
                          className={
                            recognitionResult.success
                              ? 'recognition-success'
                              : 'recognition-error'
                          }
                        >

                          {recognitionResult.success ? (

                            <>
                              <strong>
                                ✓ {recognitionResult.name}
                              </strong>

                              <span>
                                {recognitionResult.newAttendance
                                  ? 'Attendance marked successfully.'
                                  : 'Attendance already marked today.'}
                              </span>

                              <small>
                                Distance: {recognitionResult.distance.toFixed(3)}
                              </small>
                            </>

                          ) : (

                            <strong>
                              ✕ {recognitionResult.message}
                            </strong>

                          )}

                        </div>

                      )}

                    </>

                  )}

                </div>

                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />

              </div>

              <div className="dashboard-card">

                <div className="card-header">

                  <div>

                    <h2>
                      Recent Attendance
                    </h2>

                    <p>
                      Today's attendance records
                    </p>

                  </div>

                </div>

                {attendance.length === 0 ? (

                  <div className="empty-state">

                    <div>
                      📋
                    </div>

                    <p>
                      No attendance recorded today.
                    </p>

                  </div>

                ) : (

                  attendance.slice(0, 5).map((record) => (

                    <div
                      key={record.id}
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >

                      <strong>
                        {record.student_name}
                      </strong>

                      <div
                        style={{
                          fontSize: '13px',
                          color: '#6b7280',
                          marginTop: '4px'
                        }}
                      >
                        {record.date} — {record.status}
                      </div>

                    </div>

                  ))

                )}

              </div>

            </section>

          </>

        )}

        {/* STUDENTS */}

        {page === 'students' && (

          <>

            <header className="top-header">

              <div>

                <h1>
                  Students
                </h1>

                <p>
                  Manage registered students
                </p>

              </div>

              <div className="header-date">

                <span>
                  Total Students
                </span>

                <strong>
                  {students.length}
                </strong>

              </div>

            </header>

            <section className="students-card">

              <div className="students-header">

                <div>

                  <h2>
                    Registered Students
                  </h2>

                  <p>
                    Students currently registered in the system
                  </p>

                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    setShowAddStudent(!showAddStudent)
                    setStudentMessage('')
                    setStudentError('')
                  }}
                >
                  {showAddStudent
                    ? 'Close'
                    : '+ Add Student'}
                </button>

              </div>

              {showAddStudent && (

                <form
                  className="student-form"
                  onSubmit={addStudent}
                >

                  <div className="form-grid">

                    <div className="form-group">

                      <label>
                        Name
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={studentForm.name}
                        onChange={handleStudentChange}
                        required
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Roll Number
                      </label>

                      <input
                        type="text"
                        name="roll_number"
                        value={studentForm.roll_number}
                        onChange={handleStudentChange}
                        required
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Department
                      </label>

                      <input
                        type="text"
                        name="department"
                        value={studentForm.department}
                        onChange={handleStudentChange}
                        required
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Year
                      </label>

                      <input
                        type="number"
                        name="year"
                        value={studentForm.year}
                        onChange={handleStudentChange}
                        min="1"
                        required
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Email
                      </label>

                      <input
                        type="email"
                        name="email"
                        value={studentForm.email}
                        onChange={handleStudentChange}
                        required
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Student Photo
                      </label>

                      <input
                        id="student-photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        required
                      />

                    </div>

                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={addingStudent}
                  >
                    {addingStudent
                      ? 'Adding Student...'
                      : 'Add Student'}
                  </button>

                  {studentMessage && (

                    <div className="student-success">
                      {studentMessage}
                    </div>

                  )}

                  {studentError && (

                    <div className="student-error">
                      {studentError}
                    </div>

                  )}

                </form>

              )}

              <div className="student-filters">
  <div className="filter-group">
    <label>Search Students</label>

    <input
      type="text"
      placeholder="Search by name, roll number or department..."
      value={studentSearch}
      onChange={(event) => setStudentSearch(event.target.value)}
    />
  </div>

  <div className="filter-group">
    <label>Department</label>

    <select
      value={studentDepartment}
      onChange={(event) => setStudentDepartment(event.target.value)}
    >
      <option value="">All Departments</option>

      {[...new Set(students.map((student) => student.department))]
        .sort()
        .map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
    </select>
  </div>

  <div className="filter-group">
    <label>Year</label>

    <select
      value={studentYear}
      onChange={(event) => setStudentYear(event.target.value)}
    >
      <option value="">All Years</option>

      {[...new Set(students.map((student) => student.year))]
        .sort((a, b) => a - b)
        .map((year) => (
          <option key={year} value={year}>
            Year {year}
          </option>
        ))}
    </select>
  </div>

  <button
    type="button"
    className="secondary-button"
    onClick={() => {
      setStudentSearch('')
      setStudentDepartment('')
      setStudentYear('')
    }}
  >
    Clear Filters
  </button>
</div>

              <div className="students-table-wrapper">

                <table className="students-table">

                  <thead>

                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Email</th>
                      <th>Action</th>
                    </tr>

                  </thead>

                  <tbody>

                    {filteredStudents.map((student) => (

                      <tr key={student.id}>

                        <td>
                          {student.id}
                        </td>

                        <td>
                          <strong>
                            {student.name}
                          </strong>
                        </td>

                        <td>
                          {student.roll_number}
                        </td>

                        <td>
                          {student.department}
                        </td>

                        <td>
                          {student.year}
                        </td>

                        <td>
                          {student.email}
                        </td>

                        <td>
                          <button
                            className="secondary-button"
                            onClick={() => viewStudent(student.id)}
                            disabled={loadingStudent}
                          >
                            {loadingStudent ? 'Loading...' : 'View'}
                          </button>
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              {selectedStudent && (

                <div className="student-details-panel">

                  <div className="student-details-header">
  <div>
    <h2>
      Student Details
    </h2>
    <p>
      Registered student information
    </p>
  </div>

  <div className="student-details-actions">
    <button
      className="primary-button"
      onClick={startEditingStudent}
      disabled={loadingStudent}
    >
      Edit Student
    </button>

    <button
      className="secondary-button"
      onClick={() => {
        stopFaceSampleCamera()
        setSelectedStudent(null)
        setEditingStudent(null)
        setEmbeddingMessage('')
        setEmbeddingError('')
      }}
    >
      Close
    </button>
  </div>
</div>

                  <div className="student-details-content">

                    <div className="student-photo-section">

                      <img
                        src={`http://127.0.0.1:8000/students/${selectedStudent.id}/photo`}
                        alt={selectedStudent.name}
                        className="student-details-photo"
                      />

                    </div>

                    <div className="student-info-section">

                      <div className="student-info-item">

                        <span>
                          Name
                        </span>

                        <strong>
                          {selectedStudent.name}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Student ID
                        </span>

                        <strong>
                          {selectedStudent.id}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Roll Number
                        </span>

                        <strong>
                          {selectedStudent.roll_number}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Department
                        </span>

                        <strong>
                          {selectedStudent.department}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Year
                        </span>

                        <strong>
                          {selectedStudent.year}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Email
                        </span>

                        <strong>
                          {selectedStudent.email}
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Photo Status
                        </span>

                        <strong className="status-text-success">
                          ✓ Photo Uploaded
                        </strong>

                      </div>

                      <div className="student-info-item">

                        <span>
                          Face Recognition Status
                        </span>

                        <strong
                          className={
                            embeddingGenerated
                              ? 'status-text-success'
                              : 'status-text-warning'
                          }
                        >
                          {embeddingGenerated
                            ? `✓ Face Registered (${embeddingCount} sample${embeddingCount !== 1 ? 's' : ''})`
                            : '⚠ Embedding Not Generated'}
                        </strong>

                      </div>

                    </div>

                    {editingStudent && (
  <form
    className="student-form edit-student-form"
    onSubmit={updateStudent}
  >
    <h3>Edit Student</h3>

    <div className="form-grid">
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={studentForm.name}
          onChange={handleStudentChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Roll Number</label>
        <input
          type="text"
          name="roll_number"
          value={studentForm.roll_number}
          onChange={handleStudentChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Department</label>
        <input
          type="text"
          name="department"
          value={studentForm.department}
          onChange={handleStudentChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Year</label>
        <input
          type="number"
          name="year"
          value={studentForm.year}
          onChange={handleStudentChange}
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={studentForm.email}
          onChange={handleStudentChange}
          required
        />
      </div>
    </div>

    <div className="student-details-actions">
      <button
        type="submit"
        className="primary-button"
        disabled={updatingStudent}
      >
        {updatingStudent
          ? 'Saving...'
          : 'Save Changes'}
      </button>

      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          setEditingStudent(null)
          setStudentMessage('')
          setStudentError('')
        }}
        disabled={updatingStudent}
      >
        Cancel
      </button>
    </div>

    {studentMessage && (
      <div className="student-success">
        {studentMessage}
      </div>
    )}

    {studentError && (
      <div className="student-error">
        {studentError}
      </div>
    )}
  </form>
)}

                  </div>

                  <div className="face-registration-section">

                    <h3>
                      Face Recognition Registration
                    </h3>

                    <p>
                      Register a few different views of the student's face. The
                      first five samples are guided so the system gets useful
                      variations for recognition.
                    </p>

                    <div
                      style={{
                        marginBottom: '18px',
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px'
                      }}
                    >
                      <strong>
                        Registration Progress: {Math.min(embeddingCount, 5)} / 5 recommended
                      </strong>

                      <div
                        style={{
                          marginTop: '10px',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min((embeddingCount / 5) * 100, 100)}%`,
                            height: '100%',
                            background: '#2563eb',
                            transition: 'width 0.2s ease'
                          }}
                        />
                      </div>

                      <p style={{ marginTop: '12px', marginBottom: '6px' }}>
                        <strong>Next sample:</strong> {sampleInstruction}
                      </p>

                      <p style={{ marginTop: 0, marginBottom: '12px' }}>
                        Keep only this student in the frame and make sure the face
                        is clearly visible. The server validates the captured image.
                      </p>

                      {!faceSampleCameraRunning ? (
                        <button
                          className="primary-button"
                          onClick={startFaceSampleCamera}
                        >
                          Start Sample Camera
                        </button>
                      ) : (
                        <>
                          <div
                            style={{
                              marginBottom: '10px',
                              padding: '12px 14px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '8px'
                            }}
                          >
                            <strong>Position guide:</strong> {sampleInstruction}
                          </div>

                          <video
                            ref={faceSampleVideoRef}
                            autoPlay
                            playsInline
                            muted
                            onLoadedMetadata={() => {
                              setFaceSampleVideoReady(true)
                            }}
                            className="live-camera-video"
                            style={{
                              width: '100%',
                              maxWidth: '640px',
                              display: 'block',
                              marginBottom: '12px',
                              borderRadius: '8px'
                            }}
                          />

                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              className="primary-button"
                              onClick={captureFaceSample}
                              disabled={capturingSample || !faceSampleVideoReady}
                            >
                              {capturingSample
                                ? 'Capturing Sample...'
                                : faceSampleVideoReady
                                  ? 'Capture Face Sample'
                                  : 'Starting Camera...'}
                            </button>

                            <button
                              className="secondary-button"
                              onClick={stopFaceSampleCamera}
                              disabled={capturingSample}
                            >
                              Stop Sample Camera
                            </button>
                          </div>

                          <canvas
                            ref={faceSampleCanvasRef}
                            style={{ display: 'none' }}
                          />
                        </>
                      )}
                    </div>

                    {embeddingCount >= 5 && (
                      <div
                        style={{
                          marginBottom: '14px',
                          padding: '12px 14px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px'
                        }}
                      >
                        ✓ Five recommended samples are registered. You can still
                        capture additional samples if needed.
                      </div>
                    )}

                    <div
  style={{
    marginBottom: '16px',
    padding: '16px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px'
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '12px'
    }}
  >
    <div>
      <strong>Registered Face Samples</strong>

      <p
        style={{
          margin: '5px 0 0',
          fontSize: '13px',
          color: '#6b7280'
        }}
      >
        {faceSamples.length} sample
        {faceSamples.length !== 1 ? 's' : ''} currently stored
      </p>
    </div>

    <button
      className="secondary-button"
      onClick={() => fetchFaceSamples(selectedStudent.id)}
      disabled={loadingFaceSamples || deletingFaceSample}
    >
      {loadingFaceSamples ? 'Refreshing...' : 'Refresh Samples'}
    </button>
  </div>

  {loadingFaceSamples ? (
    <p>Loading face samples...</p>
  ) : faceSamples.length === 0 ? (
    <p
      style={{
        margin: 0,
        color: '#6b7280'
      }}
    >
      No face samples are currently registered.
    </p>
  ) : (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '12px'
        }}
      >
        {faceSamples.map((sample, index) => (
          <div
            key={sample.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#f9fafb'
            }}
          >
            <span>
              <strong>Sample {index + 1}</strong>
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}
              >
                ID: {sample.id}
              </span>
            </span>

            <button
              className="secondary-button"
              onClick={() => deleteFaceSample(sample.id)}
              disabled={deletingFaceSample}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <button
        className="secondary-button"
        onClick={deleteAllFaceSamples}
        disabled={deletingFaceSample}
      >
        {deletingFaceSample
          ? 'Deleting...'
          : 'Clear All Face Samples'}
      </button>
    </>
  )}
</div>

                    <button
                      className="secondary-button"
                      onClick={generateEmbedding}
                      disabled={generatingEmbedding}
                    >
                      {generatingEmbedding
                        ? 'Generating Embedding...'
                        : embeddingGenerated
                          ? 'Generate From Uploaded Photo Again'
                          : 'Generate Face Embedding'}
                    </button>

                    {embeddingMessage && (
                      <div className="student-success">
                        {embeddingMessage}
                      </div>
                    )}

                    {embeddingError && (
                      <div className="student-error">
                        {embeddingError}
                      </div>
                    )}

                  </div>

                  <div className="student-attendance-section">

                    <h3>
                      Attendance Summary
                    </h3>

                    <div className="attendance-summary-cards">

                      <div className="attendance-summary-card">

                        <span>
                          Total Records
                        </span>

                        <strong>
                          {studentAttendance.length}
                        </strong>

                      </div>

                      <div className="attendance-summary-card">

                        <span>
                          Present
                        </span>

                        <strong>
                          {
                            studentAttendance.filter(
                              record => record.status === 'Present'
                            ).length
                          }
                        </strong>

                      </div>

                      <div className="attendance-summary-card">

                        <span>
                          Attendance %
                        </span>

                        <strong>
                          {studentAttendance.length > 0
                            ? (
                                studentAttendance.filter(
                                  record => record.status === 'Present'
                                ).length / studentAttendance.length
                              * 100
                              ).toFixed(2)
                            : '0.00'}
                          %
                        </strong>

                      </div>

                    </div>

                    <h3 className="attendance-history-title">
                      Attendance History
                    </h3>

                    {loadingAttendance ? (

                      <p>
                        Loading attendance...
                      </p>

                    ) : studentAttendance.length === 0 ? (

                      <p>
                        No attendance records found.
                      </p>

                    ) : (

                      <div className="table-container">

                        <table>

                          <thead>

                            <tr>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Status</th>
                            </tr>

                          </thead>

                          <tbody>

                            {studentAttendance.map((record) => (

                              <tr key={record.id}>

                                <td>
                                  {record.date}
                                </td>

                                <td>
                                  {record.time
                                    ? new Date(record.time).toLocaleTimeString()
                                    : '-'}
                                </td>

                                <td>
                                  {record.status}
                                </td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      </div>

                    )}

                  </div>

                </div>

              )}

            </section>

          </>

        )}

        {/* LIVE ATTENDANCE */}

        {page === 'live' && (

          <>

            <header className="top-header">

              <div>

                <h1>
                  Live Attendance
                </h1>

                <p>
                  Real-time AI face recognition
                </p>

              </div>

              <div className="header-date">

                <span>
                  Camera Status
                </span>

                <strong>
                  {cameraRunning ? 'Online' : 'Offline'}
                </strong>

              </div>

            </header>

            <section className="live-page-card">

              <div className="card-header">

                <div>

                  <h2>
                    Camera
                  </h2>

                  <p>
                    Face recognition will automatically check students.
                  </p>

                </div>

                <span
                  className="status-badge"
                  style={{
                    background: cameraRunning
                      ? '#dcfce7'
                      : '#fee2e2',

                    color: cameraRunning
                      ? '#16a34a'
                      : '#dc2626'
                  }}
                >
                  ● {cameraRunning ? 'Online' : 'Offline'}
                </span>

              </div>

              <div className="live-camera-container">

                {cameraRunning ? (

                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="live-camera-video"
                    />

                    {recognizing && (
                      <p className="recognizing-text">
                        Recognizing...
                      </p>
                    )}

                    <button
                      className="secondary-button"
                      onClick={stopCamera}
                    >
                      Stop Camera
                    </button>

                    {recognitionResult && (

                      <div
                        className={
                          recognitionResult.success
                            ? 'recognition-success'
                            : 'recognition-error'
                        }
                      >

                        {recognitionResult.success ? (

                          <>
                            <strong>
                              ✓ {recognitionResult.name}
                            </strong>

                            <span>
                              {recognitionResult.newAttendance
                                ? 'Attendance marked successfully.'
                                : 'Attendance already marked today.'}
                            </span>

                            <small>
                              Distance: {recognitionResult.distance.toFixed(3)}
                            </small>
                          </>

                        ) : (

                          <strong>
                            ✕ {recognitionResult.message}
                          </strong>

                        )}

                      </div>

                    )}

                  </>

                ) : (

                  <>

                    <div className="camera-icon">
                      📷
                    </div>

                    <h2>
                      Camera is not running
                    </h2>

                    <p>
                      Start the camera to begin AI attendance.
                    </p>

                    <button
                      className="primary-button"
                      onClick={startCamera}
                    >
                      Start Camera
                    </button>

                  </>

                )}

              </div>

              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />

            </section>

          </>

        )}

        {/* ATTENDANCE */}

        {page === 'attendance' && (

          <>

            <header className="top-header">

              <div>

                <h1>
                  Attendance
                </h1>

                <p>
                  View and filter attendance records
                </p>

              </div>

              <div className="header-date">

                <span>
                  Total Records
                </span>

                <strong>
                  {attendance.length}
                </strong>

              </div>

            </header>

            <section className="attendance-card">

              <div className="attendance-header">

                <div>

                  <h2>
                    Attendance History
                  </h2>

                  <p>
                    View attendance records from the database
                  </p>

                </div>

              </div>

              <div className="attendance-filters">

                <div className="filter-group">

                  <label>
                    Filter by Date
                  </label>

                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={handleAttendanceDateChange}
                  />

                </div>

                <div className="filter-group">

                  <label>
                    Filter by Student
                  </label>

                  <select
                    value={attendanceStudent}
                    onChange={handleAttendanceStudentChange}
                  >

                    <option value="">
                      All Students
                    </option>

                    {students.map((student) => (

                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.name}
                      </option>

                    ))}

                  </select>

                </div>

                <button
                  className="secondary-button"
                  onClick={clearAttendanceFilters}
                >
                  Clear Filters
                </button>

              </div>

              {attendance.length === 0 ? (

                <div className="empty-state">

                  <div>
                    📋
                  </div>

                  <p>
                    No attendance records found.
                  </p>

                </div>

              ) : (

                <div className="attendance-table-wrapper">

                  <table className="attendance-table">

                    <thead>

                      <tr>
                        <th>ID</th>
                        <th>Student</th>
                        <th>Student ID</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>

                    </thead>

                    <tbody>

                      {attendance.map((record) => (

                        <tr key={record.id}>

                          <td>
                            {record.id}
                          </td>

                          <td>
                            <strong>
                              {record.student_name}
                            </strong>
                          </td>

                          <td>
                            {record.student_id}
                          </td>

                          <td>
                            {record.date}
                          </td>

                          <td>
                            {record.time
                              ? new Date(record.time).toLocaleTimeString()
                              : '-'}
                          </td>

                          <td>

                            <span className="present-badge">
                              {record.status}
                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </>

        )}

        {/* REPORTS */}

        {page === 'reports' && (

          <>

            <header className="top-header">

              <div>

                <h1>
                  Reports
                </h1>

                <p>
                  Attendance report for selected date
                </p>

              </div>

              <div className="header-date">

                <span>
                  Report Date
                </span>

                <strong>
                  {reportDate}
                </strong>

              </div>

            </header>

            <section className="report-card">

              <div className="report-header">

                <div>

                  <h2>
                    Attendance Report
                  </h2>

                  <p>
                    Select a date to view attendance statistics.
                  </p>

                </div>

              </div>

              <div className="report-filter">

                <div className="filter-group">

                  <label>
                    Select Date
                  </label>

                  <input
                    type="date"
                    value={reportDate}
                    onChange={(event) => {

                      const date = event.target.value

                      setReportDate(date)

                      if (date) {
                        fetchReport(date)
                      }

                    }}
                  />

                </div>

              </div>

              <div className="report-stats">

                <div className="report-stat">

                  <span>
                    Total Students
                  </span>

                  <strong>
                    {students.length}
                  </strong>

                </div>

                <div className="report-stat">

                  <span>
                    Present
                  </span>

                  <strong>
                    {reportAttendance.length}
                  </strong>

                </div>

                <div className="report-stat">

                  <span>
                    Absent
                  </span>

                  <strong>
                    {students.length - reportAttendance.length}
                  </strong>

                </div>

                <div className="report-stat">

                  <span>
                    Attendance Rate
                  </span>

                  <strong>
                    {students.length > 0
                      ? (
                          (reportAttendance.length / students.length) * 100
                        ).toFixed(2)
                      : 0}%
                  </strong>

                </div>

              </div>

              <div className="report-table-wrapper">

                <table className="report-table">

                  <thead>

                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Roll Number</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>

                  </thead>

                  <tbody>

                    {students.map((student) => {

                      const record = reportAttendance.find(
                        (attendance) =>
                          attendance.student_id === student.id
                      )

                      return (

                        <tr key={student.id}>

                          <td>
                            <strong>
                              {student.name}
                            </strong>
                          </td>

                          <td>
                            {student.id}
                          </td>

                          <td>
                            {student.roll_number}
                          </td>

                          <td>
                            {student.department}
                          </td>

                          <td>

                            {record ? (

                              <span className="present-badge">
                                Present
                              </span>

                            ) : (

                              <span className="absent-badge">
                                Absent
                              </span>

                            )}

                          </td>

                          <td>
                            {record?.time
                              ? new Date(record.time).toLocaleTimeString()
                              : '-'}
                          </td>

                        </tr>

                      )

                    })}

                  </tbody>

                </table>

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  )
}

export default App