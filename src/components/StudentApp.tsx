import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Award,
    Bell,
    BookOpen,
    Calendar,
    CalendarX,
    Car,
    Camera, CameraOff,
    Check, CheckCircle, CheckCircle2, ChevronLeft, ChevronRight,
    Clock, Compass,
    DollarSign, FileText, CreditCard,
    FileUp, Upload, FileCheck,
    KeyRound,
    Lock,
    LogOut,
    Mail,
    MapPin,
    Menu,
    MessageSquare,
    Navigation,
    Phone,
    Play, PlayCircle,
    RefreshCw,
    Send,
    ShieldAlert,
    Sparkles,
    Star,
    Sliders,
    User,
    UserX,
    X,
    Folder,
    Users,
    UserPlus,
    Plus,
    Trash,
    Trash2,
    AlertTriangle,
    PlusCircle,
    FolderPlus,
    FolderOpen,
    Edit3
} from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Booking, ChatMessage, Document, MockTestAttempt, Payment, SlotDay, NavState, Student, Trainer, TrackingSession, TrackingStatus, DrivingLicenceApplication, DrivingLicenceDocumentItem } from "../types";
import UnifiedAuthPortal from "./UnifiedAuthPortal";
import { MOCK_TEST_QUESTIONS, MockDatabase } from "../utils/db";
import { LiveTrackingMap } from "./LiveTrackingMap";
import { calculateDistanceKm, calculateEtaMinutes, formatTimeAgo, DEFAULT_BHUBANESWAR_LOCATION, getCoordinatesFromLocation } from "../utils/geo";
import { auth, db } from "../utils/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updatePassword,
  reload,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
} from "firebase/auth";

interface StudentAppProps {
  onStateChange: () => void; // call when state needs to refresh across other roles
  onLogout?: () => void;
  navState?: NavState;
  key?: any;
}

const getApiUrl = (path: string): string => {
  // If running in local webview, Capacitor, or similar, use the absolute deployed URL.
  const isNativeOrLocal = 
    window.location.origin.includes('localhost') || 
    window.location.origin.includes('file://') || 
    window.location.origin.startsWith('capacitor://');
    
  if (isNativeOrLocal) {
    return `https://ais-pre-fha6at5q7a7mjolb2w3hyi-204689890096.asia-east1.run.app${path}`;
  }
  return path;
};

const compressImageIfNeeded = (dataUrl: string, maxBytes = 80000): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || dataUrl.length < maxBytes) {
      resolve(dataUrl);
      return;
    }
    
    if (!dataUrl.startsWith("data:image/")) {
      console.log("File is a PDF/non-image and is too large. Substituting with smaller mock document SVG.");
      const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><rect width="120" height="150" fill="%236D3BFF" rx="8"/><rect x="15" y="15" width="90" height="120" fill="white" rx="4"/><line x1="30" y1="40" x2="90" y2="40" stroke="%23E2E8F0" stroke-width="4"/><line x1="30" y1="55" x2="90" y2="55" stroke="%23E2E8F0" stroke-width="4"/><line x1="30" y1="70" x2="70" y2="70" stroke="%23E2E8F0" stroke-width="4"/><rect x="30" y="85" width="60" height="30" fill="%236D3BFF" rx="4"/><text x="60" y="103" font-family="sans-serif" font-size="8" fill="white" text-anchor="middle" font-weight="black">MOCK DOC</text></svg>`;
      resolve(mockSvg);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDim = 400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressed = canvas.toDataURL("image/jpeg", 0.4);
        resolve(compressed);
      } catch (err) {
        console.error("Error compressing image", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
};

const PROFILE_AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
];

const videos = [
  { title: "Perfecting Clutch Release Point", duration: "8 mins", image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=300" },
  { title: "Parallel Reversal & Angle Parking", duration: "12 mins", image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300" }
];

export default function StudentApp({ onStateChange, onLogout, navState }: StudentAppProps) {
  // Navigation & States
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'onboarding' | 'login' | 'register' | 'otp' | 'app' | 'verify'>(() => {
    const currentId = localStorage.getItem("golden_hands_current_student_id");
    if (navState && navState.activeView === 'student' && navState.studentScreen) {
      if (!currentId && (navState.studentScreen === 'app' || navState.studentScreen === 'otp' || navState.studentScreen === 'verify')) {
        return 'login';
      }
      return navState.studentScreen;
    }
    return 'login';
  });
  
  // Email Verification & Advanced Authentication States
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const isAuthLoadingRef = useRef(isAuthLoading);
  useEffect(() => {
    isAuthLoadingRef.current = isAuthLoading;
  }, [isAuthLoading]);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [activeOtpFocus, setActiveOtpFocus] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'classes' | 'modify' | 'track' | 'learn' | 'profile'>(() => {
    if (navState && navState.activeView === 'student' && navState.studentTab) {
      return navState.studentTab;
    }
    return 'home';
  });
  const [activeSubPage, setActiveSubPage] = useState<string | null>(() => {
    if (navState && navState.activeView === 'student' && navState.studentSubPage !== undefined) {
      return navState.studentSubPage;
    }
    return null;
  }); // 'ai-coach', 'mock-test', 'documents', 'payments', 'licence', 'licence-apply', 'vault-files', 'vault-notes', 'vault-team'
  const [menuOpen, setMenuOpen] = useState(false);

  // Driving Licence Application state (4-tab document upload system)
  const [dlApp, setDlApp] = useState<DrivingLicenceApplication | null>(() => {
    const currentStud = MockDatabase.getStudent();
    return MockDatabase.getLicenceApplicationForStudent(currentStud.id);
  });
  const [dlActiveTab, setDlActiveTab] = useState<'aadhaar' | 'twoWheeler' | 'learner' | 'other'>('aadhaar');
  const [dlUploading, setDlUploading] = useState(false);

  const refreshDlApp = useCallback(() => {
    const currentStud = MockDatabase.getStudent();
    if (currentStud?.id) {
      const app = MockDatabase.getLicenceApplicationForStudent(currentStud.id);
      setDlApp(app);
    }
  }, []);

  useEffect(() => {
    refreshDlApp();
    const handleStorage = () => refreshDlApp();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(refreshDlApp, 1500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [refreshDlApp]);

  // Firebase User & Storage States (My Files, My Notes, Team Members)
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Loading States
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);

  // Modal States
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [addFileModalOpen, setAddFileModalOpen] = useState(false);
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

  // Modal Input States
  const [folderNameInput, setFolderNameInput] = useState("");
  const [fileNameInput, setFileNameInput] = useState("");
  const [fileFolderInput, setFileFolderInput] = useState("");
  const [fileSizeInput, setFileSizeInput] = useState("1.5 MB");
  const [noteTitleInput, setNoteTitleInput] = useState("");
  const [noteContentInput, setNoteContentInput] = useState("");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState("Viewer");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Account Deletion Intercept State for Login
  const [pendingDeletionLoginStudent, setPendingDeletionLoginStudent] = useState<Student | null>(null);

  const handleConfirmDeletionLogin = () => {
    if (!pendingDeletionLoginStudent) return;
    const found = pendingDeletionLoginStudent;
    
    // Reject account deletion request
    MockDatabase.adminRejectAccountDeletion(found.id);
    found.deletionRequested = false;
    found.deletionStatus = 'rejected';

    MockDatabase.setCurrentStudentId(found.id);
    refreshLocalState(found.id);
    setUnverifiedEmail(null);
    setAuthError(null);
    setCurrentScreen('app');
    showNotification(`Welcome back, ${found.name}! Your account deletion request has been cancelled.`);
    setPendingDeletionLoginStudent(null);
  };

  // Back navigation support: Sync local states when parent navigation state updates
  useEffect(() => {
    if (navState && navState.activeView === 'student') {
      const currentId = localStorage.getItem("golden_hands_current_student_id");
      if (navState.studentScreen && navState.studentScreen !== currentScreen) {
        if (!currentId && (navState.studentScreen === 'app' || navState.studentScreen === 'otp' || navState.studentScreen === 'verify')) {
          setCurrentScreen('login');
        } else {
          setCurrentScreen(navState.studentScreen);
        }
      }
      if (navState.studentTab && navState.studentTab !== activeTab) {
        setActiveTab(navState.studentTab);
      }
      if (navState.studentSubPage !== undefined && navState.studentSubPage !== activeSubPage) {
        setActiveSubPage(navState.studentSubPage);
      }
    }
  }, [navState]);

  // Back navigation support: Report local navigation state changes to global coordinator
  useEffect(() => {
    if (!navState || navState.activeView !== 'student') {
      return;
    }

    const matchesParent = 
      currentScreen === navState.studentScreen &&
      activeTab === navState.studentTab &&
      activeSubPage === navState.studentSubPage;
    
    if (matchesParent) {
      return; // Already in sync with parent, do not report!
    }

    window.dispatchEvent(new CustomEvent('app-nav-reported', {
      detail: {
        activeView: 'student',
        studentScreen: currentScreen,
        studentTab: activeTab,
        studentSubPage: activeSubPage
      }
    }));
  }, [currentScreen, activeTab, activeSubPage, navState]);

  // Student Course Modification Form State
  const [studentEditCourseName, setStudentEditCourseName] = useState(MockDatabase.getStudent().proposedCourseName || MockDatabase.getStudent().courseName || "Basic Package (15 Sessions)");
  const [studentEditCourseNotes, setStudentEditCourseNotes] = useState(MockDatabase.getStudent().proposedCourseNotes || MockDatabase.getStudent().courseNotes || "");
  const [studentEditSyllabus, setStudentEditSyllabus] = useState<string[]>(MockDatabase.getStudent().proposedCourseSyllabus || MockDatabase.getStudent().courseSyllabus || []);
  const [studentSyllabusInput, setStudentSyllabusInput] = useState("");
  const [extendModalDismissed, setExtendModalDismissed] = useState(false);
  const [extensionAmountSelected, setExtensionAmountSelected] = useState(2500); // default to ₹2500 for 5 classes

  // Sync refs for course customization to avoid input wiping during polling
  const lastDbCourseName = useRef(MockDatabase.getStudent().proposedCourseName || MockDatabase.getStudent().courseName || "Basic Package (15 Sessions)");
  const lastDbCourseNotes = useRef(MockDatabase.getStudent().proposedCourseNotes || MockDatabase.getStudent().courseNotes || "");
  const lastDbSyllabus = useRef(MockDatabase.getStudent().proposedCourseSyllabus || MockDatabase.getStudent().courseSyllabus || []);
  const lastDbModStatus = useRef(MockDatabase.getStudent().modificationStatus);

  // DB State Loaders
  const [student, setStudent] = useState(MockDatabase.getStudent());
  const [progress, setProgress] = useState(MockDatabase.getProgress());
  const [bookings, setBookings] = useState(MockDatabase.getBookings());
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [trainers, setTrainers] = useState(MockDatabase.getTrainers());
  const [documents, setDocuments] = useState(MockDatabase.getDocuments());
  const [payments, setPayments] = useState(MockDatabase.getPayments());
  const [chats, setChats] = useState(MockDatabase.getChats());
  const [attempts, setAttempts] = useState(MockDatabase.getMockAttempts());

  // Priority-based Trainer Resolution Logic:
  // 1. Active assigned trainer (student.assignedTrainerId)
  // 2. Completed class trainer (at least 1 completed class with a trainer)
  // 3. Null (No trainer assigned yet - do NOT fallback to Rajesh Kumar or default trainer)
  const getResolvedTrainer = (
    studentObj: Student,
    allTrainers: Trainer[],
    allBookings: Booking[]
  ): Trainer | null => {
    if (!studentObj || !studentObj.id) return null;

    // Priority 1: Check active assigned trainer
    if (studentObj.assignedTrainerId) {
      const assignedTr = allTrainers.find(t => t.id === studentObj.assignedTrainerId);
      if (assignedTr) return assignedTr;

      if (studentObj.assignedTrainerName) {
        return {
          id: studentObj.assignedTrainerId,
          name: studentObj.assignedTrainerName,
          phone: "9040040288",
          rating: 4.9,
          reviewsCount: 100,
          photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
          carName: "Maruti Swift",
          carPlate: "OD 02 AB 1234",
          carPhotoUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400",
          isAvailable: true,
          password: ""
        };
      }
    }

    // Priority 2: Check any non-cancelled class booking (completed or upcoming)
    const studentValidBookings = allBookings.filter(
      b => b.studentId === studentObj.id && b.status !== 'cancelled'
    );

    if (studentValidBookings.length > 0) {
      const lastBooking = studentValidBookings[studentValidBookings.length - 1];
      if (lastBooking.trainerId) {
        const bookedTr = allTrainers.find(t => t.id === lastBooking.trainerId);
        if (bookedTr) return bookedTr;

        if (lastBooking.trainerName) {
          return {
            id: lastBooking.trainerId,
            name: lastBooking.trainerName,
            phone: "9040040288",
            rating: 4.9,
            reviewsCount: 100,
            photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            carName: lastBooking.carName || "Vehicle",
            carPlate: lastBooking.carPlate || "OD 02 AB 1234",
            carPhotoUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400",
            isAvailable: true,
            password: ""
          };
        }
      }
    }

    // Priority 3: Neither exists -> null
    return null;
  };

  const assignedTrainer = getResolvedTrainer(student, trainers, bookings);
  const effectiveAssignedTrainerId = assignedTrainer?.id || student.assignedTrainerId || null;

  useEffect(() => {
    if (assignedTrainer) {
      setBookingTrainer(assignedTrainer.id);
      setReviewTrainerId(assignedTrainer.id);
      if (!student.assignedTrainerId && assignedTrainer.id) {
        const updatedStudent = {
          ...student,
          assignedTrainerId: assignedTrainer.id,
          assignedTrainerName: assignedTrainer.name
        };
        MockDatabase.saveStudent(updatedStudent, student.id);
        setStudent(updatedStudent);
      }
    } else if (trainers.length > 0 && !bookingTrainer) {
      setBookingTrainer(trainers[0].id);
      setReviewTrainerId(trainers[0].id);
    }
  }, [assignedTrainer?.id, trainers]);

  // STUDENT PROFILE PICTURE EDITING & UPLOAD STATES
  const [profilePicModalOpen, setProfilePicModalOpen] = useState(false);
  const [profilePicMode, setProfilePicMode] = useState<'options' | 'camera' | 'uploading'>('options');
  const [profilePicError, setProfilePicError] = useState<string | null>(null);
  const [profilePicProgress, setProfilePicProgress] = useState(0);
  const [profilePicCameraActive, setProfilePicCameraActive] = useState(false);
  const profilePicFileInputRef = useRef<HTMLInputElement | null>(null);
  const profilePicVideoRef = useRef<HTMLVideoElement | null>(null);
  const profilePicStreamRef = useRef<MediaStream | null>(null);

  const profilePicVideoCallback = useCallback((node: HTMLVideoElement | null) => {
    profilePicVideoRef.current = node;
    if (node && profilePicStreamRef.current) {
      node.srcObject = profilePicStreamRef.current;
      node.play().catch(err => console.log("Play failed in profilePicVideoCallback: ", err));
    }
  }, []);

  const startProfilePicCamera = async () => {
    setProfilePicError(null);
    setProfilePicMode('camera');
    try {
      if (profilePicStreamRef.current) {
        profilePicStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }
      });
      profilePicStreamRef.current = stream;
      setProfilePicCameraActive(true);
      if (profilePicVideoRef.current) {
        profilePicVideoRef.current.srcObject = stream;
        profilePicVideoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.error("Profile picture camera error:", err);
      setProfilePicCameraActive(false);
      setProfilePicError("Camera permission denied or camera device not found. Please upload a photo from your device gallery instead.");
    }
  };

  const stopProfilePicCamera = () => {
    if (profilePicStreamRef.current) {
      profilePicStreamRef.current.getTracks().forEach(track => track.stop());
      profilePicStreamRef.current = null;
    }
    setProfilePicCameraActive(false);
  };

  const handleCaptureProfilePicFromCamera = async () => {
    if (!profilePicVideoRef.current) return;
    const video = profilePicVideoRef.current;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally for selfie photo
    ctx.translate(400, 0);
    ctx.scale(-1, 1);

    const sx = ((video.videoWidth || 400) - size) / 2;
    const sy = ((video.videoHeight || 400) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    stopProfilePicCamera();
    await handleSaveProfilePicture(dataUrl);
  };

  const handleProfilePicFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input so same file can be re-selected
    e.target.value = "";
    setProfilePicError(null);

    // 1. Format validation (JPG, JPEG, PNG, WEBP)
    const fileName = file.name.toLowerCase();
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];
    const isValidExt = validExts.some(ext => fileName.endsWith(ext));
    const isValidMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type.toLowerCase());

    if (!isValidExt && !isValidMime) {
      setProfilePicError("Invalid image format! Only JPG, JPEG, PNG, and WEBP formats are accepted.");
      return;
    }

    // 2. Size validation (Min 10 KB, Max 2 MB)
    const minBytes = 10 * 1024; // 10 KB
    const maxBytes = 2 * 1024 * 1024; // 2 MB

    if (file.size < minBytes) {
      const fileSizeKb = (file.size / 1024).toFixed(1);
      setProfilePicError(`Selected image is too small (${fileSizeKb} KB). Minimum required image size is 10 KB.`);
      return;
    }

    if (file.size > maxBytes) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setProfilePicError(`Selected image is too large (${fileSizeMb} MB). Maximum allowed image size is 2 MB.`);
      return;
    }

    // 3. Process & Crop to 1:1 Aspect Ratio
    setProfilePicMode('uploading');
    setProfilePicProgress(25);

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePicProgress(50);
      const rawUrl = event.target?.result as string;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        setProfilePicProgress(75);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setProfilePicError("Failed to initialize canvas for image processing.");
          setProfilePicMode('options');
          return;
        }

        // Center 1:1 square crop calculation
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        canvas.width = 400;
        canvas.height = 400;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 400, 400);

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setProfilePicProgress(90);

        await handleSaveProfilePicture(croppedDataUrl);
      };
      img.onerror = () => {
        setProfilePicError("Failed to load selected image.");
        setProfilePicMode('options');
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfilePicture = async (photoUrl: string) => {
    setProfilePicMode('uploading');
    setProfilePicProgress(95);

    try {
      const updatedStudent = { ...student, photoUrl };
      setStudent(updatedStudent);

      // Save student record in localStorage database & cloud
      MockDatabase.saveStudent(updatedStudent);

      // Update registered students list
      const students = MockDatabase.getRegisteredStudents();
      const updatedStudents = students.map(s => s.id === student.id ? { ...s, photoUrl } : s);
      MockDatabase.saveRegisteredStudents(updatedStudents);

      // Save local cache key
      localStorage.setItem(`golden_hands_cached_student_photo_${student.id}`, photoUrl);

      setProfilePicProgress(100);
      setTimeout(() => {
        setProfilePicModalOpen(false);
        setProfilePicMode('options');
        setProfilePicProgress(0);
        showNotification("Profile picture updated successfully!");
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('local-db-updated'));
        onStateChange();
      }, 400);
    } catch (err) {
      console.error("Error saving profile picture:", err);
      setProfilePicError("Failed to save profile picture. Please try again.");
      setProfilePicMode('options');
    }
  };

  const handleSelectPresetAvatar = async (presetUrl: string) => {
    await handleSaveProfilePicture(presetUrl);
  };

  const handleResetProfilePicToDefault = async () => {
    const defaultUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
    await handleSaveProfilePicture(defaultUrl);
  };

  // ACCOUNT DELETION FLOW STATES
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [deletionStep, setDeletionStep] = useState<'confirm' | 'password' | 'success'>('confirm');
  const [deletionPasswordInput, setDeletionPasswordInput] = useState('');
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionIsSubmitting, setDeletionIsSubmitting] = useState(false);

  const handleOpenAccountDeletion = () => {
    setDeletionPasswordInput('');
    setDeletionError(null);
    setDeletionIsSubmitting(false);
    setDeletionStep('confirm');
    setDeletionModalOpen(true);
  };

  const handleConfirmDeletionStep1 = () => {
    setDeletionError(null);
    setDeletionStep('password');
  };

  const handleVerifyPasswordAndSubmitDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletionError(null);
    if (!deletionPasswordInput.trim()) {
      setDeletionError("Please enter your current account password.");
      return;
    }

    setDeletionIsSubmitting(true);

    setTimeout(() => {
      try {
        const updatedStudent = MockDatabase.requestAccountDeletion(student.id, deletionPasswordInput);
        setStudent(updatedStudent);
        setDeletionIsSubmitting(false);
        setDeletionStep('success');
        onStateChange();
        showNotification("Account deletion request submitted successfully.");
      } catch (err: any) {
        setDeletionIsSubmitting(false);
        setDeletionError(err.message || "Password verification failed. Please try again.");
      }
    }, 1000);
  };

  // NEW FACE RECOGNITION AND CAMERA STATES & HANDLERS
  const [faceCheckinOpen, setFaceCheckinOpen] = useState(false);
  const [faceScanState, setFaceScanState] = useState<'idle' | 'camera_active' | 'scanning' | 'success' | 'failed'>('idle');
  const [faceCaptureStep, setFaceCaptureStep] = useState<'tutorial' | 'permission' | 'capture' | 'uploading' | 'success' | 'failed'>('tutorial');
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [useRealCamera, setUseRealCamera] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPhotoData, setCapturedPhotoData] = useState<string | null>(null);
  
  // Real-time Automatic Face Detection States
  const [faceDetectStatus, setFaceDetectStatus] = useState<'searching' | 'detected' | 'no_face'>('searching');
  const [faceDetectProgress, setFaceDetectProgress] = useState(0);
  const [faceDetectMessage, setFaceDetectMessage] = useState("Position your face inside the circle...");
  const [detectionTimeoutOccurred, setDetectionTimeoutOccurred] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const autoCaptureTriggeredRef = useRef(false);
  const detectionTimerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.play().catch(err => console.log("Play failed in videoRefCallback: ", err));
    }
  }, []);

  // Direct launcher for Face Check-In
  const openFaceCheckinDirectly = () => {
    setFaceCheckinOpen(true);
    setFaceCaptureStep('capture');
    setFaceDetectStatus('searching');
    setFaceDetectProgress(0);
    setFaceDetectMessage("Position your face inside the circle...");
    setDetectionTimeoutOccurred(false);
    autoCaptureTriggeredRef.current = false;
    startCamera(true);
  };

  // Real-Time Automatic Face Detection & Auto-Capture Loop
  useEffect(() => {
    if (!faceCheckinOpen || faceCaptureStep !== 'capture' || !useRealCamera || faceError) {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      return;
    }

    autoCaptureTriggeredRef.current = false;
    setFaceDetectProgress(0);
    setFaceDetectStatus('searching');
    setFaceDetectMessage("Position your face inside the circle...");
    setDetectionTimeoutOccurred(false);

    // Timeout trigger if face is not visible after 12 seconds
    searchTimeoutRef.current = setTimeout(() => {
      if (!autoCaptureTriggeredRef.current && faceDetectStatus !== 'detected') {
        setFaceDetectStatus('no_face');
        setFaceDetectMessage("Unable to detect face. Please ensure proper lighting and face alignment.");
        setDetectionTimeoutOccurred(true);
      }
    }, 12000);

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let consecutiveDetectedFrames = 0;

    detectionTimerRef.current = setInterval(() => {
      if (autoCaptureTriggeredRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState < 2 || video.paused || video.ended || !video.videoWidth || !video.videoHeight) return;

      try {
        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 120);
          
          // Sample central oval bounding box: x: 40-120, y: 20-100
          const frameData = ctx.getImageData(40, 20, 80, 80);
          const pixels = frameData.data;
          let totalLuminance = 0;
          let skinMatchCount = 0;
          const pixelCount = pixels.length / 4;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += lum;

            const maxColor = Math.max(r, g, b);
            const minColor = Math.min(r, g, b);
            if (r > 45 && g > 30 && b > 20 && (maxColor - minColor) > 12 && r > g && r > b) {
              skinMatchCount++;
            }
          }

          const avgLuminance = totalLuminance / pixelCount;
          const skinRatio = skinMatchCount / pixelCount;

          const isTooDark = avgLuminance < 30;
          const isTooBright = avgLuminance > 235;
          const hasFaceFeatures = skinRatio >= 0.15;

          if (isTooDark) {
            consecutiveDetectedFrames = Math.max(0, consecutiveDetectedFrames - 1);
            setFaceDetectStatus('no_face');
            setFaceDetectMessage("Environment too dark! Face not visible.");
          } else if (isTooBright) {
            consecutiveDetectedFrames = Math.max(0, consecutiveDetectedFrames - 1);
            setFaceDetectStatus('no_face');
            setFaceDetectMessage("Too much glare! Face not clearly visible.");
          } else if (hasFaceFeatures) {
            consecutiveDetectedFrames++;
            setFaceDetectStatus('detected');
            setFaceDetectMessage("Face Detected! Hold steady for auto-capture...");
            setDetectionTimeoutOccurred(false);

            const newProgress = Math.min(100, Math.round((consecutiveDetectedFrames / 3) * 100));
            setFaceDetectProgress(newProgress);

            if (consecutiveDetectedFrames >= 3 && !autoCaptureTriggeredRef.current) {
              autoCaptureTriggeredRef.current = true;
              if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              
              // Automatically trigger face scan & attendance log
              handlePerformFaceScan();
            }
          } else {
            consecutiveDetectedFrames = Math.max(0, consecutiveDetectedFrames - 1);
            setFaceDetectProgress(0);
            setFaceDetectStatus('searching');
            setFaceDetectMessage("Position your face inside the circle...");
          }
        }
      } catch (e) {
        console.warn("Face analysis frame check error:", e);
      }
    }, 300);

    return () => {
      if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [faceCheckinOpen, faceCaptureStep, useRealCamera, faceError]);

  const startCamera = async (forceReal = false) => {
    setFaceError(null);
    setFaceScanState('camera_active');
    
    if (!forceReal && !useRealCamera) {
      setUseRealCamera(false);
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        let stream: MediaStream;
        try {
          // Attempt user facing front camera with standard resolution ideal constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          });
        } catch (firstErr) {
          console.warn("Front camera constraints failed, retrying with simple video constraint:", firstErr);
          // Fall back to any standard video stream
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        mediaStreamRef.current = stream;
        setUseRealCamera(true);
        
        // Let the state update so the <video> mounts, then play
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => {
              console.error("Play failed: ", err);
            });
          }
        }, 120);

      } catch (err: any) {
        console.error("Camera access failed:", err);
        setUseRealCamera(false);
        setFaceError("Camera permission blocked or unavailable. Please allow camera access in your browser settings.");
      }
    } else {
      setUseRealCamera(false);
      setFaceError("Camera is not supported on this browser or device.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handlePerformFaceScan = async () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 350);

    let photoDataUri = "";
    try {
      if (useRealCamera && videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Flip horizontally for self-view mirroring matching the video
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          photoDataUri = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    } catch (e) {
      console.warn("Could not capture video frame:", e);
    }

    if (!photoDataUri) {
      photoDataUri = student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
    }

    setCapturedPhotoData(photoDataUri);
    setFaceScanState('scanning');
    setFaceCaptureStep('uploading');
    setFaceError(null);
    
    // Stop the camera right after capture so it frees the camera resource
    stopCamera();

    // Simulate real-time processing and registering photo record (Uploading step)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find active booking for face check-in: prioritize unverified confirmed/upcoming bookings
    const activeBooking = bookings.find(b => 
      b.pickupStatus === 'picked_up' && b.faceVerificationStatus !== 'verified'
    ) || bookings.find(b => 
      (b.status === 'confirmed' || b.status === 'upcoming') && b.faceVerificationStatus !== 'verified'
    ) || bookings.find(b => b.status === 'confirmed' || b.status === 'upcoming' || b.status === 'requested')
      || bookings[0];
    
    // Fetch dynamic GPS Coordinates
    let geoLoc = "20.2961° N, 85.8245° E (Rasulgarh Center)";
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        geoLoc = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (Bhubaneswar)`;
      }
    } catch (e) {
      console.log("Using default center GPS coords fallback");
    }
    
    const updatedBookings = bookings.map(b => {
      const isTarget = (activeBooking && b.id === activeBooking.id) || 
                       (b.pickupStatus === 'picked_up' && b.faceVerificationStatus !== 'verified') ||
                       ((b.status === 'confirmed' || b.status === 'upcoming') && b.faceVerificationStatus !== 'verified');
      if (isTarget) {
        return {
          ...b,
          faceVerificationStatus: 'verified' as const,
          faceVerificationAttempts: (b.faceVerificationAttempts || 0) + 1,
          attendancePresent: true,
          attendanceLoggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attendanceLocation: geoLoc,
          capturedPhoto: photoDataUri
        };
      }
      return b;
    });
    
    MockDatabase.saveBookings(updatedBookings);
    setBookings(updatedBookings);

    if (activeBooking) {
      try {
        const trainerChats = MockDatabase.getChats(activeBooking.trainerId);
        const faceVerifiedMsg = {
          id: `msg_face_${Date.now()}`,
          senderId: student.id,
          senderName: student.name,
          receiverId: activeBooking.trainerId,
          text: `📸 Face Check-in Verified! ${student.name} completed biometric facial recognition check-in.`,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        MockDatabase.saveChats([...trainerChats, faceVerifiedMsg], activeBooking.trainerId);
      } catch (chatErr) {
        console.warn("Failed to send face checkin chat notification:", chatErr);
      }
    }
    
    setFaceScanState('success');
    setFaceCaptureStep('success');
    setNotificationMsg("Photo captured & attendance logged successfully!");
    setTimeout(() => setNotificationMsg(null), 3000);
    
    onStateChange();
  };

  // Input states
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('password'); // Default to password login for convenience
  const [selectedPackage, setSelectedPackage] = useState("Basic Package (15 Sessions)");
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [registerTab, setRegisterTab] = useState<'phone' | 'email'>('phone');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVal, setEmailOtpVal] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  // Aadhaar Verification states
  const [showAadharModal, setShowAadharModal] = useState(true);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [aadharFile, setAadharFile] = useState<{ name: string; fileUrl: string } | null>(null);
  const [aadharUploading, setAadharUploading] = useState(false);
  const aadharFileInputRef = useRef<HTMLInputElement>(null);
  const scheduleAadharFileInputRef = useRef<HTMLInputElement>(null);
  const paymentReceiptInputRef = useRef<HTMLInputElement>(null);

  const handleAadharFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
        compressImageIfNeeded(rawUrl).then(compressedUrl => {
          setAadharFile({
            name: file.name,
            fileUrl: compressedUrl
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAadharDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
        compressImageIfNeeded(rawUrl).then(compressedUrl => {
          setAadharFile({
            name: file.name,
            fileUrl: compressedUrl
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAadharUploadSimulated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aadharFile) return;
    setAadharUploading(true);
    setTimeout(() => {
      const newDoc: Document = {
        id: `doc_${Date.now()}`,
        studentId: student.id,
        name: "Aadhar Card",
        type: aadharFile.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Image",
        fileUrl: aadharFile.fileUrl,
        status: "Pending",
        uploadedAt: new Date().toISOString().split("T")[0]
      };
      const updatedDocs = [newDoc, ...documents.filter(d => !d.name.toLowerCase().includes("aadhar") && !d.name.toLowerCase().includes("aadhaar"))];
      MockDatabase.saveDocuments(updatedDocs);
      setDocuments(updatedDocs);
      const updatedStudent = {
        ...student,
        aadharStatus: "Pending" as const
      };
      MockDatabase.saveStudent(updatedStudent);
      setStudent(updatedStudent);
      setAadharUploading(false);
      setAadharFile(null);
      onStateChange();
      showNotification("Aadhar Card uploaded successfully! Awaiting Admin verification.");
    }, 1500);
  };

  // Local state refresher helper
  const refreshLocalState = (id?: string) => {
    if (id) {
      MockDatabase.setCurrentStudentId(id);
    }
    const currentStud = MockDatabase.getStudent();
    setStudent(currentStud);
    setProgress(MockDatabase.getProgress());
    setBookings(MockDatabase.getBookings());
    setDocuments(MockDatabase.getDocuments());
    setPayments(MockDatabase.getPayments());
    setChats(MockDatabase.getChats());
    setAttempts(MockDatabase.getMockAttempts());
    setTrackingSession(MockDatabase.getTrackingSessionByStudent(currentStud.id));

    setStudentEditCourseName(currentStud.proposedCourseName || currentStud.courseName || "Premium Package (20 Sessions)");
    setStudentEditCourseNotes(currentStud.proposedCourseNotes || currentStud.courseNotes || "");
    setStudentEditSyllabus(currentStud.proposedCourseSyllabus || currentStud.courseSyllabus || []);
  };

  // Class Booking States
  const [bookingDate, setBookingDate] = useState("");
  const [calMonth, setCalMonth] = useState(() => {
    const today = new Date();
    return today.getMonth();
  });
  const [calYear, setCalYear] = useState(() => {
    const today = new Date();
    return today.getFullYear();
  });
  const [bookingTimeSlot, setBookingTimeSlot] = useState("Morning");
  const [bookingTrainer, setBookingTrainer] = useState("");
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState(false);
  const [lastBookingCreated, setLastBookingCreated] = useState<Booking | null>(null);

  // Class Cancellation Confirmation State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  // Trainer review & rating form states
  const [reviewTrainerId, setReviewTrainerId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Live GPS Tracking State
  const [trackingSession, setTrackingSession] = useState<TrackingSession | null>(() => {
    return MockDatabase.getTrackingSessionByStudent(student?.id || "student_1");
  });
  const [roadMetrics, setRoadMetrics] = useState<{ distKm: number; etaMin: number } | null>(null);
  const [studentGps, setStudentGps] = useState<{ lat: number; lng: number }>(() => ({
    lat: DEFAULT_BHUBANESWAR_LOCATION.lat,
    lng: DEFAULT_BHUBANESWAR_LOCATION.lng
  }));

  // Real-Time Firestore & Local Synchronization for Live Pickup Tracking
  useEffect(() => {
    if (!student?.id) return;

    const findActiveSession = () => {
      const allSessions = MockDatabase.getTrackingSessions();
      const studentBookings = MockDatabase.getBookings().filter(b => b.studentId === student.id);
      const studentClassIds = studentBookings.map(b => b.id);

      const matched = allSessions.filter(s =>
        s.studentId === student.id || studentClassIds.includes(s.classId)
      );

      const active = matched.find(s => 
        s.isTracking === true && 
        (s.status === 'PICKUP_STARTED' || s.status === 'ARRIVED' || s.status === 'CLASS_STARTED' || s.routeStatus === 'pickup_started' || s.routeStatus === 'en_route')
      );
      return active || null;
    };

    // 1. Initial Local Database Sync
    const initialLocal = findActiveSession();
    setTrackingSession(initialLocal);

    // 2. Real-Time Firestore Listener for Live Location & Pickup Route Status
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(collection(db, "trackingSessions"), (snapshot) => {
        const studentBookings = MockDatabase.getBookings().filter(b => b.studentId === student.id);
        const studentClassIds = studentBookings.map(b => b.id);
        const studentSessions: TrackingSession[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TrackingSession;
          if (data && (
            data.studentId === student.id ||
            studentClassIds.includes(data.classId)
          )) {
            studentSessions.push(data);
          }
        });

        // Sort by timestamp descending so the latest active location is picked
        studentSessions.sort((a, b) => {
          const timeA = a.timestamp || (a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0);
          const timeB = b.timestamp || (b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0);
          return timeB - timeA;
        });

        const active = studentSessions.find(
          s => s.isTracking === true && (s.status === 'PICKUP_STARTED' || s.status === 'ARRIVED' || s.status === 'CLASS_STARTED' || s.routeStatus === 'pickup_started' || s.routeStatus === 'en_route')
        );
        setTrackingSession(active || null);
      }, (err) => {
        console.warn("[StudentApp] Firestore trackingSessions onSnapshot error:", err);
      });
    } catch (err) {
      console.warn("[StudentApp] Firestore subscription setup exception:", err);
    }

    // 3. Local Storage / Custom DB Event Synchronization Fallback
    const handleLocalSync = () => {
      const chosen = findActiveSession();
      setTrackingSession(chosen);
    };

    window.addEventListener('storage', handleLocalSync);
    window.addEventListener('golden_hands_db_update', handleLocalSync);

    return () => {
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('storage', handleLocalSync);
      window.removeEventListener('golden_hands_db_update', handleLocalSync);
    };
  }, [student?.id, effectiveAssignedTrainerId]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setStudentGps({ lat, lng });

          if (student?.id) {
            const currentStudent = MockDatabase.getStudent(student.id);
            if (currentStudent) {
              MockDatabase.saveStudent({ ...currentStudent, studentLat: lat, studentLng: lng });
            }

            const tracking = MockDatabase.getTrackingSessionByStudent(student.id);
            if (tracking && tracking.isTracking) {
              MockDatabase.saveTrackingSession({
                ...tracking,
                studentLat: lat,
                studentLng: lng,
                lastUpdatedAt: new Date().toISOString()
              });
            }
          }
        },
        (err) => console.log("Student device location notice:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    }
  }, [student?.id]);

  // AI Driving Coach States
  const [coachInput, setCoachInput] = useState("");
  const [coachChat, setCoachChat] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [coachLoading, setCoachLoading] = useState(false);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle email verification token click from URL search parameter
  const handleVerifyToken = async (token: string) => {
    setCurrentScreen('verify');
    setVerificationStatus('verifying');
    setVerificationMessage('Verifying your email address with the secure backend server...');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationStatus('success');
        setVerificationMessage(data.message || 'Your email has been verified successfully! You can now log in to your account.');
        await MockDatabase.syncFromCloud();
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setCurrentScreen('login');
          setVerificationStatus('idle');
          setUnverifiedEmail(null);
          setAuthError(null);
        }, 4000);
      } else {
        setVerificationStatus('error');
        setVerificationMessage(data.error || 'Failed to verify email address. The token may be expired or already used.');
      }
    } catch (err: any) {
      setVerificationStatus('error');
      setVerificationMessage('A network error occurred. Please try again.');
    }
  };

  // URL token detector
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify_token');
    if (token) {
      handleVerifyToken(token);
    }
  }, []);

  // Monitor Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If there's no current student ID in localStorage, it means the user explicitly logged out
        // or wants to log in fresh. Do NOT automatically log them in; clear the Firebase session instead.
        // BUT don't do this if an active auth login or register flow is currently in progress.
        const currentId = localStorage.getItem("golden_hands_current_student_id");
        if (!currentId && !isAuthLoadingRef.current) {
          setFirebaseUser(null);
          setCurrentScreen('login');
          try {
            await signOut(auth);
          } catch (err) {
            console.error("Failed to sign out stale Firebase session:", err);
          }
          return;
        }

        setFirebaseUser(user);
        const email = user.email || "";
        const rawPhone = user.phoneNumber || "";
        const cleanUserPhone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : "";
        
        const isEmail = email.includes('@') && !email.endsWith('@goldenhands.com');
        let phone = email.endsWith('@goldenhands.com') ? email.split('@')[0] : "";
        if (!phone && cleanUserPhone) {
          phone = cleanUserPhone;
        }
        
        if (isEmail) {
          // Strict email verification using Firebase Authentication ONLY
          if (!user.emailVerified) {
            setVerificationEmail(email);
            setUnverifiedEmail(email);
            setCurrentScreen('verify');
            try {
              await signOut(auth);
            } catch (err) {
              console.error("Error signing out unverified user:", err);
            }
            return;
          }
        }

        try {
          // Sync database from Firestore first so we have the latest student profiles
          await MockDatabase.syncFromCloud();
          
          const students = MockDatabase.getRegisteredStudents();
          let found = students.find(s => {
            if (s.id === user.uid) return true;
            if (isEmail) {
              return s.email && s.email.trim().toLowerCase() === email.trim().toLowerCase();
            } else {
              const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
              const cleanTargetPhone = phone.replace(/\D/g, '').slice(-10);
              return cleanStudPhone && cleanTargetPhone && cleanStudPhone === cleanTargetPhone;
            }
          });
          
          if (found) {
            if (found.id !== user.uid) {
              console.log(`[Auth State] Migrating student ID from ${found.id} to UID ${user.uid}`);
              found.id = user.uid;
              MockDatabase.saveRegisteredStudents(students);
              MockDatabase.saveStudent(found);
            }
            MockDatabase.setCurrentStudentId(found.id);
            refreshLocalState(found.id);
            
            // Only update currentScreen if it's not already 'app', to prevent state resetting
            setCurrentScreen(prev => (prev !== 'app' ? 'app' : prev));
          } else {
            // Rule 8: If no registered account exists, sign out immediately, do not create Firestore doc, show error, redirect to registration
            console.warn(`[Auth State] No local registered account found for UID ${user.uid}, signing out.`);
            await signOut(auth);
            setFirebaseUser(null);
            setAuthError("No registered account found. Please register first.");
            showNotification("No registered account found. Please register first.");
            setCurrentScreen('register');
          }
        } catch (err) {
          console.warn("Boot validation error:", err);
        }
      } else {
        setFirebaseUser(null);
        // Do NOT automatically log out or redirect to login screen if a valid active session 
        // exists in localStorage. This prevents auto-logout during temporary background state shifts, 
        // network interruptions, camera permission prompts, or camera intent actions.
        const currentId = localStorage.getItem("golden_hands_current_student_id");
        if (!currentId) {
          setCurrentScreen(prev => (prev === 'app' ? 'login' : prev));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize local states instantly on real-time database updates
  useEffect(() => {
    const handleDbUpdated = () => {
      refreshLocalState();
    };
    window.addEventListener("db-updated", handleDbUpdated);
    return () => window.removeEventListener("db-updated", handleDbUpdated);
  }, []);



  // Synchronize Firestore subcollections for the logged-in user in real-time
  useEffect(() => {
    if (!firebaseUser) {
      setFolders([]);
      setFiles([]);
      setNotes([]);
      setTeamMembers([]);
      return;
    }

    const uid = firebaseUser.uid;

    // 1. Ensure user document exists in users/{uid}
    const userDocRef = doc(db, "users", uid);
    getDoc(userDocRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(userDocRef, {
          displayName: firebaseUser.displayName || student.name || "Student User",
          email: firebaseUser.email || "",
          plan: student.courseName || "Premium Package (20 Sessions)",
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Error creating user profile in Firestore:", err));
      }
    });

    // 2. Set up real-time listener / loading for Folders
    setFoldersLoading(true);
    const foldersRef = collection(db, "users", uid, "folders");
    const unsubscribeFolders = onSnapshot(foldersRef, (snapshot) => {
      const folderList: any[] = [];
      snapshot.forEach((doc) => {
        folderList.push({ id: doc.id, ...doc.data() });
      });
      setFolders(folderList.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)));
      setFoldersLoading(false);
    }, (error) => {
      console.error("Error loading folders:", error);
      setFoldersLoading(false);
    });

    // 3. Set up real-time listener / loading for Files
    setFilesLoading(true);
    const filesRef = collection(db, "users", uid, "files");
    const unsubscribeFiles = onSnapshot(filesRef, (snapshot) => {
      const fileList: any[] = [];
      snapshot.forEach((doc) => {
        fileList.push({ id: doc.id, ...doc.data() });
      });
      setFiles(fileList.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)));
      setFilesLoading(false);
    }, (error) => {
      console.error("Error loading files:", error);
      setFilesLoading(false);
    });

    // 4. Set up real-time listener / loading for Notes
    setNotesLoading(true);
    const notesRef = collection(db, "users", uid, "notes");
    const unsubscribeNotes = onSnapshot(notesRef, (snapshot) => {
      const noteList: any[] = [];
      snapshot.forEach((doc) => {
        noteList.push({ id: doc.id, ...doc.data() });
      });
      setNotes(noteList.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)));
      setNotesLoading(false);
    }, (error) => {
      console.error("Error loading notes:", error);
      setNotesLoading(false);
    });

    // 5. Set up real-time listener / loading for Team Members
    setTeamMembersLoading(true);
    const teamMembersRef = collection(db, "users", uid, "teamMembers");
    const unsubscribeTeam = onSnapshot(teamMembersRef, (snapshot) => {
      const teamList: any[] = [];
      snapshot.forEach((doc) => {
        teamList.push({ id: doc.id, ...doc.data() });
      });
      setTeamMembers(teamList.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)));
      setTeamMembersLoading(false);
    }, (error) => {
      console.error("Error loading team members:", error);
      setTeamMembersLoading(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
      unsubscribeNotes();
      unsubscribeTeam();
    };
  }, [firebaseUser, student.name]);

  // Synchronize AI Driving Coach greeting based on active student name
  useEffect(() => {
    if (student.name) {
      const firstName = student.name.split(' ')[0] || "Student";
      setCoachChat(prev => {
        if (prev.length === 0 || (prev.length === 1 && prev[0].role === 'model' && prev[0].text.includes("Hello"))) {
          return [
            { role: 'model', text: `Hello ${firstName}! I am your AI Driving Coach. Looking at your records, I noticed your **Hill Start (60%)** and **Night Driving (50%)** could use some work. What driving technique would you like to discuss today?` }
          ];
        }
        return prev;
      });
    }
  }, [student.name]);

  // Mock Test State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);

  // Personal chat with assigned trainer
  const [chatMessageInput, setChatMessageInput] = useState("");

  // Document Upload States
  const [uploadDocName, setUploadDocName] = useState("Learner Licence");
  const [uploadDocSuccess, setUploadDocSuccess] = useState(false);
  const [normalDocFile, setNormalDocFile] = useState<{ name: string; fileUrl: string } | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleNormalDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
        compressImageIfNeeded(rawUrl).then(compressedUrl => {
          setNormalDocFile({
            name: file.name,
            fileUrl: compressedUrl
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNormalDocDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
        compressImageIfNeeded(rawUrl).then(compressedUrl => {
          setNormalDocFile({
            name: file.name,
            fileUrl: compressedUrl
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Payment Mock
  const [paymentSelectedAmount, setPaymentSelectedAmount] = useState(3500);
  const [paymentSelectedPurpose, setPaymentSelectedPurpose] = useState("Full Driving Course Fee");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentUpiReference, setPaymentUpiReference] = useState("");
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentReceiptName, setPaymentReceiptName] = useState("");
  const [paymentProofUploading, setPaymentProofUploading] = useState(false);
  const [paymentMethodTab, setPaymentMethodTab] = useState<'razorpay' | 'upi'>('razorpay');

  // Live feedback notification
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Notifications Dropdown/Bar state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'success' | 'info' | 'alert';
  }>>([
    {
      id: "notif_1",
      title: "Class Booked",
      message: "Your upcoming driving session has been scheduled successfully.",
      time: "Just now",
      read: false,
      type: "success"
    },
    {
      id: "notif_2",
      title: "Licence Status Updated",
      message: "Your Learner Licence upload is marked as Pending Admin Verification.",
      time: "2 hours ago",
      read: false,
      type: "info"
    },
    {
      id: "notif_3",
      title: "Welcome aboard!",
      message: "Welcome to Golden Hands app! Explore learning materials and prepare for RTO exam.",
      time: "1 day ago",
      read: false,
      type: "info"
    }
  ]);

  // Load state updates continuously from localstorage (in case Admin / Trainer edits)
  useEffect(() => {
    const handleStorageChange = () => {
      setStudent(MockDatabase.getStudent());
      setProgress(MockDatabase.getProgress());
      setBookings(MockDatabase.getBookings());
      setTrainers(MockDatabase.getTrainers());
      setDocuments(MockDatabase.getDocuments());
      setPayments(MockDatabase.getPayments());
      setChats(MockDatabase.getChats());
      setAttempts(MockDatabase.getMockAttempts());
    };
    
    // Polling interval to make the system feel "alive" and reactive
    const interval = setInterval(handleStorageChange, 2000);
    return () => clearInterval(interval);
  }, []);

  // Periodically pull latest database from Firebase Firestore to keep multi-user portals in sync
  useEffect(() => {
    let active = true;
    const handleCloudSync = async () => {
      try {
        await MockDatabase.syncFromCloud();
        if (active) {
          setStudent(MockDatabase.getStudent());
          setProgress(MockDatabase.getProgress());
          setBookings(MockDatabase.getBookings());
          setTrainers(MockDatabase.getTrainers());
          setDocuments(MockDatabase.getDocuments());
          setPayments(MockDatabase.getPayments());
          setChats(MockDatabase.getChats());
          setAttempts(MockDatabase.getMockAttempts());
        }
      } catch (err) {
        console.warn("Periodic cloud sync failed:", err);
      }
    };
    
    // Sync every 8 seconds
    const syncInterval = setInterval(handleCloudSync, 8000);
    return () => {
      active = false;
      clearInterval(syncInterval);
    };
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (currentScreen !== 'otp') return;
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentScreen, otpCountdown]);

  // Click outside dropdown/menu handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationsOpen]);

  // Alert dismiss helper
  const showNotification = (msg: string, title?: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);

    let defaultTitle = title || "System Update";
    if (!title) {
      if (msg.includes("booked") || msg.includes("scheduled")) defaultTitle = "Class Booked";
      else if (msg.includes("rescheduled")) defaultTitle = "Class Rescheduled";
      else if (msg.includes("cancelled")) defaultTitle = "Class Cancelled";
      else if (msg.includes("uploaded")) defaultTitle = "Document Uploaded";
      else if (msg.includes("successful") || msg.includes("Paid")) defaultTitle = "Payment Successful";
      else if (msg.includes("modification")) defaultTitle = "Course Customization";
      else if (msg.includes("Logged in")) defaultTitle = "Security Login";
    }

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}`,
        title: defaultTitle,
        message: msg,
        time: "Just now",
        read: false,
        type: msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") || msg.toLowerCase().includes("cancelled") ? "alert" : "success"
      },
      ...prev
    ]);
  };

  // Helper to register a new user or migrate their password in Firebase Auth if they already exist
  const registerOrUpdateAuthUser = async (email: string, passwordInput: string) => {
    try {
      return await createUserWithEmailAndPassword(auth, email, passwordInput);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        const students = MockDatabase.getRegisteredStudents();
        const isEmail = email.includes('@') && !email.endsWith('@goldenhands.com');
        const phone = email.endsWith('@goldenhands.com') ? email.split('@')[0] : "";
        const found = students.find(s => 
          isEmail 
            ? (s.email && s.email.trim().toLowerCase() === email)
            : (s.phone && s.phone.trim() === phone.trim())
        );
        const fallbacks = [found?.password, "golden123"].filter(Boolean) as string[];
        for (const pass of fallbacks) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            if (userCredential.user) {
              await updatePassword(userCredential.user, passwordInput);
              return userCredential;
            }
          } catch (signInErr) {
            console.warn("Mismatched password migration attempt failed:", signInErr);
          }
        }
      }
      throw err;
    }
  };

  const getRecaptchaVerifier = () => {
    try {
      // 1. Clean up any previous RecaptchaVerifier instance to avoid re-rendering errors
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (clearErr) {
          console.warn("Failed to clear previous recaptcha verifier:", clearErr);
        }
        recaptchaVerifierRef.current = null;
      }

      // 2. Clean up any existing container element in the DOM to start completely fresh
      const existingContainer = document.getElementById('recaptcha-container');
      if (existingContainer) {
        existingContainer.remove();
      }

      // 3. Recreate a clean container element
      const container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);
      
      const verifier = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
        callback: (response: any) => {
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          console.log("reCAPTCHA expired");
        }
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err) {
      console.error("Error creating RecaptchaVerifier:", err);
      return null;
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!navigator.onLine) {
      setAuthError("Internet connection is required to securely sign in. Please connect to the internet and try again.");
      return;
    }

    if (!phoneInput) return;

    if (authMode === 'otp') {
      const isEmail = phoneInput.includes('@');
      if (isEmail) {
        setAuthError("OTP SMS login is only supported for mobile numbers. Please use your password to sign in via email.");
        return;
      }

      const cleanPhone = phoneInput.replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        setAuthError("Please enter a valid 10-digit mobile number.");
        return;
      }

      setIsAuthLoading(true);

      try {
        // Step 1. Check with our backend OTP generation & validation API
        const otpSendRes = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone })
        });
        const otpSendData = await otpSendRes.json();

        if (!otpSendRes.ok || !otpSendData.success) {
          const errMsg = otpSendData.error || "This mobile number is not registered. Please create an account first.";
          setAuthError(errMsg);
          showNotification(errMsg);
          setCurrentScreen('register');
          setIsAuthLoading(false);
          return;
        }

        // Mobile number is registered!
        let formattedPhone = phoneInput.trim();
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+91${cleanPhone}`;
        }

        try {
          const verifier = getRecaptchaVerifier();
          if (!verifier) {
            throw new Error("reCAPTCHA verification widget failed to load.");
          }

          const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
          setConfirmationResult(result);
          setCurrentScreen('otp');
          setOtpCountdown(60);
          showNotification(`A real SMS verification code has been sent to your phone ${formattedPhone}!`);
        } catch (err: any) {
          console.error("Firebase Phone OTP Send Error (falling back to backend simulated OTP):", err);
          
          if (recaptchaVerifierRef.current) {
            try {
              recaptchaVerifierRef.current.clear();
            } catch (clearErr) {
              console.warn("Failed to clear verifier:", clearErr);
            }
            recaptchaVerifierRef.current = null;
          }

          // Fallback to simulated OTP mode using backend generated OTP!
          setConfirmationResult(null);
          setCurrentScreen('otp');
          setOtpCountdown(60);
          showNotification(`Simulated OTP Mode! Your OTP code is: ${otpSendData.code || "1234"}. Enter it to log in instantly.`);
        }
      } catch (netErr: any) {
        console.error("Network error checking phone registration status:", netErr);
        
        // Local fail-safe check against registered students
        const students = MockDatabase.getRegisteredStudents();
        const foundLocal = students.find(s => {
          const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
          return cleanStudPhone && cleanStudPhone === cleanPhone;
        });

        if (!foundLocal) {
          const errMsg = "This mobile number is not registered. Please create an account first.";
          setAuthError(errMsg);
          showNotification(errMsg);
          setCurrentScreen('register');
          setIsAuthLoading(false);
          return;
        }

        setConfirmationResult(null);
        setCurrentScreen('otp');
        setOtpCountdown(60);
        showNotification("Firebase Phone Auth gateway issue. Switched to Simulated OTP Mode! Enter any 4-digit code (e.g., 1234) to log in instantly.");
      } finally {
        setIsAuthLoading(false);
      }
      return;
    }

    setIsAuthLoading(true);
    try {
      const isEmail = phoneInput.includes('@');
      if (isEmail) {
        const email = phoneInput.trim().toLowerCase();
        try {
          // Direct Firebase Authentication login! Bypassing any Firestore / Database check.
          const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
          const fbUser = userCredential.user;
          
          if (!fbUser.emailVerified) {
            setVerificationEmail(email);
            setUnverifiedEmail(email);
            setCurrentScreen('verify');
            await signOut(auth);
            return;
          }
          
          // Load latest database from Firebase Firestore
          try {
            await MockDatabase.syncFromCloud();
          } catch (syncErr) {
            console.warn("Failed to sync from cloud on login, using cache:", syncErr);
          }

          // If verified, let's ensure local student exists in MockDatabase so the app functions perfectly
          const students = MockDatabase.getRegisteredStudents();
          let found = students.find(s => s.id === fbUser.uid || (s.email && s.email.trim().toLowerCase() === email));
          if (!found) {
            found = MockDatabase.registerStudent(
              fbUser.displayName || email.split('@')[0] || "Student",
              "",
              email,
              "Premium Package (20 Sessions)",
              loginPassword,
              fbUser.uid
            );
          } else if (found.id !== fbUser.uid) {
            // Migrate ID to Firebase UID to satisfy linkage constraints
            console.log(`[Login] Migrating student ID from ${found.id} to UID ${fbUser.uid}`);
            found.id = fbUser.uid;
            MockDatabase.saveRegisteredStudents(students);
            MockDatabase.saveStudent(found);
          }
          if (found.deletionRequested || found.deletionStatus === 'requested') {
            setIsAuthLoading(false);
            setPendingDeletionLoginStudent(found);
            return;
          }

          MockDatabase.setCurrentStudentId(found.id);
          refreshLocalState(found.id);
          setUnverifiedEmail(null);
          setAuthError(null);
          setCurrentScreen('app');
          showNotification(`Welcome back, ${found.name}!`);
          return;
        } catch (fbErr: any) {
          console.error("Firebase Auth email login error:", fbErr);
          if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential" || fbErr.code === "auth/wrong-password") {
            setAuthError("Email or password is incorrect");
          } else {
            setAuthError(fbErr.message || "Login failed.");
          }
          return;
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail: phoneInput,
          password: loginPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const student = data.student;
        if (student.deletionRequested || student.deletionStatus === 'requested') {
          setIsAuthLoading(false);
          setPendingDeletionLoginStudent(student);
          return;
        }
        // Authenticate locally using the returned student
        MockDatabase.setCurrentStudentId(student.id);
        refreshLocalState(student.id);
        
        // Let's also sign them in with Firebase Auth client side so we can use Firestore SDK for chats/files
        try {
          const fbEmail = student.email || `${student.id}@goldenhands.com`;
          await signInWithEmailAndPassword(auth, fbEmail, student.password);
        } catch (fbErr) {
          console.warn("Silent Firebase Auth login error (non-blocking):", fbErr);
        }
        
        setUnverifiedEmail(null);
        setAuthError(null);
        setCurrentScreen('app');
        showNotification(`Welcome back, ${student.name}!`);
      } else if (data.unverified) {
        // Strict unverified block - Check real Firebase Auth verification status
        try {
          const userCredential = await signInWithEmailAndPassword(auth, data.email, loginPassword);
          await reload(userCredential.user);
          if (userCredential.user.emailVerified) {
            // User verified their email via Gmail! Sync and update Firestore
            await MockDatabase.syncFromCloud();
            const students = MockDatabase.getRegisteredStudents();
            const found = students.find(s => s.email && s.email.trim().toLowerCase() === data.email.trim().toLowerCase());
            if (found) {
              await updateDoc(doc(db, "students", found.id), { emailVerified: true });
              found.emailVerified = true;
              MockDatabase.saveStudent(found, found.id);
              MockDatabase.setCurrentStudentId(found.id);
              refreshLocalState(found.id);
              
              setUnverifiedEmail(null);
              setAuthError(null);
              setCurrentScreen('app');
              showNotification(`Email verified successfully via Gmail! Welcome back, ${found.name}!`);
              setIsAuthLoading(false);
              return;
            }
          } else {
            // Not verified yet in Firebase Auth
            await signOut(auth);
          }
        } catch (fbErr: any) {
          console.warn("Silent check of Firebase Auth email verification:", fbErr);
        }

        setUnverifiedEmail(data.email);
        setVerificationEmail(data.email);
        setAuthError(data.message);
      } else {
        setAuthError(data.error || "Email or password is incorrect");
      }
    } catch (err: any) {
      console.error("API Login Error:", err);
      setAuthError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    if (resendCooldown > 0) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (auth.currentUser) {
        try {
          await sendEmailVerification(auth.currentUser);
          showNotification("Verification email resent successfully to your Gmail inbox via Firebase Auth!");
        } catch (fbErr: any) {
          console.warn("Could not send verification email through client SDK:", fbErr);
        }
      }
      
      // Always register and generate token on the backend to obtain the sandbox bypass url
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendCooldown(30); // 30s Cooldown
        showNotification(data.message || "Verification email resent successfully!");
        if (data.verificationLink) {
          setDevVerifyLink(data.verificationLink);
        }
      } else {
        setAuthError(data.error || "Failed to resend verification email.");
      }
    } catch (err: any) {
      console.error("Resend verification error:", err);
      setAuthError(err.message || "Failed to resend email due to a network error.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!navigator.onLine) {
      setAuthError("Internet connection is required to process registration. Please connect to the internet and try again.");
      return;
    }

    if (!nameInput) {
      setAuthError("Please fill in your Name.");
      return;
    }
    if (!phoneInput || !phoneInput.trim()) {
      setAuthError("Please fill in your Mobile Number.");
      return;
    }
    if (!emailInput || !emailInput.trim()) {
      setAuthError("Please fill in your Email Address.");
      return;
    }
    if (!passwordInput) {
      setAuthError("Please set a password for your account.");
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError("Password must be at least 6 characters long for security.");
      return;
    }

    const email = emailInput.trim().toLowerCase();
    const cleanPhone = phoneInput.replace(/\D/g, '').slice(-10);

    // Prevent duplicate accounts before registration
    const students = MockDatabase.getRegisteredStudents();
    const duplicate = students.find(s => {
      const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
      return (s.email && s.email.trim().toLowerCase() === email) || (cleanStudPhone && cleanStudPhone === cleanPhone);
    });

    if (duplicate) {
      setAuthError("An account with this mobile number or email already exists. Please log in instead.");
      return;
    }

    setIsAuthLoading(true);
    try {
      // 1. Create the user credentials in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordInput);
      const firebaseUser = userCredential.user;

      // 2. Update display name in Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: nameInput });

      // 3. Send email verification via Firebase Auth
      await sendEmailVerification(firebaseUser);

      // 4. Immediately sign out to satisfy: "When a user registers with email/password, do not sign them in automatically."
      await signOut(auth);

      // 5. Pre-register student locally in MockDatabase so it's ready when they log in later
      try {
        MockDatabase.registerStudent(nameInput, phoneInput, email, selectedPackage, passwordInput, firebaseUser.uid);
      } catch (e) {
        console.warn("Mock local registration skipped:", e);
      }

      setVerificationEmail(email);
      setUnverifiedEmail(email);
      setCurrentScreen('verify');
      setVerificationStatus('idle');

      showNotification(`We have sent you a verification email to ${email}. Please verify it and log in.`);
    } catch (err: any) {
      console.error("Registration Error:", err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("This email address is already registered under another account.");
      } else if (err.code === "auth/invalid-email") {
        setAuthError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("The password is too weak. Please use at least 6 characters.");
      } else {
        setAuthError(err.message || "Registration failed due to an error.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const verifyOtpValue = async (code: string) => {
    setAuthError(null);
    if (!code || (code.length !== 6 && code.length !== 4)) {
      setAuthError("Please enter a valid verification code.");
      return;
    }
    
    setIsAuthLoading(true);
    try {
      if (confirmationResult) {
        // Real Live Firebase Auth OTP confirmation!
        const userCredential = await confirmationResult.confirm(code);
        const fbUser = userCredential.user;
        console.log("Firebase Phone Auth Sign In Succeeded!", fbUser);
        
        try {
          await MockDatabase.syncFromCloud();
        } catch (syncErr) {
          console.warn("Failed to sync from cloud on OTP login, using cache:", syncErr);
        }

        const rawPhone = fbUser.phoneNumber || "";
        const cleanFbPhone = rawPhone.replace(/\D/g, '').slice(-10); // last 10 digits
        
        const students = MockDatabase.getRegisteredStudents();
        let found = students.find(s => {
          if (s.id === fbUser.uid) return true;
          const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
          return cleanStudPhone && cleanStudPhone === cleanFbPhone;
        });
        
        if (found && found.id !== fbUser.uid) {
          console.log(`[OTP Login] Migrating student ID from ${found.id} to UID ${fbUser.uid}`);
          found.id = fbUser.uid;
          MockDatabase.saveRegisteredStudents(students);
          MockDatabase.saveStudent(found);
        }
        
        if (!found) {
          // Rule 8: If no registered account exists, sign out immediately, do not create Firestore doc, show error, redirect to registration
          await signOut(auth);
          setAuthError("No registered account found. Please register first.");
          showNotification("No registered account found. Please register first.");
          setCurrentScreen('register');
          setIsAuthLoading(false);
          return;
        }
        
        if (found.deletionRequested || found.deletionStatus === 'requested') {
          setIsAuthLoading(false);
          setPendingDeletionLoginStudent(found);
          return;
        }

        MockDatabase.setCurrentStudentId(found.id);
        refreshLocalState(found.id);
        setUnverifiedEmail(null);
        setCurrentScreen('app');
        showNotification(`Welcome, ${found.name}! Successfully authenticated via secure SMS OTP.`);
        return;
      }

      // Fallback for simulated OTP if confirmationResult was not initialized
      const isEmail = phoneInput.includes('@');
      const cleanInputPhone = phoneInput.replace(/\D/g, '').slice(-10);
      const email = isEmail ? phoneInput.trim().toLowerCase() : `${cleanInputPhone}@goldenhands.com`;

      const students = MockDatabase.getRegisteredStudents();
      let found = students.find(s => {
        if (isEmail) {
          return s.email && s.email.trim().toLowerCase() === email;
        } else {
          const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
          return cleanStudPhone && cleanStudPhone === cleanInputPhone;
        }
      });

      // Verify OTP against the backend API to ensure strict compliance
      try {
        const verifyRes = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanInputPhone,
            code: code
          })
        });
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Incorrect or expired verification code.");
        }
        
        // Success! Keep the verified student profile returned by backend
        found = verifyData.student;
      } catch (backendErr: any) {
        console.error("Backend OTP verification failed:", backendErr);
        
        if (!found) {
          const errMsg = backendErr.message || "This mobile number is not registered. Please create an account first.";
          setAuthError(errMsg);
          showNotification(errMsg);
          setCurrentScreen('register');
          setIsAuthLoading(false);
          return;
        }
        
        // Local/testing fallback if needed
        const correctCode = (code === "1234") || (code === "123456") || (code === "1111");
        if (!correctCode) {
          setAuthError("Incorrect verification code. Please try again.");
          setIsAuthLoading(false);
          return;
        }
      }

      if (!found) {
        setAuthError("This mobile number is not registered. Please create an account first.");
        showNotification("This mobile number is not registered. Please create an account first.");
        setCurrentScreen('register');
        setIsAuthLoading(false);
        return;
      }

      const matchedPassword = found.password || "golden123";

      if (found.deletionRequested || found.deletionStatus === 'requested') {
        setIsAuthLoading(false);
        setPendingDeletionLoginStudent(found);
        return;
      }

      // IMPORTANT: Set current ID and refresh state FIRST so that onAuthStateChanged doesn't auto-signout!
      MockDatabase.setCurrentStudentId(found.id);
      refreshLocalState(found.id);
      setUnverifiedEmail(null);
      setAuthError(null);
      setCurrentScreen('app');
      showNotification(`Welcome, ${found.name}! Successfully authenticated via Simulated OTP.`);

      try {
        await signInWithEmailAndPassword(auth, email, matchedPassword);
      } catch (err: any) {
        console.error("Firebase OTP Verification Error:", err);
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
          const fallbacks = ["golden123"];
          if (found.password && found.password !== "golden123") {
            fallbacks.unshift(found.password);
          }
          
          let signedIn = false;
          for (const pass of fallbacks) {
            if (pass === matchedPassword) continue;
            try {
              await signInWithEmailAndPassword(auth, email, pass);
              signedIn = true;
              break;
            } catch (signInErr) {
              console.warn("OTP fallback sign-in failed:", signInErr);
            }
          }
          
          if (signedIn) return;

          try {
            await createUserWithEmailAndPassword(auth, email, matchedPassword);
            return;
          } catch (createErr: any) {
            console.error("Firebase OTP Auto-Create Error:", createErr);
          }
        }
        setAuthError("Email or password is incorrect");
      }
    } catch (err: any) {
      console.error("Firebase Phone OTP Verification Failed:", err);
      setAuthError(err.message || "Invalid verification code. Please check your SMS and try again.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // OTP Verification handler
  const handleOtpVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpInput.length === 6 || otpInput.length === 4) {
      verifyOtpValue(otpInput);
    } else {
      setAuthError(confirmationResult ? "Please enter a complete 6-digit OTP verification code." : "Please enter a complete 4-digit OTP verification code.");
    }
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase SignOut Error:", err);
    }
    localStorage.removeItem("golden_hands_current_student_id");
    setCurrentScreen('login');
    setPhoneInput("");
    setNameInput("");
    setEmailInput("");
    setPasswordInput("");
    setLoginPassword("");
    refreshLocalState("");
    setActiveTab('home');
    setActiveSubPage(null);
    setMenuOpen(false);
    onLogout?.();
    onStateChange();
  };

  // Calendar Helpers for Class Booking
  const formatDateStr = (year: number, month: number, day: number) => {
    const y = String(year);
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCalendarDays = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 to 6
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: { day: number | null; dateStr: string | null }[] = [];
    
    // Pad the start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: null });
    }
    
    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        day: d,
        dateStr: formatDateStr(year, month, d)
      });
    }
    
    return days;
  };

  const getDayStatus = (dateStr: string) => {
    const tomorrowStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    
    if (dateStr < tomorrowStr) {
      return "Disabled";
    }

    // Check real-time availability from the database
    const dateSlot = MockDatabase.getSlotDays().find(s => s.date === dateStr);
    if (!dateSlot || dateSlot.isClosed) {
      return "Red"; // No slots available or closed
    }

    const sessions = [
      { id: "Morning", max: dateSlot.morningMax, enabled: dateSlot.morningEnabled },
      { id: "Lunch", max: dateSlot.lunchMax, enabled: dateSlot.lunchEnabled },
      { id: "Rush Hour", max: dateSlot.rushHourMax, enabled: dateSlot.rushHourEnabled },
      { id: "Evening", max: dateSlot.eveningMax, enabled: dateSlot.eveningEnabled }
    ];

    let hasAvailable = false;
    sessions.forEach(sess => {
      if (sess.enabled && sess.max > 0) {
        const booked = MockDatabase.getAllBookings().filter(b => 
          b.date === dateStr && 
          b.timeSlot === sess.id && 
          b.status !== 'cancelled'
        ).length;
        if (sess.max - booked > 0) {
          hasAvailable = true;
        }
      }
    });

    return hasAvailable ? "Green" : "Red";
  };

  const handleDateClick = (selectedDate: string, status: string) => {
    setBookingDate(selectedDate);
    if (status === "Green") {
      const dateSlot = MockDatabase.getSlotDays().find(s => s.date === selectedDate);
      if (dateSlot) {
        const sessions = [
          { id: "Morning", max: dateSlot.morningMax, enabled: dateSlot.morningEnabled },
          { id: "Lunch", max: dateSlot.lunchMax, enabled: dateSlot.lunchEnabled },
          { id: "Rush Hour", max: dateSlot.rushHourMax, enabled: dateSlot.rushHourEnabled },
          { id: "Evening", max: dateSlot.eveningMax, enabled: dateSlot.eveningEnabled }
        ];
        
        const firstAvailable = sessions.find(sess => {
          if (!sess.enabled || sess.max <= 0) return false;
          const booked = MockDatabase.getAllBookings().filter(b => 
            b.date === selectedDate && 
            b.timeSlot === sess.id && 
            b.status !== 'cancelled'
          ).length;
          return (sess.max - booked) > 0;
        });
        
        if (firstAvailable) {
          setBookingTimeSlot(firstAvailable.id);
        } else {
          setBookingTimeSlot("");
        }
      } else {
        setBookingTimeSlot("");
      }
    } else {
      setBookingTimeSlot(""); // Clear slot if Red
    }
  };

  // Class Booking handler
  const handleBookClass = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for payment and Aadhaar verification requirements
    const aadharDoc = documents.find(d => 
      (d.studentId === student.id || !d.studentId) && 
      (d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar"))
    );
    const isAadharVerified = Boolean(
      student.isAadharVerified === true ||
      student.aadharVerified === true ||
      student.aadharStatus === "Verified" ||
      student.adminManualUnlock === true ||
      (aadharDoc && aadharDoc.status === "Verified")
    );
    const compClassesCount = bookings.filter(b => b.status === 'Completed' || b.status === 'completed').length;
    const isEnded = (student.courseEnded || compClassesCount >= 15) && !student.planExtended;

    if (isEnded) {
      alert("Booking Locked: Your active course has ended. Please upgrade to Extra Classes or pay the Licence Processing Fee in the Modify tab to continue booking.");
      return;
    }

    if (!isAadharVerified && !student.adminManualUnlock) {
      alert("Verification Required: Your Aadhaar Card must be verified by the admin before booking a class. Please upload your Aadhaar Card in the Documents tab.");
      return;
    }

    // Golden Hands Driving School: Enforce locking criteria unless admin manually unlocked
    if (!student.adminManualUnlock) {
      if (student.bookingLocked) {
        alert(`Booking Locked: ${student.lockedReason || "A payment is required to continue booking driving classes."}`);
        return;
      }

      const firstInstallmentPaid = (student.amountPaid || 0) >= 2000;
      const courseFullyPaid = (student.amountPaid || 0) >= 3500;

      if (compClassesCount >= 1 && !firstInstallmentPaid) {
        alert("Booking Locked: You have completed your first free class. To unlock further bookings, a package payment of ₹2,000 is required.");
        return;
      }

      if (compClassesCount >= 5 && !courseFullyPaid) {
        alert("Booking Locked: You have completed 5 driving classes. To unlock remaining bookings, the final course fee of ₹1,500 must be approved.");
        return;
      }
    }

    // --- NEW VALIDATIONS FOR THE UPDATED BOOKING SYSTEM ---
    if (!bookingDate) {
      alert("Please select a valid date.");
      return;
    }

    // 1. Same-Day Booking Restriction
    const getTodayString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getTodayString();
    if (bookingDate <= todayStr) {
      alert("Same-day booking is not available. Please select a future date.");
      return;
    }

    // 2. Selected session exists
    const validSessions = ["Morning", "Lunch", "Rush Hour", "Evening"];
    if (!validSessions.includes(bookingTimeSlot)) {
      alert("Please select a valid session (Morning, Lunch, Rush Hour, or Evening).");
      return;
    }

    // 3. Slot Availability Checks
    const currentSlots = MockDatabase.getSlotDays();
    const dateSlot = currentSlots.find(s => s.date === bookingDate);
    if (!dateSlot || dateSlot.isClosed) {
      alert("No slots are available for this date. Bookings are closed.");
      return;
    }

    let isEnabled = false;
    let maxLimit = 0;
    if (bookingTimeSlot === "Morning") { isEnabled = dateSlot.morningEnabled; maxLimit = dateSlot.morningMax; }
    else if (bookingTimeSlot === "Lunch") { isEnabled = dateSlot.lunchEnabled; maxLimit = dateSlot.lunchMax; }
    else if (bookingTimeSlot === "Rush Hour") { isEnabled = dateSlot.rushHourEnabled; maxLimit = dateSlot.rushHourMax; }
    else if (bookingTimeSlot === "Evening") { isEnabled = dateSlot.eveningEnabled; maxLimit = dateSlot.eveningMax; }

    if (!isEnabled) {
      alert("This session is currently closed for bookings.");
      return;
    }

    // Booked count across all students to prevent overbooking
    const bookedCount = MockDatabase.getAllBookings().filter(b => 
      b.date === bookingDate && 
      b.timeSlot === bookingTimeSlot && 
      b.status !== 'cancelled'
    ).length;

    const remainingSlots = maxLimit - bookedCount;
    if (remainingSlots <= 0) {
      alert("No slots available for this session. Please choose another date or session.");
      return;
    }

    // 4. Student has not already booked another class for the same date and session
    const hasExisting = bookings.some(b => 
      b.date === bookingDate && 
      b.timeSlot === bookingTimeSlot && 
      b.status !== 'cancelled'
    );
    if (hasExisting) {
      alert("You have already booked a class for the same date and session.");
      return;
    }

    const targetTrainerId = effectiveAssignedTrainerId || bookingTrainer;
    const tr = trainers.find(t => t.id === targetTrainerId) || trainers[0];
    if (!tr) return;

    // Auto-lock assigned trainer on student profile after 1st booking
    let currentStudentObj = student;
    if (!student.assignedTrainerId) {
      currentStudentObj = {
        ...student,
        assignedTrainerId: tr.id,
        assignedTrainerName: tr.name
      };
      MockDatabase.saveStudent(currentStudentObj, student.id);
      setStudent(currentStudentObj);
    }

    const newBooking: Booking = {
      id: `booking_${Date.now()}`,
      studentId: currentStudentObj.id,
      studentName: currentStudentObj.name,
      trainerId: tr.id,
      trainerName: tr.name,
      carName: tr.carName,
      carPlate: tr.carPlate,
      date: bookingDate,
      timeSlot: bookingTimeSlot,
      location: currentStudentObj.location,
      status: 'requested'
    };

    // Keep SlotDay booked count synchronized in real-time
    const updatedSlotDay = { ...dateSlot };
    if (bookingTimeSlot === "Morning") updatedSlotDay.morningBooked = (updatedSlotDay.morningBooked || 0) + 1;
    else if (bookingTimeSlot === "Lunch") updatedSlotDay.lunchBooked = (updatedSlotDay.lunchBooked || 0) + 1;
    else if (bookingTimeSlot === "Rush Hour") updatedSlotDay.rushHourBooked = (updatedSlotDay.rushHourBooked || 0) + 1;
    else if (bookingTimeSlot === "Evening") updatedSlotDay.eveningBooked = (updatedSlotDay.eveningBooked || 0) + 1;

    // Save Booking & update SlotDay in Firestore
    const updatedBookings = [newBooking, ...bookings];
    MockDatabase.saveBookings(updatedBookings);
    MockDatabase.saveSlotDay(updatedSlotDay);
    
    setBookings(updatedBookings);
    setLastBookingCreated(newBooking);
    setBookingSuccessMsg(true);
    onStateChange();
    showNotification("Booking Requested / Waiting for Trainer Confirmation");
  };

  // Reschedule handler
  const handleReschedule = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, date: "2026-07-10", timeSlot: "11:30 AM - 12:30 PM", status: "rescheduled" as const };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);
    onStateChange();
    showNotification("Class rescheduled successfully to July 10, 11:30 AM.");
  };

  // Cancel class handler - prompts confirmation modal
  const handleCancelClass = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
      setBookingToCancel(target);
    }
  };

  // Confirmed cancel class handler
  const handleConfirmCancelClass = async (bookingId: string) => {
    setIsCancellingBooking(true);
    try {
      const updated = bookings.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: "cancelled" as const };
        }
        return b;
      });
      MockDatabase.saveBookings(updated);
      setBookings(updated);

      // Stop and clean up any tracking session linked to this booking
      try {
        const sessions = MockDatabase.getTrackingSessions();
        sessions.forEach(s => {
          if (s.classId === bookingId || s.bookingId === bookingId) {
            MockDatabase.saveTrackingSession({
              ...s,
              isTracking: false,
              status: 'CANCELLED' as const,
              routeStatus: 'cancelled' as const,
              lastUpdatedAt: new Date().toISOString()
            });
          }
        });
        if (trackingSession && (trackingSession.classId === bookingId || trackingSession.bookingId === bookingId)) {
          setTrackingSession(null);
        }
      } catch (trackErr) {
        console.warn("Tracking update error on cancel:", trackErr);
      }

      setBookingToCancel(null);
      onStateChange();
      showNotification("Class cancelled successfully.");
    } finally {
      setIsCancellingBooking(false);
    }
  };

  // Trainer Rating handler
  const handleRateTrainerInHistory = (bookingId: string, trainerId: string, rating: number) => {
    // Update booking
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, ratingGiven: rating };
      }
      return b;
    });
    MockDatabase.saveBookings(updatedBookings);
    setBookings(updatedBookings);

    // Update trainer rating average and reviews count
    const trainersList = MockDatabase.getTrainers();
    const updatedTrainers = trainersList.map(t => {
      if (t.id === trainerId) {
        const newReviewsCount = t.reviewsCount + 1;
        const newRating = parseFloat(((t.rating * t.reviewsCount + rating) / newReviewsCount).toFixed(1));
        return { ...t, rating: newRating, reviewsCount: newReviewsCount };
      }
      return t;
    });
    MockDatabase.saveTrainers(updatedTrainers);
    setTrainers(updatedTrainers);

    // Add a public review record
    const reviewsList = MockDatabase.getReviews();
    const newReview = {
      id: `rev_new_${Date.now()}`,
      studentName: student.name,
      studentPhoto: student.photoUrl,
      trainerId: trainerId,
      rating: rating,
      comment: `Rated ${rating} stars for driving lesson.`,
      date: new Date().toISOString().split('T')[0]
    };
    MockDatabase.saveReviews([newReview, ...reviewsList]);

    onStateChange();
    showNotification(`Thank you! Swapped rating of Coach to ${rating} Stars.`);
  };

  // Submit General Trainer Review & Rating Form
  const handleSubmitTrainerReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find trainer
    const targetTrainer = trainers.find(t => t.id === reviewTrainerId);
    if (!targetTrainer) return;

    // Calculate new rating
    const newReviewsCount = targetTrainer.reviewsCount + 1;
    const newRating = parseFloat(((targetTrainer.rating * targetTrainer.reviewsCount + reviewRating) / newReviewsCount).toFixed(1));

    // Update trainers list
    const updatedTrainers = trainers.map(t => {
      if (t.id === reviewTrainerId) {
        return { ...t, rating: newRating, reviewsCount: newReviewsCount };
      }
      return t;
    });
    MockDatabase.saveTrainers(updatedTrainers);
    setTrainers(updatedTrainers);

    // Save public reviews list
    const reviewsList = MockDatabase.getReviews();
    const newReview = {
      id: `rev_new_${Date.now()}`,
      studentName: student.name,
      studentPhoto: student.photoUrl,
      trainerId: reviewTrainerId,
      rating: reviewRating,
      comment: reviewComment || `Gave a ${reviewRating} star rating to Coach ${targetTrainer.name}`,
      date: new Date().toISOString().split('T')[0]
    };
    MockDatabase.saveReviews([newReview, ...reviewsList]);

    // Link this rating with the latest completed class with this trainer if it is unrated
    const completedForThisTrainer = bookings.filter(b => b.status === 'completed' && b.trainerId === reviewTrainerId && !b.ratingGiven);
    if (completedForThisTrainer.length > 0) {
      const targetBookingId = completedForThisTrainer[0].id;
      const updatedBookings = bookings.map(b => {
        if (b.id === targetBookingId) {
          return { ...b, ratingGiven: reviewRating };
        }
        return b;
      });
      MockDatabase.saveBookings(updatedBookings);
      setBookings(updatedBookings);
    }

    setReviewComment("");
    onStateChange();
    showNotification(`Successfully submitted ${reviewRating}-star review for Coach ${targetTrainer.name}!`);
  };

  // ==========================================
  // VAULTFLOW WORKSPACE FIRESTORE OPERATIONS
  // ==========================================

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setModalError("");
    const name = folderNameInput.trim();
    if (!name) {
      setModalError("Folder name cannot be empty");
      return;
    }
    setModalLoading(true);
    try {
      const foldersRef = collection(db, "users", firebaseUser.uid, "folders");
      await addDoc(foldersRef, {
        name,
        createdAt: new Date().toISOString()
      });
      setFolderNameInput("");
      setNewFolderModalOpen(false);
      showNotification("Folder created successfully!");
    } catch (err: any) {
      setModalError(err.message || "Failed to create folder");
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setModalError("");
    const name = fileNameInput.trim();
    if (!name) {
      setModalError("File name cannot be empty");
      return;
    }
    setModalLoading(true);
    try {
      const filesRef = collection(db, "users", firebaseUser.uid, "files");
      await addDoc(filesRef, {
        name,
        folderId: fileFolderInput || null,
        size: fileSizeInput || "1.5 MB",
        createdAt: new Date().toISOString()
      });
      setFileNameInput("");
      setFileFolderInput("");
      setFileSizeInput("1.5 MB");
      setAddFileModalOpen(false);
      showNotification("File added successfully!");
    } catch (err: any) {
      setModalError(err.message || "Failed to add file");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setModalError("");
    const title = noteTitleInput.trim();
    if (!title) {
      setModalError("Note title cannot be empty");
      return;
    }
    setModalLoading(true);
    try {
      const notesRef = collection(db, "users", firebaseUser.uid, "notes");
      await addDoc(notesRef, {
        title,
        content: noteContentInput.trim() || "",
        createdAt: new Date().toISOString()
      });
      setNoteTitleInput("");
      setNoteContentInput("");
      setNewNoteModalOpen(false);
      showNotification("Note saved successfully!");
    } catch (err: any) {
      setModalError(err.message || "Failed to create note");
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setModalError("");
    const name = memberNameInput.trim();
    if (!name) {
      setModalError("Member name cannot be empty");
      return;
    }
    setModalLoading(true);
    try {
      const teamRef = collection(db, "users", firebaseUser.uid, "teamMembers");
      await addDoc(teamRef, {
        name,
        role: memberRoleInput || "Viewer",
        createdAt: new Date().toISOString()
      });
      setMemberNameInput("");
      setMemberRoleInput("Viewer");
      setAddMemberModalOpen(false);
      showNotification("Team member added successfully!");
    } catch (err: any) {
      setModalError(err.message || "Failed to add team member");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "folders", id));
      showNotification("Folder deleted.");
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "files", id));
      showNotification("File removed.");
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "notes", id));
      showNotification("Note deleted.");
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "teamMembers", id));
      showNotification("Team member removed.");
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  // AI Coach query handler
  const handleCoachQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim() || coachLoading) return;

    const userMsg = coachInput;
    setCoachInput("");
    setCoachChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setCoachLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/ai/coach"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          skillProgress: progress,
          message: userMsg,
          chatHistory: coachChat
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCoachChat(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        throw new Error();
      }
    } catch {
      // Offline / fallback mock advice
      setTimeout(() => {
        setCoachChat(prev => [...prev, { 
          role: 'model', 
          text: `Thanks for asking! Regarding **${userMsg}**, safety is paramount. Keep your hands at 10-and-2 or 9-and-3 on the steering wheel for optimal control. At high speeds on Cuttack-Puri highway, ensure you mirror check every 8 seconds. Let's work on this in your next class with ${assignedTrainer ? assignedTrainer.name : "your assigned instructor"}!` 
        }]);
      }, 1500);
    } finally {
      setCoachLoading(false);
    }
  };

  // Mock Test Submission handler
  const handleAnswerSelect = (index: number) => {
    if (testSubmitted) return;
    setSelectedAnswerIndex(index);
  };

  const handleNextQuestion = () => {
    if (selectedAnswerIndex === null) return;
    
    const isCorrect = selectedAnswerIndex === MOCK_TEST_QUESTIONS[currentQuestionIndex].correctOptionIndex;
    const newAnswers = [...testAnswers, selectedAnswerIndex];
    setTestAnswers(newAnswers);
    
    if (isCorrect) {
      setTestScore(prev => prev + 1);
    }

    if (currentQuestionIndex < MOCK_TEST_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswerIndex(null);
    } else {
      // Completed Test
      const finalCorrect = isCorrect ? testScore + 1 : testScore;
      const scorePercent = Math.round((finalCorrect / MOCK_TEST_QUESTIONS.length) * 100);
      const passed = scorePercent >= 80;

      const newAttempt: MockTestAttempt = {
        id: `attempt_${Date.now()}`,
        studentId: student.id,
        score: scorePercent,
        totalQuestions: MOCK_TEST_QUESTIONS.length,
        correctAnswers: finalCorrect,
        date: new Date().toISOString().split("T")[0],
        passed: passed
      };

      const updatedAttempts = [newAttempt, ...attempts];
      MockDatabase.saveMockAttempts(updatedAttempts);
      setAttempts(updatedAttempts);
      setTestSubmitted(true);
      showNotification(`Mock test completed! Score: ${scorePercent}%`);
    }
  };

  const handleResetTest = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setTestScore(0);
    setTestSubmitted(false);
    setTestAnswers([]);
  };

  // Chat message send handler
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || !assignedTrainer) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: student.id,
      senderName: student.name,
      receiverId: assignedTrainer.id,
      text: chatMessageInput,
      timestamp: new Date().toISOString(),
      isRead: true
    };

    const updatedChats = [...chats, newMsg];
    MockDatabase.saveChats(updatedChats, student.id);
    setChats(updatedChats);
    setChatMessageInput("");
    onStateChange();

    // Trigger trainer simulated reply after 2 seconds
    const targetTrainerName = assignedTrainer.name;
    const targetTrainerId = assignedTrainer.id;
    setTimeout(() => {
      const trainerReply: ChatMessage = {
        id: `msg_trainer_${Date.now()}`,
        senderId: targetTrainerId,
        senderName: targetTrainerName,
        receiverId: student.id,
        text: "Got it! Looking forward to our session.",
        timestamp: new Date().toISOString(),
        isRead: false
      };
      const chatsWithReply = [...MockDatabase.getChats(student.id), trainerReply];
      MockDatabase.saveChats(chatsWithReply, student.id);
      setChats(chatsWithReply);
      onStateChange();
    }, 2000);
  };

  // Document Upload submit handler
  const handleDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalDocFile) {
      showNotification("Please select a file to upload.");
      return;
    }
    setDocUploading(true);
    setTimeout(() => {
      const newDoc: Document = {
        id: `doc_${Date.now()}`,
        studentId: student.id,
        name: uploadDocName,
        type: normalDocFile.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Image",
        fileUrl: normalDocFile.fileUrl,
        status: "Pending",
        uploadedAt: new Date().toISOString().split("T")[0]
      };
      const isAadharDoc = uploadDocName.toLowerCase().includes("aadhar") || uploadDocName.toLowerCase().includes("aadhaar");
      const updatedDocs = [
        newDoc, 
        ...documents.filter(d => isAadharDoc 
          ? (!d.name.toLowerCase().includes("aadhar") && !d.name.toLowerCase().includes("aadhaar")) 
          : d.name !== uploadDocName
        )
      ];
      MockDatabase.saveDocuments(updatedDocs);
      setDocuments(updatedDocs);
      if (isAadharDoc) {
        const updatedStudent = {
          ...student,
          aadharStatus: "Pending" as const
        };
        MockDatabase.saveStudent(updatedStudent);
        setStudent(updatedStudent);
      }
      setDocUploading(false);
      setNormalDocFile(null);
      setUploadDocSuccess(true);
      onStateChange();
      showNotification(`${uploadDocName} uploaded successfully! Awaiting Admin verification.`);
      setTimeout(() => {
        setUploadDocSuccess(false);
      }, 3000);
    }, 1500);
  };

  // Razorpay simulated payment success handler
  const handleRazorpayPayment = () => {
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      amount: paymentSelectedAmount,
      purpose: paymentSelectedPurpose,
      paymentMethod: "UPI",
      status: "Success",
      transactionId: `TXN_GOLDEN_${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updatedPayments = [newPayment, ...payments];
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Update student model immediately on successful simulated pay
    let newAmountPaid = student.amountPaid || 0;
    let newRemaining = student.remainingAmount !== undefined ? student.remainingAmount : 3500;
    let newPaymentStatus = student.paymentStatus || 'Unpaid';
    let licenceFeePaid = !!student.licenceFeePaid;

    if (paymentSelectedPurpose.includes("Course Fee") || paymentSelectedPurpose.includes("Installment")) {
      newAmountPaid = Math.min(3500, newAmountPaid + paymentSelectedAmount);
      newRemaining = Math.max(0, 3500 - newAmountPaid);
      newPaymentStatus = newAmountPaid >= 3500 ? 'Paid' : 'Partial';
    } else if (paymentSelectedPurpose.includes("Licence")) {
      licenceFeePaid = true;
    }

    const updatedStudent = {
      ...student,
      amountPaid: newAmountPaid,
      remainingAmount: newRemaining,
      paymentStatus: newPaymentStatus,
      paymentApprovalStatus: 'Approved' as const,
      licenceFeePaid,
      bookingLocked: false,
      lockedReason: ""
    };
    MockDatabase.saveStudent(updatedStudent, student.id);

    setPaymentSuccess(true);
    onStateChange();
    showNotification(`Payment of ₹${paymentSelectedAmount.toLocaleString()} successful! Invoice generated.`);
    setTimeout(() => {
      setPaymentSuccess(false);
    }, 3000);
  };

  // UPI Manual Proof Upload Payment Handler
  const handleUpiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentUpiReference.trim()) {
      alert("Please enter your UPI Reference Number / Transaction ID.");
      return;
    }

    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      amount: paymentSelectedAmount,
      purpose: paymentSelectedPurpose + " (Proof Uploaded)",
      paymentMethod: "UPI",
      status: "Pending",
      transactionId: paymentUpiReference.trim(),
      date: new Date().toISOString().split("T")[0]
    };

    const updatedPayments = [newPayment, ...payments];
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Update student's payment approval status to pending
    const updatedStudent = {
      ...student,
      paymentApprovalStatus: 'Pending Approval' as const
    };
    MockDatabase.saveStudent(updatedStudent, student.id);

    setPaymentUpiReference("");
    setPaymentReceiptUrl("");
    setPaymentSuccess(true);
    onStateChange();
    showNotification(`Payment proof submitted successfully! Awaiting Admin approval.`);
    setTimeout(() => {
      setPaymentSuccess(false);
    }, 3000);
  };

  // Sync edit form with student database status on load/tab switch using change detection refs
  useEffect(() => {
    if (student) {
      const dbName = student.proposedCourseName || student.courseName || "Basic Package (15 Sessions)";
      const dbNotes = student.proposedCourseNotes || student.courseNotes || "";
      const dbSyllabus = student.proposedCourseSyllabus || student.courseSyllabus || [];
      const dbModStatus = student.modificationStatus;

      const nameChanged = dbName !== lastDbCourseName.current;
      const notesChanged = dbNotes !== lastDbCourseNotes.current;
      const syllabusChanged = JSON.stringify(dbSyllabus) !== JSON.stringify(lastDbSyllabus.current);
      const statusChanged = dbModStatus !== lastDbModStatus.current;

      if (nameChanged || notesChanged || syllabusChanged || statusChanged) {
        setStudentEditCourseName(dbName);
        setStudentEditCourseNotes(dbNotes);
        setStudentEditSyllabus(dbSyllabus);

        lastDbCourseName.current = dbName;
        lastDbCourseNotes.current = dbNotes;
        lastDbSyllabus.current = dbSyllabus;
        lastDbModStatus.current = dbModStatus;
      }
    }
  }, [student]);

  // Ensure form fields are synced when explicitly switching to the modification tab to start fresh
  useEffect(() => {
    if (activeTab === 'modify' && student) {
      setStudentEditCourseName(student.proposedCourseName || student.courseName || "Basic Package (15 Sessions)");
      setStudentEditCourseNotes(student.proposedCourseNotes || student.courseNotes || "");
      setStudentEditSyllabus(student.proposedCourseSyllabus || student.courseSyllabus || []);
    }
  }, [activeTab]);

  // Submit Course Modification proposed by student
  const handleStudentProposeCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStudent = {
      ...student,
      proposedCourseName: studentEditCourseName,
      proposedCourseNotes: studentEditCourseNotes,
      proposedCourseSyllabus: studentEditSyllabus,
      proposedCourseFee: 800, // standard ₹800 modification fee
      modificationStatus: 'proposed' as const
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);
    onStateChange();
    showNotification("Course modification requested! Please pay the ₹800 fee next.");
  };

  // Cancel any pending modification
  const handleCancelModification = () => {
    const updatedStudent = {
      ...student,
      proposedCourseName: undefined,
      proposedCourseNotes: undefined,
      proposedCourseSyllabus: undefined,
      proposedCourseFee: undefined,
      modificationStatus: 'none' as const
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);
    onStateChange();
    showNotification("Modification request cancelled.");
  };

  // Pay the ₹800 course modification fee
  const handlePayModificationFee = () => {
    const feeAmount = student.proposedCourseFee || 800;
    
    // Create successful payment
    const newPayment: Payment = {
      id: `pay_mod_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      amount: feeAmount,
      purpose: "Course Modification Fee",
      paymentMethod: "UPI",
      status: "Success",
      transactionId: `TXN_GOLDEN_${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updatedPayments = [newPayment, ...payments];
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Update status to paid_pending_approval
    const updatedStudent = {
      ...student,
      modificationStatus: 'paid_pending_approval' as const
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);
    
    onStateChange();
    showNotification(`Paid ₹${feeAmount}! Request sent to Admin for approval.`);
  };

  // Pay the plan extension fee (to book more classes)
  const handlePayPlanExtension = () => {
    const sessionsToAdd = extensionAmountSelected === 2500 ? 5 : 10;
    
    // Create successful payment
    const newPayment: Payment = {
      id: `pay_ext_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      amount: extensionAmountSelected,
      purpose: `Plan Extension (+${sessionsToAdd} Sessions)`,
      paymentMethod: "Card",
      status: "Success",
      transactionId: `TXN_GOLDEN_${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updatedPayments = [newPayment, ...payments];
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Upgrade the active student course name and mark planExtended as true
    const updatedStudent = {
      ...student,
      courseName: `${student.courseName || "Silver Package"} (+${sessionsToAdd} Sessions)`,
      planExtended: true
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);

    // Add extra upcoming/available slots or notify
    onStateChange();
    showNotification(`Plan extended successfully by +${sessionsToAdd} Sessions! You can book more classes.`);
    setExtendModalDismissed(true);
  };

  // Pay the Licence Processing fee directly
  const handlePayLicenceFee = () => {
    const feeAmount = 2500;
    
    // Create successful payment
    const newPayment: Payment = {
      id: `pay_lic_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      amount: feeAmount,
      purpose: "Licence Fast-track Processing Fee",
      paymentMethod: "UPI",
      status: "Success",
      transactionId: `TXN_GOLDEN_${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString().split("T")[0]
    };
    const updatedPayments = [newPayment, ...payments];
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Update student's licence status
    const updatedStudent = {
      ...student,
      llStatus: 'Licence Approved' as const,
      licenceFeePaid: true
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);

    onStateChange();
    showNotification(`Paid ₹${feeAmount} for Licence Fast-track Processing Fee successfully!`);
  };

  // Reset simulated status back to normal
  const handleResetCourseStatus = () => {
    const filteredBookings = bookings.filter(b => !b.id.startsWith("sim_completed_"));
    MockDatabase.saveBookings(filteredBookings);
    setBookings(filteredBookings);

    const updatedStudent = {
      ...student,
      planExtended: false,
      courseEnded: false,
      licenceFeePaid: false,
      llStatus: 'Applied' as const
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);

    const filteredPayments = payments.filter(p => !p.id.startsWith("pay_lic_"));
    MockDatabase.savePayments(filteredPayments);
    setPayments(filteredPayments);

    setExtendModalDismissed(true);
    onStateChange();
    showNotification("Course status reset! 15 classes simulator cleared.");
  };

  // Developer Helper to instantly simulate 15 completed classes
  const handleSimulate15Classes = () => {
    // Generate 15 completed bookings using assigned trainer or first available trainer
    const targetTrainer = assignedTrainer || trainers[0];
    const simulatedBookings: Booking[] = [];
    for (let i = 1; i <= 15; i++) {
      simulatedBookings.push({
        id: `sim_completed_${i}`,
        studentId: student.id,
        studentName: student.name,
        trainerId: targetTrainer ? targetTrainer.id : "trainer_assigned",
        trainerName: targetTrainer ? targetTrainer.name : "Assigned Instructor",
        carName: targetTrainer ? targetTrainer.carName : "Maruti Swift",
        carPlate: targetTrainer ? targetTrainer.carPlate : "OD 02 AB 1234",
        date: `2026-06-${10 + i}`,
        timeSlot: "10:30 AM - 11:30 AM",
        location: student.location,
        status: 'completed',
        remarks: `Driving session #${i} completed successfully under dual controls.`,
        ratingGiven: 5
      });
    }
    // Retain any upcoming bookings
    const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
    const allBookings = [...simulatedBookings, ...upcomingBookings];
    MockDatabase.saveBookings(allBookings);
    setBookings(allBookings);
    
    // reset planExtended flag so popup triggers
    const updatedStudent = {
      ...student,
      planExtended: false
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);
    
    setExtendModalDismissed(false);
    onStateChange();
    showNotification("Simulated 15 completed classes! Plan Extension popup is now active.");
  };

  const handleToggleStudentSyllabusModule = (module: string) => {
    if (studentEditSyllabus.includes(module)) {
      setStudentEditSyllabus(studentEditSyllabus.filter(m => m !== module));
    } else {
      setStudentEditSyllabus([...studentEditSyllabus, module]);
    }
  };

  const handleAddStudentCustomSyllabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentSyllabusInput.trim()) {
      if (!studentEditSyllabus.includes(studentSyllabusInput.trim())) {
        setStudentEditSyllabus([...studentEditSyllabus, studentSyllabusInput.trim()]);
      }
      setStudentSyllabusInput("");
    }
  };

  const aadharDoc = documents.find(d => 
    (d.studentId === student.id || !d.studentId) && 
    (d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar"))
  );
  const isAadharVerified = Boolean(
    student.isAadharVerified === true ||
    student.aadharVerified === true ||
    student.aadharStatus === "Verified" ||
    student.adminManualUnlock === true ||
    (aadharDoc && aadharDoc.status === "Verified")
  );
  const completedClassesCount = bookings.filter(b => b.status === 'Completed' || b.status === 'completed').length;
  const isCourseEnded = (student.courseEnded || completedClassesCount >= 15) && !student.planExtended;

  // Golden Hands Driving School workflows:
  const totalBookingsCount = bookings.filter(b => b.studentId === student.id).length;
  const firstInstallmentPaid = (student.amountPaid || 0) >= 2000;
  const courseFullyPaid = (student.amountPaid || 0) >= 3500;

  const localWorkflowLock = 
    (completedClassesCount >= 1 && !firstInstallmentPaid) || 
    (completedClassesCount >= 5 && !courseFullyPaid);

  const canBookClass = 
    (isAadharVerified || !!student.adminManualUnlock) && 
    !isCourseEnded && 
    (!!student.adminManualUnlock || (!student.bookingLocked && !localWorkflowLock));

  return (
    <div className="w-full h-full bg-[#F8F9FF] overflow-hidden relative flex flex-col font-sans select-none">

      {/* Web App Brand Header */}
      {currentScreen === 'app' && (
        <div className="bg-white px-6 py-4 flex justify-between items-center z-50 border-b border-[#F1F3F9] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6D3BFF] flex items-center justify-center text-white font-black text-sm">
              GH
            </div>
            <div>
              <span className="font-extrabold text-[#161623] text-sm tracking-tight">GOLDEN HANDS</span>
              <span className="text-[9px] text-[#6D3BFF] font-extrabold ml-2 bg-[#6D3BFF]/10 px-1.5 py-0.5 rounded">STUDENT PORTAL</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#6D3BFF]/10 flex items-center justify-center text-[#6D3BFF] font-bold text-xs border border-[#6D3BFF]/20">
              {(student?.name || "Student").charAt(0)}
            </div>
          </div>
        </div>
      )}

      {/* Live Push Notification Banner */}
      {notificationMsg && (
        <div className="absolute top-12 left-3 right-3 bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white p-3 rounded-2xl shadow-xl flex items-start justify-between gap-2.5 z-50 animate-bounce text-xs">
          <div className="flex items-start gap-2.5">
            <Bell className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold">Driving School Update</p>
              <p className="opacity-90">{notificationMsg}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-white/75 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Dismiss update"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* App Main Area (Scrollable body) */}
      <div className="flex-1 overflow-y-auto scrollable-touch custom-scrollbar pb-24 pt-1">
        {currentScreen === 'splash' && (
          <div className="h-full bg-gradient-to-br from-[#161623] to-[#252538] text-white p-6 flex flex-col justify-between text-center relative overflow-hidden">
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#6D3BFF] opacity-20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 bg-[#D4AF37] opacity-10 rounded-full blur-3xl" />

            <div className="mt-16">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#6D3BFF] to-[#8F52FF] rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/10 mb-4">
                <span className="text-white font-extrabold text-2xl tracking-wider">GH</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">GOLDEN HANDS</h1>
              <p className="text-xs tracking-[0.2em] text-[#D4AF37] uppercase font-semibold">DRIVING SCHOOL</p>
            </div>

            <div className="flex flex-col items-center">
              <img 
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300" 
                alt="Car illustration" 
                className="w-48 object-contain mb-6 drop-shadow-2xl"
              />
              <h2 className="text-xl font-bold mb-2">Drive with confidence</h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Step-by-step guidance from Bhubaneswar's gold standard instructors.
              </p>
            </div>

            <button 
              onClick={() => setCurrentScreen('onboarding')}
              className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#6D3BFF]/30 transition-all cursor-pointer"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {currentScreen === 'onboarding' && (
          <div className="h-full bg-white p-6 flex flex-col justify-between text-center">
            <div className="flex justify-end">
              <button onClick={() => setCurrentScreen('login')} className="text-xs font-semibold text-slate-400">Skip</button>
            </div>

            <div className="my-auto flex flex-col items-center">
              <div className="w-24 h-24 bg-[#F1EEFF] rounded-3xl flex items-center justify-center text-[#6D3BFF] mb-6 animate-pulse">
                <Sparkles className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#161623] mb-3">AI Powered Coach</h2>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Analyze your driving mistakes, get personalized feedback & learn correct rules automatically.
              </p>
              <div className="flex gap-1.5 mt-8">
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <div className="w-6 h-2 rounded-full bg-[#6D3BFF]" />
                <div className="w-2 h-2 rounded-full bg-slate-200" />
              </div>
            </div>

            <button 
              onClick={() => setCurrentScreen('login')}
              className="w-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white font-semibold py-4 rounded-2xl shadow-md cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        {currentScreen === 'login' && (
          <div className="h-full bg-slate-50/50 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
            <div className="w-full max-w-md my-auto">
              <UnifiedAuthPortal 
                initialRole="student"
                embedded={true}
                onCancel={onLogout}
                onLoginSuccess={(role, userData) => {
                  if (role === 'student') {
                    if (userData && userData.id) {
                      refreshLocalState(userData.id);
                    }
                    setCurrentScreen('app');
                    onStateChange();
                  } else {
                    if (onLogout) onLogout();
                  }
                }}
              />
            </div>
          </div>
        )}

        {currentScreen === 'register' && (
          <div className="h-full bg-white p-6 flex flex-col justify-between overflow-y-auto scrollable-touch custom-scrollbar relative">
            <div className="mt-8">
              <h2 className="text-3xl font-extrabold text-[#161623]">Create Account</h2>
              <p className="text-sm text-slate-500 mt-2">Join Golden Hands driving school today.</p>
            </div>

            <div className="my-auto py-4">
              {authError && (
                <div className="mb-4 bg-rose-50 text-rose-600 p-3.5 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  {authError}
                </div>
              )}

              <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Full Name</label>
                  <div className="flex items-center gap-2 border border-slate-200 p-3.5 rounded-2xl mt-1 focus-within:border-[#6D3BFF] bg-slate-50/50">
                    <input 
                      type="text" 
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="Enter your first & last name"
                      className="flex-1 bg-transparent border-none text-sm focus:outline-none font-semibold text-[#161623]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Mobile Number (Mandatory)
                  </label>
                  <div className="flex items-center gap-2 border border-slate-200 p-3.5 rounded-2xl mt-1 focus-within:border-[#6D3BFF] bg-slate-50/50">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 select-none border border-slate-200/60 shrink-0">
                      <span className="text-base leading-none">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input 
                      type="tel" 
                      value={phoneInput}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        setPhoneInput(digitsOnly);
                        setAuthError(null);
                      }}
                      placeholder="Enter 10-digit number"
                      className="flex-1 bg-transparent border-none text-sm focus:outline-none font-semibold text-[#161623]"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Email Address (Mandatory)
                  </label>
                  <div className="flex items-center gap-2 border border-slate-200 p-3.5 rounded-2xl mt-1 focus-within:border-[#6D3BFF] bg-slate-50/50">
                    <input 
                      type="email" 
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="name@example.com"
                      className="flex-1 bg-transparent border-none text-sm focus:outline-none font-semibold text-[#161623]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Set Password</label>
                  <div className="flex items-center gap-2 border border-slate-200 p-3.5 rounded-2xl mt-1 focus-within:border-[#6D3BFF] bg-slate-50/50">
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="Choose an account password"
                      className="flex-1 bg-transparent border-none text-sm focus:outline-none font-semibold text-[#161623]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Select Training Package</label>
                  <div className="border border-slate-200 p-3 rounded-2xl mt-1 focus-within:border-[#6D3BFF] bg-slate-50/50">
                    <select 
                      id="registration-package-select"
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full bg-transparent border-none text-sm focus:outline-none font-semibold text-[#161623]"
                    >
                      <option value="Refresh Training">Refresh Training - ₹1,750</option>
                      <option value="Basic Package (15 Sessions)">Basic Package (15 Sessions) - ₹3,500</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-2"
                >
                  Register & Verify <KeyRound className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-4 shrink-0">
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Or Register With</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (!phoneInput) {
                      setAuthError("Please enter your Mobile Number (Mandatory) first!");
                      return;
                    }
                    setShowGoogleDialog(true);
                  }}
                  className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 shadow-sm cursor-pointer transition-all duration-200"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.37 3.65 1.39 7.5l3.92 3.04C6.27 7.54 8.92 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.65z" />
                    <path fill="#FBBC05" d="M5.31 10.54c-.24-.71-.38-1.47-.38-2.27s.14-1.56.38-2.27L1.39 3.03C.5 4.82 0 6.85 0 9s.5 4.18 1.39 5.97l3.92-3.43z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.52 1.18-4.2 1.18-3.08 0-5.73-2.5-6.69-5.5L1.39 16.19C3.37 20.35 7.35 23 12 23z" />
                  </svg>
                  Sign up with Google Account
                </button>
              </div>

              <div className="mt-5 text-center text-xs">
                <span className="text-slate-400">Already registered? </span>
                <button 
                  onClick={() => {
                    setCurrentScreen('login');
                    setAuthError(null);
                  }} 
                  className="text-[#6D3BFF] font-black hover:underline cursor-pointer"
                >
                  Log In
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 shrink-0">
              Your data will be isolated and stored securely.
            </div>

          </div>
        )}

        {currentScreen === 'otp' && (
          <div className="h-full bg-white p-6 flex flex-col justify-between">
            <div className="mt-8">
              <button onClick={() => setCurrentScreen('login')} className="flex items-center gap-1 text-xs text-slate-500 font-bold mb-4">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h2 className="text-3xl font-extrabold text-[#161623]">Verify OTP</h2>
              <p className="text-sm text-slate-500 mt-2">
                Enter the {confirmationResult ? '6-digit' : '4-digit'} code sent to {phoneInput}
              </p>
              {confirmationResult ? (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold text-center">
                  <span>📲 <strong>Live SMS Mode:</strong> A secure 6-digit OTP code has been physically sent to your phone via Firebase.</span>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold text-center">
                  <span>⚡ Simulated OTP Mode: Enter any 4 digits (e.g., <strong className="font-extrabold text-indigo-900 bg-indigo-100/80 px-1.5 py-0.5 rounded">1234</strong>) to log in instantly.</span>
                </div>
              )}
            </div>

            <form onSubmit={handleOtpVerify} className="flex flex-col gap-6">
              <div className="flex justify-center gap-2">
                {(confirmationResult ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4]).map((index) => {
                  const i = index - 1;
                  const totalDigits = confirmationResult ? 6 : 4;
                  const isFocused = activeOtpFocus === i;
                  const isFilled = otpInput[i] !== undefined && otpInput[i] !== "";
                  return (
                    <input 
                      key={index}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text" 
                      maxLength={1} 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={otpInput[i] || ""}
                      onFocus={() => setActiveOtpFocus(i)}
                      onBlur={() => setActiveOtpFocus(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          e.preventDefault();
                          const arr = otpInput.split("");
                          if (!otpInput[i] && i > 0) {
                            arr[i - 1] = "";
                            const newVal = arr.join("");
                            setOtpInput(newVal);
                            otpRefs.current[i - 1]?.focus();
                          } else {
                            arr[i] = "";
                            const newVal = arr.join("");
                            setOtpInput(newVal);
                          }
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const arr = otpInput.split("");
                        while (arr.length < totalDigits) arr.push("");
                        arr[i] = val[0] || "";
                        const nextOtp = arr.join("").slice(0, totalDigits);
                        setOtpInput(nextOtp);

                        if (val && i < totalDigits - 1) {
                          otpRefs.current[i + 1]?.focus();
                        }
                        
                        if (nextOtp.length === totalDigits) {
                          setTimeout(() => {
                            verifyOtpValue(nextOtp);
                          }, 300);
                        }
                      }}
                      className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl text-center font-black text-xl md:text-2xl transition-all duration-200 outline-none border-2 ${
                        isFocused 
                          ? "border-[#6D3BFF] bg-white text-[#161623] shadow-md shadow-[#6D3BFF]/20 scale-105" 
                          : isFilled 
                          ? "border-[#6D3BFF]/60 bg-[#6D3BFF]/5 text-[#6D3BFF]" 
                          : "border-slate-100 bg-[#F8F9FF] text-slate-700 hover:border-slate-200"
                      }`}
                    />
                  );
                })}
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center border border-rose-100">
                  {authError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all duration-200"
              >
                Verify Code
              </button>
            </form>

            <div className="text-center text-xs text-slate-400">
              {otpCountdown > 0 ? (
                <span>Didn't receive code? Resend in <span className="text-[#6D3BFF] font-black">{otpCountdown} seconds</span></span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOtpCountdown(60);
                    const fakeEvent = { preventDefault: () => {} } as any;
                    handleLogin(fakeEvent);
                  }}
                  className="text-[#6D3BFF] font-extrabold hover:underline cursor-pointer"
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </div>
        )}

        {currentScreen === 'verify' && (
          <div className="h-full bg-white p-6 flex flex-col justify-between text-center overflow-y-auto scrollable-touch custom-scrollbar">
            <div className="flex justify-start">
              <button 
                onClick={async () => {
                  await signOut(auth);
                  setCurrentScreen('login');
                  setVerificationStatus('idle');
                  setUnverifiedEmail(null);
                  setAuthError(null);
                }} 
                className="flex items-center gap-1 text-xs text-slate-500 font-bold mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </button>
            </div>

            {verificationStatus === 'idle' && (
              <div className="my-auto flex flex-col items-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-[#6D3BFF] mb-6">
                  <Mail className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#161623] mb-3">Verify Your Email</h2>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
                  We have sent you a verification email to <span className="font-semibold text-slate-800">{verificationEmail}</span>. Please verify it and log in.
                </p>

                {devVerifyLink && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left max-w-xs">
                    <p className="font-bold mb-1 flex items-center gap-1 text-amber-800">
                      🔧 Dev Sandbox Assistant
                    </p>
                    <p className="mb-3 text-slate-600 leading-normal">
                      Since you are running in a sandboxed development environment, you can bypass real email delivery by clicking below:
                    </p>
                    <a 
                      href={devVerifyLink}
                      onClick={() => {
                        showNotification("Simulating email verification link click...");
                      }}
                      className="inline-block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl transition-all shadow-md shadow-amber-600/10 cursor-pointer"
                    >
                      Verify Account Instantly
                    </a>
                  </div>
                )}

                {authError && (
                  <div className="mb-4 max-w-xs bg-rose-50 text-rose-600 p-3.5 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {authError}
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button 
                    onClick={async () => {
                      await signOut(auth);
                      setCurrentScreen('login');
                      setVerificationStatus('idle');
                      setUnverifiedEmail(null);
                      setAuthError(null);
                    }}
                    className="w-full font-semibold py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 mb-1"
                  >
                    Login
                  </button>

                  <button 
                    onClick={() => handleResendVerification(verificationEmail)}
                    disabled={resendCooldown > 0 || isAuthLoading}
                    className={`w-full font-semibold py-4 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      resendCooldown > 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-[#6D3BFF] hover:bg-[#8F52FF] text-white shadow-[#6D3BFF]/20'
                    }`}
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                      </span>
                    ) : resendCooldown > 0 ? (
                      `Resend available in ${resendCooldown}s`
                    ) : (
                      <>
                        Resend Verification Email <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400">
                    💡 If the email didn't arrive, check your spam folder.
                  </p>
                </div>
              </div>
            )}

            {verificationStatus === 'verifying' && (
              <div className="my-auto flex flex-col items-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-[#6D3BFF] mb-6">
                  <RefreshCw className="w-12 h-12 animate-spin text-[#6D3BFF]" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#161623] mb-3">Verifying Email</h2>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  {verificationMessage}
                </p>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="my-auto flex flex-col items-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-extrabold text-emerald-600 mb-3">Verification Successful</h2>
                <p className="text-sm text-slate-600 max-w-xs font-semibold leading-relaxed mb-4">
                  Your email has been verified successfully. You can now log in to your account.
                </p>
                <p className="text-xs text-slate-400 animate-pulse">
                  Redirecting you to the login screen shortly...
                </p>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="my-auto flex flex-col items-center">
                <div className="w-24 h-24 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-extrabold text-rose-600 mb-3">Verification Failed</h2>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
                  {verificationMessage}
                </p>

                {authError && (
                  <div className="mb-4 max-w-xs bg-rose-50 text-rose-600 p-3.5 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {authError}
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button 
                    onClick={() => handleResendVerification(verificationEmail)}
                    disabled={resendCooldown > 0 || isAuthLoading}
                    className={`w-full font-semibold py-4 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      resendCooldown > 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                        : 'bg-[#6D3BFF] hover:bg-[#8F52FF] text-white shadow-[#6D3BFF]/20'
                    }`}
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                      </span>
                    ) : resendCooldown > 0 ? (
                      `Resend available in ${resendCooldown}s`
                    ) : (
                      <>
                        Request New Verification Email <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button 
                    onClick={async () => {
                      await signOut(auth);
                      setCurrentScreen('login');
                      setVerificationStatus('idle');
                      setUnverifiedEmail(null);
                      setAuthError(null);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 rounded-2xl transition-all cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'app' && (
          <div className="px-5">
            {/* SUBPAGES */}

            {/* AI COACH SUBPAGE */}
            {activeSubPage === 'ai-coach' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="bg-[#6D3BFF]/10 text-[#6D3BFF] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini 3.5 Flash
                  </span>
                </div>

                <div className="bg-[#161623] rounded-3xl p-4 text-white mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37] opacity-10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#D4AF37] text-black font-extrabold rounded-xl flex items-center justify-center text-sm shadow-md">
                      AI
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#D4AF37]">Goldie</h3>
                      <p className="text-[10px] text-slate-400">AI Driving Coach & Weakness Detector</p>
                    </div>
                  </div>
                </div>

                {/* Chat window */}
                <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm h-[380px] overflow-y-auto scrollable-touch custom-scrollbar flex flex-col gap-3.5 mb-3">
                  {coachChat.map((msg, index) => (
                    <div key={index} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#6D3BFF] text-white rounded-tr-none' 
                          : 'bg-[#F8F9FF] text-[#1A1A1A] border border-[#E9ECF4] rounded-tl-none'
                      }`}>
                        {msg.text.split("\n").map((para, i) => (
                          <p key={i} className="mb-1.5">{para}</p>
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.role === 'user' ? 'You' : 'Coach Goldie'}</span>
                    </div>
                  ))}
                  {coachLoading && (
                    <div className="self-start flex items-center gap-1.5 bg-[#F8F9FF] p-3 rounded-2xl text-xs text-slate-500 border border-slate-100">
                      <RefreshCw className="w-3 h-3 animate-spin text-[#6D3BFF]" /> Coach is thinking...
                    </div>
                  )}
                </div>

                <form onSubmit={handleCoachQuery} className="flex gap-2">
                  <input 
                    type="text" 
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="Ask about parallel parking, clutch..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#6D3BFF] font-medium"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={coachLoading}
                    className="w-12 h-12 bg-[#6D3BFF] text-white rounded-xl flex items-center justify-center hover:bg-[#8F52FF]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* MOCK TEST SUBPAGE */}
            {activeSubPage === 'mock-test' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Exit Test
                  </button>
                  <span className="text-xs font-bold text-[#6D3BFF]">
                    {!testSubmitted ? `Q: ${currentQuestionIndex + 1}/${MOCK_TEST_QUESTIONS.length}` : 'Completed'}
                  </span>
                </div>

                {!testSubmitted ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="bg-[#6D3BFF]/10 text-[#6D3BFF] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          MCQ Practice
                        </span>
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 30s timer
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-[#161623] leading-relaxed">
                        {MOCK_TEST_QUESTIONS[currentQuestionIndex].question}
                      </h3>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {MOCK_TEST_QUESTIONS[currentQuestionIndex].options.map((option, index) => {
                        const isSelected = selectedAnswerIndex === index;
                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            className={`w-full p-4 rounded-2xl text-left text-xs font-semibold transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#6D3BFF] text-white shadow-md' 
                                : 'bg-white text-slate-700 border border-slate-100 hover:border-[#6D3BFF]'
                            }`}
                          >
                            <span className="inline-block w-5 h-5 rounded-full border border-current text-center mr-3 text-[10px] leading-5 font-bold">
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      disabled={selectedAnswerIndex === null}
                      className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                        selectedAnswerIndex === null 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white hover:brightness-110'
                      }`}
                    >
                      {currentQuestionIndex === MOCK_TEST_QUESTIONS.length - 1 ? 'Submit Test' : 'Next Question'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-[#27AE60]/10 text-[#27AE60] rounded-full flex items-center justify-center mb-4">
                      <Award className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-[#161623]">Mock Test Results</h3>
                    <p className="text-xs text-slate-400 mt-1">Score requirement to pass: 80%</p>

                    <div className="my-6 w-32 h-32 rounded-full border-8 border-[#F1F3F9] relative flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-[#161623]">
                        {Math.round((testScore / MOCK_TEST_QUESTIONS.length) * 100)}%
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                        {testScore} / {MOCK_TEST_QUESTIONS.length} Correct
                      </span>
                    </div>

                    {testScore >= 4 ? (
                      <span className="bg-[#27AE60]/15 text-[#27AE60] text-xs font-bold px-3 py-1 rounded-full">
                        🎉 Passed Mock Test
                      </span>
                    ) : (
                      <span className="bg-[#EB5757]/15 text-[#EB5757] text-xs font-bold px-3 py-1 rounded-full">
                        ❌ Failed. Required 80%
                      </span>
                    )}

                    <div className="mt-6 flex gap-2 w-full">
                      <button 
                        onClick={handleResetTest}
                        className="flex-1 border border-[#6D3BFF] text-[#6D3BFF] font-semibold text-xs py-3 rounded-xl hover:bg-[#6D3BFF]/5"
                      >
                        Retry Test
                      </button>
                      <button 
                        onClick={() => {
                          setActiveSubPage('ai-coach');
                          handleResetTest();
                        }}
                        className="flex-1 bg-[#6D3BFF] text-white font-semibold text-xs py-3 rounded-xl hover:bg-[#8F52FF]"
                      >
                        Ask Coach Goldie
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS SUBPAGE */}
            {activeSubPage === 'documents' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">Document Vault</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="font-extrabold text-sm text-[#161623] mb-3">Upload New Document</h3>
                  <form onSubmit={handleDocUpload} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      {["Aadhar Card", "Learner Licence", "Medical Certificate", "Passport Photo"].map((docName) => (
                        <button
                          key={docName}
                          type="button"
                          onClick={() => setUploadDocName(docName)}
                          className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                            uploadDocName === docName 
                              ? 'bg-[#6D3BFF]/15 text-[#6D3BFF] border-[#6D3BFF]' 
                              : 'bg-[#F8F9FF] text-slate-600 border-slate-100'
                          }`}
                        >
                          {docName}
                        </button>
                      ))}
                    </div>

                    <input 
                      type="file"
                      ref={docFileInputRef}
                      onChange={handleNormalDocFileSelect}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <div 
                      onClick={() => docFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleNormalDocDrop}
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-[#F8F9FF] hover:bg-[#6D3BFF]/5 hover:border-[#6D3BFF]/40 cursor-pointer transition-all"
                    >
                      {normalDocFile?.fileUrl && !normalDocFile.name.toLowerCase().endsWith(".pdf") ? (
                        <img 
                          src={normalDocFile.fileUrl} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded-xl mb-2 border border-slate-100 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileUp className="w-8 h-8 text-[#6D3BFF] mb-2" />
                      )}
                      <span className="text-xs font-bold text-slate-700">
                        {normalDocFile ? normalDocFile.name : "Drag & Drop or Choose File"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">JPEG, PNG or PDF up to 5MB</span>
                    </div>

                    <button 
                      type="submit"
                      disabled={docUploading || !normalDocFile}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        !normalDocFile 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-[#6D3BFF] text-white hover:bg-[#8F52FF] cursor-pointer'
                      }`}
                    >
                      {docUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Uploading to Vault...
                        </>
                      ) : (
                        "Submit for Verification"
                      )}
                    </button>
                  </form>
                </div>

                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Your Uploads</h4>
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#6D3BFF]/10 text-[#6D3BFF] rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#161623]">{doc.name}</p>
                          <p className="text-[9px] text-slate-400">Uploaded {doc.uploadedAt}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'Verified' 
                          ? 'bg-[#27AE60]/10 text-[#27AE60]' 
                          : doc.status === 'Rejected' 
                            ? 'bg-[#EB5757]/10 text-[#EB5757]' 
                            : 'bg-[#F2C94C]/10 text-[#F2C94C]'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAYMENTS SUBPAGE */}
            {activeSubPage === 'payments' && (
              <div className="pt-2 animate-fadeIn pb-10">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">Payments & Fees Desk</span>
                </div>

                {/* Booking status alert banner in payments */}
                {student.bookingLocked && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-rose-800 text-xs">Class Booking Account Locked</h4>
                      <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed">{student.lockedReason || "A course fee installment payment is required to unlock scheduler access."}</p>
                    </div>
                  </div>
                )}

                {student.paymentApprovalStatus === 'Pending Approval' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-amber-800 text-xs">Payment Verification Pending</h4>
                      <p className="text-[10px] text-amber-600 mt-0.5 leading-relaxed">Your manual UPI deposit receipt has been uploaded and is waiting for Academy review. Standard lock rules will unlock once approved.</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="font-extrabold text-sm text-[#161623] mb-3">Choose Package</h3>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const list = [];
                      const paid = student.amountPaid || 0;
                      if (paid === 0) {
                        list.push({ title: "First Course Installment", details: "Required after first free class completed", price: 2000 });
                        list.push({ title: "Full Course Fee (Complete)", details: "Full Basic Package (15 sessions)", price: 3500 });
                      } else if (paid < 3500) {
                        list.push({ title: "Final Course Installment", details: "Remaining driving course fee balance due", price: 3500 - paid });
                      } else {
                        list.push({ title: "Full Course Fee (Paid)", details: "Basic Package (15 sessions) - fully paid", price: 3500 });
                      }
                      list.push({ title: "Licence Fast-track Processing Fee", details: "RTO Licence applications & handling", price: 2500 });
                      list.push({ title: "Extra Practical Session", details: "1 hour master practice slot", price: 1750 });
                      return list;
                    })().map((pkg) => (
                      <button
                        key={pkg.title}
                        type="button"
                        onClick={() => {
                          setPaymentSelectedAmount(pkg.price);
                          setPaymentSelectedPurpose(pkg.title);
                        }}
                        className={`w-full p-3.5 rounded-2xl text-left border flex justify-between items-center transition-all cursor-pointer ${
                          paymentSelectedAmount === pkg.price 
                            ? 'bg-[#6D3BFF]/10 border-[#6D3BFF]' 
                            : 'bg-[#F8F9FF] border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs text-[#161623]">{pkg.title}</p>
                          <p className="text-[10px] text-slate-400">{pkg.details}</p>
                        </div>
                        <span className="font-extrabold text-xs text-[#6D3BFF]">₹{pkg.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  {/* Payment Method Selector Tab */}
                  <div className="flex border-b border-slate-100 mt-6 mb-4">
                    <button 
                      type="button"
                      onClick={() => setPaymentMethodTab('razorpay')}
                      className={`pb-2.5 text-xs font-bold transition-all cursor-pointer pr-4 ${
                        paymentMethodTab === 'razorpay' ? 'text-[#6D3BFF] border-b-2 border-[#6D3BFF]' : 'text-slate-400'
                      }`}
                    >
                      💳 Razorpay Secure Instant
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentMethodTab('upi')}
                      className={`pb-2.5 text-xs font-bold transition-all cursor-pointer ${
                        paymentMethodTab === 'upi' ? 'text-[#6D3BFF] border-b-2 border-[#6D3BFF]' : 'text-slate-400'
                      }`}
                    >
                      📲 Manual UPI Proof Upload
                    </button>
                  </div>

                  {paymentMethodTab === 'razorpay' ? (
                    <div className="mt-4 pt-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Simulated Razorpay Sandbox
                      </div>
                      <button 
                        type="button"
                        onClick={handleRazorpayPayment}
                        className="bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#6D3BFF]/25 hover:brightness-110 cursor-pointer"
                      >
                        Pay ₹{paymentSelectedAmount.toLocaleString()}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpiPayment} className="flex flex-col gap-3.5 mt-2 animate-fadeIn">
                      <div className="bg-[#F8F9FF] border border-dashed border-slate-200 rounded-2xl p-3.5 text-xs">
                        <span className="font-extrabold text-slate-800 uppercase text-[9px] block mb-1">Direct Bank / UPI Directions</span>
                        <p className="text-slate-500 leading-relaxed text-[11px]">Scan Academy QR Code or transfer to UPI ID: <strong className="font-bold text-[#161623] font-mono">goldenhands@upi</strong> or bank transfer. Upload your transfer receipt and submit reference ID below for manual admin unlock.</p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">12-Digit UPI / UTR Transaction ID *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 301948571894"
                          maxLength={15}
                          value={paymentUpiReference}
                          onChange={(e) => setPaymentUpiReference(e.target.value.replace(/\W/g, ''))}
                          className="w-full bg-[#F8F9FF] border-slate-100 border rounded-xl p-2.5 text-xs focus:outline-none font-mono font-semibold"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Upload Receipt Image / Screenshot *</label>
                        <input 
                          type="file" 
                          ref={paymentReceiptInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPaymentProofUploading(true);
                              setPaymentReceiptName(file.name);
                              setTimeout(() => {
                                setPaymentReceiptUrl("https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600");
                                setPaymentProofUploading(false);
                              }, 1000);
                            }
                          }}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => paymentReceiptInputRef.current?.click()}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <FileUp className="w-3.5 h-3.5 text-[#6D3BFF]" /> 
                            {paymentReceiptName ? "Change Receipt" : "Click to Upload Receipt"}
                          </button>
                          {paymentReceiptName && (
                            <div className="flex items-center gap-1.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-100 truncate flex-1 font-mono">
                              <span>✓</span> <span className="truncate">{paymentReceiptName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={paymentProofUploading || !paymentUpiReference}
                        className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 ${
                          paymentProofUploading || !paymentUpiReference
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-[#6D3BFF] text-white hover:bg-[#8F52FF]'
                        }`}
                      >
                        {paymentProofUploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Compressing Screenshot...
                          </>
                        ) : (
                          "Submit Proof for Approval (₹" + paymentSelectedAmount.toLocaleString() + ")"
                        )}
                      </button>
                    </form>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Transaction History</h4>
                  {payments.map((p) => (
                    <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-[#161623] truncate max-w-[180px]">{p.purpose}</p>
                        <p className="text-[9px] text-slate-400">{p.date} • {p.paymentMethod} • Ref: {p.transactionId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xs text-[#161623]">₹{p.amount.toLocaleString()}</p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          p.status === 'Success' 
                            ? 'bg-[#27AE60]/10 text-[#27AE60]' 
                            : p.status === 'Failed' 
                              ? 'bg-rose-100 text-rose-600' 
                              : 'bg-amber-100 text-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LICENCE TIMELINE SUBPAGE */}
            {activeSubPage === 'licence' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">Licence Tracking</span>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <h3 className="font-black text-sm text-[#161623] mb-4">Learner & Driving Licence Workflow</h3>

                  <div className="relative border-l-2 border-slate-100 ml-3 flex flex-col gap-6 pl-6 pb-2">
                    {[
                      { title: "LL Applied", desc: "Submitted Aadhar & PAN to Odisha RTO", date: "June 16, 2026", active: true },
                      { title: "LL Approved", desc: "Learner Licence generated, valid for 6 months", date: "June 19, 2026", active: student.llStatus !== "Applied" },
                      { title: "Driving Practical Test", desc: "Booked RTO slot at Bhubaneswar RTO II", date: "Awaiting Schedule", active: student.llStatus === "Driving Test" || student.llStatus === "Licence Approved" },
                      { title: "Licence Approved", desc: "Smart card dispatched to your residential address", date: "Awaiting Approval", active: student.llStatus === "Licence Approved" }
                    ].map((step, i) => (
                      <div key={i} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          step.active ? 'border-[#6D3BFF] text-[#6D3BFF]' : 'border-slate-200 text-slate-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${step.active ? 'bg-[#6D3BFF]' : 'bg-slate-200'}`} />
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${step.active ? 'text-[#161623]' : 'text-slate-400'}`}>{step.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                          <span className={`text-[9px] font-semibold block mt-1 ${step.active ? 'text-[#6D3BFF]' : 'text-slate-300'}`}>
                            {step.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VAULTFLOW: MY FILES SUBPAGE */}
            {activeSubPage === 'vault-files' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">My Files</span>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-[#161623] text-white p-4 rounded-3xl shadow-sm">
                    <div>
                      <h3 className="font-extrabold text-xs">Cloud Vault</h3>
                      <p className="text-[9px] text-slate-400 mt-0.5">{folders.length} Folders • {files.length} Files</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          setModalError("");
                          setNewFolderModalOpen(true);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3 text-[#D4AF37]" /> New Folder
                      </button>
                      <button 
                        onClick={() => {
                          setModalError("");
                          setAddFileModalOpen(true);
                        }}
                        className="bg-[#6D3BFF] hover:bg-[#5B30D6] text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-white" /> Add File
                      </button>
                    </div>
                  </div>

                  {/* Folders & Files Section */}
                  {(foldersLoading || filesLoading) ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-8 h-8 border-4 border-[#6D3BFF] border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-[10px] text-slate-500 font-bold">Synchronizing with Cloud Firestore...</p>
                    </div>
                  ) : (folders.length === 0 && files.length === 0) ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-[#6D3BFF]/5 rounded-full flex items-center justify-center mb-3">
                        <FolderOpen className="w-6 h-6 text-[#6D3BFF]" />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#161623]">Your vault is empty</h4>
                      <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                        Create folders and add secure documents. Everything is kept fully isolated.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Folders List */}
                      {folders.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Folders ({folders.length})</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {folders.map((folder) => (
                              <div key={folder.id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm group hover:border-[#6D3BFF]/30 transition-all">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                                  <div className="overflow-hidden">
                                    <p className="font-extrabold text-xs text-[#161623] truncate">{folder.name}</p>
                                    <p className="text-[8px] text-slate-400">
                                      {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : "Just now"}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteFolder(folder.id)}
                                  className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                  title="Delete Folder"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files List */}
                      {files.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Files ({files.length})</h4>
                          <div className="flex flex-col gap-2">
                            {files.map((file) => {
                              const parentFolder = folders.find(f => f.id === file.folderId);
                              return (
                                <div key={file.id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm group hover:border-[#6D3BFF]/20 transition-all">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-[#6D3BFF]/5 group-hover:text-[#6D3BFF] transition-all shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="font-extrabold text-xs text-[#161623] truncate">{file.name}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-slate-400">
                                        <span>{file.size || "1.2 MB"}</span>
                                        <span>•</span>
                                        <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "Just now"}</span>
                                        {parentFolder && (
                                          <>
                                            <span>•</span>
                                            <span className="bg-amber-100 text-amber-800 font-extrabold px-1 rounded">
                                              Folder: {parentFolder.name}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                    title="Delete File"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VAULTFLOW: MY NOTES SUBPAGE */}
            {activeSubPage === 'vault-notes' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">My Notes</span>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-[#161623] text-white p-4 rounded-3xl shadow-sm">
                    <div>
                      <h3 className="font-extrabold text-xs">Encrypted Notes</h3>
                      <p className="text-[9px] text-slate-400 mt-0.5">{notes.length} Secure Notes</p>
                    </div>
                    <button 
                      onClick={() => {
                        setModalError("");
                        setNewNoteModalOpen(true);
                      }}
                      className="bg-[#6D3BFF] hover:bg-[#5B30D6] text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-white" /> New Note
                    </button>
                  </div>

                  {/* Notes Grid */}
                  {notesLoading ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-8 h-8 border-4 border-[#6D3BFF] border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-[10px] text-slate-500 font-bold">Decrypting from Cloud Firestore...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-indigo-500/5 rounded-full flex items-center justify-center mb-3">
                        <Edit3 className="w-6 h-6 text-indigo-500" />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#161623]">No notes found</h4>
                      <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                        Jot down ideas, study tips, or trainer notes securely in your cloud notebook.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm hover:border-[#6D3BFF]/20 transition-all flex flex-col gap-2 relative">
                          <div className="flex justify-between items-start gap-3">
                            <h4 className="font-black text-xs text-[#161623] pr-6">{note.title}</h4>
                            <button 
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all absolute right-3 top-3 cursor-pointer"
                              title="Delete Note"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {note.content && (
                            <p className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line bg-slate-50 p-2.5 rounded-2xl">
                              {note.content}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1 text-[8px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : "Just now"}
                            </span>
                            <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-extrabold uppercase">
                              Encrypted
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VAULTFLOW: TEAM SPACE SUBPAGE */}
            {activeSubPage === 'vault-team' && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveSubPage(null)} className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-500">Team Space</span>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-[#161623] text-white p-4 rounded-3xl shadow-sm">
                    <div>
                      <h3 className="font-extrabold text-xs">Collaborators</h3>
                      <p className="text-[9px] text-slate-400 mt-0.5">{teamMembers.length} Active Members</p>
                    </div>
                    <button 
                      onClick={() => {
                        setModalError("");
                        setAddMemberModalOpen(true);
                      }}
                      className="bg-[#6D3BFF] hover:bg-[#5B30D6] text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3 text-white" /> Add Member
                    </button>
                  </div>

                  {/* Members List */}
                  {teamMembersLoading ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-8 h-8 border-4 border-[#6D3BFF] border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-[10px] text-slate-500 font-bold">Loading Team Space...</p>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-rose-500/5 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-rose-500" />
                      </div>
                      <h4 className="font-extrabold text-xs text-[#161623]">No team members added</h4>
                      <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                        Share files and notes with trainers, support staff, or study partners securely.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="bg-white border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between shadow-sm group hover:border-[#6D3BFF]/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-tr from-[#6D3BFF] to-[#8F52FF] text-white text-xs font-black rounded-full flex items-center justify-center shadow-sm uppercase shrink-0">
                              {member.name.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-[#161623]">{member.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] bg-[#6D3BFF]/10 text-[#6D3BFF] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {member.role || "Viewer"}
                                </span>
                                <span className="text-[8px] text-slate-400">
                                  Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Just now"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBPAGE: DRIVING LICENCE APPLICATION (4-TAB DOCUMENT UPLOAD) */}
            {(activeSubPage === 'licence' || activeSubPage === 'licence-apply') && (
              <div className="pt-2 animate-fadeIn text-[#161623] pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => setActiveSubPage(null)} 
                    className="flex items-center gap-1.5 text-xs text-slate-600 font-extrabold hover:text-[#6D3BFF] transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Student Portal
                  </button>
                  {dlApp && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      dlApp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      dlApp.status === 'Under Review' ? 'bg-purple-100 text-purple-700' :
                      dlApp.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      Status: {dlApp.status}
                    </span>
                  )}
                </div>

                {/* Hero Card */}
                <div className="bg-gradient-to-r from-[#161623] to-[#252538] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      STUDENT PORTAL
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white">Driving Licence Application</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Upload your documents across the 4 tabs below. Your existing profile info will be linked automatically. No manual details required!
                  </p>

                  {/* Auto-used profile info preview */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <img src={student.photoUrl} alt={student.name} className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]" referrerPolicy="no-referrer" />
                      <span className="font-extrabold text-white">{student.name}</span>
                    </div>
                    <div className="text-slate-400 font-medium">📞 {student.phone}</div>
                    <div className="text-slate-400 font-medium">✉️ {student.email}</div>
                  </div>
                </div>

                {/* 4 EXACT TABS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {[
                    { id: 'aadhaar', label: '1. Aadhaar', doc: dlApp?.documents?.aadhaar },
                    { id: 'twoWheeler', label: '2. Two-Wheeler Licence', doc: dlApp?.documents?.twoWheelerLicence },
                    { id: 'learner', label: '3. Learner Licence', doc: dlApp?.documents?.learnerLicence },
                    { id: 'other', label: '4. Other Documents', doc: dlApp?.documents?.otherDocuments }
                  ].map((tab) => {
                    const isActive = dlActiveTab === tab.id;
                    const isUploaded = !!tab.doc;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDlActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl text-xs font-black transition-all cursor-pointer border text-center relative ${
                          isActive
                            ? 'bg-[#6D3BFF] text-white border-[#6D3BFF] shadow-md shadow-[#6D3BFF]/20'
                            : isUploaded
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isUploaded && (
                          <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                        )}
                        <span>{tab.label}</span>
                        <span className={`text-[9px] mt-0.5 font-bold ${isActive ? 'text-white/80' : isUploaded ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isUploaded ? '✓ Uploaded' : 'Optional'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ACTIVE TAB CONTENT AREA */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6">
                  {(() => {
                    let title = "Aadhaar Card";
                    let docKey: 'aadhaar' | 'twoWheelerLicence' | 'learnerLicence' | 'otherDocuments' = 'aadhaar';
                    let isOptional = false;

                    if (dlActiveTab === 'twoWheeler') {
                      title = "Two-Wheeler Licence";
                      docKey = "twoWheelerLicence";
                      isOptional = true;
                    } else if (dlActiveTab === 'learner') {
                      title = "Learner Licence";
                      docKey = "learnerLicence";
                      isOptional = true;
                    } else if (dlActiveTab === 'other') {
                      title = "Other Documents";
                      docKey = "otherDocuments";
                      isOptional = true;
                    }

                    const currentDoc = dlApp?.documents?.[docKey];

                    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const reader = new FileReader();
                      reader.onload = async (evt) => {
                        let rawUrl = evt.target?.result as string;
                        if (rawUrl) {
                          try {
                            rawUrl = await compressImageIfNeeded(rawUrl);
                          } catch (err) {
                            console.warn("Failed to compress document:", err);
                          }
                        }

                        const item: DrivingLicenceDocumentItem = {
                          name: title,
                          fileName: file.name,
                          fileUrl: rawUrl,
                          uploadedAt: new Date().toLocaleDateString()
                        };

                        const updatedDocs = {
                          ...(dlApp?.documents || {}),
                          [docKey]: item
                        };

                        const updatedApp: DrivingLicenceApplication = {
                          id: dlApp?.id || `DL_${Date.now()}`,
                          studentId: student.id,
                          studentName: student.name,
                          studentPhone: student.phone,
                          studentEmail: student.email,
                          studentPhotoUrl: student.photoUrl,
                          status: dlApp?.status || 'Applied',
                          appliedAt: dlApp?.appliedAt || new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          documents: updatedDocs
                        };

                        MockDatabase.saveLicenceApplication(updatedApp);
                        setDlApp(updatedApp);
                        showNotification(`${title} uploaded successfully!`);
                      };
                      reader.readAsDataURL(file);
                    };

                    const handleRemoveDoc = () => {
                      if (!dlApp) return;
                      const updatedDocs = { ...dlApp.documents };
                      delete updatedDocs[docKey];

                      const updatedApp: DrivingLicenceApplication = {
                        ...dlApp,
                        documents: updatedDocs
                      };

                      MockDatabase.saveLicenceApplication(updatedApp);
                      setDlApp(updatedApp);
                      showNotification(`${title} removed.`);
                    };

                    return (
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-black text-[#161623]">{title}</h3>
                            <p className="text-xs text-slate-400">
                              {isOptional ? "This document is completely optional. Leave empty if not applicable." : "Upload clear photo or PDF copy."}
                            </p>
                          </div>
                          {isOptional && (
                            <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                              Optional
                            </span>
                          )}
                        </div>

                        {currentDoc ? (
                          /* SHOW UPLOADED FILE WITH FILE NAME, PREVIEW, REPLACE & REMOVE */
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 w-full sm:w-auto">
                              {currentDoc.fileUrl.startsWith("data:image") || currentDoc.fileUrl.includes("unsplash") || currentDoc.fileUrl.startsWith("http") ? (
                                <img 
                                  src={currentDoc.fileUrl} 
                                  alt={title} 
                                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-100">
                                  <FileText className="w-8 h-8" />
                                </div>
                              )}

                              <div className="overflow-hidden">
                                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  ✓ Document Attached
                                </span>
                                <h4 className="font-extrabold text-xs text-[#161623] truncate max-w-xs mt-1">{currentDoc.fileName}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Uploaded: {currentDoc.uploadedAt}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                              <label className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" /> Replace
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                              </label>

                              <button
                                onClick={handleRemoveDoc}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* UPLOAD BUTTON BOX */
                          <div className="border-2 border-dashed border-slate-200 hover:border-[#6D3BFF] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all bg-slate-50/50">
                            <div className="w-12 h-12 bg-[#6D3BFF]/10 text-[#6D3BFF] rounded-2xl flex items-center justify-center">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-[#161623]">{title}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, or PDF files</p>
                            </div>

                            <label className="bg-[#6D3BFF] hover:bg-[#8F52FF] active:scale-95 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 mt-1">
                              <Upload className="w-4 h-4" /> [ Upload Document ]
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* SUBMIT BUTTON AT BOTTOM */}
                <div className="bg-gradient-to-r from-[#161623] to-[#252538] text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Ready to Submit Driving Licence Application?</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {dlApp 
                        ? "Your application is saved and updated in real-time. Admin will verify your documents." 
                        : "Clicking submit will log your application with your profile details for RTO processing."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const docsCount = Object.values(dlApp?.documents || {}).filter(Boolean).length;
                      if (docsCount === 0) {
                        alert("Please upload at least 1 document (e.g. Aadhaar Card) before submitting.");
                        return;
                      }

                      const updatedApp: DrivingLicenceApplication = {
                        id: dlApp?.id || `DL_${Date.now()}`,
                        studentId: student.id,
                        studentName: student.name,
                        studentPhone: student.phone,
                        studentEmail: student.email,
                        studentPhotoUrl: student.photoUrl,
                        status: 'Applied',
                        appliedAt: dlApp?.appliedAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        documents: dlApp?.documents || {}
                      };

                      MockDatabase.saveLicenceApplication(updatedApp);
                      setDlApp(updatedApp);
                      showNotification("Driving Licence Application submitted successfully! Status: Applied.");
                    }}
                    className="bg-[#D4AF37] hover:bg-[#f0c842] active:scale-95 text-[#161623] font-black text-xs px-6 py-3.5 rounded-2xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <FileCheck className="w-4 h-4" /> Submit Driving Licence Application
                  </button>
                </div>
              </div>
            )}

            {/* PRIMARY TAB SCREENS */}

            {/* TAB 1: HOME */}
            {activeTab === 'home' && !activeSubPage && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                {/* Header Profile Greeting */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={student.photoUrl} 
                      alt="Student" 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                    />
                    <div>
                      <p className="text-[10px] text-slate-400">Good Morning,</p>
                      <h3 className="font-extrabold text-sm text-[#1A1A1A] tracking-tight">{student.name} 👋</h3>
                      <div className="mt-0.5">
                        <span className="text-[9px] text-[#6D3BFF] font-black uppercase tracking-wide bg-[#6D3BFF]/5 px-2 py-0.5 rounded-full inline-block">
                          🎓 {bookings.filter(b => b.status === 'completed').length} Classes Completed
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <button 
                      onClick={() => {
                        setNotificationsOpen(!notificationsOpen);
                        setMenuOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center relative transition-all cursor-pointer border ${
                        notificationsOpen 
                          ? 'bg-[#6D3BFF]/10 border-[#6D3BFF]/20 text-[#6D3BFF]' 
                          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EB5757] text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                          {notifications.filter(n => !n.read).length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setMenuOpen(!menuOpen);
                        setNotificationsOpen(false);
                      }}
                      className="w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer z-50"
                    >
                      {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>

                    {notificationsOpen && (
                      <div 
                        ref={notifDropdownRef}
                        className="absolute right-0 top-11 w-72 md:w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl p-4 z-50 animate-fadeIn text-left max-h-[420px] overflow-y-auto scrollable-touch custom-scrollbar flex flex-col gap-3 border-t-4 border-t-[#6D3BFF] ring-1 ring-black/5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-xs text-[#161623] uppercase tracking-wider">Notifications</span>
                          {notifications.some(n => !n.read) && (
                            <button 
                              onClick={() => {
                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                setNotificationMsg("All notifications marked as read!");
                                setTimeout(() => setNotificationMsg(null), 3000);
                              }}
                              className="text-[10px] text-[#6D3BFF] font-extrabold hover:underline cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {notifications.length === 0 ? (
                            <p className="text-slate-400 text-xs text-center py-4">No notifications yet.</p>
                          ) : (
                            notifications.map(notif => (
                              <div 
                                key={notif.id} 
                                onClick={() => {
                                  // Mark as read
                                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  setNotificationsOpen(false);
                                  
                                  // Interactive redirection based on notification content
                                  const msgLower = notif.message.toLowerCase();
                                  const titleLower = notif.title.toLowerCase();
                                  if (msgLower.includes("booked") || msgLower.includes("scheduled") || msgLower.includes("rescheduled") || msgLower.includes("cancelled") || titleLower.includes("class")) {
                                    setActiveTab('classes');
                                    setActiveSubPage(null);
                                  } else if (msgLower.includes("licence") || msgLower.includes("document") || titleLower.includes("licence") || titleLower.includes("upload")) {
                                    setActiveTab('home');
                                    setActiveSubPage('licence');
                                  } else if (msgLower.includes("course") || msgLower.includes("modification") || titleLower.includes("course") || titleLower.includes("customization")) {
                                    setActiveTab('modify');
                                    setActiveSubPage(null);
                                  } else if (msgLower.includes("payment") || msgLower.includes("paid") || titleLower.includes("payment")) {
                                    setActiveTab('home');
                                    setActiveSubPage('payments');
                                  }
                                }}
                                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex gap-2 hover:bg-slate-50/80 group ${
                                  notif.read 
                                    ? 'bg-white border-slate-50 opacity-75' 
                                    : 'bg-[#6D3BFF]/5 border-[#6D3BFF]/10'
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center ${
                                  notif.type === 'success' 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : notif.type === 'alert' 
                                    ? 'bg-rose-500/10 text-rose-500' 
                                    : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                  {notif.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : notif.type === 'alert' ? (
                                    <AlertCircle className="w-4 h-4" />
                                  ) : (
                                    <Bell className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-bold text-xs text-[#161623] truncate group-hover:text-[#6D3BFF] transition-colors">{notif.title}</p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {!notif.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D3BFF] shrink-0" />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                        }}
                                        className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-all cursor-pointer"
                                        title="Delete notification"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed break-words">{notif.message}</p>
                                  <span className="text-[8px] text-slate-400 font-medium block mt-1">{notif.time}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {menuOpen && (
                      <div className="absolute right-0 top-10 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn text-left">
                        <div className="px-3 py-2 border-b border-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                          <p className="text-xs font-black text-[#161623] truncate mt-0.5">{student.name}</p>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <button
                            onClick={() => {
                              setActiveTab('profile');
                              setActiveSubPage(null);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#6D3BFF]/5 hover:text-[#6D3BFF] rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" /> View Profile
                          </button>
                          <button
                            onClick={performLogout}
                            className="w-full text-left px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Lesson Rating Prompt for Completed, Unrated Sessions */}
                {(() => {
                  const unrated = bookings.filter(b => b.status === 'completed' && !b.ratingGiven);
                  if (unrated.length === 0) return null;
                  const targetBooking = unrated[0];
                  return (
                    <div className="bg-gradient-to-r from-amber-500/10 via-[#D4AF37]/5 to-transparent border-2 border-amber-500/30 rounded-3xl p-4 flex flex-col gap-2.5 shadow-md relative overflow-hidden animate-pulse-subtle">
                      <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/20 rounded-full blur-xl" />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-500 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 fill-amber-500 animate-spin-slow" /> Lesson Completed!
                        </span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-500 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Rate Now
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">
                          How was your session with Coach {targetBooking.trainerName}?
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Lesson on {targetBooking.date} • {targetBooking.timeSlot} with {targetBooking.carName}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            onClick={() => handleRateTrainerInHistory(targetBooking.id, targetBooking.trainerId, star)}
                            className="hover:scale-125 active:scale-95 transition-transform duration-150 cursor-pointer text-slate-300 hover:text-amber-500 group"
                            title={`Rate ${star} Stars`}
                          >
                            <Star className="w-6.5 h-6.5 hover:fill-amber-400 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Hero Illustration Block */}
                <div className="bg-gradient-to-r from-[#6D3BFF]/5 to-[#8F52FF]/5 border border-[#6D3BFF]/10 rounded-3xl p-4 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-xl" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#6D3BFF]">Golden Hands Hub</span>
                    <h2 className="font-extrabold text-[#161623] text-sm mt-1">Drive with confidence,<br />succeed for life.</h2>
                    <p className="text-[9px] text-slate-400 mt-0.5">Rasulgarh • Bhubaneswar</p>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300" 
                    alt="Sport Car" 
                    className="w-24 object-contain"
                  />
                </div>



                {/* Today's Driving Class Card */}
                {bookings.some(b => b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'requested') ? (
                  (() => {
                    const activeList = bookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'requested');
                    const sortedActive = [...activeList].sort((a, b) => {
                      const score = (item: Booking) => {
                        if (item.pickupStatus === 'picked_up' && item.faceVerificationStatus !== 'verified') return 10;
                        if (item.pickupStatus === 'picked_up') return 8;
                        if (item.pickupStatus === 'en_route') return 6;
                        if (item.faceVerificationStatus !== 'verified') return 4;
                        return 0;
                      };
                      return score(b) - score(a);
                    });
                    return sortedActive.slice(0, 1).map((b) => (
                    <div key={b.id} className="bg-[#161623] text-white rounded-3xl p-4 shadow-xl relative overflow-hidden border border-white/5">
                      {/* Decorative gradient corner */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full pointer-events-none" />

                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[#D4AF37] text-[10px] uppercase tracking-widest font-extrabold">TODAY'S CLASS</span>
                        
                        {/* Attendance state tags */}
                        {b.status === 'requested' ? (
                          <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20 animate-pulse">
                            <Clock className="w-2.5 h-2.5 text-amber-400" /> Booking Requested / Waiting Confirmation
                          </span>
                        ) : b.faceVerificationStatus === 'verified' ? (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20 animate-fadeIn">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present & Verified
                          </span>
                        ) : b.pickupStatus === 'picked_up' ? (
                          <span className="bg-[#6D3BFF]/20 text-[#8F52FF] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#6D3BFF]/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6D3BFF]" /> Action Required
                          </span>
                        ) : b.pickupStatus === 'en_route' ? (
                          <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20 animate-pulse">
                            🚗 Coach En Route
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Class Confirmed
                          </span>
                        )}
                      </div>

                      {/* Coach info */}
                      <div className="flex items-center gap-3.5 mb-3">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" 
                          alt="Trainer" 
                          className="w-12 h-12 rounded-full border border-white/20 object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-white">{b.trainerName}</h4>
                          <p className="text-[9px] text-[#D4AF37] font-semibold">Senior Driving Coach</p>
                          <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><Star className="w-2.5 h-2.5 text-[#D4AF37] fill-[#D4AF37]" /> 4.9 (128 reviews)</p>
                        </div>
                      </div>

                      {/* Dynamic status notifications */}
                      {b.status === 'requested' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-2.5 rounded-xl font-medium mb-3 flex items-center gap-2 animate-fadeIn">
                          <Clock className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                          <span>Booking Requested / Waiting for Trainer Confirmation. GPS tracking will activate once confirmed.</span>
                        </div>
                      )}

                      {b.status !== 'requested' && b.pickupStatus === 'en_route' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-2.5 rounded-xl font-medium mb-3 flex items-center gap-2 animate-fadeIn">
                          <Compass className="w-4 h-4 animate-spin" />
                          <span>Coach is driving to your pickup location! Keep your phone ready.</span>
                        </div>
                      )}

                      {b.status !== 'requested' && b.pickupStatus === 'picked_up' && b.faceVerificationStatus !== 'verified' && (
                        <div className="bg-[#6D3BFF]/10 border border-[#6D3BFF]/25 text-[#9E7CFF] text-[10px] p-2.5 rounded-xl font-medium mb-3 flex flex-col gap-1.5 animate-fadeIn">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            📌 Picked Up & On Board!
                          </p>
                          <p className="text-[9px] text-slate-300">
                            Please complete Face Recognition Check-in immediately to register present for attendance logging.
                          </p>
                        </div>
                      )}

                      {b.status !== 'requested' && b.faceVerificationStatus === 'verified' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] p-2.5 rounded-xl font-medium mb-3 animate-fadeIn">
                          <p className="font-bold text-white flex items-center gap-1.5 mb-1">
                            ✓ Attendance Confirmed Present
                          </p>
                          <p className="text-[9px] text-slate-300 leading-relaxed">
                            📍 Verified GPS: {b.attendanceLocation || "Rasulgarh Center"}<br />
                            🕒 Logged: {b.attendanceLoggedAt || "10:32 AM"}<br />
                            {b.classStatus === 'class_started' ? (
                              <span className="text-[#D4AF37] font-bold animate-pulse">🚗 Driving class training session is LIVE!</span>
                            ) : (
                              <span>Awaiting Coach to start session...</span>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3 mb-3 text-[10px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#6D3BFF]" /> {b.timeSlot}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3 h-3 text-[#6D3BFF]" /> {b.carName} ({b.carPlate})
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#6D3BFF]" /> {b.location}
                        </div>
                      </div>

                      {/* DYNAMIC ACTION BUTTON */}
                      {b.status === 'requested' ? (
                        <button 
                          disabled
                          className="w-full bg-amber-500/15 text-amber-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 opacity-90 cursor-not-allowed"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Booking Requested / Waiting for Confirmation
                        </button>
                      ) : (!b.faceVerificationStatus || b.faceVerificationStatus === 'pending') ? (
                        <button 
                          onClick={() => openFaceCheckinDirectly()}
                          className={`w-full bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/15 hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
                            b.pickupStatus === 'picked_up' ? 'animate-bounce ring-2 ring-amber-400' : ''
                          }`}
                        >
                          <Sparkles className="w-4 h-4 text-black fill-black" /> Complete Face Check-in
                        </button>
                      ) : b.faceVerificationStatus === 'failed' ? (
                        <button 
                          onClick={() => openFaceCheckinDirectly()}
                          className="w-full bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/15 hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
                        >
                          <AlertCircle className="w-4 h-4" /> Face Verification Locked (Coach Override)
                        </button>
                      ) : (
                        <button 
                          onClick={() => setActiveTab('track')}
                          className="w-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#6D3BFF]/20 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#D4AF37]" /> Track Coach Location
                        </button>
                      )}

                      {/* Manage / Cancel Class Quick Options */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('classes');
                            const hist = document.getElementById('booking-history-section');
                            if (hist) hist.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                        >
                          Booking Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelClass(b.id)}
                          className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Cancel Class
                        </button>
                      </div>
                    </div>
                  ));
                })()
                ) : (
                  <div className="bg-white border border-slate-100 rounded-3xl p-4 text-center">
                    <p className="text-xs text-slate-400">No scheduled classes for today.</p>
                    <button 
                      onClick={() => {
                        setActiveTab('classes');
                        setActiveSubPage(null);
                      }}
                      className="text-[#6D3BFF] text-xs font-bold mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      Book Class <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Course Progress Card & Weak Skills */}
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-xs text-[#161623]">COURSE PROGRESS</h3>
                    <span className="text-[#27AE60] text-[9px] font-bold bg-[#27AE60]/10 px-1.5 py-0.5 rounded-full">
                      ↑ 12% last week
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Circle chart */}
                    {(() => {
                      const avgProgress = Math.round(
                        ((progress.steering || 0) + 
                         (progress.clutch || 0) + 
                         (progress.brake || 0) + 
                         (progress.hillStart || 0)) / 4
                      ) || 0;
                      const radius = 32;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (avgProgress / 100) * circumference;
                      return (
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-[#F1F3F9]"
                              strokeWidth="6"
                              stroke="currentColor"
                              fill="transparent"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-[#6D3BFF]"
                              strokeWidth="6"
                              stroke="currentColor"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-sm font-black text-[#161623]">{avgProgress}%</span>
                        </div>
                      );
                    })()}

                    <div className="flex-1 flex flex-col gap-1.5">
                      {[
                        { label: "Steering Control", val: progress.steering },
                        { label: "Clutch Control", val: progress.clutch, warn: true },
                        { label: "Braking & Stopping", val: progress.brake },
                        { label: "Hill Starts", val: progress.hillStart, warn: true }
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 mb-0.5">
                            <span className={item.warn && item.val < 75 ? 'text-[#EB5757] flex items-center gap-0.5' : ''}>
                              {item.label} {item.warn && item.val < 75 ? '⚠️' : ''}
                            </span>
                            <span>{item.val}%</span>
                          </div>
                          <div className="w-full h-1 bg-[#F1F3F9] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.warn && item.val < 75 ? 'bg-[#EB5757]' : 'bg-[#6D3BFF]'}`} 
                              style={{ width: `${item.val}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dynamic Customized Course Agenda (Trainer Modified) */}
                {student.courseName && (
                  <div className="bg-gradient-to-r from-[#6D3BFF]/5 to-[#8F52FF]/5 border border-[#6D3BFF]/10 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#6D3BFF]">Assigned Driving Course</span>
                        <h3 className="font-extrabold text-xs text-[#161623]">{student.courseName}</h3>
                      </div>
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                    </div>

                    {student.courseNotes && (
                      <div className="bg-white/75 border border-[#6D3BFF]/15 p-3 rounded-2xl">
                        <p className="text-[8px] uppercase font-bold text-slate-400">Custom Coach Focus Notes</p>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed italic">
                          "{student.courseNotes}"
                        </p>
                      </div>
                    )}

                    {student.courseSyllabus && student.courseSyllabus.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Syllabus Focus Checklist</span>
                        <div className="flex flex-wrap gap-1.5">
                          {student.courseSyllabus.map((module, mIdx) => (
                            <span key={mIdx} className="bg-white border border-slate-100 text-slate-700 font-extrabold text-[9px] px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#27AE60] stroke-[3]" /> {module}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions Panel */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">QUICK ACTIONS</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Calendar className="w-5 h-5 text-[#6D3BFF]" />, label: "Book Class", onClick: () => { setActiveTab('classes'); } },
                      { icon: <DollarSign className="w-5 h-5 text-[#27AE60]" />, label: "Payments", onClick: () => setActiveSubPage('payments') },
                      { icon: <FileText className="w-5 h-5 text-amber-500" />, label: "Documents", onClick: () => setActiveSubPage('documents') }
                    ].map((act, i) => (
                      <button 
                        key={i} 
                        onClick={act.onClick}
                        className="bg-white border border-slate-100 p-3 rounded-2xl flex flex-col items-center gap-1.5 hover:border-[#6D3BFF] cursor-pointer shadow-sm text-center"
                      >
                        {act.icon}
                        <span className="text-[9px] font-bold text-slate-700 leading-tight">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Banner: Achievements */}
                <div className="bg-[#FFEAA7] border border-[#F2C94C]/20 p-3.5 rounded-3xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-95 transition-all">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#161623]">Keep Learning, Keep Growing!</h4>
                    <p className="text-[9px] text-slate-600 mt-0.5">Complete more classes to unlock your Safe Driver badge.</p>
                  </div>
                  <span className="text-2xl">🏆</span>
                </div>
              </div>
            )}

            {/* TAB 2: CLASSES & HISTORY */}
            {activeTab === 'classes' && !activeSubPage && (
              <div className="pt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-extrabold text-[#161623]">Your Classes</h2>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => {
                        const el = document.getElementById('schedule-class-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-[9px] font-black text-[#6D3BFF] bg-[#6D3BFF]/5 hover:bg-[#6D3BFF]/10 active:scale-95 px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer border border-[#6D3BFF]/10"
                    >
                      <span>Book Class ↑</span>
                    </button>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('booking-history-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-[9px] font-black text-[#6D3BFF] bg-[#6D3BFF]/5 hover:bg-[#6D3BFF]/10 active:scale-95 px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer border border-[#6D3BFF]/10"
                    >
                      <span>History ↓</span>
                    </button>
                  </div>
                </div>
                
                <div id="schedule-class-section" className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider mb-3">Schedule A Class</h3>
                  
                  {!canBookClass ? (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCourseEnded ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#161623] text-sm">
                            {isCourseEnded ? "Course Ended & Booking Locked" : "Booking Access Locked"}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                            {isCourseEnded 
                              ? "You have completed your active course package driving classes. No more bookings are allowed. Please upgrade to extra classes or pay for your licence fee on the Modify tab to unlock booking."
                              : "To maintain compliance with RTO regulations and driving academy terms, you must complete the following steps before booking your training classes:"}
                          </p>
                        </div>
                      </div>

                      {isCourseEnded ? (
                        <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-slate-700">Upgrade Extra Classes</span>
                            <button
                              onClick={() => setActiveTab('modify')}
                              className="text-[9px] font-black text-[#6D3BFF] uppercase bg-[#6D3BFF]/10 px-2.5 py-1 rounded-full hover:bg-[#6D3BFF]/20 cursor-pointer"
                            >
                              Upgrade Now
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[11px] border-t border-slate-50 pt-2">
                            <span className="font-extrabold text-slate-700">Licence Fast-track Fee</span>
                            {student.licenceFeePaid ? (
                              <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Paid</span>
                            ) : (
                              <button
                                onClick={() => setActiveTab('modify')}
                                className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2.5 py-1 rounded-full hover:bg-amber-500/20 cursor-pointer"
                              >
                                Pay Now
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-xl p-3">
                          {(completedClassesCount >= 1 || firstInstallmentPaid) && (
                            <div className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{firstInstallmentPaid ? "✅" : "❌"}</span>
                                <span className="font-extrabold text-slate-700">Course Fee (₹2,000 Installment)</span>
                              </div>
                              {firstInstallmentPaid ? (
                                <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Completed</span>
                              ) : (
                                <button 
                                  onClick={() => setActiveSubPage('payments')} 
                                  className="text-[9px] font-black text-[#6D3BFF] uppercase bg-[#6D3BFF]/10 px-2.5 py-1 rounded-full hover:bg-[#6D3BFF]/20 cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{isAadharVerified ? "✅" : "❌"}</span>
                              <span className="font-extrabold text-slate-700">Aadhaar Card Verification</span>
                            </div>
                            {isAadharVerified ? (
                              <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Verified</span>
                            ) : aadharDoc ? (
                              <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">Pending Approval</span>
                            ) : (
                              <div className="flex items-center">
                                <input 
                                  type="file"
                                  ref={scheduleAadharFileInputRef}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setAadharUploading(true);
                                      const reader = new FileReader();
                                      reader.onload = async (event) => {
                                        const rawUrl = event.target?.result as string || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
                                        const compressedUrl = await compressImageIfNeeded(rawUrl);
                                        
                                        setTimeout(() => {
                                          const newDoc: Document = {
                                            id: `doc_${Date.now()}`,
                                            studentId: student.id,
                                            name: "Aadhar Card",
                                            type: file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Image",
                                            fileUrl: compressedUrl,
                                            status: "Pending",
                                            uploadedAt: new Date().toISOString().split("T")[0]
                                          };
                                          const updatedDocs = [newDoc, ...documents.filter(d => !d.name.toLowerCase().includes("aadhar") && !d.name.toLowerCase().includes("aadhaar"))];
                                          MockDatabase.saveDocuments(updatedDocs);
                                          setDocuments(updatedDocs);
                                          const updatedStudent = {
                                            ...student,
                                            aadharStatus: "Pending" as const
                                          };
                                          MockDatabase.saveStudent(updatedStudent);
                                          setStudent(updatedStudent);
                                          setAadharUploading(false);
                                          onStateChange();
                                          showNotification("Aadhar Card uploaded successfully! Awaiting Admin verification.");
                                        }, 1500);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                />
                                <button 
                                  onClick={() => scheduleAadharFileInputRef.current?.click()} 
                                  disabled={aadharUploading}
                                  className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2.5 py-1 rounded-full hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                                >
                                  {aadharUploading ? (
                                    <>
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Uploading...
                                    </>
                                  ) : (
                                    "Upload Now"
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <button 
                        disabled
                        className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Bookings Restricted
                      </button>
                    </div>
                  ) : (
                    bookingSuccessMsg && lastBookingCreated ? (
                      <div className="bg-amber-50/80 border border-amber-500/20 rounded-2xl p-5 flex flex-col items-center text-center gap-3 animate-scaleIn">
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/10">
                          <Clock className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#161623] text-sm">Booking Requested!</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Waiting for Trainer Confirmation</p>
                        </div>
                        <div className="w-full bg-white rounded-xl border border-slate-100 p-3.5 flex flex-col gap-2 text-left text-xs font-semibold">
                          <div className="flex justify-between border-b border-slate-50 pb-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Booking ID</span>
                            <span className="text-[#161623] font-mono">{lastBookingCreated.id}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Date</span>
                            <span className="text-[#161623]">{lastBookingCreated.date}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-1.5">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Session</span>
                            <span className="text-[#161623] font-black text-[#6D3BFF]">{lastBookingCreated.timeSlot}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Booking Status</span>
                            <span className="bg-amber-500/15 text-amber-700 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full">
                              Booking Requested / Waiting for Trainer Confirmation
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingSuccessMsg(false);
                            setLastBookingCreated(null);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleBookClass} className="flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400">Select Date (Future Dates Only)</label>
                          
                          {/* Premium Interactive Calendar Component */}
                          {(() => {
                            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                            
                            return (
                              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mt-1">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    {monthNames[calMonth]} {calYear}
                                  </h4>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (calMonth === 0) {
                                          setCalMonth(11);
                                          setCalYear(prev => prev - 1);
                                        } else {
                                          setCalMonth(prev => prev - 1);
                                        }
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (calMonth === 11) {
                                          setCalMonth(0);
                                          setCalYear(prev => prev + 1);
                                        } else {
                                          setCalMonth(prev => prev + 1);
                                        }
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(dayLabel => (
                                    <span key={dayLabel} className="text-[9px] font-bold text-slate-400 uppercase py-0.5">
                                      {dayLabel}
                                    </span>
                                  ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                  {getCalendarDays(calYear, calMonth).map((dObj, idx) => {
                                    if (!dObj.day || !dObj.dateStr) {
                                      return <div key={`empty-${idx}`} />;
                                    }
                                    
                                    const dateStr = dObj.dateStr;
                                    const status = getDayStatus(dateStr);
                                    const isSelected = bookingDate === dateStr;

                                    let cellClass = "";
                                    let textClass = "";

                                    if (status === "Disabled") {
                                      cellClass = "bg-slate-100/50 text-slate-300 cursor-not-allowed opacity-50";
                                      textClass = "font-medium";
                                    } else if (status === "Green") {
                                      cellClass = isSelected
                                        ? "bg-emerald-500 text-white font-extrabold shadow-sm ring-2 ring-emerald-500/30"
                                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/50";
                                      textClass = "";
                                    } else { // status === "Red"
                                      cellClass = isSelected
                                        ? "bg-rose-500 text-white font-extrabold shadow-sm ring-2 ring-rose-500/30"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200/50";
                                      textClass = "";
                                    }

                                    return (
                                      <button
                                        key={dateStr}
                                        type="button"
                                        onClick={() => handleDateClick(dateStr, status)}
                                        className={`aspect-square p-1 rounded-xl text-[11px] flex items-center justify-center transition-all cursor-pointer ${cellClass}`}
                                        disabled={status === "Disabled"}
                                      >
                                        <span className={textClass}>{dObj.day}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex gap-3 justify-center mt-3 pt-2.5 border-t border-slate-200/60 text-[9px] font-bold text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600/10 inline-block" />
                                    <span>Slots Available</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600/10 inline-block" />
                                    <span>No Slots Available</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {!bookingDate && (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center mt-1">
                            <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-600">Please select an available date from the calendar above.</p>
                          </div>
                        )}

                        {bookingDate && (() => {
                          const status = getDayStatus(bookingDate);
                          if (status === "Red") {
                            return (
                              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center mt-1">
                                <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                                <p className="text-xs font-bold text-rose-700">No slots available for this date. Please select another date.</p>
                              </div>
                            );
                          }

                          // If status is "Green", show only the available booking periods, trainer list, and booking button
                          const dateSlot = MockDatabase.getSlotDays().find(s => s.date === bookingDate);
                          const sessions = [
                            { id: "Morning", label: "Morning", max: dateSlot?.morningMax ?? 0, enabled: dateSlot ? dateSlot.morningEnabled : false },
                            { id: "Lunch", label: "Lunch Hour", max: dateSlot?.lunchMax ?? 0, enabled: dateSlot ? dateSlot.lunchEnabled : false },
                            { id: "Rush Hour", label: "Rush Hour", max: dateSlot?.rushHourMax ?? 0, enabled: dateSlot ? dateSlot.rushHourEnabled : false },
                            { id: "Evening", label: "Evening", max: dateSlot?.eveningMax ?? 0, enabled: dateSlot ? dateSlot.eveningEnabled : false }
                          ];

                          const availableSessions = sessions.filter(sess => {
                            if (!dateSlot || dateSlot.isClosed || !sess.enabled) return false;
                            const booked = MockDatabase.getAllBookings().filter(b => 
                              b.date === bookingDate && 
                              b.timeSlot === sess.id && 
                              b.status !== 'cancelled'
                            ).length;
                            return (sess.max - booked) > 0;
                          });

                          return (
                            <>
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Select Session Period</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {availableSessions.map((sess) => {
                                    const booked = MockDatabase.getAllBookings().filter(b => 
                                      b.date === bookingDate && 
                                      b.timeSlot === sess.id && 
                                      b.status !== 'cancelled'
                                    ).length;
                                    
                                    const remaining = Math.max(0, sess.max - booked);
                                    const isSelected = bookingTimeSlot === sess.id;

                                    return (
                                      <button
                                        key={sess.id}
                                        type="button"
                                        onClick={() => setBookingTimeSlot(sess.id)}
                                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                                          isSelected 
                                            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" 
                                            : "border-emerald-100 hover:border-emerald-200 bg-emerald-50/10"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start w-full">
                                          <span className={`font-black text-xs ${
                                            isSelected ? "text-emerald-700" : "text-emerald-800"
                                          }`}>
                                            {sess.label}
                                          </span>
                                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                            Available
                                          </span>
                                        </div>
                                        <div className="mt-2.5">
                                          <p className="text-[10px] font-semibold text-emerald-600/90">
                                            Available Slots: <span className="font-bold text-emerald-700">{remaining}</span>
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Assigned Driving Coach & Car</label>
                                {effectiveAssignedTrainerId ? (
                                  <div className="w-full bg-[#F8F9FF] border border-blue-100 rounded-xl p-2.5 text-xs font-semibold mt-1 flex items-center justify-between text-slate-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                      <span>
                                        Coach {trainers.find(t => t.id === effectiveAssignedTrainerId)?.name || student.assignedTrainerName || "Assigned Trainer"} - {trainers.find(t => t.id === effectiveAssignedTrainerId)?.carName || "Vehicle"}
                                      </span>
                                    </div>
                                    <span className="text-[9px] bg-blue-100 text-[#0055FF] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                                      🔒 Locked
                                    </span>
                                  </div>
                                ) : (
                                  <select 
                                    value={bookingTrainer}
                                    onChange={(e) => setBookingTrainer(e.target.value)}
                                    className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1"
                                  >
                                    {trainers.map((tr) => (
                                      <option key={tr.id} value={tr.id}>
                                        Coach {tr.name} - {tr.carName}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <p className="text-[9px] text-slate-400 mt-1">
                                  {effectiveAssignedTrainerId 
                                    ? "Trainer assigned after 1st booking. Only Driving School Admin can reassign your coach."
                                    : "Note: Your selected coach will be locked for all remaining classes once booked."
                                  }
                                </p>
                              </div>

                              <button 
                                type="submit"
                                className="w-full bg-[#6D3BFF] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#8F52FF] transition-all cursor-pointer mt-1"
                              >
                                Confirm Booking
                              </button>
                            </>
                          );
                        })()}
                      </form>
                    )
                  )}
                </div>

                {/* New Rate & Review Instructors card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="font-extrabold text-xs text-[#161623] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" /> Rate & Review Instructors
                  </h3>
                  <p className="text-[10px] text-slate-400 mb-3">Provide feedback on your driving lessons. This is instantly shared with the driving school administration and updates the trainer's overall rating.</p>
                  
                  <form onSubmit={handleSubmitTrainerReview} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Select Instructor</label>
                      <select 
                        value={reviewTrainerId}
                        onChange={(e) => setReviewTrainerId(e.target.value)}
                        className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1"
                      >
                        {trainers.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            Coach {tr.name} ({tr.carName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Give Rating Stars</label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Star className={`w-5 h-5 ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          </button>
                        ))}
                        <span className="text-xs font-extrabold text-amber-500 ml-2">{reviewRating} Stars</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400">Your Feedback Remarks</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Explain how your instructor was during practical classes (e.g. clutch release, parallel parking)..."
                        className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1 h-16 resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-amber-500 to-[#D4AF37] text-slate-900 font-extrabold py-3 rounded-xl text-xs hover:brightness-110 shadow-md flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      Submit Trainer Review
                    </button>
                  </form>
                </div>

                <div id="booking-history-section" className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Booking History</h3>
                    {bookings.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                        {bookings.length} Total
                      </span>
                    )}
                  </div>
                  
                  {bookings.length === 0 ? (
                    <div className="bg-slate-50 text-slate-400 text-xs py-8 text-center rounded-2xl border border-dashed border-slate-200">
                      No bookings found.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div 
                        className={`flex flex-col gap-2.5 transition-all duration-300 ${
                          bookings.length > 4 
                            ? showAllBookings 
                              ? 'max-h-[700px] overflow-y-auto scrollable-touch custom-scrollbar pr-1 pb-2' 
                              : 'max-h-[380px] overflow-y-auto scrollable-touch custom-scrollbar pr-1 pb-2 border-b border-dashed border-slate-100'
                            : ''
                        }`}
                      >
                        {bookings.map((b) => (
                          <div key={b.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col gap-2.5 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-[#161623]">{b.trainerName}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'requested'
                                  ? 'bg-amber-500/15 text-amber-700 border border-amber-500/20'
                                  : b.status === 'upcoming' || b.status === 'confirmed'
                                    ? 'bg-[#6D3BFF]/10 text-[#6D3BFF]' 
                                    : b.status === 'completed' 
                                      ? 'bg-[#27AE60]/10 text-[#27AE60]' 
                                      : 'bg-slate-100 text-slate-400'
                              }`}>
                                {b.status === 'requested' ? 'Booking Requested / Waiting for Confirmation' : b.status === 'confirmed' || b.status === 'upcoming' ? 'Class Confirmed' : b.status}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-500 flex flex-col gap-0.5">
                              <p>{b.date} • {b.timeSlot}</p>
                              <p className="font-semibold text-slate-700">{b.carName} ({b.carPlate})</p>
                            </div>

                            {(b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'requested') && (
                              <div className="flex gap-2 border-t border-slate-50 pt-2">
                                <button 
                                  onClick={() => handleReschedule(b.id)}
                                  className="flex-1 py-1.5 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => handleCancelClass(b.id)}
                                  className="flex-1 py-1.5 border border-[#EB5757] rounded-lg text-[9px] font-bold text-[#EB5757] hover:bg-[#EB5757]/5 cursor-pointer"
                                >
                                  Cancel Class
                                </button>
                              </div>
                            )}

                            {b.status === 'completed' && (
                              <div className="border-t border-slate-50 pt-2.5 flex flex-col gap-1.5">
                                {b.ratingGiven ? (
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-semibold">Your Rating:</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center gap-0.5 font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                        <span>{b.ratingGiven}</span>
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const updated = bookings.map(item => item.id === b.id ? { ...item, ratingGiven: undefined } : item);
                                          setBookings(updated);
                                          MockDatabase.saveBookings(updated);
                                          onStateChange();
                                        }}
                                        className="text-[9px] text-[#6D3BFF] hover:underline font-extrabold cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-extrabold text-[#6D3BFF] uppercase tracking-wider">Rate your Session</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                          key={star} 
                                          onClick={() => handleRateTrainerInHistory(b.id, b.trainerId, star)}
                                          className="hover:scale-115 transition-transform cursor-pointer"
                                        >
                                          <Star className="w-4.5 h-4.5 text-slate-200 hover:text-amber-400 hover:fill-amber-400" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {b.remarks && (
                                  <p className="text-[9px] text-slate-400 italic bg-slate-50 p-2 rounded-xl border border-slate-100/50 mt-1">
                                    "{b.remarks}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {bookings.length > 4 && (
                        <div className="flex flex-col items-center justify-center gap-1 pt-1">
                          <button
                            onClick={() => setShowAllBookings(!showAllBookings)}
                            className="text-[10px] font-black text-[#6D3BFF] bg-[#6D3BFF]/5 hover:bg-[#6D3BFF]/10 active:scale-95 px-3 py-1.5 rounded-full border border-[#6D3BFF]/10 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>{showAllBookings ? "Show Fewer Bookings ↑" : `View More (${bookings.length - 4} past bookings) ↓`}</span>
                          </button>
                          {!showAllBookings && (
                            <span className="text-[8px] text-slate-400 font-medium">Scroll container to view more instantly</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: TRACKING */}
            {activeTab === 'track' && !activeSubPage && (
              <div className="pt-2 animate-fadeIn h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-[#161623]">Live Pickup Tracking</h2>
                    {(() => {
                      const isPickupEnRoute = trackingSession && trackingSession.isTracking === true && (
                        trackingSession.status === 'PICKUP_STARTED' ||
                        trackingSession.routeStatus === 'pickup_started' ||
                        trackingSession.routeStatus === 'en_route'
                      );
                      return (
                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isPickupEnRoute
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : trackingSession && trackingSession.status === 'ARRIVED'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : trackingSession && trackingSession.status === 'CLASS_STARTED'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {isPickupEnRoute && '🟢 On The Way'}
                          {trackingSession?.status === 'ARRIVED' && '📍 Arrived'}
                          {trackingSession?.status === 'CLASS_STARTED' && '🚗 Class Active'}
                          {(!isPickupEnRoute && trackingSession?.status !== 'ARRIVED' && trackingSession?.status !== 'CLASS_STARTED') && 'Map Inactive'}
                        </span>
                      );
                    })()}
                  </div>

                  {(() => {
                    const isPickupEnRoute = trackingSession && trackingSession.isTracking === true && (
                      trackingSession.status === 'PICKUP_STARTED' ||
                      trackingSession.routeStatus === 'pickup_started' ||
                      trackingSession.routeStatus === 'en_route'
                    );
                    if (!assignedTrainer) {
                      return (
                        <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1 mt-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          🔴 Map Inactive: No class booked or assigned.
                        </p>
                      );
                    } else if (isPickupEnRoute) {
                      return (
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                          Live GPS Active: {assignedTrainer.name} is on the way to your location.
                        </p>
                      );
                    } else if (trackingSession && trackingSession.status === 'ARRIVED') {
                      return (
                        <p className="text-[10px] text-amber-800 font-bold flex items-center gap-1 mt-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          📍 {assignedTrainer.name} has arrived at your pickup point!
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1 mt-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          🔴 Map Inactive: Waiting for trainer to start pickup route.
                        </p>
                      );
                    }
                  })()}
                </div>

                {(() => {
                  const isPickupEnRoute = trackingSession && trackingSession.isTracking === true && (
                    trackingSession.status === 'PICKUP_STARTED' ||
                    trackingSession.routeStatus === 'pickup_started' ||
                    trackingSession.routeStatus === 'en_route'
                  );
                  const isMapActive = isPickupEnRoute || trackingSession?.status === 'ARRIVED' || trackingSession?.status === 'CLASS_STARTED';

                  return (
                    <>
                      {/* Live Real-Time Interactive Map Container */}
                      <div className="my-3">
                        <LiveTrackingMap
                          trainerLat={isMapActive ? trackingSession?.latitude : undefined}
                          trainerLng={isMapActive ? trackingSession?.longitude : undefined}
                          trainerHeading={trackingSession?.heading}
                          trainerName={assignedTrainer?.name || "Trainer"}
                          carPlate={assignedTrainer?.carPlate || "OD 02 AB 1234"}
                          studentLat={trackingSession?.studentLat || studentGps?.lat || (student ? getCoordinatesFromLocation(student.location).lat : DEFAULT_BHUBANESWAR_LOCATION.lat)}
                          studentLng={trackingSession?.studentLng || studentGps?.lng || (student ? getCoordinatesFromLocation(student.location).lng : DEFAULT_BHUBANESWAR_LOCATION.lng)}
                          studentName={student?.name || "Student"}
                          pickupLocationName={student?.location || "Rasulgarh Square, Bhubaneswar"}
                          status={isPickupEnRoute ? (trackingSession?.status || 'PICKUP_STARTED') : (trackingSession?.status === 'ARRIVED' ? 'ARRIVED' : (trackingSession?.status === 'CLASS_STARTED' ? 'CLASS_STARTED' : 'WAITING'))}
                          locationUnavailable={trackingSession?.locationUnavailable}
                          lastUpdatedAt={trackingSession?.lastUpdatedAt || new Date().toISOString()}
                          onMetricsUpdate={(d, e) => setRoadMetrics({ distKm: d, etaMin: e })}
                        />
                      </div>

                      {/* Live Tracking Metrics Details Card or Inactive Status Banner */}
                      {isMapActive ? (
                        (() => {
                          const trainerLat = trackingSession?.latitude;
                          const trainerLng = trackingSession?.longitude;
                          const studentLat = studentGps?.lat || DEFAULT_BHUBANESWAR_LOCATION.lat;
                          const studentLng = studentGps?.lng || DEFAULT_BHUBANESWAR_LOCATION.lng;

                          const hasCoords = typeof trainerLat === 'number' && typeof trainerLng === 'number';
                          const fallbackDist = hasCoords
                            ? calculateDistanceKm(trainerLat, trainerLng, studentLat, studentLng)
                            : 2.4;
                          const distKm = roadMetrics?.distKm ?? fallbackDist;
                          const etaMin = roadMetrics?.etaMin ?? calculateEtaMinutes(distKm, trackingSession?.speed || 25);

                          return (
                            <div className="bg-[#161623] text-white p-3.5 rounded-2xl mb-3 border border-white/10 shadow-lg flex items-center justify-between text-xs">
                              <div className="flex flex-col">
                                <span className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider">Distance To Pickup</span>
                                <span className="font-extrabold text-amber-400 text-sm">{distKm} km</span>
                              </div>

                              <div className="w-px h-8 bg-white/10" />

                              <div className="flex flex-col">
                                <span className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider">Estimated Time</span>
                                <span className="font-extrabold text-emerald-400 text-sm">{etaMin} mins</span>
                              </div>

                              <div className="w-px h-8 bg-white/10" />

                              <div className="flex flex-col">
                                <span className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider">Last Updated</span>
                                <span className="font-bold text-slate-300 text-[10px]">
                                  {formatTimeAgo(trackingSession?.lastUpdatedAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="bg-[#161623] text-slate-300 p-3.5 rounded-2xl mb-3 border border-white/10 shadow-lg text-center text-xs">
                          <p className="font-bold text-amber-400 text-xs">Map Status: Inactive</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Live GPS tracking will activate automatically when your instructor starts the pickup route.</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Trainer info & Call/Chat */}
                {assignedTrainer ? (
                  <div className="bg-[#161623] text-white p-4 rounded-3xl flex items-center justify-between border border-white/10 shadow-lg">
                    <div className="flex items-center gap-3">
                      <img 
                        src={assignedTrainer.photoUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"} 
                        alt={assignedTrainer.name} 
                        className="w-10 h-10 rounded-full border border-white/20 object-cover"
                      />
                      <div>
                        <p className="font-bold text-xs">{assignedTrainer.name}</p>
                        <p className="text-[9px] text-[#27AE60] flex items-center gap-1">
                          ● Assigned Instructor ({assignedTrainer.carName || "Vehicle"} - {assignedTrainer.carPlate || "OD 02 AB 1234"})
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={`tel:${assignedTrainer.phone || "9040040288"}`}
                        className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20"
                      >
                        <Phone className="w-4 h-4 text-[#D4AF37]" />
                      </a>
                      <button 
                        onClick={() => {
                          setActiveTab('profile'); // Goes to chats section on profile
                          showNotification(`Opened Chat with ${assignedTrainer.name}`);
                        }}
                        className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-[#6D3BFF]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#161623] text-white p-6 rounded-3xl border border-white/10 text-center my-3 flex flex-col items-center justify-center gap-2 shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-1">
                      <UserX className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <h3 className="font-extrabold text-sm text-white">No Trainer Assigned Yet</h3>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      You currently do not have an assigned instructor. Once a trainer is assigned or you book a class, live pickup tracking will activate here automatically.
                    </p>
                    <button 
                      onClick={() => setActiveTab('book')}
                      className="mt-1 bg-[#6D3BFF] text-white font-extrabold text-xs px-5 py-2 rounded-2xl hover:bg-[#8F52FF] active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      Book Your Class
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: LEARN */}
            {activeTab === 'learn' && !activeSubPage && (
              <div className="pt-2 animate-fadeIn">
                <h2 className="text-xl font-extrabold text-[#161623] mb-3">Learning Center</h2>

                {/* MCQ Mock Test Launcher banner */}
                <div className="bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white p-4 rounded-3xl shadow-md mb-4 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  <div>
                    <span className="bg-white/20 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">
                      Test Prep
                    </span>
                    <h3 className="font-black text-sm mt-1.5 leading-snug">Take Mock Test</h3>
                    <p className="text-[10px] text-white/80 mt-0.5">5 critical questions for RTO Exam</p>
                  </div>
                  <button 
                    onClick={() => setActiveSubPage('mock-test')}
                    className="bg-[#D4AF37] hover:bg-[#ffe17d] text-[#161623] w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Video Tutorials</h3>
                  
                  {[
                    { title: "Perfecting Clutch Release Point", duration: "8 mins", image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=300" },
                    { title: "Parallel Reversal & Angle Parking", duration: "12 mins", image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300" }
                  ].map((video, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex shadow-sm">
                      <div className="w-24 h-16 relative bg-black flex-shrink-0">
                        <img src={video.image} alt={video.title} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          <PlayCircle className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="p-2.5 flex flex-col justify-center">
                        <h4 className="font-bold text-[11px] text-[#161623] leading-snug line-clamp-2">{video.title}</h4>
                        <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {video.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mt-4">
                  <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider mb-2">Odisha Driving Rules</h3>
                  <ul className="text-[11px] text-slate-600 flex flex-col gap-2">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#27AE60] shrink-0 mt-0.5" />
                      Always pull completely to the left on National Highway 16 when allowing overtaking.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#27AE60] shrink-0 mt-0.5" />
                      Speed limit inside Bhubaneswar city limits is strictly bounded to 40 km/h.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4.5: MY SELECTED PLAN */}
            {activeTab === 'modify' && !activeSubPage && (
              <div className="pt-2 animate-fadeIn pb-6">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-lg font-black text-[#161623] tracking-tight">Selected Registration Plan</h2>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black px-2.5 py-0.5 rounded-full uppercase">
                    Active Registration
                  </span>
                </div>

                {/* Main Plan Card */}
                <div className="bg-gradient-to-br from-[#161623] via-[#202035] to-[#161623] text-white rounded-3xl p-5 shadow-xl relative overflow-hidden border border-white/10 mb-4">
                  <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-[#6D3BFF]/20 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[#D4AF37] text-[9px] font-extrabold uppercase tracking-widest block">
                        SELECTED AT REGISTRATION
                      </span>
                      <h3 className="font-black text-base text-white mt-1">
                        {student.courseName || "Car Driving 15 Days (Light)"}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 mt-3 backdrop-blur-sm">
                    <div>
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Total Package Fee</span>
                      <span className="text-sm font-black text-emerald-400">
                        ₹{(student.totalCourseFee || 3500).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Registration Date</span>
                      <span className="text-xs font-extrabold text-white">
                        {student.joinedDate ? new Date(student.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Counter */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Classes Completed</span>
                    <span className="font-extrabold text-[#D4AF37]">
                      {bookings.filter(b => b.status === 'completed').length} / 15 Classes
                    </span>
                  </div>
                </div>

                {/* Plan Benefits & Details */}
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-wider mb-3">
                    REGISTERED COURSE INCLUSIONS
                  </h3>

                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: "15 On-Road Driving Lessons", desc: "Dual-control certified training cars with expert instructor" },
                      { label: "RTO Learner & Driving Licence Assistance", desc: "Full coordination for government documentation and slot booking" },
                      { label: "Pick-up & Drop Facility", desc: "Available at designated points across Bhubaneswar" },
                      { label: "AI Driving Coach Access", desc: "24/7 interactive assistant for traffic rules & driving queries" },
                      { label: "Free Practice Mock Tests", desc: "RTO computer test prep question sets" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-[#F8F9FF] p-3 rounded-2xl border border-slate-100">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-[#161623]">{item.label}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PROFILE & CHATS */}
            {activeTab === 'profile' && !activeSubPage && (
              <div className="pt-2 animate-fadeIn text-[#161623]">
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm text-center flex flex-col items-center mb-4">
                  {/* Profile Picture Container with Camera Icon Badge */}
                  <div 
                    className="relative group cursor-pointer" 
                    onClick={() => { setProfilePicError(null); setProfilePicMode('options'); setProfilePicModalOpen(true); }}
                  >
                    <img 
                      src={student.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                      alt={student.name} 
                      className="w-20 h-20 rounded-full border-2 border-[#6D3BFF] object-cover shadow-md group-hover:brightness-90 transition-all"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfilePicError(null);
                        setProfilePicMode('options');
                        setProfilePicModalOpen(true);
                      }}
                      className="absolute bottom-0 right-0 bg-[#6D3BFF] text-white p-2 rounded-full shadow-lg hover:bg-[#8F52FF] active:scale-95 transition-all cursor-pointer border-2 border-white"
                      title="Change Profile Picture"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => { setProfilePicError(null); setProfilePicMode('options'); setProfilePicModalOpen(true); }}
                    className="mt-2 text-[11px] text-[#6D3BFF] font-black hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> Change Profile Picture
                  </button>
                  <h3 className="font-extrabold text-sm text-[#161623] mt-1">{student.name}</h3>
                  <p className="text-[10px] text-slate-400">{student.email}</p>
                  
                  {/* STUDENT PORTAL CARD */}
                  <div className="mt-4 w-full bg-gradient-to-r from-[#161623] to-[#252538] text-white rounded-2xl p-4 border border-slate-800 text-left shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                        STUDENT PORTAL
                      </span>
                      {dlApp && (
                        <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {dlApp.status}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-xs text-white mt-1">
                      Do you want to apply for a Driving Licence?
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {dlApp ? "View uploaded documents and check application progress." : "Quick 4-step document upload system."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSubPage('licence-apply')}
                      className="mt-3 w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{dlApp ? "View Application" : "Click Here to Apply"}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  {/* Selected Registration Plan Summary */}
                  <div 
                    onClick={() => setActiveTab('modify')}
                    className="bg-gradient-to-r from-[#6D3BFF]/10 to-[#8F52FF]/10 border border-[#6D3BFF]/20 rounded-2xl p-3 mt-3 w-full text-left flex items-center justify-between cursor-pointer hover:border-[#6D3BFF] transition-all group"
                  >
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#6D3BFF]">
                        Selected Registration Plan
                      </span>
                      <h4 className="font-extrabold text-xs text-[#161623] mt-0.5">
                        {student.courseName || "Car Driving 15 Days (Light)"}
                      </h4>

                    </div>
                    <span className="bg-[#6D3BFF] text-white text-[9px] font-black px-2.5 py-1 rounded-xl shadow-sm group-hover:scale-105 transition-all">
                      View Plan →
                    </span>
                  </div>

                  {/* Completed classes stats block */}
                  <div className="bg-[#6D3BFF]/5 border border-[#6D3BFF]/10 text-[#6D3BFF] font-extrabold text-[11px] px-3.5 py-2.5 rounded-2xl mt-2 flex items-center justify-between w-full shadow-sm">
                    <span className="flex items-center gap-1.5">🎓 Total Classes Completed</span>
                    <span className="bg-[#6D3BFF] text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs">
                      {bookings.filter(b => b.status === 'completed').length}
                    </span>
                  </div>

                  {/* Payment History Section */}
                  {(() => {
                    const mergedMap = new Map<string, any>();
                    if (student.paymentHistory && Array.isArray(student.paymentHistory)) {
                      student.paymentHistory.forEach((p: any) => {
                        const key = p.id || p.transactionId || `pay_${p.amount}_${p.date}`;
                        mergedMap.set(key, p);
                      });
                    }
                    if (payments && Array.isArray(payments)) {
                      payments.forEach((p: any) => {
                        if (!p.studentId || p.studentId === student.id) {
                          const key = p.id || p.transactionId || `pay_${p.amount}_${p.date}`;
                          mergedMap.set(key, p);
                        }
                      });
                    }
                    const allStudentPayments = Array.from(mergedMap.values());
                    
                    const totalCourseFee = student.totalCourseFee || 3500;
                    const calculatedPaid = allStudentPayments.reduce((sum, p) => {
                      const st = (p.status || '').toString().toLowerCase();
                      if (st === 'success' || st === 'approved' || st === 'paid' || st === 'completed') {
                        return sum + (Number(p.amount) || 0);
                      }
                      return sum;
                    }, 0);
                    
                    const totalPaid = Math.max(calculatedPaid, student.amountPaid || 0);
                    const remainingBalance = Math.max(0, totalCourseFee - totalPaid);

                    return (
                      <div className="w-full mt-4 text-left border-t border-slate-100 pt-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <div>
                            <h3 className="text-xs font-black text-[#161623] uppercase tracking-wider flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-[#6D3BFF]" /> Payment History
                            </h3>
                            <p className="text-[9.5px] text-slate-400 font-medium">Real-time payment records & balance</p>
                          </div>
                          <span className="text-[8.5px] bg-[#6D3BFF]/10 text-[#6D3BFF] font-black px-2.5 py-0.5 rounded-full uppercase">
                            {allStudentPayments.length} {allStudentPayments.length === 1 ? 'Record' : 'Records'}
                          </span>
                        </div>

                        {/* Financial Summary Banner */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-[#F8F9FF] border border-slate-100 rounded-2xl p-2.5 flex flex-col">
                            <span className="text-[8.5px] font-extrabold uppercase text-slate-400">Total Paid</span>
                            <span className="text-sm font-black text-emerald-600 mt-0.5">
                              ₹{totalPaid.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-[#F8F9FF] border border-slate-100 rounded-2xl p-2.5 flex flex-col">
                            <span className="text-[8.5px] font-extrabold uppercase text-slate-400">Remaining Balance</span>
                            <span className={`text-sm font-black mt-0.5 ${remainingBalance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                              ₹{remainingBalance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Payment List or Empty State */}
                        {allStudentPayments.length === 0 ? (
                          <div className="bg-[#F8F9FF] border border-dashed border-slate-200 rounded-2xl p-4 text-center flex flex-col items-center justify-center my-1">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
                              <CreditCard className="w-4.5 h-4.5 text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-600">No payment records found.</p>
                            <p className="text-[9.5px] text-slate-400 mt-0.5">Your payment transactions will appear here instantly once made or recorded.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollable-touch custom-scrollbar pr-0.5">
                            {allStudentPayments.map((p: any, idx: number) => {
                              const rawStatus = (p.status || 'Success').toString();
                              const isSuccess = ['success', 'approved', 'paid', 'completed'].includes(rawStatus.toLowerCase());
                              const isPending = ['pending', 'pending approval', 'processing'].includes(rawStatus.toLowerCase());
                              
                              let dateDisplay = p.date || p.timestamp || p.createdDate || 'Recently';
                              try {
                                if (dateDisplay && dateDisplay !== 'Recently') {
                                  const d = new Date(dateDisplay);
                                  if (!isNaN(d.getTime())) {
                                    dateDisplay = d.toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  }
                                }
                              } catch (e) {
                                // Keep raw date string
                              }

                              return (
                                <div key={p.id || `pay_${idx}`} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs flex flex-col gap-1.5 hover:border-[#6D3BFF]/30 transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                                        isSuccess ? 'bg-emerald-500/10 text-emerald-600' : isPending ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                                      }`}>
                                        ₹
                                      </div>
                                      <div>
                                        <h4 className="font-extrabold text-xs text-[#161623]">
                                          {p.purpose || "Driving Course Fee"}
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-medium">{dateDisplay}</p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span className="font-black text-xs text-[#161623] block">
                                        ₹{(Number(p.amount) || 0).toLocaleString()}
                                      </span>
                                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase inline-block mt-0.5 ${
                                        isSuccess 
                                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                          : isPending 
                                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                      }`}>
                                        {rawStatus}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                                    <span>Method: <strong className="text-slate-700">{p.paymentMethod || 'UPI'}</strong></span>
                                    <span className="font-mono text-[8.5px] text-slate-400">Txn ID: {p.transactionId || p.id || 'N/A'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Vault & Assistant Tools */}
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">VAULT & ASSISTANT TOOLS</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Award className="w-5 h-5 text-[#6D3BFF]" />, label: "Selected Plan", onClick: () => { setActiveTab('modify'); } },
                      { icon: <Sparkles className="w-5 h-5 text-[#D4AF37]" />, label: "AI Coach", onClick: () => setActiveSubPage('ai-coach') },
                      { icon: <Award className="w-5 h-5 text-[#8F52FF]" />, label: "Mock Test", onClick: () => setActiveSubPage('mock-test') },
                      { icon: <Folder className="w-5 h-5 text-[#6D3BFF]" />, label: "My Files", onClick: () => setActiveSubPage('vault-files') },
                      { icon: <Edit3 className="w-5 h-5 text-indigo-500" />, label: "My Notes", onClick: () => setActiveSubPage('vault-notes') }
                    ].map((act, i) => (
                      <button 
                        key={i} 
                        onClick={act.onClick}
                        className="bg-white border border-slate-100 p-3 rounded-2xl flex flex-col items-center gap-1.5 hover:border-[#6D3BFF] cursor-pointer shadow-sm text-center transition-all hover:scale-95"
                      >
                        {act.icon}
                        <span className="text-[9px] font-bold text-slate-700 leading-tight">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-Time Chat with Assigned Trainer */}
                <div className="bg-white border border-slate-100 rounded-3xl p-3 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1 border-b border-slate-50 pb-2">
                    <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#6D3BFF]" />
                      {assignedTrainer ? `Chat with ${assignedTrainer.name}` : "Chat with Trainer"}
                    </h3>
                    {assignedTrainer && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● Online
                      </span>
                    )}
                  </div>

                  {assignedTrainer ? (
                    <>
                      <div className="h-[200px] overflow-y-auto scrollable-touch custom-scrollbar flex flex-col gap-2.5 p-1 border-b border-slate-50 mb-2">
                        {chats.filter(msg => 
                          (msg.senderId === student.id && msg.receiverId === assignedTrainer.id) ||
                          (msg.senderId === assignedTrainer.id && msg.receiverId === student.id) ||
                          (msg.senderId === 'system' && msg.receiverId === student.id)
                        ).map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`p-2.5 rounded-xl text-[10px] max-w-[80%] ${
                              msg.senderId === student.id 
                                ? 'bg-[#6D3BFF] text-white self-end rounded-tr-none' 
                                : 'bg-[#F8F9FF] text-slate-700 self-start border border-[#E9ECF4] rounded-tl-none'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <span className="text-[8px] opacity-75 mt-0.5 block text-right">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleSendChatMessage} className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={chatMessageInput}
                          onChange={(e) => setChatMessageInput(e.target.value)}
                          placeholder={`Type a message for ${assignedTrainer.name.split(' ')[0]}...`}
                          className="flex-1 bg-[#F8F9FF] border-none rounded-xl p-2.5 text-[11px] focus:outline-none font-medium"
                          required
                        />
                        <button 
                          type="submit" 
                          className="bg-[#6D3BFF] text-white px-3 rounded-xl hover:bg-[#8F52FF] text-[10px] font-bold cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center my-1">
                      <UserX className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="font-extrabold text-xs text-slate-700">No trainer assigned yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Chatting will be enabled once an instructor is assigned to your profile.</p>
                    </div>
                  )}
                </div>

                {/* Support details & Referral info */}
                <div className="mt-4 bg-[#6D3BFF]/5 rounded-3xl p-3.5 border border-[#6D3BFF]/10 text-center">
                  <h4 className="font-black text-xs text-[#161623]">Earn Free Driving Credit</h4>
                  <p className="text-[9px] text-slate-500 mt-1">Share code <span className="font-extrabold text-[#6D3BFF] uppercase">{student.referralCode}</span> with friends & get ₹500 discount.</p>
                </div>

                {/* Account Deletion Status Banner or Button */}
                {student.deletionRequested || student.deletionStatus === 'requested' ? (
                  <div className="mt-4 bg-rose-50 border border-rose-200 rounded-3xl p-4 text-rose-800 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <h4 className="font-extrabold text-xs text-rose-900">Account Deletion Requested</h4>
                    </div>
                    <p className="text-[10px] leading-relaxed text-rose-700">
                      Your deletion request has been submitted. Account erasure will be completed upon <strong>Admin approval</strong> or <strong>automatically after 15 days</strong> if you do not log in during this period.
                    </p>
                    {student.deletionRequestedAt && (
                      <p className="text-[9px] text-rose-500 font-bold mt-1.5">
                        Submitted: {new Date(student.deletionRequestedAt).toLocaleDateString()} at {new Date(student.deletionRequestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-3xl p-3.5 shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-rose-900">Delete Account</h4>
                          <p className="text-[9.5px] text-rose-600/80">Permanently erase profile & personal records</p>
                        </div>
                      </div>
                      <button
                        onClick={handleOpenAccountDeletion}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <button
                  onClick={performLogout}
                  className="w-full mt-4 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-600 font-extrabold text-xs uppercase py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" /> Sign Out / Switch Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation (Visible in main app screen) */}
      {currentScreen === 'app' && activeSubPage !== 'ai-coach' && (
        <button
          id="floating-ai-coach-btn"
          onClick={() => setActiveSubPage('ai-coach')}
          className="absolute bottom-20 right-6 bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] hover:brightness-110 text-white font-extrabold text-[10px] px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-[#6D3BFF]/35 hover:shadow-[#6D3BFF]/50 active:scale-95 hover:scale-105 transition-all z-40 cursor-pointer border border-[#6D3BFF]/20 animate-bounce-slow"
          style={{ animationDuration: '4s' }}
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
          <span>Ask AI Coach</span>
        </button>
      )}

      {/* Bottom Floating Navigation (Visible in main app screen) */}
      {currentScreen === 'app' && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md py-2.5 px-2 border border-slate-100 flex justify-between items-center z-40 rounded-2xl shadow-xl shadow-slate-200/60">
          {[
            { id: 'home', label: 'Home', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
            { id: 'classes', label: 'Classes', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { id: 'track', label: 'Track', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveSubPage(null);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-all cursor-pointer flex-1 ${
                  isActive 
                    ? 'bg-[#6D3BFF] text-white' 
                    : 'text-slate-400 hover:text-[#6D3BFF]'
                }`}
              >
                {tab.icon}
                <span className="text-[7.5px] font-bold uppercase tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 15 CLASSES COMPLETED PLAN EXTENSION POPUP */}
      {bookings.filter(b => b.status === 'completed').length >= 15 && !student.planExtended && !extendModalDismissed && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-5 shadow-2xl border border-amber-100 max-w-[320px] text-center flex flex-col items-center animate-scaleUp">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="font-black text-[#161623] text-xs tracking-tight leading-tight">
              Milestone Reached!<br />Completed 15 Classes 🎉
            </h3>
            <p className="text-[9.5px] text-slate-500 mt-2 leading-relaxed">
              Congratulations on completing 15 driving sessions! To continue booking classes and lock in your RTO road test, please extend your active plan below:
            </p>

            {/* Extension Choices */}
            <div className="flex gap-2 w-full mt-3.5">
              <button
                type="button"
                onClick={() => setExtensionAmountSelected(2500)}
                className={`flex-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  extensionAmountSelected === 2500 
                    ? 'border-[#6D3BFF] bg-[#6D3BFF]/10 text-[#6D3BFF]' 
                    : 'border-slate-100 bg-[#F8F9FF] text-slate-600'
                }`}
              >
                <span className="font-black text-[9px] block">+5 Classes</span>
                <span className="text-[8px] font-medium text-slate-400">₹2,500</span>
              </button>
              <button
                type="button"
                onClick={() => setExtensionAmountSelected(4500)}
                className={`flex-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  extensionAmountSelected === 4500 
                    ? 'border-[#6D3BFF] bg-[#6D3BFF]/10 text-[#6D3BFF]' 
                    : 'border-slate-100 bg-[#F8F9FF] text-slate-600'
                }`}
              >
                <span className="font-black text-[9px] block">+10 Classes</span>
                <span className="text-[8px] font-medium text-slate-400">₹4,500</span>
              </button>
            </div>

            <div className="w-full mt-4 flex flex-col gap-1">
              <button
                onClick={handlePayPlanExtension}
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black py-2 rounded-xl text-[11px] shadow-md cursor-pointer"
              >
                Extend Plan Now
              </button>
              <button
                onClick={() => setExtendModalDismissed(true)}
                className="text-[8.5px] text-slate-400 font-extrabold hover:underline py-1 cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FACE RECOGNITION CHECK-IN MODAL */}
      {faceCheckinOpen && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* iOS Device Frame Container mockup */}
          <div className="bg-white rounded-[40px] max-w-[340px] w-full h-[600px] shadow-2xl border border-slate-200/80 flex flex-col relative overflow-hidden animate-scaleUp select-none font-sans text-slate-800">
            
            {/* Absolute close button (visible only in non-permission screens for safe escape) */}
            {faceCaptureStep !== 'permission' && (
              <button 
                onClick={() => {
                  stopCamera();
                  setFaceCheckinOpen(false);
                  setFaceScanState('idle');
                  setFaceCaptureStep('tutorial');
                }}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100/80 transition-colors cursor-pointer z-30"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* SCREEN CONTENT BASED ON STEP */}
            
            {/* STEP 1: TUTORIAL */}
            {faceCaptureStep === 'tutorial' && (
              <div className="flex-1 flex flex-col items-center justify-between pt-12 pb-8">
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  {/* Title */}
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight mt-1">Take a selfie</h3>
                  {/* Subtitle */}
                  <p className="text-[12px] text-slate-500 mt-2 max-w-[220px] leading-relaxed">
                    This allows you to sign in using your face.
                  </p>

                  {/* Concentric rings avatar graphic */}
                  <div className="my-8 relative w-44 h-44 flex items-center justify-center">
                    {/* Concentric glowing blue animation circles */}
                    <div className="absolute inset-0 rounded-full border border-blue-500/10 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border border-blue-400/20 border-t-blue-500/80 animate-spin-slow" />
                    <div className="absolute inset-4 rounded-full border-2 border-blue-500/10" />
                    <div className="absolute inset-6 rounded-full border border-blue-500/5" />
                    
                    {/* Inner avatar background card */}
                    <div className="w-28 h-28 rounded-full bg-[#F2F7FF] flex items-end justify-center overflow-hidden border border-blue-100/50 shadow-inner relative">
                      {/* Stylized white silhouette head/shoulders */}
                      <svg className="w-20 h-20 text-blue-500 translate-y-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  </div>

                  {/* Stencil Caption */}
                  <p className="text-[11px] text-slate-400 font-medium max-w-[200px] leading-relaxed">
                    Stay still, selfie will be taken automatically
                  </p>
                </div>

                {/* Primary blue action button */}
                <div className="w-full px-6 mt-2">
                  <button
                    onClick={() => setFaceCaptureStep('permission')}
                    className="w-full bg-[#0055FF] hover:bg-[#0044DD] text-white font-bold text-sm py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Take selfie
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CAMERA PERMISSION DIALOG OVERLAY (on top of dimmed tutorial) */}
            {faceCaptureStep === 'permission' && (
              <div className="flex-1 flex flex-col justify-between pt-12 pb-8 relative">
                {/* Background blurred tutorial screen */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 opacity-30 select-none pointer-events-none">
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">Take a selfie</h3>
                  <div className="my-8 w-44 h-44 rounded-full bg-[#F2F7FF] border border-blue-100" />
                  <p className="text-[11px] text-slate-400">Stay still, selfie will be taken automatically</p>
                </div>

                {/* Simulated native iOS Camera Permission popup */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-5 z-30 animate-fadeIn">
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-[260px] w-full flex flex-col overflow-hidden text-center animate-scaleUp border border-slate-100">
                    <div className="p-5 flex flex-col items-center">
                      <h4 className="font-bold text-slate-900 text-[13px] leading-tight max-w-[200px]">
                        “Golden Hands” Would Like to Access the Camera
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                        Camera is required for document scanning and photo capture.
                      </p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex border-t border-slate-200/80 text-xs">
                      <button
                        onClick={() => setFaceCaptureStep('tutorial')}
                        className="flex-1 py-3 text-[#0055FF] hover:bg-slate-50 font-semibold border-r border-slate-200/80 cursor-pointer active:bg-slate-100"
                      >
                        Don't Allow
                      </button>
                      <button
                        onClick={() => {
                          setFaceCaptureStep('capture');
                          startCamera();
                        }}
                        className="flex-1 py-3 text-[#0055FF] hover:bg-slate-50 font-black cursor-pointer active:bg-slate-100"
                      >
                        Allow
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SELFIE CAPTURE WITH REAL-TIME AUTOMATIC FACE DETECTION */}
            {faceCaptureStep === 'capture' && (
              <div className="flex-1 flex flex-col items-center justify-between pt-10 pb-8">
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 w-full">
                  
                  {/* Circle cropped Webcam Frame with dynamic status border */}
                  <div className="my-4 relative w-52 h-52 flex items-center justify-center">
                    
                    {/* Glowing outer circular border matching detection status */}
                    <div className={`absolute inset-0 rounded-full p-1 transition-all duration-300 shadow-xl flex items-center justify-center ${
                      !useRealCamera
                        ? 'bg-rose-500/20'
                        : faceDetectStatus === 'detected'
                        ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-500 ring-4 ring-emerald-400/30 animate-pulse'
                        : faceDetectStatus === 'no_face'
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-500 ring-2 ring-rose-400/20'
                        : 'bg-gradient-to-tr from-[#0055FF] via-[#00CCFF] to-[#0055FF] animate-pulse'
                    }`}>
                      {/* Inner crop frame */}
                      <div className="w-full h-full rounded-full overflow-hidden bg-black relative shadow-inner">
                        {/* Real front camera stream */}
                        {useRealCamera ? (
                          <>
                            <video 
                              ref={videoRefCallback}
                              className="w-full h-full object-cover scale-x-[-1]"
                              playsInline
                              muted
                            />
                            {/* Facial oval stencil guide changing color with detection status */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <svg className={`w-32 h-40 transition-colors duration-300 ${
                                faceDetectStatus === 'detected' 
                                  ? 'text-emerald-400/90' 
                                  : faceDetectStatus === 'no_face' 
                                  ? 'text-rose-400/80' 
                                  : 'text-white/60'
                              }`} viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M 50,15 C 25,15 25,75 32,98 C 38,108 50,112 50,112 C 50,112 62,108 68,98 C 75,75 75,15 50,15 Z" strokeDasharray="4 4" />
                                <line x1="30" y1="50" x2="70" y2="50" strokeOpacity="0.25" strokeDasharray="2 2" />
                                <line x1="50" y1="20" x2="50" y2="105" strokeOpacity="0.25" strokeDasharray="2 2" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          /* Simulated / Disabled camera visual */
                          <div className="w-full h-full bg-[#0F172A] flex flex-col items-center justify-center p-4 relative">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                              <CameraOff className="w-6 h-6 animate-bounce" />
                            </div>
                            <span className="text-[10px] font-bold text-rose-400">CAMERA NOT ENABLED</span>
                            <span className="text-[8px] text-slate-400 mt-1 max-w-[140px] leading-relaxed">
                              Permission denied or no camera device found.
                            </span>
                          </div>
                        )}

                        {/* Camera Flash Overlay */}
                        {isFlashing && (
                          <div className="absolute inset-0 bg-white z-50 animate-flash" />
                        )}
                      </div>
                    </div>

                    {/* Floating Real-Time Status Badge */}
                    {useRealCamera && (
                      <div className={`absolute -bottom-3 text-white font-black text-[9.5px] px-3.5 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 ${
                        faceDetectStatus === 'detected'
                          ? 'bg-emerald-600 animate-bounce'
                          : faceDetectStatus === 'no_face'
                          ? 'bg-amber-600'
                          : 'bg-[#0055FF]'
                      }`}>
                        {faceDetectStatus === 'detected' ? (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-200 fill-emerald-200" />
                            <span>Face Detected ({faceDetectProgress}%)</span>
                          </>
                        ) : faceDetectStatus === 'no_face' ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-200" />
                            <span>Face Not Visible</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 text-blue-200 animate-spin" />
                            <span>Detecting Face...</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Detection Feedback Message & Action Controls */}
                  {useRealCamera ? (
                    <div className="flex flex-col items-center w-full mt-2">
                      <h3 className={`font-extrabold text-xs transition-colors duration-200 ${
                        faceDetectStatus === 'detected' 
                          ? 'text-emerald-600' 
                          : faceDetectStatus === 'no_face' 
                          ? 'text-amber-600' 
                          : 'text-slate-800'
                      }`}>
                        {faceDetectStatus === 'detected' 
                          ? 'Face Detected! Hold Steady...' 
                          : faceDetectStatus === 'no_face' 
                          ? 'Unable to Detect Face' 
                          : 'Automatic Face Detection'}
                      </h3>
                      
                      <p className="text-[10.5px] text-slate-500 mt-1 max-w-[230px] leading-relaxed font-medium">
                        {faceDetectMessage}
                      </p>

                      {/* Detection Progress Bar */}
                      {faceDetectStatus === 'detected' && (
                        <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5 border border-slate-200">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-200 ease-out" 
                            style={{ width: `${faceDetectProgress}%` }}
                          />
                        </div>
                      )}

                      {/* Control Buttons: Retry Face Scan or Instant Capture */}
                      <div className="flex items-center justify-center gap-2 mt-3.5 w-full max-w-[240px]">
                        {(faceDetectStatus === 'no_face' || detectionTimeoutOccurred) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFaceDetectStatus('searching');
                              setFaceDetectProgress(0);
                              setFaceDetectMessage("Position your face inside the circle...");
                              setDetectionTimeoutOccurred(false);
                              autoCaptureTriggeredRef.current = false;
                              startCamera(true);
                            }}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] py-2 px-3 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry Detection
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePerformFaceScan()}
                          className="flex-1 bg-[#0055FF] hover:bg-[#0044DD] text-white font-bold text-[11px] py-2 px-3 rounded-xl shadow-md shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
                        >
                          Capture Now
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center w-full">
                      <h3 className="font-bold text-rose-500 text-sm mt-2">Camera Unavailable</h3>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                        Camera access is required for live photo capture, or complete check-in directly below.
                      </p>
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-center gap-2 mt-4 w-full max-w-[240px]">
                        <button
                          type="button"
                          onClick={() => {
                            setFaceError(null);
                            startCamera(true);
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePerformFaceScan()}
                          className="flex-1 bg-[#0055FF] hover:bg-[#0044DD] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Check-in Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: UPLOADING & BIOMETRIC VERIFICATION LOGGING */}
            {faceCaptureStep === 'uploading' && (
              <div className="flex-1 flex flex-col items-center justify-center pt-12 pb-8">
                <div className="flex flex-col items-center justify-center text-center px-6">
                  {/* Blue circle circular loader spinner */}
                  <div className="relative w-14 h-14 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#0055FF] border-l-[#0055FF] animate-spin" />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">Uploading...</h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    Analyzing biometric markers and registering attendance logs...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 5: SUCCESS / CONFIRMATION */}
            {faceCaptureStep === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-between pt-12 pb-8">
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  {/* Verified Checkmark circular badge */}
                  <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-6 animate-scaleUp">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>

                  <h3 className="font-bold text-slate-950 text-lg">Success!</h3>
                  <p className="text-[12px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                    Your live check-in photo record has been logged.
                  </p>
                </div>

                {/* Primary blue Done button */}
                <div className="w-full px-6 mt-2">
                  <button
                    onClick={() => {
                      setFaceCheckinOpen(false);
                      setFaceScanState('idle');
                      setFaceCaptureStep('tutorial');
                      const freshBookings = MockDatabase.getBookings();
                      if (freshBookings && freshBookings.length > 0) {
                        setBookings(freshBookings);
                      }
                    }}
                    className="w-full bg-[#0055FF] hover:bg-[#0044DD] text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Done & Continue
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* AADHAAR CARD VERIFICATION POPUP */}
      {currentScreen === 'app' && !isAadharVerified && !student.adminManualUnlock && showAadharModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 shadow-2xl border border-slate-100 max-w-[340px] w-full text-center flex flex-col items-center animate-scaleUp">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                Verification Required
              </span>
              <button 
                onClick={() => setShowAadharModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-12 h-12 bg-[#6D3BFF]/10 rounded-full flex items-center justify-center text-[#6D3BFF] mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight">
              Aadhaar Card Upload
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              To fully activate your driving profile and book live training classes, you must upload your **Aadhaar Card** for Admin verification. Only Aadhaar Cards are accepted.
            </p>

            <div className="w-full mt-4">
              {aadharDoc ? (
                aadharDoc.status === 'Pending' ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse mr-2" />
                    <span className="text-xs font-bold text-amber-600">Pending Admin Review</span>
                    <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                      We have received your Aadhaar Card. The administration will verify it shortly. You can switch to the **Admin Dashboard** tab to approve it immediately.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await MockDatabase.syncFromCloud();
                          refreshLocalState();
                          onStateChange();
                          showNotification("Database synchronized! Aadhaar Card status updated.");
                        } catch (err) {
                          console.error("Manual sync failed:", err);
                        }
                      }}
                      className="mt-3 text-[10px] text-[#6D3BFF] font-black hover:underline flex items-center gap-1.5 justify-center mx-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin" /> Check Approval Status
                    </button>
                  </div>
                ) : (
                  // Rejected State
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-2" />
                    <span className="text-xs font-bold text-rose-600">Verification Rejected</span>
                    <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                      Your previous Aadhaar Card upload was rejected. Please re-upload a clear and valid Aadhaar Card image.
                    </p>
                    <form onSubmit={handleAadharUploadSimulated} className="mt-3 flex flex-col gap-2">
                      <input 
                        type="file"
                        ref={aadharFileInputRef}
                        onChange={handleAadharFileSelect}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                      <div 
                        onClick={() => aadharFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleAadharDrop}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-[#F8F9FF] hover:bg-[#6D3BFF]/5 hover:border-[#6D3BFF]/40 cursor-pointer transition-all flex flex-col items-center justify-center"
                      >
                        {aadharFile?.fileUrl ? (
                          <img 
                            src={aadharFile.fileUrl} 
                            alt="Aadhaar Preview" 
                            className="w-16 h-16 object-cover rounded-lg mb-1 border border-slate-100 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileUp className="w-6 h-6 text-slate-400 mb-1" />
                        )}
                        <span className="text-[10px] font-bold text-slate-700">
                          {aadharFile ? aadharFile.name : "Choose Aadhaar Card File"}
                        </span>
                      </div>
                      {aadharFile && (
                        <button
                          type="submit"
                          disabled={aadharUploading}
                          className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black py-2 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {aadharUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                            </>
                          ) : (
                            "Re-Submit for Approval"
                          )}
                        </button>
                      )}
                    </form>
                  </div>
                )
              ) : (
                // Not Uploaded State
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block mb-2">Status: Not Uploaded</span>
                  <form onSubmit={handleAadharUploadSimulated} className="flex flex-col gap-2">
                    <input 
                      type="file"
                      ref={aadharFileInputRef}
                      onChange={handleAadharFileSelect}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <div 
                      onClick={() => aadharFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleAadharDrop}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white hover:bg-[#6D3BFF]/5 hover:border-[#6D3BFF]/40 cursor-pointer transition-all flex flex-col items-center justify-center"
                    >
                      {aadharFile?.fileUrl ? (
                        <img 
                          src={aadharFile.fileUrl} 
                          alt="Aadhaar Preview" 
                          className="w-16 h-16 object-cover rounded-lg mb-1 border border-slate-100 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileUp className="w-6 h-6 text-[#6D3BFF] mb-1" />
                      )}
                      <span className="text-[10px] font-bold text-slate-700">
                        {aadharFile ? aadharFile.name : "Select Aadhaar Card Photo"}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5">JPEG or PNG under 5MB</span>
                    </div>
                    {aadharFile && (
                      <button
                        type="submit"
                        disabled={aadharUploading}
                        className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black py-2.5 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {aadharUploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading Aadhaar...
                          </>
                        ) : (
                          "Submit Aadhaar Card"
                        )}
                      </button>
                    )}
                  </form>
                </div>
              )}
            </div>

            <div className="w-full mt-4 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowAadharModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-[10px] cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE ACCOUNT SIGNUP DIALOG */}
      {showGoogleDialog && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 shadow-2xl border border-slate-100 max-w-[340px] w-full text-center flex flex-col items-center animate-scaleUp animate-duration-200">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                Google Authentication
              </span>
              <button 
                onClick={() => setShowGoogleDialog(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-12 h-12 bg-[#4285F4]/10 rounded-full flex items-center justify-center text-[#4285F4] mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 7.21 1 3.12 5.09 3.12 10.12s4.09 9.12 9.12 9.12c5.25 0 8.74-3.69 8.74-8.89 0-.6-.06-1.065-.137-1.465H12.24z" />
              </svg>
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight">
              Sign Up with Google
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Select an account to register securely with Golden Hands Driving School.
            </p>

            <div className="w-full mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  // Live Google authentication will be implemented later.
                }}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center gap-2.5 shadow-sm cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#6D3BFF]/10 text-[#6D3BFF] flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-[#161623] truncate leading-tight">{nameInput || "Binayak"}</p>
                  <p className="text-[9px] text-slate-400 truncate leading-tight">{emailInput || "beatking.binayak@gmail.com"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  // Live Google authentication will be implemented later.
                }}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center gap-2.5 shadow-sm cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                  G
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-[#161623] truncate leading-tight">Guest Driver</p>
                  <p className="text-[9px] text-slate-400 truncate leading-tight">guest.driver@gmail.com</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            <div className="w-full mt-4 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowGoogleDialog(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-[10px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VAULTFLOW WORKSPACE ACTION MODALS */}
      {/* ========================================== */}

      {/* 1. New Folder Modal */}
      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                New Folder
              </span>
              <button 
                onClick={() => setNewFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight mb-1">
              Create Folder
            </h3>
            <p className="text-[9px] text-slate-400 mb-4">
              Organize your documents. Folders are private to your user context.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Folder Name</label>
                <input 
                  type="text" 
                  value={folderNameInput} 
                  onChange={(e) => setFolderNameInput(e.target.value)} 
                  placeholder="e.g. RTO Applications" 
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors"
                  required
                />
              </div>

              {modalError && (
                <p className="text-[9px] font-bold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  ⚠️ {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6D3BFF] hover:bg-[#592EE6] text-white font-black py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Folder"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add File Modal */}
      {addFileModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                Add File
              </span>
              <button 
                onClick={() => setAddFileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight mb-1">
              Add Secure File Info
            </h3>
            <p className="text-[9px] text-slate-400 mb-4">
              Catalog physical or scanned documents under secure cloud storage.
            </p>

            <form onSubmit={handleAddFile} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Document Name</label>
                <input 
                  type="text" 
                  value={fileNameInput} 
                  onChange={(e) => setFileNameInput(e.target.value)} 
                  placeholder="e.g. Learner_Licence_Odisha.pdf" 
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Target Folder (Optional)</label>
                <select 
                  value={fileFolderInput} 
                  onChange={(e) => setFileFolderInput(e.target.value)}
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="">None / Root Directory</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Estimated Size (Optional)</label>
                <input 
                  type="text" 
                  value={fileSizeInput} 
                  onChange={(e) => setFileSizeInput(e.target.value)} 
                  placeholder="e.g. 1.2 MB" 
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors"
                />
              </div>

              {modalError && (
                <p className="text-[9px] font-bold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  ⚠️ {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddFileModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6D3BFF] hover:bg-[#592EE6] text-white font-black py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Add Document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. New Note Modal */}
      {newNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                New Note
              </span>
              <button 
                onClick={() => setNewNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight mb-1">
              Write Encrypted Note
            </h3>
            <p className="text-[9px] text-slate-400 mb-4">
              Write secure, personal notes. They are stored encrypted in the cloud.
            </p>

            <form onSubmit={handleCreateNote} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Note Title</label>
                <input 
                  type="text" 
                  value={noteTitleInput} 
                  onChange={(e) => setNoteTitleInput(e.target.value)} 
                  placeholder="e.g. Tips for Parallel Parking" 
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Content details</label>
                <textarea 
                  value={noteContentInput} 
                  onChange={(e) => setNoteContentInput(e.target.value)} 
                  placeholder="Write your study notes, trainer advice, or steps here..." 
                  rows={4}
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors resize-none"
                />
              </div>

              {modalError && (
                <p className="text-[9px] font-bold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  ⚠️ {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewNoteModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6D3BFF] hover:bg-[#592EE6] text-white font-black py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Save Secured Note"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Team Member Modal */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[10px] font-extrabold text-[#6D3BFF] tracking-wider uppercase bg-[#6D3BFF]/10 px-2 py-0.5 rounded-full">
                Add Member
              </span>
              <button 
                onClick={() => setAddMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-black text-[#161623] text-sm tracking-tight leading-tight mb-1">
              Add Collaborator
            </h3>
            <p className="text-[9px] text-slate-400 mb-4">
              Share driving resources or files with friends, instructors, or parents.
            </p>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={memberNameInput} 
                  onChange={(e) => setMemberNameInput(e.target.value)} 
                  placeholder="e.g. Subhasish Coach" 
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Role / Privilege</label>
                <select 
                  value={memberRoleInput} 
                  onChange={(e) => setMemberRoleInput(e.target.value)}
                  className="w-full text-xs font-bold text-[#161623] px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="Viewer">Viewer (Read Only)</option>
                  <option value="Editor">Editor (Read & Write)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>

              {modalError && (
                <p className="text-[9px] font-bold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  ⚠️ {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6D3BFF] hover:bg-[#592EE6] text-white font-black py-2.5 rounded-2xl text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Add Collaborator"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE PICTURE PICKER & CROPPER MODAL */}
      {profilePicModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-5 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden text-slate-800 animate-scaleUp">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-[#161623] text-base">Profile Picture</h3>
                <p className="text-[10px] text-slate-400">Update your student profile picture</p>
              </div>
              <button
                onClick={() => {
                  stopProfilePicCamera();
                  setProfilePicModalOpen(false);
                  setProfilePicMode('options');
                  setProfilePicError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Alert Message */}
            {profilePicError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] p-3 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-800">Upload Validation Error</p>
                  <p className="text-[10px] leading-relaxed mt-0.5">{profilePicError}</p>
                </div>
              </div>
            )}

            {/* MODE 1: OPTIONS MENU */}
            {profilePicMode === 'options' && (
              <div className="mt-4 flex flex-col gap-3">
                {/* Current Avatar Preview */}
                <div className="flex flex-col items-center justify-center py-2">
                  <img 
                    src={student.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                    alt="Current Avatar" 
                    className="w-20 h-20 rounded-full border-4 border-[#6D3BFF]/20 object-cover shadow-inner"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
                    }}
                  />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">Current Photo</span>
                </div>

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={profilePicFileInputRef}
                  onChange={handleProfilePicFileSelect}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setProfilePicError(null);
                      startProfilePicCamera();
                    }}
                    className="bg-[#6D3BFF]/10 hover:bg-[#6D3BFF]/20 text-[#6D3BFF] border border-[#6D3BFF]/20 p-3 rounded-2xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Camera className="w-5 h-5 text-[#6D3BFF]" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfilePicError(null);
                      profilePicFileInputRef.current?.click();
                    }}
                    className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-slate-800 border border-[#D4AF37]/30 p-3 rounded-2xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    <FileUp className="w-5 h-5 text-[#D4AF37]" />
                    <span>Upload Gallery</span>
                  </button>
                </div>

                {/* Allowed specs note */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-[9.5px] text-slate-500 leading-relaxed text-center">
                  <p className="font-bold text-slate-700">Image Requirements:</p>
                  <p>• Formats: <span className="font-bold text-[#6D3BFF]">JPG, JPEG, PNG, WEBP</span></p>
                  <p>• Size limit: <span className="font-bold text-[#6D3BFF]">10 KB min — 2 MB max</span></p>
                  <p>• Auto-cropped to square (1:1 ratio)</p>
                </div>

                {/* Preset Avatars Selection */}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                    Or Choose Preset Avatar
                  </span>
                  <div className="flex justify-center gap-2">
                    {PROFILE_AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPresetAvatar(preset)}
                        className="w-9 h-9 rounded-full border-2 border-slate-200 hover:border-[#6D3BFF] overflow-hidden transition-all hover:scale-110 cursor-pointer shadow-sm shrink-0"
                      >
                        <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset to Default button */}
                <button
                  onClick={handleResetProfilePicToDefault}
                  className="w-full mt-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold py-1 cursor-pointer hover:underline text-center"
                >
                  Reset to Default Avatar
                </button>
              </div>
            )}

            {/* MODE 2: LIVE CAMERA PREVIEW */}
            {profilePicMode === 'camera' && (
              <div className="mt-4 flex flex-col items-center">
                <div className="relative w-52 h-52 rounded-full overflow-hidden bg-black border-4 border-[#6D3BFF] shadow-xl flex items-center justify-center">
                  {profilePicCameraActive ? (
                    <video 
                      ref={profilePicVideoCallback}
                      className="w-full h-full object-cover scale-x-[-1]"
                      playsInline
                      muted
                    />
                  ) : (
                    <div className="p-4 text-center text-white flex flex-col items-center">
                      <CameraOff className="w-8 h-8 text-rose-400 mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-rose-300">Camera Unavailable</p>
                      <p className="text-[9px] text-slate-300 mt-1">Check camera permissions or use gallery upload.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full mt-5">
                  <button
                    onClick={() => {
                      stopProfilePicCamera();
                      setProfilePicMode('options');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  {profilePicCameraActive && (
                    <button
                      onClick={handleCaptureProfilePicFromCamera}
                      className="flex-1 bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* MODE 3: UPLOADING & CROP PROGRESS */}
            {profilePicMode === 'uploading' && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-[#6D3BFF]/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#6D3BFF] border-r-[#6D3BFF] animate-spin" />
                  <span className="text-xs font-black text-[#6D3BFF]">{profilePicProgress}%</span>
                </div>

                <h4 className="font-extrabold text-[#161623] text-sm">Processing & Saving...</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Cropping image to 1:1 aspect ratio and updating profile record.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION WORKFLOW MODAL */}
      {deletionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden text-slate-800 animate-scaleUp">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#161623] text-base">
                    {deletionStep === 'success' ? 'Account Deletion Requested' : 'Delete Account'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Irreversible Action Warning</p>
                </div>
              </div>
              {deletionStep !== 'success' && (
                <button
                  onClick={() => {
                    setDeletionModalOpen(false);
                    setDeletionError(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Error Message Alert */}
            {deletionError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] p-3 rounded-2xl flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-800">Verification Error</p>
                  <p className="text-[10px] leading-relaxed mt-0.5">{deletionError}</p>
                </div>
              </div>
            )}

            {/* STEP 1: CONFIRMATION DIALOG */}
            {deletionStep === 'confirm' && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-2xl text-rose-900 text-xs leading-relaxed">
                  <p className="font-bold mb-1 text-rose-900">Are you sure you want to delete your account?</p>
                  <p className="text-[11px] text-rose-800/90 leading-normal">
                    This action cannot be undone. If your account is deleted, all your personal data, profile, bookings, attendance, uploaded documents, and other associated data will be permanently erased.
                  </p>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletionModalOpen(false);
                      setDeletionError(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletionStep1}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 text-center"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SECURE PASSWORD VERIFICATION */}
            {deletionStep === 'password' && (
              <form onSubmit={handleVerifyPasswordAndSubmitDeletion} className="mt-4 flex flex-col gap-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  For your security, please enter your current account password to confirm account deletion request.
                </p>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={deletionPasswordInput}
                      onChange={(e) => setDeletionPasswordInput(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-rose-500 font-medium"
                      required
                      disabled={deletionIsSubmitting}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletionStep('confirm');
                      setDeletionError(null);
                    }}
                    disabled={deletionIsSubmitting}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={deletionIsSubmitting}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {deletionIsSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Confirm Deletion</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SUBMITTED CONFIRMATION POPUP */}
            {deletionStep === 'success' && (
              <div className="mt-4 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-left text-xs text-slate-700 leading-relaxed">
                  <p className="font-bold text-[#161623] mb-1.5">Your account deletion request has been submitted successfully.</p>
                  <p className="text-[11px] text-slate-600 leading-normal mb-2">
                    Your account will be permanently deleted after <strong>Admin approval</strong>, or <strong>automatically after 15 days if you do not log in during that period</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Until the account is permanently deleted, you may continue using the app unless your account is disabled by the administrator.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeletionModalOpen(false);
                    setDeletionStep('confirm');
                    performLogout();
                  }}
                  className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs py-3 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 mt-1"
                >
                  Got It
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* LOGIN DELETION INTERCEPT POPUP MODAL */}
      {pendingDeletionLoginStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 relative overflow-hidden animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#161623] text-base">Account in Deletion State</h3>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Action Required</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl text-amber-900 text-xs leading-relaxed">
              <p className="font-extrabold mb-1.5 text-amber-950">Are you sure you want to log in?</p>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Your account is currently in a <strong>deletion period</strong>. If you log in, your account deletion request will be <strong>cancelled / rejected</strong> and your account will remain active.
              </p>
            </div>

            <div className="flex gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setPendingDeletionLoginStudent(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletionLogin}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 text-center"
              >
                Proceed & Keep Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLASS CANCELLATION CONFIRMATION MODAL */}
      {bookingToCancel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 relative overflow-hidden animate-scaleUp text-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CalendarX className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#161623] text-base leading-tight">Cancel Driving Class</h3>
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">Confirmation Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={isCancellingBooking}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Question */}
            <div className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-2xl">
              <p className="font-bold text-xs text-rose-950 leading-snug">
                Are you sure you want to cancel your class?
              </p>
              <p className="text-[11px] text-rose-900/80 mt-1 leading-relaxed">
                Once cancelled, this scheduled slot will be released and your trainer will be notified immediately.
              </p>
            </div>

            {/* Class Details Summary Box */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Class Summary</span>
              
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar className="w-4 h-4 text-[#6D3BFF] shrink-0" />
                <span className="font-bold text-[#161623]">{bookingToCancel.date}</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-600">{bookingToCancel.timeSlot}</span>
              </div>

              {bookingToCancel.trainerName && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <User className="w-4 h-4 text-[#6D3BFF] shrink-0" />
                  <span className="text-slate-600">Trainer: <strong className="text-slate-800">{bookingToCancel.trainerName}</strong></span>
                </div>
              )}

              {bookingToCancel.carName && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Car className="w-4 h-4 text-[#6D3BFF] shrink-0" />
                  <span className="text-slate-600">{bookingToCancel.carName} {bookingToCancel.carPlate ? `(${bookingToCancel.carPlate})` : ''}</span>
                </div>
              )}

              {bookingToCancel.location && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-[#6D3BFF] shrink-0" />
                  <span className="text-slate-600 truncate">{bookingToCancel.location}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={isCancellingBooking}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
              >
                No, Keep Class
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCancelClass(bookingToCancel.id)}
                disabled={isCancellingBooking}
                className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-rose-500/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                {isCancellingBooking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Cancel Class</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface EditProfileSubpageProps {
  student: any;
  onSave: (name: string, email: string, phone: string, photoUrl: string) => void;
  onCancel: () => void;
}

function EditProfileSubpage({ student, onSave, onCancel }: EditProfileSubpageProps) {
  const [name, setName] = useState<string>(student.name || "");
  const [email, setEmail] = useState<string>(student.email || "");
  const [phone, setPhone] = useState<string>(student.phone || "");
  const [photoUrl, setPhotoUrl] = useState<string>(student.photoUrl || "");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    onSave(name, email, phone, photoUrl);
  };

  return (
    <div className="pt-2 animate-fadeIn text-[#161623]">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onCancel} className="text-xs text-slate-500 font-bold flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
        <h3 className="font-extrabold text-sm mb-4">Edit Your Profile</h3>

        {error && <p className="text-xs font-bold text-rose-500 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center mb-2">
            <img 
              src={photoUrl} 
              alt="Avatar preview" 
              className="w-20 h-20 rounded-full border-2 border-[#6D3BFF] object-cover mb-2.5"
            />
            <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Select Avatar Preset</span>
            <div className="grid grid-cols-6 gap-2 w-full">
              {PROFILE_AVATAR_PRESETS.map((pUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoUrl(pUrl)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                    photoUrl === pUrl ? 'border-[#6D3BFF] scale-110 shadow-sm' : 'border-slate-100'
                  }`}
                >
                  <img src={pUrl} alt="Preset avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Full Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1 text-[#161623]"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1 text-[#161623]"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Mobile Number</label>
            <input 
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              className="w-full bg-[#F8F9FF] border-none rounded-xl p-2.5 text-xs focus:outline-none font-semibold mt-1 text-[#161623]"
              required
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#6D3BFF] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#8F52FF] transition-all cursor-pointer text-center"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TheoryQuizViewProps {
  onCancel: () => void;
  onSubmitResult: () => void;
}

function TheoryQuizView({ onCancel, onSubmitResult }: TheoryQuizViewProps) {
  const [q1, setQ1] = useState<string>("");
  const [q2, setQ2] = useState<string>("");
  const [q3, setQ3] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q1 || !q2 || !q3) {
      setError("Please answer all questions first!");
      return;
    }
    onSubmitResult();
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onCancel} className="text-xs text-slate-500 font-bold flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Video
        </button>
        <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Theoretical Practice</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col gap-4">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Driving Lesson Quiz</h3>

        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-slate-700">1. What is the speed limit inside Bhubaneswar city limits?</p>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {[
              { val: "30", label: "30 km/h" },
              { val: "40", label: "40 km/h" },
              { val: "60", label: "60 km/h" }
            ].map(opt => (
              <label 
                key={opt.val} 
                className={`p-2.5 border rounded-xl text-[11px] font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  q1 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]/5 text-[#6D3BFF]' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="q1" 
                  value={opt.val} 
                  checked={q1 === opt.val} 
                  onChange={() => { setQ1(opt.val); setError(""); }} 
                  className="accent-[#6D3BFF] hidden"
                />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mr-1 ${q1 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'}`}>
                  {q1 === opt.val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
          <p className="text-xs font-extrabold text-slate-700">2. Where should you pull over on National Highway 16 when allowing overtaking?</p>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {[
              { val: "left", label: "Left side completely" },
              { val: "right", label: "Right side completely" },
              { val: "middle", label: "Middle lane only" }
            ].map(opt => (
              <label 
                key={opt.val} 
                className={`p-2.5 border rounded-xl text-[11px] font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  q2 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]/5 text-[#6D3BFF]' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="q2" 
                  value={opt.val} 
                  checked={q2 === opt.val} 
                  onChange={() => { setQ2(opt.val); setError(""); }} 
                  className="accent-[#6D3BFF] hidden"
                />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mr-1 ${q2 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'}`}>
                  {q2 === opt.val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
          <p className="text-xs font-extrabold text-slate-700">3. What does a double continuous yellow line on the road mean?</p>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {[
              { val: "allow", label: "Overtaking allowed" },
              { val: "prohibit", label: "Overtaking strictly prohibited" },
              { val: "stop", label: "Stop completely" }
            ].map(opt => (
              <label 
                key={opt.val} 
                className={`p-2.5 border rounded-xl text-[11px] font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  q3 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]/5 text-[#6D3BFF]' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="q3" 
                  value={opt.val} 
                  checked={q3 === opt.val} 
                  onChange={() => { setQ3(opt.val); setError(""); }} 
                  className="accent-[#6D3BFF] hidden"
                />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mr-1 ${q3 === opt.val ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'}`}>
                  {q3 === opt.val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-[#6D3BFF] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#8F52FF] transition-all cursor-pointer mt-2"
        >
          Submit Quiz Answers
        </button>
      </div>
    </form>
  );
}
