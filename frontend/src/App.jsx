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
  const [updatingPhoto, setUpdatingPhoto] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)

  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

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
  const notificationTimerRef = useRef(null)

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
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current)
      }
    }
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

  const showNotification = (type, message) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current)
    }

    setNotification({ type, message })

    notificationTimerRef.current = setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const closeConfirmation = () => {
    setConfirmDialog(null)
  }

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
      showNotification('error', error.message)
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

  setConfirmDialog({
    title: 'Delete face sample?',
    message: 'This face sample will be permanently removed from the student profile.',
    confirmText: 'Delete Sample',
    danger: true,
    onConfirm: () => performDeleteFaceSample(embeddingId)
  })
}

const performDeleteFaceSample = async (embeddingId) => {
  if (!selectedStudent) {
    return
  }

  closeConfirmation()
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
    showNotification('success', 'Face sample deleted successfully.')

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

  setConfirmDialog({
    title: 'Clear all face samples?',
    message: `All ${faceSamples.length} face samples for ${selectedStudent.name} will be permanently deleted.`,
    confirmText: 'Clear All',
    danger: true,
    onConfirm: performDeleteAllFaceSamples
  })
}

const performDeleteAllFaceSamples = async () => {
  if (!selectedStudent) {
    return
  }

  closeConfirmation()
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
    showNotification('success', `${data.deleted_samples} face sample${data.deleted_samples !== 1 ? 's' : ''} deleted.`)
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
      showNotification('success', 'Face embedding generated and stored.')

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
      showNotification('error', 'Unable to access the camera. Please allow camera permission.')
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

          showNotification(
            'success',
            student.new_attendance
              ? `Attendance marked for ${student.name}.`
              : `${student.name} is already marked present today.`
          )

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
      showNotification('success', 'Student information updated successfully.')

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

  const updateStudentPhoto = async () => {
    if (!editingStudent || !studentForm.photo) {
      setStudentError('Please select a photo first.')
      return
    }

    setStudentMessage('')
    setStudentError('')
    setUpdatingPhoto(true)

    try {
      const formData = new FormData()
      formData.append('file', studentForm.photo)

      const response = await fetch(
        `http://127.0.0.1:8000/students/${editingStudent.id}/photo`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to update student photo.'
        )
      }

      setStudentMessage('Student photo updated successfully.')
      showNotification('success', 'Student photo updated successfully.')
      setStudentForm((previous) => ({
        ...previous,
        photo: null
      }))

      const photoInput = document.getElementById('edit-student-photo')
      if (photoInput) {
        photoInput.value = ''
      }

      await viewStudent(editingStudent.id)
    } catch (error) {
      console.error('Error updating student photo:', error)
      setStudentError(error.message)
    } finally {
      setUpdatingPhoto(false)
    }
  }


  const deleteStudent = async () => {
    if (!selectedStudent) return

    setConfirmDialog({
      title: `Delete ${selectedStudent.name}?`,
      message: 'This permanently deletes the student, attendance records, face samples, and stored photo.',
      confirmText: 'Delete Student',
      danger: true,
      onConfirm: performDeleteStudent
    })
  }

  const performDeleteStudent = async () => {
    if (!selectedStudent) return

    closeConfirmation()
    setStudentMessage('')
    setStudentError('')
    setDeletingStudent(true)

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/students/${selectedStudent.id}`,
        {
          method: 'DELETE'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to delete student.'
        )
      }

      stopFaceSampleCamera()
      setSelectedStudent(null)
      setEditingStudent(null)
      setEmbeddingMessage('')
      setEmbeddingError('')
      setStudentMessage('Student deleted successfully.')
      showNotification('success', 'Student deleted successfully.')

      await fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      setStudentError(error.message)
    } finally {
      setDeletingStudent(false)
    }
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
      showNotification('success', 'Student and photo added successfully.')

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

        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">AI</div>
          <div className="sidebar-brand-copy">
            <h2>Attendance</h2>
            <span>System</span>
          </div>
        </div>

        <div className="sidebar-tagline">
          <span>SMART ATTENDANCE</span>
          <span>BRIGHTER TOMORROW</span>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section-label">MAIN MENU</div>

        <nav className="navigation">

          <button
            className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            <span className="nav-icon nav-icon-dashboard">▥</span>
            <span className="nav-label">Dashboard</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={`nav-item ${page === 'students' ? 'active' : ''}`}
            onClick={() => setPage('students')}
          >
            <span className="nav-icon nav-icon-students">♟</span>
            <span className="nav-label">Students</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={`nav-item ${page === 'live' ? 'active' : ''}`}
            onClick={() => setPage('live')}
          >
            <span className="nav-icon nav-icon-live">●</span>
            <span className="nav-label">Live Attendance</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={`nav-item ${page === 'attendance' ? 'active' : ''}`}
            onClick={() => {
              setPage('attendance')
              fetchAllAttendance()
            }}
          >
            <span className="nav-icon nav-icon-attendance">▤</span>
            <span className="nav-label">Attendance</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={`nav-item ${page === 'reports' ? 'active' : ''}`}
            onClick={() => {
              setPage('reports')
              fetchReport(reportDate)
            }}
          >
            <span className="nav-icon nav-icon-reports">▥</span>
            <span className="nav-label">Reports</span>
            <span className="nav-arrow">›</span>
          </button>

        </nav>

        <div className="sidebar-lower">
          <div className="sidebar-divider" />

          <div className="sidebar-status-heading">
            <span>SYSTEM STATUS</span>
            <span className="sidebar-online"><i /> Online</span>
          </div>

          <div className="sidebar-status-card">
            <div className="status-pulse-icon">⌁</div>
            <div>
              <strong>All Systems Operational</strong>
              <span>Camera · AI Engine · Database</span>
            </div>
          </div>

          <div className="sidebar-divider sidebar-profile-divider" />

          <div className="sidebar-profile">
            <div className="sidebar-avatar">NY</div>
            <div className="sidebar-profile-copy">
              <strong>Nishant Yadav</strong>
              <span>Administrator</span>
            </div>
            <button className="sidebar-profile-menu" type="button" aria-label="Profile options">⋮</button>
          </div>
        </div>

      </aside>

      <main className="main-content">

        {/* DASHBOARD */}

        {page === 'dashboard' && (
          <>
            <header className="top-header dashboard-header">
              <div>
                <div className="eyebrow">CONTROL CENTER</div>
                <h1>Dashboard</h1>
                <p>Real-time overview of your attendance system.</p>
              </div>

              <div className="dashboard-header-actions">
                <div className="header-date dashboard-date-card">
                  <span>Today</span>
                  <strong>{new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}</strong>
                </div>

                <button
                  className="primary-button dashboard-action-button"
                  onClick={() => setPage('live')}
                >
                  <span>◉</span>
                  Live Recognition
                </button>
              </div>
            </header>

            <section className="dashboard-hero">
              <div className="dashboard-hero-copy">
                <span className="hero-kicker">● SYSTEM READY</span>
                <h2>Smart attendance, running in real time.</h2>
                <p>
                  Your camera can identify registered students and record attendance
                  automatically through the AI recognition pipeline.
                </p>
                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() => setPage('live')}
                  >
                    Start Live Recognition
                  </button>
                  <button
                    className="secondary-button hero-secondary-button"
                    onClick={() => {
                      setPage('students')
                      setShowAddStudent(false)
                    }}
                  >
                    Manage Students
                  </button>
                </div>
              </div>

              <div className="dashboard-hero-visual">
                <div className="ai-orbit ai-orbit-one"></div>
                <div className="ai-orbit ai-orbit-two"></div>
                <div className="ai-core">
                  <span>AI</span>
                  <small>ACTIVE</small>
                </div>
                <div className="ai-scan-line"></div>
              </div>
            </section>

            <section className="stats-grid dashboard-stats-grid">
              <div className="stat-card stat-card-blue">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-main">
                  <p>Total Students</p>
                  <h2>{statistics?.["Total students"] ?? students.length}</h2>
                  <span className="stat-caption">Registered in system</span>
                </div>
                <div className="stat-mark">↗</div>
              </div>

              <div className="stat-card stat-card-green">
                <div className="stat-icon">✓</div>
                <div className="stat-main">
                  <p>Present Today</p>
                  <h2>{statistics?.["Present today"] ?? 0}</h2>
                  <span className="stat-caption">Attendance recorded</span>
                </div>
                <div className="stat-mark">✓</div>
              </div>

              <div className="stat-card stat-card-red">
                <div className="stat-icon">✕</div>
                <div className="stat-main">
                  <p>Absent Today</p>
                  <h2>{statistics?.["Absent today"] ?? 0}</h2>
                  <span className="stat-caption">Yet to be marked</span>
                </div>
                <div className="stat-mark">!</div>
              </div>

              <div className="stat-card stat-card-purple">
                <div className="stat-icon">%</div>
                <div className="stat-main">
                  <p>Attendance Rate</p>
                  <h2>{statistics?.["Attendance percentage"] ?? 0}%</h2>
                  <span className="stat-caption">Today's overall rate</span>
                </div>
                <div
                  className="attendance-ring-small"
                  style={{ '--attendance': statistics?.["Attendance percentage"] ?? 0 }}
                >
                  <span>{statistics?.["Attendance percentage"] ?? 0}%</span>
                </div>
              </div>
            </section>

            <section className="dashboard-main-grid">
              <div className="dashboard-card dashboard-recognition-card">
                <div className="card-header dashboard-section-header">
                  <div>
                    <span className="section-kicker">RECOGNITION</span>
                    <h2>Live Attendance</h2>
                    <p>Monitor the AI recognition camera from here.</p>
                  </div>
                  <span className={`dashboard-status-pill ${cameraRunning ? 'is-online' : 'is-offline'}`}>
                    <span className="status-dot"></span>
                    {cameraRunning ? 'Camera Online' : 'Camera Offline'}
                  </span>
                </div>

                <div className="dashboard-camera-preview">
                  {cameraRunning ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="camera-video"
                      />
                      <div className="dashboard-camera-overlay">
                        <span>● LIVE</span>
                        <span>{recognizing ? 'ANALYZING FRAME' : 'MONITORING'}</span>
                      </div>
                      <div className="dashboard-camera-corners" />
                    </>
                  ) : (
                    <div className="dashboard-camera-idle">
                      <div className="camera-idle-icon">◉</div>
                      <strong>AI camera is standing by</strong>
                      <span>Start live recognition to begin scanning faces.</span>
                      <button className="primary-button" onClick={startCamera}>
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>

                {cameraRunning && (
                  <div className="dashboard-camera-footer">
                    <div className="camera-engine-state">
                      <span className="pulse-dot"></span>
                      <div>
                        <strong>Recognition engine active</strong>
                        <small>Scanning every 2 seconds</small>
                      </div>
                    </div>
                    <button className="secondary-button" onClick={stopCamera}>
                      Stop Camera
                    </button>
                  </div>
                )}

                {recognitionResult && (
                  <div className={`dashboard-result ${recognitionResult.success ? 'result-success' : 'result-error'}`}>
                    <div className="result-symbol">
                      {recognitionResult.success ? '✓' : '!' }
                    </div>
                    <div className="result-copy">
                      <strong>{recognitionResult.success ? recognitionResult.name : 'Recognition issue'}</strong>
                      <span>
                        {recognitionResult.success
                          ? recognitionResult.newAttendance
                            ? 'Attendance marked successfully.'
                            : 'Attendance already marked today.'
                          : recognitionResult.message}
                      </span>
                    </div>
                    {recognitionResult.success && (
                      <small>Distance {recognitionResult.distance.toFixed(3)}</small>
                    )}
                  </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              <div className="dashboard-card recent-attendance-card">
                <div className="card-header dashboard-section-header">
                  <div>
                    <span className="section-kicker">TODAY</span>
                    <h2>Recent Attendance</h2>
                    <p>Latest attendance activity.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPage('attendance')
                      fetchAttendance()
                    }}
                  >
                    View all →
                  </button>
                </div>

                {attendance.length === 0 ? (
                  <div className="empty-state dashboard-empty-state">
                    <div>◌</div>
                    <strong>No attendance yet</strong>
                    <p>Recognized students will appear here.</p>
                  </div>
                ) : (
                  <div className="recent-attendance-list">
                    {attendance.slice(0, 6).map((record) => (
                      <div className="recent-attendance-row" key={record.id}>
                        <div className="recent-avatar">
                          {(record.student_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="recent-student-info">
                          <strong>{record.student_name}</strong>
                          <span>{record.time ? new Date(record.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : record.date}</span>
                        </div>
                        <span className="present-badge">{record.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="dashboard-bottom-grid">
              <div className="dashboard-card quick-actions-card">
                <div className="dashboard-section-header">
                  <div>
                    <span className="section-kicker">SHORTCUTS</span>
                    <h2>Quick Actions</h2>
                  </div>
                </div>
                <div className="quick-actions-grid">
                  <button onClick={() => setPage('live')}>
                    <span>◉</span>
                    <div><strong>Live Recognition</strong><small>Scan faces now</small></div>
                    <b>→</b>
                  </button>
                  <button onClick={() => { setPage('students'); setShowAddStudent(true) }}>
                    <span>＋</span>
                    <div><strong>Add Student</strong><small>Register a new student</small></div>
                    <b>→</b>
                  </button>
                  <button onClick={() => setPage('attendance')}>
                    <span>▣</span>
                    <div><strong>Attendance</strong><small>Review today's records</small></div>
                    <b>→</b>
                  </button>
                  <button onClick={() => { setPage('reports'); fetchReport(reportDate) }}>
                    <span>▤</span>
                    <div><strong>Reports</strong><small>View attendance reports</small></div>
                    <b>→</b>
                  </button>
                </div>
              </div>

              <div className="dashboard-card system-status-card">
                <div className="dashboard-section-header">
                  <div>
                    <span className="section-kicker">SYSTEM</span>
                    <h2>System Status</h2>
                  </div>
                  <span className="system-ready-badge">Healthy</span>
                </div>
                <div className="system-status-list">
                  <div><span><i className="status-dot green"></i>API Server</span><strong>Online</strong></div>
                  <div><span><i className="status-dot green"></i>Database</span><strong>Connected</strong></div>
                  <div><span><i className="status-dot green"></i>Face Recognition</span><strong>Ready</strong></div>
                  <div><span><i className="status-dot gray"></i>Camera</span><strong>{cameraRunning ? 'Active' : 'Standby'}</strong></div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* STUDENTS */}

        {page === 'students' && (
          <>
            <style>{`
              .students-page-modern {
                max-width: 1480px;
                margin: 0 auto;
              }

              .students-modern-header {
                align-items: flex-end;
                margin-bottom: 22px;
              }

              .students-modern-header .eyebrow {
                margin-bottom: 7px;
              }

              .students-modern-header h1 {
                margin-bottom: 5px;
              }

              .students-modern-header p {
                margin: 0;
              }

              .students-total-card {
                min-width: 170px;
                padding: 15px 18px;
                border: 1px solid rgba(37, 99, 235, 0.12);
                border-radius: 16px;
                background: linear-gradient(135deg, #ffffff 0%, #f5f8ff 100%);
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
                text-align: right;
              }

              .students-total-card span {
                display: block;
                color: #718096;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1.4px;
                text-transform: uppercase;
                margin-bottom: 4px;
              }

              .students-total-card strong {
                color: #172554;
                font-size: 30px;
                line-height: 1;
              }

              .students-workspace {
                padding: 0 !important;
                overflow: hidden;
                border: 1px solid #e5eaf2;
                border-radius: 22px;
                background: #ffffff;
                box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
              }

              .students-workspace-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                padding: 24px 26px 20px;
                border-bottom: 1px solid #edf1f7;
              }

              .students-workspace-title {
                display: flex;
                align-items: center;
                gap: 14px;
              }

              .students-workspace-icon {
                width: 48px;
                height: 48px;
                display: grid;
                place-items: center;
                border-radius: 14px;
                color: #1d4ed8;
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
                font-size: 21px;
                box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
              }

              .students-workspace-title h2 {
                margin: 0 0 4px;
                color: #172554;
                font-size: 21px;
              }

              .students-workspace-title p {
                margin: 0;
                color: #718096;
                font-size: 13px;
              }

              .student-filter-modern {
                display: grid !important;
                grid-template-columns: minmax(280px, 1.8fr) minmax(150px, 0.8fr) minmax(130px, 0.65fr) auto;
                align-items: end;
                gap: 12px;
                margin: 0 !important;
                padding: 18px 26px !important;
                border: 0 !important;
                border-bottom: 1px solid #edf1f7 !important;
                border-radius: 0 !important;
                background: #fbfcfe !important;
              }

              .student-filter-modern .filter-group {
                margin: 0;
              }

              .student-filter-modern label {
                display: block;
                margin: 0 0 7px;
                color: #52627a;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.8px;
                text-transform: uppercase;
              }

              .student-search-wrap {
                position: relative;
              }

              .student-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #7b8aa3;
                font-size: 16px;
                pointer-events: none;
              }

              .student-filter-modern .student-search-input {
                padding-left: 42px !important;
              }

              .student-filter-modern input,
              .student-filter-modern select {
                width: 100%;
                min-height: 48px;
                box-sizing: border-box;
                border: 1px solid #dce3ed !important;
                border-radius: 12px !important;
                background: #ffffff !important;
                color: #172033 !important;
                font-size: 13px !important;
                box-shadow: none !important;
              }

              .student-filter-modern input:focus,
              .student-filter-modern select:focus {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.11) !important;
                outline: none;
              }

              .student-filter-modern .secondary-button {
                min-height: 48px;
                white-space: nowrap;
              }

              .student-list-meta {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 18px 26px 12px;
              }

              .student-list-meta strong {
                color: #172033;
                font-size: 14px;
              }

              .student-list-meta span {
                color: #7b879a;
                font-size: 12px;
              }

              .students-table-modern-wrap {
                margin: 0 26px 26px;
                overflow: hidden;
                border: 1px solid #e8edf4;
                border-radius: 16px;
              }

              .students-table-modern {
                width: 100%;
                border-collapse: collapse;
              }

              .students-table-modern thead th {
                padding: 13px 15px;
                border-bottom: 1px solid #e5eaf1;
                background: #f7f9fc;
                color: #65748b;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.9px;
                text-align: left;
                text-transform: uppercase;
              }

              .students-table-modern tbody td {
                padding: 14px 15px;
                border-bottom: 1px solid #edf1f5;
                color: #27344a;
                font-size: 13px;
                vertical-align: middle;
              }

              .students-table-modern tbody tr:last-child td {
                border-bottom: 0;
              }

              .students-table-modern tbody tr {
                transition: background 0.18s ease, transform 0.18s ease;
              }

              .students-table-modern tbody tr:hover {
                background: #f8fbff;
              }

              .student-id-pill {
                display: inline-grid;
                min-width: 32px;
                height: 28px;
                padding: 0 7px;
                place-items: center;
                border-radius: 9px;
                background: #f1f5f9;
                color: #475569;
                font-size: 11px;
                font-weight: 800;
              }

              .student-name-cell {
                display: flex;
                align-items: center;
                gap: 11px;
                min-width: 190px;
              }

              .student-row-avatar {
                width: 38px;
                height: 38px;
                flex: 0 0 38px;
                display: grid;
                place-items: center;
                border-radius: 11px;
                color: #1d4ed8;
                background: linear-gradient(135deg, #dbeafe, #eff6ff);
                font-size: 13px;
                font-weight: 900;
              }

              .student-name-cell strong {
                display: block;
                color: #172033;
                font-size: 13px;
                margin-bottom: 3px;
              }

              .student-name-cell span {
                color: #8a96a8;
                font-size: 11px;
              }

              .student-department-badge,
              .student-year-badge {
                display: inline-flex;
                align-items: center;
                min-height: 27px;
                padding: 0 9px;
                border-radius: 8px;
                background: #f5f7fb;
                color: #475569;
                font-size: 11px;
                font-weight: 700;
              }

              .student-action-button {
                min-width: 86px;
                padding: 9px 13px !important;
                border-radius: 10px !important;
                font-size: 12px !important;
              }

              .students-empty-modern {
                margin: 0 26px 26px;
                padding: 55px 20px;
                border: 1px dashed #d7dfeb;
                border-radius: 16px;
                background: #fbfcfe;
                text-align: center;
              }

              .students-empty-modern .empty-icon {
                width: 54px;
                height: 54px;
                margin: 0 auto 12px;
                display: grid;
                place-items: center;
                border-radius: 16px;
                background: #eff6ff;
                color: #2563eb;
                font-size: 23px;
              }

              .students-empty-modern strong {
                display: block;
                margin-bottom: 5px;
                color: #172033;
                font-size: 15px;
              }

              .students-empty-modern span {
                color: #7b879a;
                font-size: 12px;
              }

              .student-details-modern {
                margin: 0 26px 26px;
                overflow: hidden;
                border: 1px solid #e3e9f2;
                border-radius: 18px;
                background: #fbfcff;
              }

              .student-details-modern .student-details-header {
                padding: 20px 22px;
                border-bottom: 1px solid #e6ebf2;
                background: #ffffff;
              }

              .student-details-modern .student-details-header h2 {
                margin-bottom: 4px;
                color: #172554;
              }

              .student-details-modern .student-details-header p {
                color: #7b879a;
              }

              .student-details-content-modern {
                display: grid !important;
                grid-template-columns: 240px minmax(0, 1fr);
                gap: 24px;
                padding: 22px;
                background: #fbfcff;
              }

              .student-photo-modern {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 245px;
                padding: 18px;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                background: #ffffff;
              }

              .student-photo-modern .student-details-photo {
                width: 150px;
                height: 150px;
                object-fit: cover;
                border-radius: 20px;
                border: 5px solid #ffffff;
                box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
              }

              .student-photo-modern-label {
                margin-top: 12px;
                color: #64748b;
                font-size: 11px;
                font-weight: 700;
              }

              .student-info-modern {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
              }

              .student-info-modern .student-info-item {
                min-height: 70px;
                padding: 12px 14px;
                border: 1px solid #e5eaf2;
                border-radius: 12px;
                background: #ffffff;
              }

              .student-info-modern .student-info-item span {
                display: block;
                margin-bottom: 6px;
                color: #8a96a8;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.7px;
                text-transform: uppercase;
              }

              .student-info-modern .student-info-item strong {
                color: #172033;
                font-size: 13px;
                overflow-wrap: anywhere;
              }

              .student-face-section-modern,
              .student-attendance-modern {
                margin: 0 22px 22px;
                padding: 20px;
                border: 1px solid #e3e9f2;
                border-radius: 16px;
                background: #ffffff;
              }

              .student-face-section-modern > h3,
              .student-attendance-modern > h3 {
                margin: 0 0 6px;
                color: #172554;
                font-size: 17px;
              }

              .student-face-section-modern > p {
                margin: 0 0 16px;
                color: #748197;
                font-size: 12px;
                line-height: 1.6;
              }

              .face-progress-modern {
                margin-bottom: 16px;
                padding: 14px;
                border: 1px solid #e3eaf5;
                border-radius: 12px;
                background: #f8fbff;
              }

              .face-progress-head {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 9px;
                color: #52627a;
                font-size: 11px;
                font-weight: 800;
              }

              .face-progress-track {
                height: 8px;
                overflow: hidden;
                border-radius: 999px;
                background: #e7edf5;
              }

              .face-progress-fill {
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg, #2563eb, #60a5fa);
                transition: width 0.25s ease;
              }

              .face-camera-modern {
                padding: 15px;
                border: 1px solid #e1e8f2;
                border-radius: 14px;
                background: #f8fafc;
              }

              .face-position-guide {
                margin-bottom: 11px;
                padding: 10px 12px;
                border: 1px solid #bfdbfe;
                border-radius: 10px;
                background: #eff6ff;
                color: #1e40af;
                font-size: 12px;
              }

              .face-sample-video-modern {
                width: 100%;
                max-width: 720px;
                max-height: 360px;
                object-fit: cover;
                display: block;
                margin: 0 auto 12px;
                border-radius: 12px;
                background: #0f172a;
              }

              .face-sample-actions-modern {
                display: flex;
                gap: 9px;
                flex-wrap: wrap;
              }

              .sample-list-modern {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 9px;
                margin: 12px 0 14px;
              }

              .sample-item-modern {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 11px 12px;
                border: 1px solid #e5eaf2;
                border-radius: 10px;
                background: #f8fafc;
              }

              .sample-item-modern strong {
                display: block;
                color: #27344a;
                font-size: 12px;
              }

              .sample-item-modern span {
                color: #8a96a8;
                font-size: 10px;
              }

              .sample-item-modern button {
                padding: 7px 9px !important;
                border-radius: 8px !important;
                font-size: 10px !important;
              }

              .student-attendance-stats-modern {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
                margin: 14px 0 18px;
              }

              .attendance-mini-card-modern {
                padding: 14px;
                border: 1px solid #e5eaf2;
                border-radius: 12px;
                background: #f8fafc;
              }

              .attendance-mini-card-modern span {
                display: block;
                margin-bottom: 6px;
                color: #8290a4;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.7px;
                text-transform: uppercase;
              }

              .attendance-mini-card-modern strong {
                color: #172033;
                font-size: 22px;
              }

              .student-history-modern {
                overflow: hidden;
                border: 1px solid #e7ebf2;
                border-radius: 12px;
              }

              .student-history-modern table {
                width: 100%;
                border-collapse: collapse;
              }

              .student-history-modern th {
                padding: 11px 13px;
                background: #f7f9fc;
                color: #6b778c;
                font-size: 10px;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 0.7px;
              }

              .student-history-modern td {
                padding: 11px 13px;
                border-top: 1px solid #edf1f5;
                color: #334155;
                font-size: 12px;
              }

              @media (max-width: 1050px) {
                .student-filter-modern {
                  grid-template-columns: 1fr 1fr;
                }

                .student-details-content-modern {
                  grid-template-columns: 190px minmax(0, 1fr);
                }
              }

              @media (max-width: 760px) {
                .students-modern-header,
                .students-workspace-top,
                .student-list-meta {
                  align-items: flex-start;
                  flex-direction: column;
                }

                .students-total-card {
                  width: 100%;
                  box-sizing: border-box;
                  text-align: left;
                }

                .student-filter-modern {
                  grid-template-columns: 1fr;
                }

                .students-table-modern-wrap {
                  overflow-x: auto;
                }

                .students-table-modern {
                  min-width: 760px;
                }

                .student-details-content-modern,
                .student-info-modern,
                .student-attendance-stats-modern {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            <div className="students-page-modern">
              <header className="top-header students-modern-header">
                <div>
                  <div className="eyebrow">STUDENT MANAGEMENT</div>
                  <h1>Students</h1>
                  <p>Manage registered students and face recognition profiles.</p>
                </div>

                <div className="students-total-card">
                  <span>Total Students</span>
                  <strong>{students.length}</strong>
                </div>
              </header>

              <section className="students-card students-workspace">
                <div className="students-workspace-top">
                  <div className="students-workspace-title">
                    <div className="students-workspace-icon">♟</div>
                    <div>
                      <h2>Registered Students</h2>
                      <p>Search, filter and manage students registered in the system.</p>
                    </div>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setShowAddStudent(!showAddStudent)
                      setStudentMessage('')
                      setStudentError('')
                    }}
                  >
                    {showAddStudent ? 'Close Form' : '+ Add Student'}
                  </button>
                </div>

                {showAddStudent && (
                  <form className="student-form" onSubmit={addStudent}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Name</label>
                        <input type="text" name="name" value={studentForm.name} onChange={handleStudentChange} required />
                      </div>
                      <div className="form-group">
                        <label>Roll Number</label>
                        <input type="text" name="roll_number" value={studentForm.roll_number} onChange={handleStudentChange} required />
                      </div>
                      <div className="form-group">
                        <label>Department</label>
                        <input type="text" name="department" value={studentForm.department} onChange={handleStudentChange} required />
                      </div>
                      <div className="form-group">
                        <label>Year</label>
                        <input type="number" name="year" value={studentForm.year} onChange={handleStudentChange} min="1" required />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={studentForm.email} onChange={handleStudentChange} required />
                      </div>
                      <div className="form-group">
                        <label>Student Photo</label>
                        <input id="student-photo" type="file" accept="image/*" onChange={handlePhotoChange} required />
                      </div>
                    </div>

                    <button type="submit" className="primary-button" disabled={addingStudent}>
                      {addingStudent ? 'Adding Student...' : 'Add Student'}
                    </button>

                    {studentMessage && <div className="student-success">{studentMessage}</div>}
                    {studentError && <div className="student-error">{studentError}</div>}
                  </form>
                )}

                <div className="student-filters student-filter-modern">
                  <div className="filter-group">
                    <label>Search Students</label>
                    <div className="student-search-wrap">
                      <span className="student-search-icon">⌕</span>
                      <input
                        className="student-search-input"
                        type="text"
                        placeholder="Search by name, roll number or department..."
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <label>Department</label>
                    <select value={studentDepartment} onChange={(event) => setStudentDepartment(event.target.value)}>
                      <option value="">All Departments</option>
                      {[...new Set(students.map((student) => student.department))]
                        .sort()
                        .map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Year</label>
                    <select value={studentYear} onChange={(event) => setStudentYear(event.target.value)}>
                      <option value="">All Years</option>
                      {[...new Set(students.map((student) => student.year))]
                        .sort((a, b) => a - b)
                        .map((year) => (
                          <option key={year} value={year}>Year {year}</option>
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

                <div className="student-list-meta">
                  <strong>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} shown</strong>
                  <span>Click View Profile to manage recognition and attendance.</span>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="students-empty-modern">
                    <div className="empty-icon">♟</div>
                    <strong>No students found</strong>
                    <span>Try changing your search or clearing the filters.</span>
                  </div>
                ) : (
                  <div className="students-table-modern-wrap">
                    <table className="students-table-modern">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Student</th>
                          <th>Roll Number</th>
                          <th>Department</th>
                          <th>Year</th>
                          <th>Email</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => {
                          const initials = (student.name || '?')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()

                          return (
                            <tr key={student.id}>
                              <td><span className="student-id-pill">#{student.id}</span></td>
                              <td>
                                <div className="student-name-cell">
                                  <div className="student-row-avatar">{initials}</div>
                                  <div>
                                    <strong>{student.name}</strong>
                                    <span>Registered profile</span>
                                  </div>
                                </div>
                              </td>
                              <td>{student.roll_number}</td>
                              <td><span className="student-department-badge">{student.department}</span></td>
                              <td><span className="student-year-badge">Year {student.year}</span></td>
                              <td>{student.email}</td>
                              <td>
                                <button
                                  className="secondary-button student-action-button"
                                  onClick={() => viewStudent(student.id)}
                                  disabled={loadingStudent}
                                >
                                  {loadingStudent ? 'Loading...' : 'View Profile'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStudent && (
                  <div className="student-details-panel student-details-modern">
                    <div className="student-details-header">
                      <div>
                        <div className="eyebrow">STUDENT PROFILE</div>
                        <h2>{selectedStudent.name}</h2>
                        <p>Registered student information and recognition configuration.</p>
                      </div>

                      <div className="student-details-actions">
                        <button className="primary-button" onClick={startEditingStudent} disabled={loadingStudent}>
                          Edit Student
                        </button>
                        <button className="secondary-button" onClick={deleteStudent} disabled={deletingStudent || loadingStudent}>
                          {deletingStudent ? 'Deleting...' : 'Delete Student'}
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
                          disabled={deletingStudent}
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="student-details-content student-details-content-modern">
                      <div className="student-photo-section student-photo-modern">
                        <img
                          src={`http://127.0.0.1:8000/students/${selectedStudent.id}/photo`}
                          alt={selectedStudent.name}
                          className="student-details-photo"
                        />
                        <span className="student-photo-modern-label">Profile Photo</span>
                      </div>

                      <div className="student-info-section student-info-modern">
                        <div className="student-info-item"><span>Name</span><strong>{selectedStudent.name}</strong></div>
                        <div className="student-info-item"><span>Student ID</span><strong>#{selectedStudent.id}</strong></div>
                        <div className="student-info-item"><span>Roll Number</span><strong>{selectedStudent.roll_number}</strong></div>
                        <div className="student-info-item"><span>Department</span><strong>{selectedStudent.department}</strong></div>
                        <div className="student-info-item"><span>Year</span><strong>Year {selectedStudent.year}</strong></div>
                        <div className="student-info-item"><span>Email</span><strong>{selectedStudent.email}</strong></div>
                        <div className="student-info-item">
                          <span>Photo Status</span>
                          <strong className="status-text-success">✓ Photo Uploaded</strong>
                        </div>
                        <div className="student-info-item">
                          <span>Face Recognition</span>
                          <strong className={embeddingGenerated ? 'status-text-success' : 'status-text-warning'}>
                            {embeddingGenerated
                              ? `✓ Registered (${embeddingCount} sample${embeddingCount !== 1 ? 's' : ''})`
                              : '⚠ Not Registered'}
                          </strong>
                        </div>
                      </div>

                      {editingStudent && (
                        <form className="student-form edit-student-form" onSubmit={updateStudent}>
                          <h3>Edit Student</h3>
                          <div className="form-grid">
                            <div className="form-group">
                              <label>Name</label>
                              <input type="text" name="name" value={studentForm.name} onChange={handleStudentChange} required />
                            </div>
                            <div className="form-group">
                              <label>Roll Number</label>
                              <input type="text" name="roll_number" value={studentForm.roll_number} onChange={handleStudentChange} required />
                            </div>
                            <div className="form-group">
                              <label>Department</label>
                              <input type="text" name="department" value={studentForm.department} onChange={handleStudentChange} required />
                            </div>
                            <div className="form-group">
                              <label>Year</label>
                              <input type="number" name="year" value={studentForm.year} onChange={handleStudentChange} min="1" required />
                            </div>
                            <div className="form-group">
                              <label>Email</label>
                              <input type="email" name="email" value={studentForm.email} onChange={handleStudentChange} required />
                            </div>
                          </div>

                          <div className="edit-photo-section">
                            <div className="form-group">
                              <label htmlFor="edit-student-photo">Change Student Photo</label>
                              <input
                                id="edit-student-photo"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                disabled={updatingStudent || updatingPhoto}
                              />
                            </div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={updateStudentPhoto}
                              disabled={updatingStudent || updatingPhoto || !studentForm.photo}
                            >
                              {updatingPhoto ? 'Uploading Photo...' : 'Update Photo'}
                            </button>
                          </div>

                          <div className="student-details-actions">
                            <button type="submit" className="primary-button" disabled={updatingStudent}>
                              {updatingStudent ? 'Saving...' : 'Save Changes'}
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

                          {studentMessage && <div className="student-success">{studentMessage}</div>}
                          {studentError && <div className="student-error">{studentError}</div>}
                        </form>
                      )}
                    </div>

                    <div className="face-registration-section student-face-section-modern">
                      <h3>Face Recognition Registration</h3>
                      <p>Register multiple views of the student's face. The first five samples are guided to improve recognition reliability.</p>

                      <div className="face-progress-modern">
                        <div className="face-progress-head">
                          <span>Registration Progress</span>
                          <strong>{Math.min(embeddingCount, 5)} / 5 recommended</strong>
                        </div>
                        <div className="face-progress-track">
                          <div
                            className="face-progress-fill"
                            style={{ width: `${Math.min((embeddingCount / 5) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="face-camera-modern">
                        <div className="face-position-guide">
                          <strong>Next sample:</strong> {sampleInstruction}
                        </div>

                        {!faceSampleCameraRunning ? (
                          <button className="primary-button" onClick={startFaceSampleCamera}>
                            Start Sample Camera
                          </button>
                        ) : (
                          <>
                            <video
                              ref={faceSampleVideoRef}
                              autoPlay
                              playsInline
                              muted
                              onLoadedMetadata={() => setFaceSampleVideoReady(true)}
                              className="live-camera-video face-sample-video-modern"
                            />
                            <div className="face-sample-actions-modern">
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
                              <button className="secondary-button" onClick={stopFaceSampleCamera} disabled={capturingSample}>
                                Stop Sample Camera
                              </button>
                            </div>
                            <canvas ref={faceSampleCanvasRef} style={{ display: 'none' }} />
                          </>
                        )}
                      </div>

                      {embeddingCount >= 5 && (
                        <div className="student-success" style={{ marginTop: '14px' }}>
                          ✓ Five recommended samples are registered. Additional samples can still be captured.
                        </div>
                      )}

                      <div style={{ marginTop: '18px' }}>
                        <div className="student-list-meta" style={{ padding: '0 0 4px' }}>
                          <div>
                            <strong>Registered Face Samples</strong>
                            <span style={{ display: 'block', marginTop: '3px' }}>
                              {faceSamples.length} sample{faceSamples.length !== 1 ? 's' : ''} currently stored
                            </span>
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
                          <div className="students-empty-modern" style={{ margin: '10px 0 0', padding: '28px 15px' }}>
                            <strong>No face samples registered</strong>
                            <span>Start the sample camera above to register one.</span>
                          </div>
                        ) : (
                          <>
                            <div className="sample-list-modern">
                              {faceSamples.map((sample, index) => (
                                <div className="sample-item-modern" key={sample.id}>
                                  <div>
                                    <strong>Sample {index + 1}</strong>
                                    <span>ID: {sample.id}</span>
                                  </div>
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
                            <button className="secondary-button" onClick={deleteAllFaceSamples} disabled={deletingFaceSample}>
                              {deletingFaceSample ? 'Deleting...' : 'Clear All Face Samples'}
                            </button>
                          </>
                        )}
                      </div>

                      <div style={{ marginTop: '18px' }}>
                        <button className="secondary-button" onClick={generateEmbedding} disabled={generatingEmbedding}>
                          {generatingEmbedding
                            ? 'Generating Embedding...'
                            : embeddingGenerated
                              ? 'Generate From Uploaded Photo Again'
                              : 'Generate Face Embedding'}
                        </button>
                      </div>

                      {embeddingMessage && <div className="student-success" style={{ marginTop: '12px' }}>{embeddingMessage}</div>}
                      {embeddingError && <div className="student-error" style={{ marginTop: '12px' }}>{embeddingError}</div>}
                    </div>

                    <div className="student-attendance-section student-attendance-modern">
                      <h3>Attendance Summary</h3>

                      <div className="student-attendance-stats-modern">
                        <div className="attendance-mini-card-modern">
                          <span>Total Records</span>
                          <strong>{studentAttendance.length}</strong>
                        </div>
                        <div className="attendance-mini-card-modern">
                          <span>Present</span>
                          <strong>{studentAttendance.filter((record) => record.status === 'Present').length}</strong>
                        </div>
                        <div className="attendance-mini-card-modern">
                          <span>Attendance %</span>
                          <strong>
                            {studentAttendance.length > 0
                              ? ((studentAttendance.filter((record) => record.status === 'Present').length / studentAttendance.length) * 100).toFixed(2)
                              : '0.00'}%
                          </strong>
                        </div>
                      </div>

                      <h3 className="attendance-history-title">Attendance History</h3>

                      {loadingAttendance ? (
                        <p>Loading attendance...</p>
                      ) : studentAttendance.length === 0 ? (
                        <div className="students-empty-modern" style={{ margin: '12px 0 0', padding: '28px 15px' }}>
                          <strong>No attendance records found</strong>
                          <span>Attendance will appear here after recognition.</span>
                        </div>
                      ) : (
                        <div className="table-container student-history-modern">
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
                                  <td>{record.date}</td>
                                  <td>{record.time ? new Date(record.time).toLocaleTimeString() : '-'}</td>
                                  <td><span className="present-badge">{record.status}</span></td>
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
            </div>
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

            <section className="live-page-card live-console-card">

              <div className="live-console-header">
                <div>
                  <div className="live-title-row">
                    <span className="live-pulse-dot" />
                    <h2>AI Recognition Console</h2>
                  </div>
                  <p>Live camera feed with automatic face recognition and attendance marking.</p>
                </div>

                <div className="live-engine-status">
                  <span className={`engine-dot ${cameraRunning ? 'engine-online' : ''}`} />
                  <div>
                    <strong>{cameraRunning ? 'AI ENGINE ACTIVE' : 'AI ENGINE STANDBY'}</strong>
                    <small>{cameraRunning ? 'Scanning every 2 seconds' : 'Camera is offline'}</small>
                  </div>
                </div>
              </div>

              <div className="live-console-grid">
                <div className="live-feed-panel">
                  <div className="feed-toolbar">
                    <div className="feed-label"><span className="feed-rec-dot" /> LIVE FEED</div>
                    <span className="feed-resolution">FACE RECOGNITION</span>
                  </div>

                  <div className={`live-camera-container ${cameraRunning ? 'camera-active' : 'camera-idle'}`}>
                    {cameraRunning ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="live-camera-video" />
                        <div className="camera-overlay">
                          <span className="corner corner-tl" />
                          <span className="corner corner-tr" />
                          <span className="corner corner-bl" />
                          <span className="corner corner-br" />
                          <div className={`scan-line ${recognizing ? 'scan-active' : ''}`} />
                          <div className="scan-status">
                            <span className="scan-status-dot" />
                            {recognizing ? 'ANALYZING FRAME' : 'READY TO SCAN'}
                          </div>
                        </div>
                        <div className="camera-bottom-bar">
                          <div><span>STATUS</span><strong>{recognizing ? 'Processing' : 'Monitoring'}</strong></div>
                          <button className="stop-camera-button" onClick={stopCamera}>Stop Camera</button>
                        </div>
                      </>
                    ) : (
                      <div className="camera-idle-content">
                        <div className="camera-icon-large">📷</div>
                        <span className="idle-eyebrow">CAMERA OFFLINE</span>
                        <h2>Ready for live attendance</h2>
                        <p>Start the camera to begin automatic AI face recognition.</p>
                        <button className="primary-button start-camera-button" onClick={startCamera}>Start Camera</button>
                      </div>
                    )}
                  </div>

                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                </div>

                <aside className="recognition-panel">
                  <div className="panel-heading">
                    <div><span>RECOGNITION</span><h3>Latest Result</h3></div>
                    <div className={`mini-status ${recognitionResult?.success ? 'mini-success' : ''}`}>
                      {recognitionResult?.success ? 'MATCH' : cameraRunning ? 'SCANNING' : 'IDLE'}
                    </div>
                  </div>

                  {recognitionResult?.success ? (
                    <div className="match-result">
                      <div className="match-avatar">✓</div>
                      <span className="match-label">STUDENT RECOGNIZED</span>
                      <h3 style={{ color: "#172033", fontWeight: 800 }}>{recognitionResult.name}</h3>
                      <div className="match-divider" />
                      <div className="match-metrics">
                        <div><span>Distance</span><strong>{recognitionResult.distance.toFixed(3)}</strong></div>
                        <div><span>Attendance</span><strong>{recognitionResult.newAttendance ? 'MARKED' : 'ALREADY IN'}</strong></div>
                      </div>
                      <div className="match-message">
                        {recognitionResult.newAttendance ? 'Attendance marked successfully.' : 'Attendance was already marked today.'}
                      </div>
                    </div>
                  ) : recognitionResult ? (
                    <div className="no-match-result">
                      <div className="no-match-icon">×</div>
                      <span>NO MATCH</span>
                      <h3>{recognitionResult.message}</h3>
                      <p>Keep the face clearly visible to the camera.</p>
                    </div>
                  ) : (
                    <div className="waiting-result">
                      <div className="waiting-icon">◌</div>
                      <span>WAITING FOR INPUT</span>
                      <h3>No recognition yet</h3>
                      <p>{cameraRunning ? 'The AI engine is monitoring the camera feed.' : 'Start the camera to begin recognition.'}</p>
                    </div>
                  )}

                  <div className="live-stats-strip">
                    <div><span>Today</span><strong>{statistics?.['Present today'] ?? 0}</strong><small>Present</small></div>
                    <div><span>Registered</span><strong>{statistics?.['Total students'] ?? students.length}</strong><small>Students</small></div>
                  </div>
                </aside>
              </div>

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

        {notification && (
          <div className={`notification notification-${notification.type}`} role="status">
            <div className="notification-icon">
              {notification.type === 'success' ? '✓' : notification.type === 'error' ? '!' : 'i'}
            </div>
            <div className="notification-content">
              <strong>
                {notification.type === 'success'
                  ? 'Success'
                  : notification.type === 'error'
                    ? 'Error'
                    : 'Notice'}
              </strong>
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              className="notification-close"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}

        {confirmDialog && (
          <div className="modal-backdrop" onMouseDown={closeConfirmation}>
            <div
              className="confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className={`confirm-icon ${confirmDialog.danger ? 'danger' : ''}`}>
                {confirmDialog.danger ? '!' : '?'}
              </div>
              <div className="confirm-content">
                <h2 id="confirm-title">{confirmDialog.title}</h2>
                <p>{confirmDialog.message}</p>
              </div>
              <div className="confirm-actions">
                <button type="button" className="secondary-button" onClick={closeConfirmation}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={confirmDialog.danger ? 'danger-button' : 'primary-button'}
                  onClick={confirmDialog.onConfirm}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  )
}

export default App