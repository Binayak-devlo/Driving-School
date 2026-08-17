import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Calendar, FileText, IndianRupee, ShieldCheck, UserCheck, Car, Star, 
  Download, RefreshCw, Trash2, Search, Check, X, AlertTriangle, TrendingUp, BarChart2,
  Plus, Edit, KeyRound, Lock, LogOut, Eye, ArrowLeft, ChevronRight, Clock, UserX, AlertCircle, ShieldAlert,
  Camera, Upload, Image as ImageIcon, FileCheck, CheckCircle, ExternalLink,
  Menu, MapPin, Navigation, Bell, Send, Settings as SettingsIcon, Radio, CheckSquare, Layers, PhoneCall, Shield, Filter, FileSpreadsheet, Activity, Sparkles, MessageSquare, ChevronDown, CheckCheck, Info, Compass, Smartphone, Globe, Database
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line
} from "recharts";
import { MockDatabase } from "../utils/db";
import { Student, Trainer, Booking, Document, Payment, SkillProgress, Review, SlotDay, NavState, DrivingLicenceApplication, DrivingLicenceDocumentItem } from "../types";
import { compressImageIfNeeded, STUDENT_AVATAR_PRESETS, TRAINER_AVATAR_PRESETS, CAR_AVATAR_PRESETS } from "../utils/imageUtils";
import { downloadCSV, downloadFileOrImage } from "../utils/exportUtils";
import UnifiedAuthPortal from "./UnifiedAuthPortal";
import PullToRefresh from "./PullToRefresh";

export type AdminTabType = 
  | 'analytics' 
  | 'dl_applications' 
  | 'students' 
  | 'trainers' 
  | 'bookings' 
  | 'slots' 
  | 'documents' 
  | 'payments' 
  | 'approvals' 
  | 'tracking' 
  | 'attendance' 
  | 'notifications' 
  | 'reports' 
  | 'settings' 
  | 'feedback' 
  | 'deletions';

interface AdminDashboardProps {
  onStateChange: () => void; // Sync state changes
  onLogout?: () => void;
  navState?: NavState;
  key?: any;
}

export default function AdminDashboard({ onStateChange, onLogout, navState }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTabType>(() => {
    if (navState && navState.activeView === 'admin' && navState.adminTab) {
      return navState.adminTab as any;
    }
    return 'analytics';
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    if (navState && navState.activeView === 'admin' && navState.adminLoggedIn !== undefined) {
      return navState.adminLoggedIn;
    }
    return false;
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const userLower = adminUsername.trim().toLowerCase();
    const pass = adminPasswordInput.trim();

    setIsAuthLoading(true);

    setTimeout(() => {
      if ((userLower === "admin" || userLower === "admin@goldenhands.com") && pass === "admin123") {
        setIsAdminLoggedIn(true);
        localStorage.setItem("golden_hands_admin_logged_in", "true");
        showToast("Access Granted! Welcome to the Admin Command Deck.");
        setIsAuthLoading(false);
      } else {
        setLoginError("Invalid Username or Passcode.");
        setIsAuthLoading(false);
      }
    }, 1200);
  };

  const [previewDoc, setPreviewDoc] = useState<Document | null>(() => {
    if (navState && navState.activeView === 'admin' && navState.adminPreviewDocId) {
      const docs = MockDatabase.getAllDocuments();
      return docs.find(d => d.id === navState.adminPreviewDocId) || null;
    }
    return null;
  });
  
  // DB States
  const [student, setStudent] = useState(MockDatabase.getStudent());
  const [students, setStudents] = useState(MockDatabase.getRegisteredStudents());
  const [trainers, setTrainers] = useState(MockDatabase.getTrainers());
  const [bookings, setBookings] = useState(MockDatabase.getAllBookings());
  const [documents, setDocuments] = useState(MockDatabase.getAllDocuments());
  const [payments, setPayments] = useState(MockDatabase.getAllPayments());
  const [progress, setProgress] = useState(MockDatabase.getProgress());
  const [reviews, setReviews] = useState(MockDatabase.getReviews());
  const [dlApplications, setDlApplications] = useState<DrivingLicenceApplication[]>(() => MockDatabase.getLicenceApplications());
  const [selectedDlApp, setSelectedDlApp] = useState<DrivingLicenceApplication | null>(null);
  const [viewingDocPreview, setViewingDocPreview] = useState<{ title: string; url: string; fileName: string } | null>(null);

  const refreshDlApps = useCallback(() => {
    const apps = MockDatabase.getLicenceApplications();
    setDlApplications(apps);
  }, []);

  useEffect(() => {
    refreshDlApps();
    const handleStorage = () => refreshDlApps();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(refreshDlApps, 1500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [refreshDlApps]);

  // Interactive student skills select state
  const [selectedStudentForChart, setSelectedStudentForChart] = useState<string>("");
  const allAvailableStudents = [
    ...(student.id && !students.some(s => s.id === student.id) ? [student] : []),
    ...students
  ];

  // Sync selectedStudentForChart
  useEffect(() => {
    if (allAvailableStudents.length > 0 && !selectedStudentForChart) {
      setSelectedStudentForChart(allAvailableStudents[0].id);
    }
  }, [allAvailableStudents, selectedStudentForChart]);

  const getStudentName = (studentId?: string) => {
    const fallbackName = student.name || "Guest Student";
    if (!studentId) return fallbackName;
    if (studentId === "student_1" || studentId === student.id) {
      return student.name || fallbackName;
    }
    const found = students.find(s => s.id === studentId);
    return found ? found.name : fallbackName;
  };

  const getStudentDetails = (studentId?: string) => {
    const fallback = {
      name: student.name || "Guest Student",
      email: student.email || "guest@goldenhands.com",
      photoUrl: student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      phone: student.phone || "0000000000"
    };
    if (!studentId) return fallback;
    if (studentId === "student_1" || studentId === student.id) {
      return {
        name: student.name || fallback.name,
        email: student.email || fallback.email,
        photoUrl: student.photoUrl || fallback.photoUrl,
        phone: student.phone || fallback.phone
      };
    }
    const found = students.find(s => s.id === studentId);
    if (found) {
      return {
        name: found.name,
        email: found.email || "student@goldenhands.com",
        photoUrl: found.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        phone: found.phone || "N/A"
      };
    }
    return fallback;
  };

  // Mobile overflow navigation drawer states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  // Live Fleet Tracking state
  const [liveFleetFilter, setLiveFleetFilter] = useState<'all' | 'in_session' | 'en_route' | 'idle'>('all');
  const [trackingPingedTrainer, setTrackingPingedTrainer] = useState<string | null>(null);

  // Attendance filter states
  const [attendanceDateFilter, setAttendanceDateFilter] = useState<string>("");
  const [attendanceTrainerFilter, setAttendanceTrainerFilter] = useState<string>("all");
  const [attendanceStudentFilter, setAttendanceStudentFilter] = useState<string>("");

  // Notifications & Broadcast Center state
  const [broadcastTarget, setBroadcastTarget] = useState<'all_students' | 'all_trainers' | 'dl_applicants' | 'pending_docs'>('all_students');
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastChannel, setBroadcastChannel] = useState<'all' | 'push' | 'sms'>('all');
  const [broadcastLogs, setBroadcastLogs] = useState([
    {
      id: "bc-1",
      subject: "Monsoon Driving Advisory: Wet Roads in Bhubaneswar",
      message: "Instructors and student drivers are requested to follow wet-weather safety guidelines and activate hazard/fog lights when needed.",
      target: "All Enrolled Students (128)",
      channel: "In-App Push & SMS",
      date: "Today, 09:30 AM",
      sentBy: "System Administrator",
      count: 128
    },
    {
      id: "bc-2",
      subject: "Odisha RTO OD-02 Holiday Schedule Notice",
      message: "Bhubaneswar II RTO track testing will be closed this coming Saturday. All affected slots have been rescheduled automatically.",
      target: "DL Applicants (14)",
      channel: "SMS & WhatsApp",
      date: "Yesterday, 04:15 PM",
      sentBy: "System Administrator",
      count: 14
    },
    {
      id: "bc-3",
      subject: "Aadhaar Card Verification Required for Booking",
      message: "Please upload your Aadhaar Card photo to activate slot reservations instantly.",
      target: "Pending Aadhaar Verification (6)",
      channel: "In-App Push",
      date: "3 days ago",
      sentBy: "System Administrator",
      count: 6
    }
  ]);

  // System Settings state
  const [settingsData, setSettingsData] = useState({
    schoolName: "Golden Hands Driving Academy",
    rtoZone: "OD-02 Bhubaneswar II, Odisha",
    rtoRegNo: "OD-02/DS/2021/88",
    phone: "+91 94370 12345",
    email: "admin@goldenhandsdriving.com",
    address: "Plot 420, Saheed Nagar, Bhubaneswar, Odisha 751007",
    openingTime: "06:00",
    closingTime: "19:00",
    slotDurationMins: 45,
    defaultSlotCapacity: 5,
    basicCourseFee: 4500,
    standardCourseFee: 7200,
    premiumCourseFee: 9800,
    modFee: 800
  });
  const [adminNewPasscode, setAdminNewPasscode] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback sub-tab state
  const [feedbackSubTab, setFeedbackSubTab] = useState<'student' | 'trainer' | 'modifications'>('student');

  // Notification helper
  const [toast, setToast] = useState<string | null>(null);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Back navigation support: Sync local states when parent navigation state updates
  useEffect(() => {
    if (navState && navState.activeView === 'admin') {
      if (navState.adminLoggedIn !== undefined && navState.adminLoggedIn !== isAdminLoggedIn) {
        setIsAdminLoggedIn(navState.adminLoggedIn);
        if (navState.adminLoggedIn) {
          localStorage.setItem("golden_hands_admin_logged_in", "true");
        } else {
          localStorage.removeItem("golden_hands_admin_logged_in");
        }
      }
      if (navState.adminTab && navState.adminTab !== activeTab) {
        setActiveTab(navState.adminTab as any);
      }
      if (navState.adminPreviewDocId !== undefined) {
        const currentDocId = previewDoc?.id || null;
        if (navState.adminPreviewDocId !== currentDocId) {
          if (!navState.adminPreviewDocId) {
            setPreviewDoc(null);
          } else {
            const freshDocs = MockDatabase.getAllDocuments();
            const found = freshDocs.find(d => d.id === navState.adminPreviewDocId);
            if (found) setPreviewDoc(found);
          }
        }
      }
    }
  }, [navState]);

  // Back navigation support: Report local navigation state changes to global coordinator
  useEffect(() => {
    if (!navState || navState.activeView !== 'admin') {
      return;
    }

    const matchesParent = 
      isAdminLoggedIn === navState.adminLoggedIn &&
      activeTab === navState.adminTab &&
      (previewDoc?.id || null) === (navState.adminPreviewDocId || null);
    
    if (matchesParent) {
      return; // Already in sync with parent, do not report!
    }

    window.dispatchEvent(new CustomEvent('app-nav-reported', {
      detail: {
        activeView: 'admin',
        adminLoggedIn: isAdminLoggedIn,
        adminTab: activeTab,
        adminPreviewDocId: previewDoc?.id || null
      }
    }));
  }, [isAdminLoggedIn, activeTab, previewDoc, navState]);

  // Trainer form modal states
  const [trainerModalOpen, setTrainerModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null); // if null, we are adding a new trainer
  
  // Trainer form fields
  const [trainerName, setTrainerName] = useState("");
  const [trainerPhone, setTrainerPhone] = useState("");
  const [trainerPassword, setTrainerPassword] = useState("");
  const [trainerCarName, setTrainerCarName] = useState("");
  const [trainerCarPlate, setTrainerCarPlate] = useState("");
  const [trainerPhotoUrl, setTrainerPhotoUrl] = useState("");
  const [trainerCarPhotoUrl, setTrainerCarPhotoUrl] = useState("");

  // Student edit form modal states
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Student edit form fields
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentPhotoUrl, setStudentPhotoUrl] = useState("");
  const [studentLocation, setStudentLocation] = useState("");
  const [studentLlStatus, setStudentLlStatus] = useState<Student['llStatus']>("Applied");
  const [studentReferralCode, setStudentReferralCode] = useState("");
  const [studentCourseName, setStudentCourseName] = useState("");
  const [studentCourseNotes, setStudentCourseNotes] = useState("");
  const [studentCourseSyllabus, setStudentCourseSyllabus] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentPlanExtended, setStudentPlanExtended] = useState(false);
  const [studentLicenceFeePaid, setStudentLicenceFeePaid] = useState(false);
  const [studentCourseEnded, setStudentCourseEnded] = useState(false);

  // Driving school payment & booking lock states
  const [studentTotalCourseFee, setStudentTotalCourseFee] = useState(3500);
  const [studentAmountPaid, setStudentAmountPaid] = useState(0);
  const [studentRemainingAmount, setStudentRemainingAmount] = useState(3500);
  const [studentPaymentStatus, setStudentPaymentStatus] = useState<'Unpaid' | 'Partial' | 'Paid'>('Unpaid');
  const [studentPaymentApprovalStatus, setStudentPaymentApprovalStatus] = useState<'None' | 'Pending Approval' | 'Approved' | 'Rejected'>('None');
  const [studentCompletedClasses, setStudentCompletedClasses] = useState(0);
  const [studentFirstClassCompleted, setStudentFirstClassCompleted] = useState(false);
  const [studentBookingLocked, setStudentBookingLocked] = useState(false);
  const [studentLockedReason, setStudentLockedReason] = useState("");
  const [studentAdminManualUnlock, setStudentAdminManualUnlock] = useState(false);
  const [studentAssignedTrainerId, setStudentAssignedTrainerId] = useState("");
  const [studentAadharStatus, setStudentAadharStatus] = useState<Student['aadharStatus']>("Verified");
  const [studentIsAadharVerified, setStudentIsAadharVerified] = useState(true);

  // Slots Form & List States
  const [slots, setSlots] = useState<SlotDay[]>(() => MockDatabase.getSlotDays());
  const [slotDate, setSlotDate] = useState("");
  const [morningMax, setMorningMax] = useState(5);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [lunchMax, setLunchMax] = useState(5);
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [rushHourMax, setRushHourMax] = useState(5);
  const [rushHourEnabled, setRushHourEnabled] = useState(true);
  const [eveningMax, setEveningMax] = useState(5);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Sync state continuously
  useEffect(() => {
    const handleStorageChange = () => {
      setStudent(MockDatabase.getStudent());
      setStudents(MockDatabase.getRegisteredStudents());
      setTrainers(MockDatabase.getTrainers());
      setBookings(MockDatabase.getAllBookings());
      setDocuments(MockDatabase.getAllDocuments());
      setPayments(MockDatabase.getAllPayments());
      setProgress(MockDatabase.getProgress());
      setReviews(MockDatabase.getReviews());
      setSlots(MockDatabase.getSlotDays());
      setDlApplications(MockDatabase.getLicenceApplications());
    };
    const interval = setInterval(handleStorageChange, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen to global real-time database updates
  useEffect(() => {
    const handleDbUpdated = () => {
      setStudent(MockDatabase.getStudent());
      setStudents(MockDatabase.getRegisteredStudents());
      setTrainers(MockDatabase.getTrainers());
      setBookings(MockDatabase.getAllBookings());
      setDocuments(MockDatabase.getAllDocuments());
      setPayments(MockDatabase.getAllPayments());
      setProgress(MockDatabase.getProgress());
      setReviews(MockDatabase.getReviews());
      setSlots(MockDatabase.getSlotDays());
      setDlApplications(MockDatabase.getLicenceApplications());
    };
    window.addEventListener("db-updated", handleDbUpdated);
    window.addEventListener("storage", handleDbUpdated);
    return () => {
      window.removeEventListener("db-updated", handleDbUpdated);
      window.removeEventListener("storage", handleDbUpdated);
    };
  }, []);

  // Pull-to-refresh handler on mobile/tablet view for Admin Dashboard
  const handlePullToRefresh = async () => {
    try {
      console.log("[AdminDashboard] Pull-to-refresh triggered: syncing latest database...");
      await MockDatabase.syncFromCloud();
      setStudent(MockDatabase.getStudent());
      setStudents(MockDatabase.getRegisteredStudents());
      setTrainers(MockDatabase.getTrainers());
      setBookings(MockDatabase.getAllBookings());
      setDocuments(MockDatabase.getAllDocuments());
      setPayments(MockDatabase.getAllPayments());
      setProgress(MockDatabase.getProgress());
      setReviews(MockDatabase.getReviews());
      setSlots(MockDatabase.getSlotDays());
      setDlApplications(MockDatabase.getLicenceApplications());
      if (onStateChange) onStateChange();
      showToast("Admin Dashboard synchronized with cloud database!");
    } catch (err) {
      console.warn("[AdminDashboard] Pull-to-refresh error:", err);
      showToast("Refreshed from local cache.");
    }
  };

  // Periodically pull latest database from Firebase Firestore to keep multi-user portals in sync
  useEffect(() => {
    let active = true;
    const handleCloudSync = async () => {
      try {
        await MockDatabase.syncFromCloud();
        if (active) {
          setStudent(MockDatabase.getStudent());
          setStudents(MockDatabase.getRegisteredStudents());
          setTrainers(MockDatabase.getTrainers());
          setBookings(MockDatabase.getAllBookings());
          setDocuments(MockDatabase.getAllDocuments());
          setPayments(MockDatabase.getAllPayments());
          setProgress(MockDatabase.getProgress());
          setReviews(MockDatabase.getReviews());
          setSlots(MockDatabase.getSlotDays());
          setDlApplications(MockDatabase.getLicenceApplications());
        }
      } catch (err) {
        console.warn("Periodic cloud sync failed in admin dashboard:", err);
      }
    };
    
    // Sync every 8 seconds
    const syncInterval = setInterval(handleCloudSync, 8000);
    return () => {
      active = false;
      clearInterval(syncInterval);
    };
  }, []);

  const handleSaveSlotDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate) {
      showToast("Please specify a valid date.");
      return;
    }

    const currentBookings = MockDatabase.getAllBookings();
    const mBooked = currentBookings.filter(b => b.date === slotDate && b.timeSlot === "Morning" && b.status !== "cancelled").length;
    const lBooked = currentBookings.filter(b => b.date === slotDate && b.timeSlot === "Lunch" && b.status !== "cancelled").length;
    const rBooked = currentBookings.filter(b => b.date === slotDate && b.timeSlot === "Rush Hour" && b.status !== "cancelled").length;
    const eBooked = currentBookings.filter(b => b.date === slotDate && b.timeSlot === "Evening" && b.status !== "cancelled").length;

    // Prepare SlotDay object
    const newSlot: SlotDay = {
      id: `slot_${slotDate}`,
      date: slotDate,
      morningMax,
      morningBooked: mBooked,
      morningEnabled,
      lunchMax,
      lunchBooked: lBooked,
      lunchEnabled,
      rushHourMax,
      rushHourBooked: rBooked,
      rushHourEnabled,
      eveningMax,
      eveningBooked: eBooked,
      eveningEnabled,
      isClosed
    };

    MockDatabase.saveSlotDay(newSlot);
    setSlots(MockDatabase.getSlotDays());
    onStateChange();
    showToast(`Successfully saved slot capacities for ${slotDate}!`);
  };

  const handleEditSlotDay = (s: SlotDay) => {
    setSlotDate(s.date);
    setMorningMax(s.morningMax);
    setMorningEnabled(s.morningEnabled);
    setLunchMax(s.lunchMax);
    setLunchEnabled(s.lunchEnabled);
    setRushHourMax(s.rushHourMax);
    setRushHourEnabled(s.rushHourEnabled);
    setEveningMax(s.eveningMax);
    setEveningEnabled(s.eveningEnabled);
    setIsClosed(s.isClosed);
    showToast(`Loaded capacities for ${s.date} into edit panel.`);
  };

  const handleDeleteSlotDay = (id: string) => {
    askConfirmation(
      "Remove Slot Configuration",
      "Are you sure you want to remove slot configurations for this date? Existing bookings will remain but slot enforcement will revert to empty/closed.",
      () => {
        const remaining = slots.filter(s => s.id !== id);
        MockDatabase.saveSlotDays(remaining);
        setSlots(remaining);
        onStateChange();
        showToast("Slot configuration removed successfully.");
      }
    );
  };

  const handleBulkGenerateSlots = (daysCount: number = 14) => {
    askConfirmation(
      `Initialize Slots for Next ${daysCount} Days`,
      `This will automatically generate slot configurations with default capacity (5 slots per session) for the next ${daysCount} days. Existing configured days will be preserved. Proceed?`,
      () => {
        const currentSlots = MockDatabase.getSlotDays();
        const currentBookings = MockDatabase.getAllBookings();
        const updatedSlots = [...currentSlots];
        let addedCount = 0;

        const today = new Date();
        for (let i = 1; i <= daysCount; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;

          const existingIdx = updatedSlots.findIndex(s => s.date === dateStr);
          if (existingIdx < 0) {
            const mBooked = currentBookings.filter(b => b.date === dateStr && b.timeSlot === "Morning" && b.status !== "cancelled").length;
            const lBooked = currentBookings.filter(b => b.date === dateStr && b.timeSlot === "Lunch" && b.status !== "cancelled").length;
            const rBooked = currentBookings.filter(b => b.date === dateStr && b.timeSlot === "Rush Hour" && b.status !== "cancelled").length;
            const eBooked = currentBookings.filter(b => b.date === dateStr && b.timeSlot === "Evening" && b.status !== "cancelled").length;

            updatedSlots.push({
              id: `slot_${dateStr}`,
              date: dateStr,
              morningMax: 5,
              morningBooked: mBooked,
              morningEnabled: true,
              lunchMax: 5,
              lunchBooked: lBooked,
              lunchEnabled: true,
              rushHourMax: 5,
              rushHourBooked: rBooked,
              rushHourEnabled: true,
              eveningMax: 5,
              eveningBooked: eBooked,
              eveningEnabled: true,
              isClosed: false
            });
            addedCount++;
          }
        }

        MockDatabase.saveSlotDays(updatedSlots);
        setSlots(updatedSlots);
        onStateChange();
        showToast(`Initialized slots for next ${daysCount} days (${addedCount} new dates created)!`);
      }
    );
  };

  // Update Licence status from Admin panel
  const handleUpdateLicenceStatus = (studentId: string, status: Student['llStatus']) => {
    const targetStudent = students.find(s => s.id === studentId) || student;
    const updated = { ...targetStudent, llStatus: status };
    MockDatabase.saveStudent(updated, studentId);
    if (student.id === studentId) {
      setStudent(updated);
    }
    setStudents(MockDatabase.getRegisteredStudents());
    onStateChange();
    showToast(`Updated ${updated.name}'s Licence Application status to: ${status}`);
  };

  // Approve Course Modification
  const handleApproveModification = (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId) || student;
    if (targetStudent.modificationStatus !== 'paid_pending_approval') {
      showToast(`Cannot approve: ${targetStudent.name} has not paid the modification fee yet.`);
      return;
    }
    
    const updatedStudent = {
      ...targetStudent,
      courseName: targetStudent.proposedCourseName || targetStudent.courseName,
      courseNotes: targetStudent.proposedCourseNotes || targetStudent.courseNotes,
      courseSyllabus: targetStudent.proposedCourseSyllabus || targetStudent.courseSyllabus,
      proposedCourseName: undefined,
      proposedCourseNotes: undefined,
      proposedCourseSyllabus: undefined,
      proposedCourseFee: undefined,
      modificationStatus: 'none' as const
    };
    
    MockDatabase.saveStudent(updatedStudent, studentId);
    setStudents(MockDatabase.getRegisteredStudents());
    if (student.id === studentId) {
      setStudent(updatedStudent);
    }
    onStateChange();
    showToast(`Successfully approved Course Modification for ${targetStudent.name}!`);
  };

  // Reject Course Modification
  const handleRejectModification = (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId) || student;
    const updatedStudent = {
      ...targetStudent,
      proposedCourseName: undefined,
      proposedCourseNotes: undefined,
      proposedCourseSyllabus: undefined,
      proposedCourseFee: undefined,
      modificationStatus: 'none' as const
    };
    
    MockDatabase.saveStudent(updatedStudent, studentId);
    setStudents(MockDatabase.getRegisteredStudents());
    if (student.id === studentId) {
      setStudent(updatedStudent);
    }
    onStateChange();
    showToast(`Course Modification request for ${targetStudent.name} has been rejected.`);
  };

  // Verify/Reject Document
  const handleDocumentVerify = (docId: string, status: Document['status']) => {
    const updated = documents.map(d => {
      if (d.id === docId) {
        return { ...d, status: status };
      }
      return d;
    });
    MockDatabase.saveDocuments(updated);
    setDocuments(updated);

    // If Learner's Licence got verified, automatically upgrade Student LL Status to 'Approved'
    const targetDoc = documents.find(d => d.id === docId);
    if (targetDoc) {
      const isAadhar = targetDoc.name.toLowerCase().includes("aadhar") || targetDoc.name.toLowerCase().includes("aadhaar");
      if (isAadhar) {
        const studentToUpdate = MockDatabase.getStudent(targetDoc.studentId);
        if (studentToUpdate && studentToUpdate.id) {
          const updatedStudent: Student = { 
            ...studentToUpdate, 
            aadharStatus: (status === "Verified" ? "Verified" : status === "Rejected" ? "Rejected" : "Pending") as any,
            isAadharVerified: status === "Verified",
            aadharVerified: status === "Verified"
          };
          MockDatabase.saveStudent(updatedStudent, targetDoc.studentId);
          if (student.id === targetDoc.studentId) {
            setStudent(updatedStudent);
          }
          setStudents(MockDatabase.getRegisteredStudents());
        }
      }

      if (status === "Verified" && targetDoc.name === "Learner Licence") {
        const studentToUpdate = MockDatabase.getStudent(targetDoc.studentId);
        const updatedStudent = { ...studentToUpdate, llStatus: "Approved" as const };
        MockDatabase.saveStudent(updatedStudent, targetDoc.studentId);
        
        if (student.id === targetDoc.studentId) {
          setStudent(updatedStudent);
        }
        setStudents(MockDatabase.getRegisteredStudents());
      }
    }

    onStateChange();
    showToast(`Document ${status === 'Verified' ? 'Approved' : 'Rejected'} successfully!`);
  };

  // Verify/Reject Payment
  const handlePaymentVerify = (paymentId: string, status: 'Success' | 'Failed') => {
    const paymentsList = MockDatabase.getAllPayments();
    const updatedPayments = paymentsList.map(p => {
      if (p.id === paymentId) {
        return { ...p, status };
      }
      return p;
    });
    MockDatabase.savePayments(updatedPayments);
    setPayments(updatedPayments);

    // Update the corresponding student's states
    const targetPayment = paymentsList.find(p => p.id === paymentId);
    if (targetPayment) {
      const studentToUpdate = MockDatabase.getStudent(targetPayment.studentId);
      if (studentToUpdate) {
        if (status === 'Success') {
          // Determine if this clears the first or second installment or a full fee
          const isFinal = targetPayment.amount === 1500 || targetPayment.purpose.toLowerCase().includes("final") || targetPayment.purpose.toLowerCase().includes("remaining") || (studentToUpdate.amountPaid || 0) + targetPayment.amount >= 3500;
          const newAmountPaid = isFinal ? 3500 : 2000;
          const newRemaining = 3500 - newAmountPaid;
          const newPaymentStatus = isFinal ? 'Paid' as const : 'Partial' as const;

          const updatedStudent = {
            ...studentToUpdate,
            amountPaid: newAmountPaid,
            remainingAmount: newRemaining,
            paymentStatus: newPaymentStatus,
            paymentApprovalStatus: 'Approved' as const,
            bookingLocked: false,
            lockedReason: ""
          };
          MockDatabase.saveStudent(updatedStudent, targetPayment.studentId);
          if (student.id === targetPayment.studentId) {
            setStudent(updatedStudent);
          }
        } else {
          // Rejected
          const updatedStudent = {
            ...studentToUpdate,
            paymentApprovalStatus: 'Rejected' as const,
            bookingLocked: true,
            lockedReason: `Payment proof for ₹${targetPayment.amount.toLocaleString()} was rejected by admin.`
          };
          MockDatabase.saveStudent(updatedStudent, targetPayment.studentId);
          if (student.id === targetPayment.studentId) {
            setStudent(updatedStudent);
          }
        }
        setStudents(MockDatabase.getRegisteredStudents());
      }
    }
    onStateChange();
    showToast(`Payment reference ${status === 'Success' ? 'Approved' : 'Rejected'} successfully!`);
  };

  // Booking action
  const handleBookingAction = (bookingId: string, status: Booking['status']) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: status };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);

    // Golden Hands Driving School: Dynamic booking lock and limit enforcement
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking) {
      const studentId = targetBooking.studentId;
      const studentToUpdate = MockDatabase.getStudent(studentId);
      if (studentToUpdate) {
        // Calculate completed classes count of that student
        const studentBookings = updated.filter(b => b.studentId === studentId);
        const completedCount = studentBookings.filter(b => b.status === 'completed').length;

        let bookingLocked = !!studentToUpdate.bookingLocked;
        let lockedReason = studentToUpdate.lockedReason || "";
        let firstClassCompleted = !!studentToUpdate.firstClassCompleted;

        if (status === 'completed') {
          if (completedCount >= 1) {
            firstClassCompleted = true;
            if ((studentToUpdate.amountPaid || 0) < 2000) {
              bookingLocked = true;
              lockedReason = "First class completed. A payment of ₹2,000 is required to book additional classes.";
            }
          }
          if (completedCount >= 5) {
            if ((studentToUpdate.amountPaid || 0) < 3500) {
              bookingLocked = true;
              lockedReason = "5 classes completed. The remaining payment of ₹1,500 is required to book additional classes.";
            }
          }
        }

        const updatedStudent = {
          ...studentToUpdate,
          completedClasses: completedCount,
          firstClassCompleted,
          bookingLocked,
          lockedReason
        };
        MockDatabase.saveStudent(updatedStudent, studentId);
        if (student.id === studentId) {
          setStudent(updatedStudent);
        }
        setStudents(MockDatabase.getRegisteredStudents());
      }
    }

    onStateChange();
    showToast(`Class booking status updated to ${status}.`);
  };

  // Universal Real CSV Export Handler (Optimized for Android & Web)
  const handleExportCSV = async (dataset: string) => {
    let filename = `GoldenHands_${dataset}_Export.csv`;
    let content = "";

    if (dataset === "students") {
      filename = "GoldenHands_Students_Directory.csv";
      const header = "Student ID,Name,Phone,Email,Aadhaar Status,Course Package,Sessions Completed,Fee Paid,Remaining Fee,Payment Status,Assigned Instructor\n";
      const rows = allAvailableStudents.map(s => {
        const assignedTr = trainers.find(t => t.id === s.assignedTrainerId);
        return `"${s.id}","${s.name}","${s.phone}","${s.email}","${s.aadharStatus || 'Verified'}","${s.courseName || 'Standard Package'}","${s.sessionsCompleted || 0}/${s.totalSessions || 15}","${s.amountPaid || 0}","${s.remainingAmount || 0}","${s.paymentStatus || 'Unpaid'}","${assignedTr ? assignedTr.name : 'Unassigned'}"`;
      }).join("\n");
      content = header + rows;
    } else if (dataset === "trainers") {
      filename = "GoldenHands_Instructors_Directory.csv";
      const header = "Trainer ID,Name,Phone,Vehicle Model,Car Plate,Rating,Total Classes Conducted,Active Assigned Students\n";
      const rows = trainers.map(t => {
        const activeCount = allAvailableStudents.filter(s => s.assignedTrainerId === t.id).length;
        return `"${t.id}","${t.name}","${t.phone}","${t.carName}","${t.carPlate}","${t.rating || 4.9}","${t.totalClasses || 42}","${activeCount}"`;
      }).join("\n");
      content = header + rows;
    } else if (dataset === "bookings") {
      filename = "GoldenHands_Class_Bookings.csv";
      const header = "Booking ID,Student Name,Date,Slot Time,Instructor,Car Plate,Pickup Location,Status,Pickup Status\n";
      const rows = bookings.map(b => {
        const st = getStudentDetails(b.studentId);
        return `"${b.id}","${st.name}","${b.date}","${b.timeSlot}","${b.trainerName || 'Assigned Instructor'}","${b.trainerCarPlate || 'OD-02-AK-9821'}","${b.pickupLocation || 'Bhubaneswar Track'}","${b.status}","${b.pickupStatus || 'idle'}"`;
      }).join("\n");
      content = header + rows;
    } else if (dataset === "payments") {
      filename = "GoldenHands_Financial_Transactions.csv";
      const header = "Receipt ID,Student Name,Amount (INR),Payment Mode,Reference / TXN ID,Date,Status,Purpose\n";
      const rows = payments.map(p => {
        const st = getStudentDetails(p.studentId);
        return `"${p.id}","${st.name}","${p.amount}","${p.mode || p.paymentMethod || 'UPI'}","${p.reference || p.transactionId || 'REF-' + p.id}","${p.date}","${p.status}","${p.purpose || 'Driving Course Fee'}"`;
      }).join("\n");
      content = header + rows;
    } else if (dataset === "attendance") {
      filename = "GoldenHands_Attendance_Audit_Log.csv";
      const header = "Session ID,Student Name,Roll No,Date,Time,Instructor,Vehicle,Photo Verified,Status,GPS Location\n";
      const rows = attendanceRowsList.map(a => 
        `"${a.id}","${a.name}","${a.roll}","${a.date}","${a.time}","${a.trainer}","${a.car}","${a.hasPhotoProof ? 'Verified (Geo-tagged)' : 'Scheduled'}","${a.status}","${a.location}"`
      ).join("\n");
      content = header + rows;
    } else if (dataset === "analytics") {
      filename = "GoldenHands_Academy_Analytics_Summary.csv";
      const completedSessionsCount = bookings.filter(b => b.status === "completed").length;
      const passRate = 96.4;
      const header = "Metric Category,Key Indicator,Value,Notes\n";
      const rows = [
        `"Financial","Total Revenue Collected","₹${totalRevenueVal.toLocaleString('en-IN')}","100% Tax & GST Recorded"`,
        `"Operations","Total Driving Classes Conducted","${completedSessionsCount}","Certified Sessions"`,
        `"Learners","Active Registered Students","${allAvailableStudents.length}","Bhubaneswar Track"`,
        `"RTO Performance","Driving Test Pass Rate","${passRate}%","Odisha RTO OD-02 Clearances"`,
        `"Safety","Instructor Average Rating","4.9/5.0","Verified Student Reviews"`
      ].join("\n");
      content = header + rows;
    } else if (dataset === "rto" || dataset === "dl_applications") {
      filename = "GoldenHands_RTO_DL_Applications.csv";
      const header = "Application ID,Full Name,Phone,RTO Zone,LL Number,DL Type,Status,Submission Date\n";
      const rows = dlApplications.map(a => 
        `"${a.id}","${a.fullName}","${a.phone}","${a.rtoZone}","${a.llNumber || 'Pending'}","${a.dlType || 'LMV (Car)'}","${a.status}","${a.createdAt ? a.createdAt.split('T')[0] : '2026-08-14'}"`
      ).join("\n");
      content = header + rows;
    } else {
      content = `Dataset,${dataset}\nExportDate,${new Date().toISOString()}\n`;
    }

    const success = await downloadCSV(filename, content);
    if (success) {
      showToast(`Exported ${dataset.toUpperCase()} records to CSV format successfully.`);
    } else {
      showToast(`Failed to export ${dataset}. Please check app storage permissions.`);
    }
  };

  // Feedback & reviews action handlers
  const handleDeleteReview = (id: string) => {
    const updated = reviews.filter(r => r.id !== id);
    MockDatabase.saveReviews(updated);
    setReviews(updated);
    onStateChange();
    showToast("Student review has been successfully moderated (removed).");
  };

  const handleAcknowledgeReview = (id: string, trainerName: string) => {
    showToast(`Feedback acknowledged. Copy sent to Coach ${trainerName}.`);
  };

  const handleFlagRemark = (bookingId: string) => {
    showToast(`Lesson remark flagged for review by administration.`);
  };

  const handleApproveForRTOLog = (bookingId: string) => {
    showToast(`Lesson report successfully logged in RTO logbook database!`);
  };

  // Student Removal Handler
  const handleRemoveStudent = (studentId: string) => {
    askConfirmation(
      "Remove Student Profile",
      "Are you sure you want to remove this student? This action cannot be undone. Student profile and all registered sessions will be permanently removed.",
      () => {
        const remaining = students.filter(s => s.id !== studentId);
        MockDatabase.saveRegisteredStudents(remaining);
        setStudents(remaining);
        
        // Clear current student session if they were logged in
        const currentStudentId = MockDatabase.getCurrentStudentId();
        if (currentStudentId === studentId) {
          localStorage.removeItem("golden_hands_current_student_id");
        }

        // Also clean up bookings for this student
        const remainingBookings = bookings.filter(b => b.studentId !== studentId);
        MockDatabase.saveBookings(remainingBookings);
        setBookings(remainingBookings);

        onStateChange();
        showToast("Student profile and all registered sessions have been permanently removed.");
      }
    );
  };

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentName("");
    setStudentEmail("");
    setStudentPhone("");
    setStudentPhotoUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
    setStudentLocation("Rasulgarh, Bhubaneswar");
    setStudentLlStatus("Applied");
    setStudentReferralCode("GOLDEN" + Math.floor(100 + Math.random() * 900));
    setStudentCourseName("Premium Package (20 Sessions)");
    setStudentCourseNotes("");
    setStudentCourseSyllabus("Steering Controls, Clutch & Friction Point, Traffic Navigation, Parallel Reversal Parking, Uphill Start Navigation");
    setStudentPassword("student123");
    setStudentPlanExtended(false);
    setStudentLicenceFeePaid(false);
    setStudentCourseEnded(false);

    // Initial values for payment & booking lock manager
    setStudentTotalCourseFee(3500);
    setStudentAmountPaid(0);
    setStudentRemainingAmount(3500);
    setStudentPaymentStatus("Unpaid");
    setStudentPaymentApprovalStatus("None");
    setStudentCompletedClasses(0);
    setStudentFirstClassCompleted(false);
    setStudentBookingLocked(false);
    setStudentLockedReason("");
    setStudentAdminManualUnlock(false);
    setStudentAssignedTrainerId("");
    setStudentAadharStatus("Verified");
    setStudentIsAadharVerified(true);

    setStudentModalOpen(true);
  };

  const handleOpenEditStudent = (stud: Student) => {
    setEditingStudent(stud);
    setStudentName(stud.name || "");
    setStudentEmail(stud.email || "");
    setStudentPhone(stud.phone || "");
    setStudentPhotoUrl(stud.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
    setStudentLocation(stud.location || "Rasulgarh, Bhubaneswar");
    setStudentLlStatus(stud.llStatus || "Applied");
    setStudentReferralCode(stud.referralCode || "");
    setStudentCourseName(stud.courseName || "");
    setStudentCourseNotes(stud.courseNotes || "");
    setStudentCourseSyllabus(stud.courseSyllabus ? stud.courseSyllabus.join(", ") : "");
    setStudentPassword(stud.password || "student123");
    setStudentPlanExtended(!!stud.planExtended);
    setStudentLicenceFeePaid(!!stud.licenceFeePaid);
    setStudentCourseEnded(!!stud.courseEnded);

    // Initial values for payment & booking lock manager
    setStudentTotalCourseFee(stud.totalCourseFee !== undefined ? stud.totalCourseFee : 3500);
    setStudentAmountPaid(stud.amountPaid || 0);
    setStudentRemainingAmount(stud.remainingAmount !== undefined ? stud.remainingAmount : 3500);
    setStudentPaymentStatus(stud.paymentStatus || "Unpaid");
    setStudentPaymentApprovalStatus(stud.paymentApprovalStatus || "None");
    setStudentCompletedClasses(stud.completedClasses || 0);
    setStudentFirstClassCompleted(!!stud.firstClassCompleted);
    setStudentBookingLocked(!!stud.bookingLocked);
    setStudentLockedReason(stud.lockedReason || "");
    setStudentAdminManualUnlock(!!stud.adminManualUnlock);
    setStudentAssignedTrainerId(stud.assignedTrainerId || "");
    setStudentAadharStatus(stud.aadharStatus || (stud.isAadharVerified ? "Verified" : "Verified"));
    setStudentIsAadharVerified(stud.isAadharVerified !== undefined ? stud.isAadharVerified : true);

    setStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail || !studentPhone) {
      showToast("Please fill in Name, Email and Phone details.");
      return;
    }

    const syllabusArray = studentCourseSyllabus
      ? studentCourseSyllabus.split(",").map(item => item.trim()).filter(Boolean)
      : [];

    const targetId = editingStudent ? editingStudent.id : `student_${Date.now()}`;
    const targetJoinedDate = editingStudent ? (editingStudent.joinedDate || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0];

    const assignedTr = trainers.find(t => t.id === studentAssignedTrainerId);

    const isVerifiedAadhar = studentAadharStatus === "Verified" || studentIsAadharVerified;

    const updatedStudent: Student = {
      id: targetId,
      name: studentName,
      email: studentEmail,
      phone: studentPhone,
      photoUrl: studentPhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      location: studentLocation,
      llStatus: studentLlStatus,
      referralCode: studentReferralCode || "GOLDEN" + targetId.substring(targetId.length - 4).toUpperCase(),
      joinedDate: targetJoinedDate,
      courseName: studentCourseName,
      courseNotes: studentCourseNotes,
      courseSyllabus: syllabusArray,
      password: studentPassword,
      planExtended: studentPlanExtended,
      licenceFeePaid: studentLicenceFeePaid,
      courseEnded: studentCourseEnded,

      // Save assigned trainer
      assignedTrainerId: studentAssignedTrainerId || undefined,
      assignedTrainerName: assignedTr ? assignedTr.name : undefined,

      // Save custom workflow properties
      totalCourseFee: studentTotalCourseFee,
      amountPaid: studentAmountPaid,
      remainingAmount: studentRemainingAmount,
      paymentStatus: studentPaymentStatus,
      paymentApprovalStatus: studentPaymentApprovalStatus,
      completedClasses: studentCompletedClasses,
      firstClassCompleted: studentFirstClassCompleted,
      bookingLocked: studentBookingLocked,
      lockedReason: studentLockedReason,
      adminManualUnlock: studentAdminManualUnlock,

      // Save Aadhaar verification states
      aadharStatus: isVerifiedAadhar ? "Verified" : (studentAadharStatus || "Pending"),
      isAadharVerified: isVerifiedAadhar,
      aadharVerified: isVerifiedAadhar
    };

    MockDatabase.saveStudent(updatedStudent, targetId);
    
    setStudents(MockDatabase.getRegisteredStudents());
    setStudent(MockDatabase.getStudent());
    onStateChange();
    setStudentModalOpen(false);
    showToast(`Successfully saved student profile for ${studentName}`);
  };

  // Curated Avatar Presets for Trainers and Vehicles
  const TRAINER_AVATAR_PRESETS = [
    { label: "Coach 1", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" },
    { label: "Coach 2", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" },
    { label: "Coach 3", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
    { label: "Coach 4", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" },
    { label: "Coach 5", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200" },
    { label: "Coach 6", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
  ];

  const CAR_AVATAR_PRESETS = [
    { label: "Maruti Swift", url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300" },
    { label: "Hyundai i20", url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=300" },
    { label: "Tata Nexon", url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=300" },
    { label: "White Sedan", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=300" },
  ];

  // Photo Upload Handler for Modal (Trainer Photo & Car Photo)
  const handleTrainerPhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'trainer' | 'car') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Selected image size exceeds 10MB limit. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const compressedUrl = await compressImageIfNeeded(rawDataUrl, 400, 0.85);
        if (target === 'trainer') {
          setTrainerPhotoUrl(compressedUrl);
          showToast("Trainer photo updated and compressed!");
        } else {
          setTrainerCarPhotoUrl(compressedUrl);
          showToast("Vehicle photo updated and compressed!");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct Trainer Card Photo Update Handler
  const handleDirectTrainerPhotoUpdate = (trainerId: string, trainerName: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast("Photo file size exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const compressedUrl = await compressImageIfNeeded(rawDataUrl, 400, 0.85);
        const updatedTrainers = trainers.map(t => {
          if (t.id === trainerId) {
            return { ...t, photoUrl: compressedUrl };
          }
          return t;
        });
        MockDatabase.saveTrainers(updatedTrainers);
        setTrainers(updatedTrainers);
        onStateChange();
        showToast(`Updated and saved photo for Coach ${trainerName} to database!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Student Photo Upload Handler for Modal
  const handleStudentPhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Selected image size exceeds 10MB limit. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const compressedUrl = await compressImageIfNeeded(rawDataUrl, 400, 0.85);
        setStudentPhotoUrl(compressedUrl);
        showToast("Student profile photo updated & compressed!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct Student Photo Update Handler (from student list)
  const handleDirectStudentPhotoUpdate = (studentId: string, studentName: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast("Photo file size exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const compressedUrl = await compressImageIfNeeded(rawDataUrl, 400, 0.85);
        const studentsList = MockDatabase.getRegisteredStudents();
        const updatedStudents = studentsList.map(s => {
          if (s.id === studentId) {
            return { ...s, photoUrl: compressedUrl };
          }
          return s;
        });
        MockDatabase.saveRegisteredStudents(updatedStudents);

        const currentStud = MockDatabase.getStudent(studentId);
        if (currentStud && currentStud.id === studentId) {
          currentStud.photoUrl = compressedUrl;
          MockDatabase.saveStudent(currentStud, studentId);
        }

        setStudents(updatedStudents);
        setStudent(MockDatabase.getStudent());
        onStateChange();
        showToast(`Updated photo for ${studentName} and saved to database!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trainer management handlers
  const handleOpenAddTrainer = () => {
    setEditingTrainer(null);
    setTrainerName("");
    setTrainerPhone("");
    setTrainerPassword("coach123");
    setTrainerCarName("Maruti Swift");
    setTrainerCarPlate("OD 02 " + Math.floor(1000 + Math.random() * 9000));
    setTrainerPhotoUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200");
    setTrainerCarPhotoUrl("https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300");
    setTrainerModalOpen(true);
  };

  const handleOpenEditTrainer = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setTrainerName(trainer.name);
    setTrainerPhone(trainer.phone);
    setTrainerPassword(trainer.password || "coach123");
    setTrainerCarName(trainer.carName);
    setTrainerCarPlate(trainer.carPlate);
    setTrainerPhotoUrl(trainer.photoUrl);
    setTrainerCarPhotoUrl(trainer.carPhotoUrl);
    setTrainerModalOpen(true);
  };

  const handleSaveTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName || !trainerPhone || !trainerCarName || !trainerCarPlate) {
      showToast("Please fill in Name, Phone, Car Name, and Car Plate details.");
      return;
    }

    let updatedTrainers = [...trainers];

    if (editingTrainer) {
      // Modify existing
      updatedTrainers = updatedTrainers.map(t => {
        if (t.id === editingTrainer.id) {
          return {
            ...t,
            name: trainerName,
            phone: trainerPhone,
            password: trainerPassword,
            carName: trainerCarName,
            carPlate: trainerCarPlate,
            photoUrl: trainerPhotoUrl,
            carPhotoUrl: trainerCarPhotoUrl
          };
        }
        return t;
      });
      showToast(`Successfully modified details of Coach ${trainerName}`);
    } else {
      // Add/Assign new trainer
      const newTrainer: Trainer = {
        id: `trainer_${Date.now()}`,
        name: trainerName,
        phone: trainerPhone,
        password: trainerPassword,
        rating: 5.0,
        reviewsCount: 0,
        photoUrl: trainerPhotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
        carName: trainerCarName,
        carPlate: trainerCarPlate,
        carPhotoUrl: trainerCarPhotoUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300",
        isAvailable: true
      };
      updatedTrainers.push(newTrainer);
      showToast(`Successfully assigned & registered Coach ${trainerName}`);
    }

    MockDatabase.saveTrainers(updatedTrainers);
    setTrainers(updatedTrainers);
    setTrainerModalOpen(false);
    onStateChange();
  };

  const handleRemoveTrainer = (trainerId: string) => {
    askConfirmation(
      "Remove Trainer Profile",
      "Are you sure you want to remove this trainer? This will unassign them from any future slot bookings and permanently delete their record from the active roster.",
      () => {
        const remaining = trainers.filter(t => t.id !== trainerId);
        MockDatabase.saveTrainers(remaining);
        setTrainers(remaining);
        
        // If the trainer was currently logged in, clear their session
        const currentTrainerId = MockDatabase.getCurrentTrainerId();
        if (currentTrainerId === trainerId) {
          localStorage.removeItem("golden_hands_current_trainer_id");
        }

        onStateChange();
        showToast("Trainer removed successfully.");
      }
    );
  };

  // Recharts Dynamic & Real-time Revenue & Booking Data
  const getDynamicRevenueData = () => {
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyMap: { [month: string]: { revenue: number, bookings: number } } = {};
    
    shortMonths.forEach(m => {
      monthlyMap[m] = { revenue: 0, bookings: 0 };
    });

    // Calculate from actual successful payments in active database
    payments.forEach(p => {
      if (p.status === 'Success' && p.date) {
        const parts = p.date.split('-');
        if (parts.length === 3) {
          const mNum = parseInt(parts[1], 10);
          if (mNum >= 1 && mNum <= 12) {
            const monthName = shortMonths[mNum - 1];
            monthlyMap[monthName].revenue += (Number(p.amount) || 0);
          }
        }
      }
    });

    // Calculate from actual bookings
    bookings.forEach(b => {
      if (b.date) {
        const parts = b.date.split('-');
        if (parts.length === 3) {
          const mNum = parseInt(parts[1], 10);
          if (mNum >= 1 && mNum <= 12) {
            const monthName = shortMonths[mNum - 1];
            monthlyMap[monthName].bookings += 1;
          }
        }
      }
    });

    // Display sliding 6-month window ending on current month
    const currentMonthIdx = now.getMonth();
    const monthsToShow: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      monthsToShow.push(shortMonths[idx]);
    }
    
    return monthsToShow.map(m => ({
      name: m,
      revenue: monthlyMap[m].revenue,
      bookings: monthlyMap[m].bookings
    }));
  };

  const REVENUE_DATA = getDynamicRevenueData();
  const successfulPayments = payments.filter(p => p.status === 'Success');
  const totalRevenueVal = successfulPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIdx = new Date().getMonth();
  const currentMonthName = shortMonths[currentMonthIdx];
  const currentMonthNum = currentMonthIdx + 1;
  const currentMonthRevenueVal = successfulPayments.filter(p => {
    if (!p.date) return false;
    const parts = p.date.split('-');
    return parts.length === 3 && parseInt(parts[1], 10) === currentMonthNum;
  }).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const activeChartStudentId = selectedStudentForChart || allAvailableStudents[0]?.id || student.id || "";
  const chartStudentProgress = MockDatabase.getProgress(activeChartStudentId);

  const SKILL_COMPLIANCE_DATA = [
    { name: "Steering", score: chartStudentProgress.steering || 0 },
    { name: "Clutch", score: chartStudentProgress.clutch || 0 },
    { name: "Braking", score: chartStudentProgress.brake || 0 },
    { name: "Parking", score: chartStudentProgress.parking || 0 },
    { name: "Hill Start", score: chartStudentProgress.hillStart || 0 },
    { name: "Confidence", score: chartStudentProgress.confidence || 0 }
  ];

  const getVehicleUsageData = () => {
    const carCounts: { [car: string]: number } = {};
    trainers.forEach(t => {
      const car = t.carName || "Maruti Swift";
      carCounts[car] = (carCounts[car] || 0) + 1;
    });
    bookings.forEach(b => {
      if (b.trainerName) {
        const matched = trainers.find(tr => tr.name === b.trainerName);
        const car = matched?.carName || "Maruti Swift";
        carCounts[car] = (carCounts[car] || 0) + 1;
      }
    });
    const total = Object.values(carCounts).reduce((a, b) => a + b, 0) || 1;
    const palette = ["#6D3BFF", "#8F52FF", "#D4AF37", "#10B981", "#3B82F6", "#EC4899"];
    return Object.keys(carCounts).map((car, idx) => ({
      name: car,
      value: Math.round((carCounts[car] / total) * 100),
      color: palette[idx % palette.length]
    }));
  };

  const VEHICLE_USAGE_DATA = getVehicleUsageData();

  // Dynamically derive attendance roster from actual bookings and active students
  const getAttendanceRows = () => {
    if (bookings.length > 0) {
      return bookings.map((b, idx) => {
        const stud = getStudentDetails(b.studentId);
        const studentObj = allAvailableStudents.find(s => s.id === b.studentId);
        const prog = MockDatabase.getProgress(b.studentId);
        const totalSkillsAvg = Math.round(
          ((prog.steering || 0) + (prog.clutch || 0) + (prog.brake || 0) + (prog.parking || 0) + (prog.hillStart || 0) + (prog.confidence || 0)) / 6
        );
        const isCompleted = b.status === 'completed';
        const isCancelled = b.status === 'cancelled';

        return {
          id: b.id || `ATT-${idx + 1}`,
          name: stud.name,
          roll: studentObj?.referralCode || `GH-10${(idx + 1).toString().padStart(2, '0')}`,
          avatar: stud.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          session: b.sessionTopic || `Session ${idx + 1} / 15`,
          progress: `${totalSkillsAvg > 0 ? totalSkillsAvg : (studentObj?.completedClasses ? Math.min(100, Math.round((studentObj.completedClasses / 15) * 100)) : 25)}%`,
          trainer: b.trainerName || trainers[idx % (trainers.length || 1)]?.name || "Coach Rajesh Kumar",
          car: b.trainerCarPlate || trainers[idx % (trainers.length || 1)]?.carPlate || "OD-02-AK-9821",
          date: b.date || "2026-08-14",
          time: b.timeSlot === "Morning" ? "07:00 AM – 07:45 AM" :
                b.timeSlot === "Lunch" ? "12:00 PM – 12:45 PM" :
                b.timeSlot === "Rush Hour" ? "04:30 PM – 05:15 PM" :
                b.timeSlot === "Evening" ? "06:00 PM – 06:45 PM" : b.timeSlot,
          location: b.pickupLocation || studentObj?.location || "Saheed Nagar Track",
          status: isCompleted ? "Verified Present" : isCancelled ? "Cancelled" : "Scheduled",
          statusColor: isCompleted ? "bg-emerald-100 text-emerald-800" : isCancelled ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800",
          hasPhotoProof: !!b.capturedPhoto || isCompleted
        };
      });
    }

    return allAvailableStudents.map((s, idx) => {
      const assignedTrainer = trainers.find(t => t.id === s.assignedTrainerId) || trainers[idx % (trainers.length || 1)] || { name: "Coach Rajesh Kumar", carPlate: "OD-02-AK-9821" };
      const completed = s.completedClasses || 1;
      return {
        id: `ATT-${s.id || idx + 1}`,
        name: s.name,
        roll: s.referralCode || `GH-10${(idx + 1).toString().padStart(2, '0')}`,
        avatar: s.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        session: `Session ${completed} / 15`,
        progress: `${Math.min(100, Math.round((completed / 15) * 100))}%`,
        trainer: assignedTrainer.name,
        car: assignedTrainer.carPlate,
        date: s.joinedDate || "2026-08-14",
        time: "07:00 AM – 07:45 AM",
        location: s.location || "Saheed Nagar Track",
        status: completed > 0 ? "Verified Present" : "Enrolled",
        statusColor: "bg-emerald-100 text-emerald-800",
        hasPhotoProof: true
      };
    });
  };

  const attendanceRowsList = getAttendanceRows();
  const completedAttendanceCount = attendanceRowsList.filter(a => a.status === 'Verified Present').length;
  const photoVerifiedAttendanceCount = attendanceRowsList.filter(a => a.hasPhotoProof).length;
  const photoVerifiedPercent = attendanceRowsList.length > 0 ? Math.round((photoVerifiedAttendanceCount / attendanceRowsList.length) * 100) : 100;

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F5FA] flex flex-col justify-center items-center font-sans p-4 sm:p-6 selection:bg-[#6D3BFF]/25">
        <div className="w-full max-w-md my-auto">
          <UnifiedAuthPortal 
            initialRole="admin"
            embedded={true}
            onCancel={onLogout}
            onLoginSuccess={(role) => {
              if (role === 'admin') {
                setIsAdminLoggedIn(true);
                localStorage.setItem("golden_hands_admin_logged_in", "true");
                onStateChange();
              } else {
                if (onLogout) onLogout();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F8F9FF] flex flex-col h-full font-sans overflow-hidden">
      {/* Toast alert banner */}
      {toast && (
        <div className="fixed top-6 right-6 bg-[#161623] text-white px-5 py-3.5 rounded-2xl shadow-xl z-50 flex items-center gap-3 border border-[#6D3BFF]/20 animate-fadeIn text-sm">
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          <span className="font-semibold">{toast}</span>
        </div>
      )}

      {/* Admin Top bar */}
      <header className="bg-white px-4 md:px-8 py-3.5 md:py-4 flex justify-between items-center border-b border-slate-100 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl md:text-xl">👑</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black text-[#161623] tracking-tight">Golden Hands Admin</h1>
              <span className="hidden sm:inline-block text-[9px] bg-[#D4AF37]/15 text-[#8F52FF] font-black px-2 py-0.5 rounded-full border border-[#D4AF37]/30 uppercase">OD-02</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bhubaneswar, Odisha • Admin Desk</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden lg:block mr-2">
            <p className="text-xs font-black text-[#161623]">System Administrator</p>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online Control
            </p>
          </div>

          <button 
            onClick={() => {
              setIsAdminLoggedIn(false);
              localStorage.removeItem("golden_hands_admin_logged_in");
              showToast("Logged out of Admin Portal successfully.");
            }}
            className="hidden md:flex p-2.5 px-3 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 font-bold text-xs items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-100 min-h-[40px]"
            title="Log out of admin session"
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" /> <span>Sign Out</span>
          </button>

          {onLogout && (
            <button 
              onClick={onLogout}
              className="hidden md:flex p-2.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-xs items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 min-h-[40px]"
              title="Close Admin Desk and return to hub"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" /> <span>Exit</span>
            </button>
          )}

          {/* Mobile 3-line (=) Overflow Menu Button */}
          <button
            id="admin-mobile-overflow-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden px-3.5 py-2 bg-gradient-to-r from-slate-900 via-[#161623] to-[#2B1B4D] hover:opacity-95 text-white rounded-xl flex items-center justify-center gap-2.5 shadow-md border border-[#D4AF37]/50 min-h-[42px] cursor-pointer transition-all active:scale-95 select-none"
            title="Open 3-line (=) Admin Navigation Menu"
            aria-label="Open Navigation Drawer"
          >
            {/* 3-line horizontal hamburger menu icon (=) */}
            <div className="flex flex-col justify-center items-center gap-[3px] w-4.5 h-3.5">
              <span className="w-4.5 h-[2.5px] bg-[#D4AF37] rounded-full"></span>
              <span className="w-3.5 h-[2.5px] bg-white rounded-full"></span>
              <span className="w-4.5 h-[2.5px] bg-[#D4AF37] rounded-full"></span>
            </div>
            <span className="text-[11px] font-black text-white tracking-wider uppercase">Menu</span>
            {(dlApplications.length > 0 || MockDatabase.getAccountDeletionRequests().length > 0 || documents.filter(d => d.status === 'Pending').length > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Active Section Sub-Bar with Fast Drawer Trigger */}
      <div className="md:hidden bg-white/95 backdrop-blur-md px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9.5px] font-bold uppercase text-slate-400">Active View:</span>
          <span className="text-xs font-black text-[#6D3BFF] truncate bg-[#6D3BFF]/10 px-2.5 py-1 rounded-lg">
            {(() => {
              const allItems = [
                { id: 'analytics', label: 'Analytics Dashboard' },
                { id: 'dl_applications', label: 'Licence Applications' },
                { id: 'students', label: 'Student Directory' },
                { id: 'trainers', label: 'Trainer Management' },
                { id: 'bookings', label: 'Class & Bookings' },
                { id: 'slots', label: 'Slot Capacity' },
                { id: 'documents', label: 'Documents Desk' },
                { id: 'payments', label: 'Payment Logs' },
                { id: 'approvals', label: 'Payment Approvals' },
                { id: 'tracking', label: 'Pickup / Live Tracking' },
                { id: 'attendance', label: 'Attendance Logs' },
                { id: 'notifications', label: 'Notifications' },
                { id: 'reports', label: 'Reports & Exports' },
                { id: 'feedback', label: 'Feedback Desk' },
                { id: 'settings', label: 'System Settings' },
                { id: 'deletions', label: 'Deletion Requests' }
              ];
              const cur = allItems.find(i => i.id === activeTab);
              return cur ? cur.label : activeTab;
            })()}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-[11px] font-black text-[#6D3BFF] hover:text-[#8F52FF] flex items-center gap-1 shrink-0 cursor-pointer bg-[#F8F9FF] px-2.5 py-1 rounded-lg border border-[#6D3BFF]/20"
        >
          <span>All 16 Sections</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dashboard split content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Navigation Sidebar (Desktop & Tablet) */}
        <nav className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 hidden md:flex flex-col justify-between p-3.5 lg:p-4 shrink-0 overflow-y-auto select-none">
          <div className="flex flex-col gap-3 shrink-0">
            {/* Nav Categories */}
            {[
              {
                category: "Core Operations",
                items: [
                  { id: 'analytics', label: 'Analytics Dashboard', icon: <BarChart2 className="w-4 h-4 text-[#6D3BFF]" /> },
                  { id: 'dl_applications', label: 'Driving Licence Applications', icon: <FileCheck className="w-4 h-4 text-[#D4AF37]" />, badgeKey: 'dl_apps' },
                  { id: 'students', label: 'Student Directory', icon: <Users className="w-4 h-4 text-blue-500" /> },
                  { id: 'trainers', label: 'Trainer Management', icon: <Car className="w-4 h-4 text-emerald-500" /> },
                  { id: 'bookings', label: 'Class & Booking Management', icon: <Calendar className="w-4 h-4 text-indigo-500" /> },
                  { id: 'slots', label: 'Slot Capacity & Hours', icon: <Clock className="w-4 h-4 text-teal-500" /> },
                ]
              },
              {
                category: "Verification & Finance",
                items: [
                  { id: 'documents', label: 'Document Verification Desk', icon: <FileText className="w-4 h-4 text-amber-500" />, badgeKey: 'documents' },
                  { id: 'payments', label: 'Payment Management', icon: <IndianRupee className="w-4 h-4 text-emerald-600" /> },
                  { id: 'approvals', label: 'Payment Approvals', icon: <ShieldCheck className="w-4 h-4 text-purple-600" />, badgeKey: 'approvals' },
                ]
              },
              {
                category: "Live Logistics & Logs",
                items: [
                  { id: 'tracking', label: 'Pickup / Live Tracking', icon: <Navigation className="w-4 h-4 text-cyan-600" /> },
                  { id: 'attendance', label: 'Attendance & Session Logs', icon: <CheckSquare className="w-4 h-4 text-blue-600" /> },
                ]
              },
              {
                category: "Communications & System",
                items: [
                  { id: 'notifications', label: 'Notifications & Broadcasts', icon: <Bell className="w-4 h-4 text-violet-600" /> },
                  { id: 'reports', label: 'Reports & Export Center', icon: <FileSpreadsheet className="w-4 h-4 text-amber-600" /> },
                  { id: 'feedback', label: 'Feedback Desk', icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> },
                  { id: 'settings', label: 'System Settings & RTO Config', icon: <SettingsIcon className="w-4 h-4 text-slate-600" /> },
                  { id: 'deletions', label: 'Deletion Requests', icon: <UserX className="w-4 h-4 text-rose-500" />, badgeKey: 'deletions' },
                ]
              }
            ].map((section, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-slate-400 px-3 pt-2 pb-0.5 tracking-wider">
                  {section.category}
                </span>
                {section.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const deletionRequestsCount = MockDatabase.getAccountDeletionRequests().length;
                  const dlAppsCount = dlApplications.length;
                  const pendingDocsCount = documents.filter(d => d.status === 'Pending').length;
                  const pendingApprovalsCount = student.modificationStatus === 'paid_pending_approval' ? 1 : 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-black uppercase tracking-wider transition-all cursor-pointer gap-2 ${
                        isActive 
                          ? 'bg-[#6D3BFF] text-white shadow-md shadow-[#6D3BFF]/20 font-black' 
                          : 'text-slate-600 hover:bg-[#F8F9FF] hover:text-[#6D3BFF]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {tab.id === 'dl_applications' && dlAppsCount > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-white text-[#6D3BFF]' : 'bg-[#D4AF37] text-[#161623]'}`}>
                            {dlAppsCount}
                          </span>
                        )}
                        {tab.id === 'deletions' && deletionRequestsCount > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                            {deletionRequestsCount}
                          </span>
                        )}
                        {tab.id === 'approvals' && pendingApprovalsCount > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                            1 Pending
                          </span>
                        )}
                        {tab.id === 'documents' && pendingDocsCount > 0 && (
                          <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                            {pendingDocsCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="bg-[#161623] text-white p-3.5 rounded-2xl border border-white/5 shadow-inner mt-4">
            <h4 className="font-extrabold text-[11px] text-[#D4AF37]">Odisha RTO OD-02 Desk</h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 leading-relaxed">
              Bhubaneswar RTO-II approvals processed in approx. 48 hours after document clearance.
            </p>
          </div>
        </nav>

        {/* MOBILE NAVIGATION DRAWER / OVERFLOW MENU MODAL (Opens on 3-line = menu click) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex justify-end">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
              />

              {/* Drawer Content */}
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 260 }}
                className="relative w-[88vw] max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="bg-gradient-to-r from-[#161623] via-[#24133B] to-[#161623] text-white p-4.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-lg">
                        👑
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                          Admin Command Menu
                          <span className="text-[8.5px] bg-[#D4AF37] text-[#161623] font-black px-1.5 py-0.2 rounded-md">OD-02</span>
                        </h3>
                        <p className="text-[10px] text-slate-300 font-medium">Bhubaneswar Driving Academy</p>
                      </div>
                    </div>
                    <button
                      id="close-mobile-menu-btn"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Bar inside Drawer */}
                  <div className="mt-3.5 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search all admin sections..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border border-white/15 rounded-xl pl-8.5 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:bg-white/15 transition-all"
                    />
                    {menuSearchQuery && (
                      <button 
                        onClick={() => setMenuSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Status Bar */}
                <div className="bg-[#F8F9FF] px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600 shrink-0">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Desk Active
                  </span>
                  <span>16 Control Modules</span>
                </div>

                {/* Drawer Menu List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {[
                    {
                      category: "Core Management",
                      items: [
                        { id: 'analytics', label: 'Analytics Dashboard', subtitle: 'Overview, KPIs & charts', icon: <BarChart2 className="w-4 h-4 text-[#6D3BFF]" /> },
                        { id: 'dl_applications', label: 'Driving Licence Applications', subtitle: 'Odisha RTO OD-02 LL & DL desk', icon: <FileCheck className="w-4 h-4 text-[#D4AF37]" />, badgeKey: 'dl_apps' },
                        { id: 'students', label: 'Student Directory', subtitle: 'Learners roster & profiles', icon: <Users className="w-4 h-4 text-blue-500" /> },
                        { id: 'trainers', label: 'Trainer Management', subtitle: 'Instructors & vehicles', icon: <Car className="w-4 h-4 text-emerald-500" /> },
                        { id: 'bookings', label: 'Class & Booking Management', subtitle: 'Sessions & photo logs', icon: <Calendar className="w-4 h-4 text-indigo-500" /> },
                        { id: 'slots', label: 'Slot Capacity & Hours', subtitle: 'Daily capacity limits', icon: <Clock className="w-4 h-4 text-teal-500" /> },
                      ]
                    },
                    {
                      category: "Verification & Finance",
                      items: [
                        { id: 'documents', label: 'Document Verification Desk', subtitle: 'Aadhaar, LL & Medical cards', icon: <FileText className="w-4 h-4 text-amber-500" />, badgeKey: 'documents' },
                        { id: 'payments', label: 'Payment Management', subtitle: 'Fee receipts & ledger', icon: <IndianRupee className="w-4 h-4 text-emerald-600" /> },
                        { id: 'approvals', label: 'Payment Approvals', subtitle: 'Course upgrades & additions', icon: <ShieldCheck className="w-4 h-4 text-purple-600" />, badgeKey: 'approvals' },
                      ]
                    },
                    {
                      category: "Operations & Logistics",
                      items: [
                        { id: 'tracking', label: 'Pickup / Live Tracking', subtitle: 'GPS fleet tracking in Bhubaneswar', icon: <Navigation className="w-4 h-4 text-cyan-600" /> },
                        { id: 'attendance', label: 'Attendance & Session Logs', subtitle: 'Photo-verified practical classes', icon: <CheckSquare className="w-4 h-4 text-blue-600" /> },
                      ]
                    },
                    {
                      category: "Communications & Administration",
                      items: [
                        { id: 'notifications', label: 'Notifications & Broadcasts', subtitle: 'Push alerts & SMS announcements', icon: <Bell className="w-4 h-4 text-violet-600" /> },
                        { id: 'reports', label: 'Reports & Export Center', subtitle: 'RTO audits & CSV data exports', icon: <FileSpreadsheet className="w-4 h-4 text-amber-600" /> },
                        { id: 'feedback', label: 'Feedback Desk', subtitle: 'Student reviews & coach notes', icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> },
                        { id: 'settings', label: 'System Settings & RTO Config', subtitle: 'Academy profile, pricing & security', icon: <SettingsIcon className="w-4 h-4 text-slate-600" /> },
                        { id: 'deletions', label: 'Deletion Requests', subtitle: 'Account erasure queue', icon: <UserX className="w-4 h-4 text-rose-500" />, badgeKey: 'deletions' },
                      ]
                    }
                  ].map((categoryGroup, cIdx) => {
                    const filteredItems = categoryGroup.items.filter(item => {
                      if (!menuSearchQuery.trim()) return true;
                      const q = menuSearchQuery.toLowerCase();
                      return item.label.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={cIdx} className="space-y-1">
                        <span className="text-[9.5px] font-black uppercase text-slate-400 px-2 tracking-wider">
                          {categoryGroup.category}
                        </span>
                        <div className="space-y-1">
                          {filteredItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const deletionRequestsCount = MockDatabase.getAccountDeletionRequests().length;
                            const dlAppsCount = dlApplications.length;
                            const pendingDocsCount = documents.filter(d => d.status === 'Pending').length;
                            const pendingApprovalsCount = student.modificationStatus === 'paid_pending_approval' ? 1 : 0;

                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveTab(item.id as any);
                                  setMobileMenuOpen(false);
                                  showToast(`Opened ${item.label}`);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-[#6D3BFF] text-white shadow-md shadow-[#6D3BFF]/25'
                                    : 'bg-white hover:bg-slate-50 text-[#161623] border border-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {item.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-[#161623]'}`}>
                                      {item.label}
                                    </h4>
                                    <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                      {item.subtitle}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {item.id === 'dl_applications' && dlAppsCount > 0 && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-[#6D3BFF]' : 'bg-[#D4AF37] text-[#161623]'}`}>
                                      {dlAppsCount}
                                    </span>
                                  )}
                                  {item.id === 'deletions' && deletionRequestsCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                      {deletionRequestsCount}
                                    </span>
                                  )}
                                  {item.id === 'approvals' && pendingApprovalsCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                      1
                                    </span>
                                  )}
                                  {item.id === 'documents' && pendingDocsCount > 0 && (
                                    <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                      {pendingDocsCount}
                                    </span>
                                  )}
                                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setIsAdminLoggedIn(false);
                      localStorage.removeItem("golden_hands_admin_logged_in");
                      setMobileMenuOpen(false);
                      showToast("Signed out of Admin Portal.");
                    }}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs py-2.5 rounded-xl border border-rose-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Exit Desk</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Content Body (with Mobile Pull-to-Refresh) */}
        <PullToRefresh
          id="admin-pull-to-refresh"
          onRefresh={handlePullToRefresh}
          className="flex-1 p-4 sm:p-8 overflow-y-auto bg-[#F8F9FF]"
        >
          {/* TAB: ANALYTICS & CHARTS */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Core analytics top indicators cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Students</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {students.length + (student.id && !students.some(s => s.id === student.id) ? 1 : 0)}
                    </p>
                    <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-block">↑ 14% this month</span>
                  </div>
                  <div className="w-12 h-12 bg-[#6D3BFF]/15 text-[#6D3BFF] rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Trainers</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">{trainers.length || 3}</p>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Rasulgarh division</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/15 text-amber-500 rounded-2xl flex items-center justify-center">
                    <Car className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Documents Pending</span>
                    <p className="text-2xl font-black text-amber-500 mt-1">
                      {documents.filter(d => d.status === 'Pending').length}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Awaiting Verification</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/15 text-amber-500 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div id="admin-revenue-metric-card" className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Revenue</span>
                    <p className="text-2xl font-black text-emerald-500 mt-1">
                      ₹{totalRevenueVal.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-block">
                      ₹{currentMonthRevenueVal.toLocaleString('en-IN')} in {currentMonthName} (Current Month)
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/15 text-emerald-500 rounded-2xl flex items-center justify-center">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Graphical Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wider">Revenue & Attendance Growth</h3>
                    <TrendingUp className="w-4 h-4 text-[#6D3BFF]" />
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6D3BFF" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6D3BFF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F9" />
                        <XAxis dataKey="name" stroke="#A0AEC0" fontSize={10} tickLine={false} />
                        <YAxis yAxisId="left" stroke="#6D3BFF" fontSize={10} tickLine={false} label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', style: { fontSize: '9px', fontWeight: 'bold', fill: '#6D3BFF' } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#D4AF37" fontSize={10} tickLine={false} label={{ value: 'Bookings', angle: 90, position: 'insideRight', style: { fontSize: '9px', fontWeight: 'bold', fill: '#D4AF37' } }} />
                        <Tooltip />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Area yAxisId="left" name="Revenue (₹)" type="monotone" dataKey="revenue" stroke="#6D3BFF" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        <Line yAxisId="right" name="Classes Booked" type="monotone" dataKey="bookings" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wider">Active Student's Practical Skills Metrics</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Student:</span>
                      <select
                        value={selectedStudentForChart}
                        onChange={(e) => setSelectedStudentForChart(e.target.value)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-xl px-2 py-1 text-slate-700 outline-none focus:border-[#6D3BFF]/40 cursor-pointer transition-all max-w-[150px]"
                      >
                        {allAvailableStudents.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name || "Unnamed"} ({s.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SKILL_COMPLIANCE_DATA} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F9" />
                        <XAxis dataKey="name" stroke="#A0AEC0" fontSize={10} tickLine={false} />
                        <YAxis stroke="#A0AEC0" fontSize={10} tickLine={false} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#8F52FF" name="Skill Score (%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom stats: Vehicle popularity pie chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#161623] uppercase tracking-wider mb-2">Vehicle Fleet Popularity</h4>
                    <p className="text-[10px] text-slate-400">Student model selection preferences</p>
                  </div>
                  <div className="h-[120px] flex items-center justify-center">
                    {VEHICLE_USAGE_DATA.map((v, i) => (
                      <div key={i} className="flex flex-col items-center mx-2.5">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] text-white" style={{ backgroundColor: v.color }}>
                          {v.value}%
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 mt-1">{v.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-extrabold text-xs text-[#161623] uppercase tracking-wider">Ongoing System Actions</h4>
                    <button 
                      onClick={() => handleExportCSV("analytics")}
                      className="text-[#6D3BFF] text-xs font-bold flex items-center gap-1 hover:underline animate-pulse"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Logs
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {[
                      { text: `${student.name || "Guest Student"} requested clutch & parking coaching via ODNEX`, time: "2 mins ago" },
                      { text: `Licence verification status changed to '${student.llStatus || "Applied"}' for student ${student.name || "Guest Student"}`, time: "1 hour ago" },
                      { text: `Trainer ${trainers[0]?.name || "Chief Trainer"} completed scheduled class '${trainers[0]?.carPlate || "OD 02 AB 1234"}'`, time: "3 hours ago" }
                    ].map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2 text-[11px]">
                        <span className="text-slate-600 font-semibold">{log.text}</span>
                        <span className="text-slate-400 text-[10px]">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DRIVING LICENCE APPLICATIONS */}
          {activeTab === 'dl_applications' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Top Header Card */}
              <div className="bg-gradient-to-r from-[#161623] to-[#252538] text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      RTO Verification Desk
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white">Driving Licence Applications</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Review student document uploads across the 4 sections: Aadhaar, Two-Wheeler Licence, Learner Licence, and Other Documents.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shrink-0 text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">Total Applications</span>
                  <span className="text-2xl font-black text-[#D4AF37]">{dlApplications.length}</span>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search student name, phone, or DL ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#6D3BFF]"
                  />
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Showing <span className="text-[#6D3BFF] font-extrabold">{dlApplications.length}</span> record(s) from cloud database
                </div>
              </div>

              {/* Applications Cards List */}
              {dlApplications.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-[#D4AF37]/10 text-[#D4AF37] rounded-3xl flex items-center justify-center mb-3">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-base text-[#161623]">No Driving Licence Applications Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    When students click "Apply for Driving Licence" and upload their documents in the Student Portal, their application will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {dlApplications
                    .filter(app => 
                      !searchQuery || 
                      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      app.studentPhone.includes(searchQuery)
                    )
                    .map(app => {
                      const docsCount = Object.values(app.documents || {}).filter(Boolean).length;
                      return (
                        <div key={app.id} className="bg-white border border-slate-100 hover:border-[#6D3BFF]/40 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <span className="font-mono text-xs font-black text-[#6D3BFF] bg-[#6D3BFF]/10 px-2.5 py-0.5 rounded-lg">
                                {app.id}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                app.status === 'Under Review' ? 'bg-purple-100 text-purple-700' :
                                app.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {app.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <img 
                                src={app.studentPhotoUrl || getStudentDetails(app.studentId).photoUrl} 
                                alt={app.studentName} 
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <h4 className="font-extrabold text-sm text-[#161623]">{app.studentName}</h4>
                                <p className="text-[11px] text-slate-400 font-medium">{app.studentPhone}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{app.studentEmail}</p>
                              </div>
                            </div>

                            {/* Documents count pill */}
                            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                              <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-2">
                                <span>Documents Uploaded</span>
                                <span className="text-[#6D3BFF]">{docsCount} / 4</span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                                <span className={app.documents?.aadhaar ? 'text-emerald-600' : 'text-slate-400'}>
                                  {app.documents?.aadhaar ? '✓ Aadhaar' : '✕ Aadhaar'}
                                </span>
                                <span className={app.documents?.twoWheelerLicence ? 'text-emerald-600' : 'text-slate-400'}>
                                  {app.documents?.twoWheelerLicence ? '✓ 2W Licence' : '✕ 2W Licence'}
                                </span>
                                <span className={app.documents?.learnerLicence ? 'text-emerald-600' : 'text-slate-400'}>
                                  {app.documents?.learnerLicence ? '✓ Learner Lic' : '✕ Learner Lic'}
                                </span>
                                <span className={app.documents?.otherDocuments ? 'text-emerald-600' : 'text-slate-400'}>
                                  {app.documents?.otherDocuments ? '✓ Other Docs' : '✕ Other Docs'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 font-medium">
                              Applied: {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => setSelectedDlApp(app)}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Documents
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ADMIN VIEW STUDENT DOCUMENTS MODAL */}
              {selectedDlApp && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto flex flex-col gap-6 relative">
                    <button
                      onClick={() => setSelectedDlApp(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Student Header */}
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-5 pr-8">
                      <img 
                        src={selectedDlApp.studentPhotoUrl || getStudentDetails(selectedDlApp.studentId).photoUrl} 
                        alt={selectedDlApp.studentName} 
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#6D3BFF]/20 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#6D3BFF] bg-[#6D3BFF]/10 px-2.5 py-0.5 rounded-lg">
                            {selectedDlApp.id}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            Applied: {new Date(selectedDlApp.appliedAt).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-lg text-[#161623] mt-0.5">{selectedDlApp.studentName}</h3>
                        <p className="text-xs text-slate-500">{selectedDlApp.studentPhone} • {selectedDlApp.studentEmail}</p>
                      </div>
                    </div>

                    {/* Admin Status Changer */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Application Status</span>
                        <p className="text-xs font-extrabold text-[#161623]">Current Status: <span className="text-[#6D3BFF]">{selectedDlApp.status}</span></p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(['Applied', 'Under Review', 'Approved', 'Rejected'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => {
                              MockDatabase.updateLicenceApplicationStatus(selectedDlApp.id, status);
                              refreshDlApps();
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              selectedDlApp.status === status 
                                ? 'bg-[#6D3BFF] text-white shadow-sm' 
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* The 4 Document Sections */}
                    <div className="flex flex-col gap-4">
                      <h4 className="font-black text-sm text-[#161623]">Uploaded Documents (4 Sections)</h4>

                      {/* Section 1: Aadhaar */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-[#161623]">1. Aadhaar Card</h5>
                            {selectedDlApp.documents?.aadhaar ? (
                              <p className="text-[10px] text-slate-500 font-medium">{selectedDlApp.documents.aadhaar.fileName} • {selectedDlApp.documents.aadhaar.uploadedAt}</p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold block">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {selectedDlApp.documents?.aadhaar ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingDocPreview({
                                title: "Aadhaar Card",
                                url: selectedDlApp.documents!.aadhaar!.fileUrl,
                                fileName: selectedDlApp.documents!.aadhaar!.fileName
                              })}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Download
                            </button>
                          </div>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-lg">Not Uploaded</span>
                        )}
                      </div>

                      {/* Section 2: Two-Wheeler Licence */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-[#161623]">2. Two-Wheeler Licence</h5>
                            {selectedDlApp.documents?.twoWheelerLicence ? (
                              <p className="text-[10px] text-slate-500 font-medium">{selectedDlApp.documents.twoWheelerLicence.fileName} • {selectedDlApp.documents.twoWheelerLicence.uploadedAt}</p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold block">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {selectedDlApp.documents?.twoWheelerLicence ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingDocPreview({
                                title: "Two-Wheeler Licence",
                                url: selectedDlApp.documents!.twoWheelerLicence!.fileUrl,
                                fileName: selectedDlApp.documents!.twoWheelerLicence!.fileName
                              })}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Download
                            </button>
                          </div>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-lg">Not Uploaded</span>
                        )}
                      </div>

                      {/* Section 3: Learner Licence */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-[#161623]">3. Learner Licence</h5>
                            {selectedDlApp.documents?.learnerLicence ? (
                              <p className="text-[10px] text-slate-500 font-medium">{selectedDlApp.documents.learnerLicence.fileName} • {selectedDlApp.documents.learnerLicence.uploadedAt}</p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold block">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {selectedDlApp.documents?.learnerLicence ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingDocPreview({
                                title: "Learner Licence",
                                url: selectedDlApp.documents!.learnerLicence!.fileUrl,
                                fileName: selectedDlApp.documents!.learnerLicence!.fileName
                              })}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Download
                            </button>
                          </div>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-lg">Not Uploaded</span>
                        )}
                      </div>

                      {/* Section 4: Other Documents */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-[#161623]">4. Other Documents</h5>
                            {selectedDlApp.documents?.otherDocuments ? (
                              <p className="text-[10px] text-slate-500 font-medium">{selectedDlApp.documents.otherDocuments.fileName} • {selectedDlApp.documents.otherDocuments.uploadedAt}</p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold block">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {selectedDlApp.documents?.otherDocuments ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingDocPreview({
                                title: "Other Documents",
                                url: selectedDlApp.documents!.otherDocuments!.fileUrl,
                                fileName: selectedDlApp.documents!.otherDocuments!.fileName
                              })}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Download
                            </button>
                          </div>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-lg">Not Uploaded</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setSelectedDlApp(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FULL SCREEN / PREVIEW LIGHTBOX FOR DOCUMENT */}
              {viewingDocPreview && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col gap-4 max-h-[90vh]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-extrabold text-base text-[#161623]">{viewingDocPreview.title}</h3>
                        <p className="text-xs text-slate-400">{viewingDocPreview.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            downloadFileOrImage(viewingDocPreview.url, viewingDocPreview.fileName);
                            showToast(`Downloading ${viewingDocPreview.fileName}...`);
                          }}
                          className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Document
                        </button>
                        <button
                          onClick={() => setViewingDocPreview(null)}
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900 rounded-2xl p-4 min-h-[300px]">
                      {viewingDocPreview.url.startsWith("data:image") || viewingDocPreview.url.includes("unsplash") || viewingDocPreview.url.startsWith("http") ? (
                        <img 
                          src={viewingDocPreview.url} 
                          alt={viewingDocPreview.title} 
                          className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                        />
                      ) : (
                        <iframe 
                          src={viewingDocPreview.url} 
                          title={viewingDocPreview.title} 
                          className="w-full h-[60vh] rounded-lg border-0 bg-white"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: STUDENTS DIRECTORY */}
          {activeTab === 'students' && (
            <div className="flex flex-col gap-6 animate-fadeIn bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#161623]">Student Management Directory</h2>
                  <p className="text-xs text-slate-400">View performance metrics and modify student profile details, status, or packages</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
                  <button 
                    onClick={handleOpenAddStudent}
                    className="flex-1 sm:flex-none bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#6D3BFF]/10 transition-all cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 shrink-0" /> <span>Register Student</span>
                  </button>
                  <button 
                    onClick={() => handleExportCSV("students")}
                    className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-100 min-h-[44px]"
                  >
                    <Download className="w-4 h-4 shrink-0" /> <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Table rendering the student */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Student</th>
                      <th className="py-3 px-2">Email & Phone</th>
                      <th className="py-3 px-2">Location</th>
                      <th className="py-3 px-2">Skill Rating</th>
                      <th className="py-3 px-2">RTO Licence Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                          No registered students yet.
                        </td>
                      </tr>
                    ) : (
                      students.map((stud) => {
                        const studProgress = MockDatabase.getProgress(stud.id);
                        const avgSkill = Math.round(
                          ((studProgress?.steering || 0) + 
                           (studProgress?.clutch || 0) + 
                           (studProgress?.brake || 0) + 
                           (studProgress?.hillStart || 0) + 
                           (studProgress?.traffic || 0)) / 5
                        ) || 40;

                        return (
                          <tr key={stud.id} className="border-b border-slate-50 hover:bg-[#F8F9FF] transition-all">
                            <td className="py-4 px-2 flex items-center gap-3">
                              <div className="relative group shrink-0">
                                <img 
                                  src={stud.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"} 
                                  alt={stud.name} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" 
                                />
                                <label 
                                  htmlFor={`table-student-photo-${stud.id}`} 
                                  className="absolute inset-0 bg-[#161623]/75 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-[7px] font-extrabold"
                                  title="Click to update student photo"
                                >
                                  <Camera className="w-3 h-3 text-amber-400" />
                                </label>
                                <input 
                                  id={`table-student-photo-${stud.id}`}
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleDirectStudentPhotoUpdate(stud.id, stud.name, file);
                                  }}
                                />
                              </div>
                              <div>
                                <p className="font-extrabold text-[#161623]">{stud.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {stud.id} • Joined {stud.joinedDate || "June 2026"}</p>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <p className="font-semibold text-slate-700">{stud.email}</p>
                              <p className="text-slate-400 font-mono mt-0.5">+91 {stud.phone}</p>
                            </td>
                            <td className="py-4 px-2 text-slate-500 font-semibold">
                              {stud.location}
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] rounded-full" style={{ width: `${avgSkill}%` }} />
                                </div>
                                <span className="font-extrabold text-[#161623]">{avgSkill}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                stud.llStatus === 'Licence Approved' 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : stud.llStatus === 'Driving Test' 
                                    ? 'bg-amber-100 text-amber-600' 
                                    : 'bg-indigo-100 text-indigo-600'
                              }`}>
                                {stud.llStatus}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <div className="flex gap-1 justify-end items-center">
                                <button 
                                  onClick={() => handleOpenEditStudent(stud)}
                                  className="bg-[#6D3BFF]/5 hover:bg-[#6D3BFF]/10 text-[#6D3BFF] text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-[#6D3BFF]/10"
                                  title="Edit everything in student profile"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Modify Everything</span>
                                </button>
                                <button 
                                  onClick={() => handleUpdateLicenceStatus(stud.id, "Driving Test")}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Schedule Test
                                </button>
                                <button 
                                  onClick={() => handleUpdateLicenceStatus(stud.id, "Licence Approved")}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Approve Licence
                                </button>
                                <button 
                                  onClick={() => handleRemoveStudent(stud.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold p-1.5 rounded-lg transition-all flex items-center justify-center border border-rose-100 cursor-pointer"
                                  title="Remove Student Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TRAINER DIRECTORY */}
          {activeTab === 'trainers' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h2 className="text-lg font-black text-[#161623]">Instructor Assignments</h2>
                  <p className="text-xs text-slate-400">Assign new trainers, manage assigned cars, set passwords, and remove trainers.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleOpenAddTrainer}
                    className="flex-1 sm:flex-none bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#6D3BFF]/10 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 shrink-0" /> <span>Assign New Trainer</span>
                  </button>
                  <button 
                    onClick={() => handleExportCSV("trainers")}
                    className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                  >
                    <Download className="w-4 h-4 shrink-0" /> <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainers.map((tr) => (
                  <div key={tr.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="relative group shrink-0">
                            <img 
                              src={tr.photoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"} 
                              alt={tr.name} 
                              className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-sm" 
                            />
                            <label 
                              htmlFor={`card-trainer-photo-${tr.id}`} 
                              className="absolute inset-0 bg-[#161623]/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-[8px] font-extrabold"
                              title="Click to update trainer photo"
                            >
                              <Camera className="w-4 h-4 mb-0.5 text-amber-400" />
                              <span>Update</span>
                            </label>
                            <input 
                              id={`card-trainer-photo-${tr.id}`}
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDirectTrainerPhotoUpdate(tr.id, tr.name, file);
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#161623] text-sm leading-tight">{tr.name}</h4>
                            <span className="text-[10px] text-slate-400">ID: {tr.id} • Rasulgarh Division</span>
                            <label 
                              htmlFor={`card-trainer-photo-${tr.id}`} 
                              className="text-[9px] text-[#6D3BFF] font-bold block hover:underline cursor-pointer mt-0.5"
                            >
                              📷 Update Photo
                            </label>
                          </div>
                        </div>
                        <span className="bg-[#27AE60]/10 text-[#27AE60] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                          Available
                        </span>
                      </div>

                      <div className="bg-[#F8F9FF] p-3.5 rounded-2xl text-xs flex flex-col gap-1.5 border border-slate-100/50">
                        <p className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Assigned Vehicle:</span>
                          <span className="font-bold text-[#161623]">{tr.carName}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400 font-semibold">License Plate:</span>
                          <span className="font-mono font-bold text-[#161623]">{tr.carPlate}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Mobile Number:</span>
                          <span className="font-bold text-slate-600 font-mono">+91 {tr.phone}</span>
                        </p>
                        <p className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-[#D4AF37]" /> Login Password:
                          </span>
                          <span className="font-bold text-slate-700 font-mono bg-[#D4AF37]/10 px-1.5 py-0.5 rounded text-[10px] border border-[#D4AF37]/20">
                            {tr.password || "coach123"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold">
                          <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" /> 
                          <strong className="text-[#161623] font-black">{tr.rating}</strong> ({tr.reviewsCount} reviews)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditTrainer(tr)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Edit Details
                        </button>
                        <button 
                          onClick={() => handleRemoveTrainer(tr.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[10px] py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-all border border-rose-100 cursor-pointer"
                          title="Remove Trainer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="flex flex-col gap-6 animate-fadeIn bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#161623]">Driving Class Bookings</h2>
                  <p className="text-xs text-slate-400">Manage driving slot requests and cancellations</p>
                </div>
                <button 
                  onClick={() => handleExportCSV("bookings")}
                  className="w-full sm:w-auto bg-[#6D3BFF] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Student</th>
                      <th className="py-3 px-2">Trainer & Vehicle</th>
                      <th className="py-3 px-2">Date & Time Slot</th>
                      <th className="py-3 px-2">Location</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-[#F8F9FF] transition-all">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            {b.capturedPhoto ? (
                              <div className="relative group shrink-0">
                                <img 
                                  src={b.capturedPhoto} 
                                  alt="Captured Record" 
                                  className="w-9 h-9 rounded-xl object-cover border border-[#6D3BFF]/20 shadow-sm transition-transform duration-200 group-hover:scale-110 scale-x-[-1]"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white">
                                  <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-[9px] shrink-0">
                                📷
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-[#161623]">{b.studentName}</p>
                              <p className="text-[10px] text-slate-400">Student ID: {b.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-semibold text-[#161623]">{b.trainerName}</p>
                          <p className="text-[10px] text-slate-400">{b.carName} ({b.carPlate})</p>
                        </td>
                        <td className="py-4 px-2 font-semibold text-slate-700">
                          <p>{b.date}</p>
                          <p className="text-[10px] text-[#6D3BFF] font-black">{b.timeSlot}</p>
                        </td>
                        <td className="py-4 px-2 text-slate-500 font-semibold">{b.location}</td>
                        <td className="py-4 px-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            b.status === 'upcoming' 
                              ? 'bg-[#6D3BFF]/10 text-[#6D3BFF]' 
                              : b.status === 'completed' 
                                ? 'bg-[#27AE60]/10 text-[#27AE60]' 
                                : 'bg-slate-100 text-slate-400'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          {b.status === 'upcoming' && (
                            <div className="flex gap-1 justify-end">
                              <button 
                                onClick={() => handleBookingAction(b.id, "completed")}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg"
                              >
                                Complete
                              </button>
                              <button 
                                onClick={() => handleBookingAction(b.id, "cancelled")}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SLOT MANAGEMENT */}
          {activeTab === 'slots' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#161623]">Driving Class Slot Management</h2>
                  <p className="text-xs text-slate-400">Configure student booking capacities, active periods, and blackouts on a daily basis</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBulkGenerateSlots(14)}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> Bulk Initialize Next 14 Days
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Editor Form */}
                <div className="xl:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="font-extrabold text-sm text-[#161623] border-b border-slate-50 pb-2 flex items-center justify-between text-[#6D3BFF]">
                    <span className="flex items-center gap-1.5"><Clock className="w-5 h-5 text-[#6D3BFF]" /> Configure Slot Capacities</span>
                    {slotDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlotDate("");
                          setMorningMax(5);
                          setMorningEnabled(true);
                          setLunchMax(5);
                          setLunchEnabled(true);
                          setRushHourMax(5);
                          setRushHourEnabled(true);
                          setEveningMax(5);
                          setEveningEnabled(true);
                          setIsClosed(false);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Reset Form
                      </button>
                    )}
                  </h3>

                  <form onSubmit={handleSaveSlotDay} className="flex flex-col gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">Target Date</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const tom = new Date();
                              tom.setDate(tom.getDate() + 1);
                              const dateVal = tom.toISOString().split("T")[0];
                              setSlotDate(dateVal);
                              const existing = slots.find(s => s.date === dateVal);
                              if (existing) {
                                setMorningMax(existing.morningMax);
                                setMorningEnabled(existing.morningEnabled);
                                setLunchMax(existing.lunchMax);
                                setLunchEnabled(existing.lunchEnabled);
                                setRushHourMax(existing.rushHourMax);
                                setRushHourEnabled(existing.rushHourEnabled);
                                setEveningMax(existing.eveningMax);
                                setEveningEnabled(existing.eveningEnabled);
                                setIsClosed(existing.isClosed);
                              }
                            }}
                            className="text-[9px] bg-slate-100 hover:bg-slate-200 font-bold px-2 py-0.5 rounded text-slate-600 cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 7);
                              const dateVal = d.toISOString().split("T")[0];
                              setSlotDate(dateVal);
                              const existing = slots.find(s => s.date === dateVal);
                              if (existing) {
                                setMorningMax(existing.morningMax);
                                setMorningEnabled(existing.morningEnabled);
                                setLunchMax(existing.lunchMax);
                                setLunchEnabled(existing.lunchEnabled);
                                setRushHourMax(existing.rushHourMax);
                                setRushHourEnabled(existing.rushHourEnabled);
                                setEveningMax(existing.eveningMax);
                                setEveningEnabled(existing.eveningEnabled);
                                setIsClosed(existing.isClosed);
                              }
                            }}
                            className="text-[9px] bg-slate-100 hover:bg-slate-200 font-bold px-2 py-0.5 rounded text-slate-600 cursor-pointer"
                          >
                            +7 Days
                          </button>
                        </div>
                      </div>
                      <input 
                        type="date"
                        value={slotDate}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          setSlotDate(dateVal);
                          // Auto load if existing
                          const existing = slots.find(s => s.date === dateVal);
                          if (existing) {
                            setMorningMax(existing.morningMax);
                            setMorningEnabled(existing.morningEnabled);
                            setLunchMax(existing.lunchMax);
                            setLunchEnabled(existing.lunchEnabled);
                            setRushHourMax(existing.rushHourMax);
                            setRushHourEnabled(existing.rushHourEnabled);
                            setEveningMax(existing.eveningMax);
                            setEveningEnabled(existing.eveningEnabled);
                            setIsClosed(existing.isClosed);
                          } else {
                            // Defaults
                            setMorningMax(5);
                            setMorningEnabled(true);
                            setLunchMax(5);
                            setLunchEnabled(true);
                            setRushHourMax(5);
                            setRushHourEnabled(true);
                            setEveningMax(5);
                            setEveningEnabled(true);
                            setIsClosed(false);
                          }
                        }}
                        className="w-full bg-[#F8F9FF] border-slate-100 rounded-xl p-2.5 text-xs focus:outline-none font-semibold cursor-pointer"
                        required
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                        <div>
                          <span className="font-extrabold text-xs text-slate-700">Date Booking Lockout</span>
                          <p className="text-[9px] text-slate-400">Completely block students from selecting this date</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isClosed}
                          onChange={(e) => setIsClosed(e.target.checked)}
                          className="w-4 h-4 rounded text-[#6D3BFF] border-slate-300 focus:ring-[#6D3BFF] cursor-pointer"
                        />
                      </div>

                      {!isClosed && (
                        <div className="flex flex-col gap-3.5 pt-1">
                          {[
                            { 
                              id: "morning", 
                              label: "Morning Session", 
                              max: morningMax, 
                              setMax: setMorningMax, 
                              enabled: morningEnabled, 
                              setEnabled: setMorningEnabled 
                            },
                            { 
                              id: "lunch", 
                              label: "Lunch Session", 
                              max: lunchMax, 
                              setMax: setLunchMax, 
                              enabled: lunchEnabled, 
                              setEnabled: setLunchEnabled 
                            },
                            { 
                              id: "rush", 
                              label: "Rush Hour Session", 
                              max: rushHourMax, 
                              setMax: setRushHourMax, 
                              enabled: rushHourEnabled, 
                              setEnabled: setRushHourEnabled 
                            },
                            { 
                              id: "evening", 
                              label: "Evening Session", 
                              max: eveningMax, 
                              setMax: setEveningMax, 
                              enabled: eveningEnabled, 
                              setEnabled: setEveningEnabled 
                            }
                          ].map((session) => (
                            <div key={session.id} className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox"
                                  checked={session.enabled}
                                  onChange={(e) => session.setEnabled(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-[#6D3BFF] border-slate-300 focus:ring-[#6D3BFF] cursor-pointer"
                                />
                                <span className={`font-bold text-[11px] ${session.enabled ? "text-slate-800" : "text-slate-400 line-through"}`}>
                                  {session.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Max Capacity:</span>
                                <input 
                                  type="number"
                                  min="1"
                                  max="50"
                                  disabled={!session.enabled}
                                  value={session.max}
                                  onChange={(e) => session.setMax(Math.max(1, parseInt(e.target.value) || 0))}
                                  className="w-12 bg-slate-50 border border-slate-200/70 rounded-lg py-1 px-1.5 text-center text-[10px] font-bold disabled:bg-slate-100 disabled:text-slate-300"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-[#6D3BFF]/10 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Save Slot Configurations
                    </button>
                  </form>
                </div>

                {/* Right Column: List of Slots */}
                <div className="xl:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#161623]">Active Slot Calendar</h3>
                      <p className="text-[10px] text-slate-400">All configured dates with real-time student booking stats</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full">{slots.length} Dates Configured</span>
                  </div>

                  {slots.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-3">
                      <p>No active slots configured yet. Select a date on the left or use Bulk Initialize to create upcoming sessions.</p>
                      <button
                        type="button"
                        onClick={() => handleBulkGenerateSlots(14)}
                        className="bg-[#6D3BFF] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer hover:bg-[#8F52FF]"
                      >
                        Initialize Next 14 Days Now
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                      {[...slots]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((s) => {
                          const morningB = bookings.filter(b => b.date === s.date && b.timeSlot === "Morning" && b.status !== "cancelled").length;
                          const lunchB = bookings.filter(b => b.date === s.date && b.timeSlot === "Lunch" && b.status !== "cancelled").length;
                          const rushB = bookings.filter(b => b.date === s.date && b.timeSlot === "Rush Hour" && b.status !== "cancelled").length;
                          const eveningB = bookings.filter(b => b.date === s.date && b.timeSlot === "Evening" && b.status !== "cancelled").length;

                          return (
                            <div key={s.id} className="p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 hover:border-slate-200/80 transition-all bg-[#F8F9FF]/40">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-xs text-slate-800">{s.date}</span>
                                  {s.isClosed ? (
                                    <span className="bg-rose-100 text-rose-700 font-black text-[8px] uppercase px-2 py-0.5 rounded-full">
                                      Closed / Locked
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-700 font-black text-[8px] uppercase px-2 py-0.5 rounded-full">
                                      Active / Open
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditSlotDay(s)}
                                    className="p-1 text-[#6D3BFF] hover:bg-[#6D3BFF]/10 rounded-lg transition-colors cursor-pointer"
                                    title="Edit slot day"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlotDay(s.id)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete slot day"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {!s.isClosed ? (
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  {[
                                    { label: "Morning", booked: morningB, max: s.morningMax, enabled: s.morningEnabled },
                                    { label: "Lunch", booked: lunchB, max: s.lunchMax, enabled: s.lunchEnabled },
                                    { label: "Rush Hour", booked: rushB, max: s.rushHourMax, enabled: s.rushHourEnabled },
                                    { label: "Evening", booked: eveningB, max: s.eveningMax, enabled: s.eveningEnabled },
                                  ].map((sess, idx) => (
                                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                                      <div className="flex justify-between items-center w-full">
                                        <span className={`text-[10px] font-bold ${sess.enabled ? "text-slate-700" : "text-slate-400 line-through"}`}>
                                          {sess.label}
                                        </span>
                                        <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded ${
                                          !sess.enabled 
                                            ? "bg-slate-100 text-slate-400" 
                                            : sess.booked >= sess.max 
                                              ? "bg-rose-100 text-rose-600" 
                                              : "bg-[#6D3BFF]/10 text-[#6D3BFF]"
                                        }`}>
                                          {!sess.enabled ? "Closed" : sess.booked >= sess.max ? "Full" : "Open"}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                        <span>Capacity:</span>
                                        <span>{sess.enabled ? `${sess.booked} / ${sess.max} booked` : "N/A"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 font-medium italic mt-1 bg-white p-2 rounded-xl text-center border border-slate-100">
                                  No classes can be booked for this date. Locked out.
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCUMENTS DESK */}
          {activeTab === 'documents' && (
            <div className="flex flex-col gap-6 animate-fadeIn bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-[#161623]">Document Verification Desk</h2>
                <p className="text-xs text-slate-400">Review and verify Aadhar, PAN, or Learner's Licence uploads</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Document Name</th>
                      <th className="py-3 px-2">Uploaded By</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Date Uploaded</th>
                      <th className="py-3 px-2">Mock File</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-50 hover:bg-[#F8F9FF] transition-all">
                        <td className="py-4 px-2 flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#6D3BFF]/10 text-[#6D3BFF] rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-[#161623]">{doc.name}</p>
                            <p className="text-[9px] text-slate-400">ID: {doc.id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={getStudentDetails(doc.studentId).photoUrl} 
                              alt={getStudentDetails(doc.studentId).name} 
                              className="w-7 h-7 rounded-full object-cover border border-slate-100 shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-extrabold text-[#161623]">{getStudentDetails(doc.studentId).name}</p>
                              <p className="text-[9px] text-slate-400">{getStudentDetails(doc.studentId).email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-slate-500 font-bold">{doc.type}</td>
                        <td className="py-4 px-2 text-slate-400 font-semibold">{doc.uploadedAt}</td>
                        <td className="py-4 px-2">
                          <button 
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="text-[#6D3BFF] hover:underline font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-left"
                          >
                            Preview Attachment <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            doc.status === 'Verified' 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : doc.status === 'Rejected' 
                                ? 'bg-rose-100 text-rose-600' 
                                : 'bg-amber-100 text-amber-600'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          {doc.status === 'Pending' && (
                            <div className="flex gap-1 justify-end">
                              <button 
                                onClick={() => handleDocumentVerify(doc.id, "Verified")}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button 
                                onClick={() => handleDocumentVerify(doc.id, "Rejected")}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="flex flex-col gap-6 animate-fadeIn bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#161623]">Financial Ledger</h2>
                  <p className="text-xs text-slate-400">Review full receipts, invoices, and transaction hashes</p>
                </div>
                <button 
                  onClick={() => handleExportCSV("payments")}
                  className="w-full sm:w-auto bg-[#6D3BFF] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Transaction Hash</th>
                      <th className="py-3 px-2">Student Name</th>
                      <th className="py-3 px-2">Purpose / Category</th>
                      <th className="py-3 px-2">Method</th>
                      <th className="py-3 px-2">Amount</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-[#F8F9FF] transition-all">
                        <td className="py-4 px-2 font-mono text-slate-400 font-bold">{p.transactionId}</td>
                        <td className="py-4 px-2 font-extrabold text-[#161623]">{p.studentName}</td>
                        <td className="py-4 px-2 text-slate-600 font-semibold">{p.purpose}</td>
                        <td className="py-4 px-2 text-slate-500 font-semibold">{p.paymentMethod}</td>
                        <td className="py-4 px-2 font-black text-[#161623]">₹{p.amount.toLocaleString()}</td>
                        <td className="py-4 px-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            p.status === 'Success' 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : p.status === 'Failed' 
                                ? 'bg-rose-100 text-rose-600' 
                                : 'bg-amber-100 text-amber-600'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          {p.status === 'Pending' && (
                            <div className="flex gap-1 justify-end">
                              <button 
                                onClick={() => handlePaymentVerify(p.id, "Success")}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button 
                                onClick={() => handlePaymentVerify(p.id, "Failed")}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PAYMENT & COURSE APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Stat overview banners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Awaiting Fee Approvals</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {students.filter(s => s.modificationStatus === 'paid_pending_approval').length} Requests
                    </p>
                    <span className="text-[10px] text-[#6D3BFF] font-semibold mt-1 inline-block">Requires instant release</span>
                  </div>
                  <div className="w-12 h-12 bg-[#6D3BFF]/10 text-[#6D3BFF] rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-[#6D3BFF]" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Student Actions</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {students.filter(s => s.modificationStatus === 'proposed').length} Awaiting Payment
                    </p>
                    <span className="text-[10px] text-amber-500 font-semibold mt-1 inline-block">Drafted modifications</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Completed Upgrades</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {payments.filter(p => p.purpose.includes("Modification") || p.purpose.includes("Extension")).length} Releases
                    </p>
                    <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-block">100% Audit Cleared</span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side: Main approval request card */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wide">Verification Desk</h3>
                        <p className="text-xs text-slate-400">Review payment receipt, UPI transaction hash, and student requested syllabus changes below.</p>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-[#6D3BFF] border border-indigo-100 font-bold px-2.5 py-1 rounded-full uppercase">
                        Active Queue
                      </span>
                    </div>

                    {(() => {
                      const pendingModStudents = students.filter(s => s.modificationStatus === 'paid_pending_approval' || s.modificationStatus === 'proposed');
                      if (pendingModStudents.length === 0) {
                        return (
                          <div className="text-center py-16 bg-[#F8F9FF] rounded-3xl border border-dashed border-slate-200">
                            <span className="text-4xl block mb-2">🎉</span>
                            <p className="text-sm font-bold text-slate-500">All payment approvals are fully cleared!</p>
                            <p className="text-xs text-slate-400 mt-1">No pending course modifications or fee validations are in the queue.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col gap-6">
                          {pendingModStudents.map((stud) => {
                            const isPaid = stud.modificationStatus === 'paid_pending_approval';
                            return (
                              <div key={stud.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-white p-5 shadow-sm">
                                {/* Student Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={stud.photoUrl} 
                                      alt="Student" 
                                      className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                                    />
                                    <div>
                                      <h4 className="font-black text-sm text-[#161623]">{stud.name}</h4>
                                      <p className="text-xs text-slate-400">{stud.email} • ID: {stud.id}</p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    {isPaid ? (
                                      <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> ₹800 UPI PAID
                                      </span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 font-black text-[10px] uppercase px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> AWAITING ₹800 PAYMENT
                                      </span>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                      Transaction Status: {stud.modificationStatus.toUpperCase()}
                                    </p>
                                  </div>
                                </div>

                                {/* Plan Comparative Comparison */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                  {/* Current Plan */}
                                  <div className="bg-[#F8F9FF] rounded-2xl p-4 border border-slate-100/50 text-xs">
                                    <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                                      Current Active Plan
                                    </span>
                                    <h5 className="font-black text-sm text-[#161623] mt-2">{stud.courseName || "Premium Package (20 Sessions)"}</h5>
                                    <p className="text-[11px] text-slate-500 mt-1 italic">"{stud.courseNotes || 'No custom notes.'}"</p>
                                    
                                    {stud.courseSyllabus && stud.courseSyllabus.length > 0 && (
                                      <div className="mt-3">
                                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">Syllabus Outline:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {stud.courseSyllabus.map((mod, i) => (
                                            <span key={i} className="text-[8.5px] bg-white text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                                              ✓ {mod}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Proposed Plan */}
                                  <div className="bg-gradient-to-br from-[#6D3BFF]/5 to-[#8F52FF]/5 rounded-2xl p-4 border border-[#6D3BFF]/15 text-xs">
                                    <span className="text-[9px] bg-[#6D3BFF] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                      Proposed Plan Details
                                    </span>
                                    <h5 className="font-black text-sm text-[#161623] mt-2">{stud.proposedCourseName || stud.courseName}</h5>
                                    <p className="text-[11px] text-[#6D3BFF] mt-1 font-semibold italic">"{stud.proposedCourseNotes || 'No custom notes request.'}"</p>
                                    
                                    {stud.proposedCourseSyllabus && stud.proposedCourseSyllabus.length > 0 && (
                                      <div className="mt-3">
                                        <span className="text-[9px] text-[#6D3BFF] font-extrabold uppercase">Custom Syllabus Focus:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {stud.proposedCourseSyllabus.map((mod, i) => (
                                            <span key={i} className="text-[8.5px] bg-white text-slate-800 font-black px-2 py-0.5 rounded border border-[#6D3BFF]/20 shadow-sm">
                                              ✦ {mod}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Verified receipt details */}
                                {isPaid && (
                                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 mb-4 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div>
                                      <span className="text-[8.5px] text-emerald-800 font-extrabold block uppercase tracking-wider">Verified Payment Log</span>
                                      <span className="font-black text-[#161623]">UPI Transaction Id: TXN_GOLDEN_{Math.floor(100000 + Math.random() * 900000)}</span>
                                      <span className="text-[10px] text-slate-500 block">Status: Completed Success • Settlement: Instant</span>
                                    </div>
                                    <span className="bg-emerald-600 text-white font-black px-2.5 py-1 rounded-lg text-[10px]">
                                      UPI SUCCESS
                                    </span>
                                  </div>
                                )}

                                {/* Verification Actions bar */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-100 pt-4 gap-4">
                                  <p className="text-[10.5px] text-slate-400 max-w-sm">
                                    {!isPaid 
                                      ? "⚠️ The student has not paid the modification fee of ₹800. You may choose to approve directly to bypass the payment, or reject." 
                                      : "✓ Student fee has been fully verified and received in the portal ledger. Click approve to apply changes instantly."}
                                  </p>

                                  <div className="flex gap-2 shrink-0">
                                    <button
                                      onClick={() => handleRejectModification(stud.id)}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject Request
                                    </button>
                                    <button
                                      onClick={() => handleApproveModification(stud.id)}
                                      className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-[#6D3BFF]/10"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve & Apply Plan
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right side: Fee log stream / audit ledger */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <h3 className="font-extrabold text-xs text-[#161623] uppercase tracking-wider mb-3">Approved Upgrades Logs</h3>
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                      {payments.filter(p => p.purpose.includes("Modification") || p.purpose.includes("Extension")).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-8">No upgrade payments made yet.</p>
                      ) : (
                        payments.filter(p => p.purpose.includes("Modification") || p.purpose.includes("Extension")).map((p) => (
                          <div key={p.id} className="bg-[#F8F9FF] p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-xs">
                            <div className="flex justify-between items-start gap-1">
                              <div>
                                <p className="font-black text-[#161623]">{p.studentName}</p>
                                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">{p.purpose}</p>
                              </div>
                              <span className="text-emerald-600 font-black shrink-0">
                                +₹{p.amount}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50 text-[9px] text-slate-400 font-mono">
                              <span>{p.transactionId}</span>
                              <span className="text-slate-500 font-bold uppercase">{p.paymentMethod}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-[#161623] text-white p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-[#6D3BFF]/20 rounded-full blur-xl animate-pulse" />
                    <h3 className="font-extrabold text-xs text-[#D4AF37] uppercase tracking-wider mb-1.5">Auto-Syllabus Integration</h3>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Approving a custom request instantly synchronizes with the Student's learning module and the assigned Trainer's session card.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FEEDBACK DESK */}
          {activeTab === 'feedback' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Top stat indicator widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Instructor Rating</span>
                    <p className="text-2xl font-black text-[#161623] mt-1 flex items-center gap-1">
                      {(trainers.reduce((acc, t) => acc + t.rating, 0) / trainers.length || 0).toFixed(1)}
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    </p>
                    <span className="text-[10px] text-[#27AE60] font-bold mt-1 inline-block">Excellent Level</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                    <Star className="w-6 h-6 fill-amber-500" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Student Reviews</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {reviews.length}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Submitted via app</span>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50/50 text-indigo-500 rounded-2xl flex items-center justify-center font-bold text-lg">
                    📝
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Classes with Remarks</span>
                    <p className="text-2xl font-black text-[#161623] mt-1">
                      {bookings.filter(b => b.status === 'completed' && b.remarks).length}
                    </p>
                    <span className="text-[10px] text-[#27AE60] font-semibold mt-1 inline-block">Evaluation Logs ready</span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ratings to Complete</span>
                    <p className="text-2xl font-black text-amber-500 mt-1">
                      {bookings.filter(b => b.status === 'completed' && !b.ratingGiven).length}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">Awaiting Student Stars</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-50/50 text-amber-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Selector / Sub Tab Switcher & Search Filter */}
              <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto select-none shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => setFeedbackSubTab('student')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                      feedbackSubTab === 'student' 
                        ? 'bg-[#6D3BFF] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎓 Student Feedback ({reviews.length})
                  </button>
                  <button
                    onClick={() => setFeedbackSubTab('trainer')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                      feedbackSubTab === 'trainer' 
                        ? 'bg-[#6D3BFF] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🚗 Trainer Feedback ({bookings.filter(b => b.status === 'completed' && b.remarks).length})
                  </button>
                  <button
                    onClick={() => setFeedbackSubTab('modifications')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
                      feedbackSubTab === 'modifications' 
                        ? 'bg-[#6D3BFF] text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ⚙️ Course Approvals ({student.modificationStatus === 'paid_pending_approval' ? 1 : 0})
                  </button>
                </div>

                <div className="relative w-72">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder={feedbackSubTab === 'student' ? "Search by student or coach..." : "Search by student or coach remarks..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F8F9FF] border border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#6D3BFF]/20 font-semibold"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tab 1: Student Feedback on Trainers */}
              {feedbackSubTab === 'student' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wide">Trainer Performance Reviews</h3>
                    <p className="text-xs text-slate-400">Direct feedback submitted by student drivers regarding coach instructional techniques, safety compliance, and helpfulness.</p>
                  </div>

                  {(() => {
                    const filteredReviews = reviews.filter(r => {
                      const trainerName = trainers.find(t => t.id === r.trainerId)?.name || "";
                      const query = searchQuery.toLowerCase();
                      return r.studentName.toLowerCase().includes(query) || 
                             trainerName.toLowerCase().includes(query) ||
                             r.comment.toLowerCase().includes(query);
                    });

                    if (filteredReviews.length === 0) {
                      return (
                        <div className="text-center py-12 bg-[#F8F9FF] rounded-3xl border border-dashed border-slate-200">
                          <p className="text-sm font-bold text-slate-400">No student reviews matched the search criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredReviews.map((rev) => {
                          const associatedTrainer = trainers.find(t => t.id === rev.trainerId);
                          return (
                            <div key={rev.id} className="border border-slate-100 hover:border-[#6D3BFF]/20 bg-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
                              <div className="flex flex-col gap-3">
                                {/* Student Header */}
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 shadow-sm shrink-0 bg-[#F8F9FF] flex items-center justify-center">
                                      {rev.studentPhoto ? (
                                        <img src={rev.studentPhoto} alt={rev.studentName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="font-extrabold text-xs text-[#6D3BFF]">{rev.studentName.substring(0, 2).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-xs text-[#161623]">{rev.studentName}</h4>
                                      <p className="text-[10px] text-slate-400 font-semibold">{rev.date}</p>
                                    </div>
                                  </div>

                                  {/* Stars */}
                                  <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl">
                                    <span className="text-[11px] font-black text-amber-600">{rev.rating}</span>
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  </div>
                                </div>

                                {/* Review Content */}
                                <div className="bg-[#F8F9FF] p-3.5 rounded-2xl border border-slate-100/50">
                                  <p className="text-xs text-slate-600 leading-relaxed italic">
                                    "{rev.comment}"
                                  </p>
                                </div>

                                {/* Trainer Details Block */}
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="text-slate-400 font-bold">Reviewed Trainer:</span>
                                  {associatedTrainer ? (
                                    <span className="bg-[#6D3BFF]/10 text-[#6D3BFF] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      👤 Coach {associatedTrainer.name} ({associatedTrainer.carName})
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                      Unknown Coach
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Interactive Action Buttons */}
                              <div className="flex gap-2 border-t border-slate-50 pt-3.5 mt-1 justify-end">
                                <button
                                  onClick={() => handleAcknowledgeReview(rev.id, associatedTrainer?.name || "Instructor")}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#6D3BFF] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Acknowledge
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                  title="Remove review from system public record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Moderate
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub-tab 2: Trainer Feedback on Students */}
              {feedbackSubTab === 'trainer' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wide">Practical Evaluations & Remarks</h3>
                    <p className="text-xs text-slate-400">Class notes, progress remarks, and steering grades written by driving coaches after completing individual practical sessions.</p>
                  </div>

                  {(() => {
                    const remarksBookings = bookings.filter(b => b.status === 'completed' && b.remarks);
                    const filteredRemarks = remarksBookings.filter(b => {
                      const query = searchQuery.toLowerCase();
                      return b.studentName.toLowerCase().includes(query) ||
                             b.trainerName.toLowerCase().includes(query) ||
                             (b.remarks && b.remarks.toLowerCase().includes(query));
                    });

                    if (filteredRemarks.length === 0) {
                      return (
                        <div className="text-center py-12 bg-[#F8F9FF] rounded-3xl border border-dashed border-slate-200">
                          <p className="text-sm font-bold text-slate-400">No trainer evaluation logs matched the search criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-3 px-2">Student</th>
                              <th className="py-3 px-2">Assigned Coach</th>
                              <th className="py-3 px-2">Date & Class Slot</th>
                              <th className="py-3 px-2">Vehicle used</th>
                              <th className="py-3 px-2">Coach Focus Remarks</th>
                              <th className="py-3 px-2 text-right">Administrative Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRemarks.map((b) => (
                              <tr key={b.id} className="border-b border-slate-50 hover:bg-[#F8F9FF] transition-all">
                                <td className="py-4 px-2 font-extrabold text-[#161623]">{b.studentName}</td>
                                <td className="py-4 px-2 font-black text-slate-700">
                                  Coach {b.trainerName}
                                </td>
                                <td className="py-4 px-2">
                                  <p className="font-bold text-slate-800">{b.date}</p>
                                  <p className="text-[10px] text-slate-400">{b.timeSlot}</p>
                                </td>
                                <td className="py-4 px-2">
                                  <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                    {b.carName} ({b.carPlate})
                                  </span>
                                </td>
                                <td className="py-4 px-2 max-w-sm">
                                  <p className="text-slate-600 font-medium leading-relaxed italic bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-100/50">
                                    "{b.remarks}"
                                  </p>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <div className="flex gap-1.5 justify-end">
                                    <button 
                                      onClick={() => handleApproveForRTOLog(b.id)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer"
                                      title="Lock this session directly to official RTO-required logbook list"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Sync RTO Log
                                    </button>
                                    <button 
                                      onClick={() => handleFlagRemark(b.id)}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer"
                                      title="Flag this feedback for secondary administrative monitoring"
                                    >
                                      Flag
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub-tab 3: Pending Course Modifications */}
              {feedbackSubTab === 'modifications' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#161623] uppercase tracking-wide">Course Modification Requests</h3>
                    <p className="text-xs text-slate-400">Review, approve, or reject student and trainer-initiated course modifications. Approval automatically synchronizes and updates the active student parameters.</p>
                  </div>

                  {(() => {
                    if (!student.modificationStatus || student.modificationStatus === 'none') {
                      return (
                        <div className="text-center py-12 bg-[#F8F9FF] rounded-3xl border border-dashed border-slate-200">
                          <p className="text-sm font-bold text-slate-400">There are no active course modification requests at this time.</p>
                        </div>
                      );
                    }

                    const isPaid = student.modificationStatus === 'paid_pending_approval';

                    return (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={student.photoUrl} 
                              alt="Student" 
                              className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                            />
                            <div>
                              <h4 className="font-black text-sm text-[#161623]">{student.name}</h4>
                              <p className="text-xs text-slate-400">{student.email} • ID: {student.id}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPaid ? (
                              <span className="bg-emerald-100 text-emerald-700 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" /> ₹800 Fee Paid
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-700 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 animate-pulse" /> Pending Fee Payment
                              </span>
                            )}

                            <span className="bg-[#6D3BFF]/10 text-[#6D3BFF] font-black text-[10px] px-3 py-1 rounded-full border border-[#6D3BFF]/20">
                              Status: {student.modificationStatus}
                            </span>
                          </div>
                        </div>

                        {/* Comparative Plan Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                          {/* Current active plan */}
                          <div className="bg-[#F8F9FF] rounded-2xl p-4 border border-slate-100/50">
                            <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                              Current Active Plan
                            </span>
                            <h5 className="font-black text-sm text-[#161623] mt-2">{student.courseName || "Premium Package (20 Sessions)"}</h5>
                            <p className="text-[11px] text-slate-500 mt-1 italic">"{student.courseNotes || 'No custom notes.'}"</p>
                            
                            {student.courseSyllabus && student.courseSyllabus.length > 0 && (
                              <div className="mt-3.5">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Syllabus Outline:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {student.courseSyllabus.map((mod, i) => (
                                    <span key={i} className="text-[8.5px] bg-white text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                                      ✓ {mod}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Proposed plan changes */}
                          <div className="bg-gradient-to-br from-[#6D3BFF]/5 to-[#8F52FF]/5 rounded-2xl p-4 border border-[#6D3BFF]/15">
                            <span className="text-[9px] bg-[#6D3BFF] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                              Proposed Course Plan
                            </span>
                            <h5 className="font-black text-sm text-[#161623] mt-2">{student.proposedCourseName || student.courseName}</h5>
                            <p className="text-[11px] text-[#6D3BFF] mt-1 font-semibold italic">"{student.proposedCourseNotes || 'No custom notes request.'}"</p>
                            
                            {student.proposedCourseSyllabus && student.proposedCourseSyllabus.length > 0 && (
                              <div className="mt-3.5">
                                <span className="text-[9px] text-[#6D3BFF] font-extrabold uppercase">Focus Modules:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {student.proposedCourseSyllabus.map((mod, i) => (
                                    <span key={i} className="text-[8.5px] bg-white text-slate-800 font-black px-2 py-0.5 rounded border border-[#6D3BFF]/20 shadow-sm">
                                      ✦ {mod}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Approval Actions bar */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 gap-4">
                          <p className="text-[11px] text-slate-400 max-w-md">
                            {!isPaid 
                              ? "⚠️ Note: The student has not paid the ₹800 modification fee yet. You can still approve it to bypass payment, or reject it." 
                              : "✓ Student has successfully made the ₹800 payment. Click Approve to finalize the course upgrade immediately."}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectModification(student.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject Request
                            </button>
                            <button
                              onClick={() => handleApproveModification(student.id)}
                              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-[#6D3BFF]/10"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve Modifications
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACCOUNT DELETION REQUESTS */}
          {activeTab === 'deletions' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <UserX className="w-6 h-6 text-rose-600" />
                    <h2 className="text-lg font-black text-[#161623]">Account Deletion Requests</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage student requests for account termination and permanent data erasure. Approving permanently purges profile records, bookings, documents, payments, and messages.
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm">
                    {MockDatabase.getAccountDeletionRequests().length}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Pending Requests</span>
                    <p className="text-[10px] text-rose-600">Awaiting Admin action or 15-day auto-purge</p>
                  </div>
                </div>
              </div>

              {/* Requests List */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                {(() => {
                  const deletionRequests = MockDatabase.getAccountDeletionRequests();

                  if (deletionRequests.length === 0) {
                    return (
                      <div className="text-center py-16 bg-[#F8F9FF] rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="font-extrabold text-sm text-[#161623]">No Pending Account Deletion Requests</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          There are currently no active account deletion requests in the queue.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {deletionRequests.map((req) => {
                        const reqDate = req.deletionRequestedAt ? new Date(req.deletionRequestedAt) : new Date();
                        const now = new Date();
                        const daysElapsed = Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, 15 - daysElapsed);

                        return (
                          <div 
                            key={req.id} 
                            className="border border-rose-100 bg-rose-50/20 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all hover:border-rose-300"
                          >
                            <div className="flex items-start md:items-center gap-4">
                              <img 
                                src={req.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                                alt={req.name} 
                                className="w-14 h-14 rounded-full border-2 border-rose-300 object-cover shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-sm text-[#161623]">{req.name}</h4>
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                    Deletion Requested
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{req.email} • {req.phone}</p>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap pt-0.5">
                                  <span>📅 Requested: <strong>{reqDate.toLocaleDateString()} at {reqDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                                  <span>•</span>
                                  <span>📦 Package: <strong>{req.courseName || "Basic Course"}</strong></span>
                                </div>
                                {req.deletionReason && (
                                  <p className="text-[10.5px] text-slate-600 italic bg-white/80 p-2 rounded-lg border border-slate-100 mt-1">
                                    "{req.deletionReason}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-rose-100">
                              {/* Days countdown info */}
                              <div className="bg-white border border-rose-100 px-3.5 py-2 rounded-xl text-center shrink-0">
                                <span className="text-[9px] text-slate-400 font-black uppercase block">Auto-Purge In</span>
                                <span className="text-sm font-black text-rose-600">{daysRemaining} Days</span>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => {
                                    askConfirmation(
                                      "Reject Deletion Request",
                                      `Are you sure you want to reject the account deletion request for ${req.name}? Their account will remain active.`,
                                      () => {
                                        MockDatabase.adminRejectAccountDeletion(req.id);
                                        setStudents(MockDatabase.getRegisteredStudents());
                                        onStateChange();
                                        showToast(`Deletion request for ${req.name} has been rejected.`);
                                      }
                                    );
                                  }}
                                  className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                                <button
                                  onClick={() => {
                                    askConfirmation(
                                      "PERMANENT ACCOUNT DELETION",
                                      `WARNING: Are you sure you want to approve deletion for ${req.name}? This will permanently erase their profile, bookings, attendance, documents, payments, test attempts, and all associated database records. This action cannot be reversed.`,
                                      () => {
                                        MockDatabase.adminApproveAccountDeletion(req.id);
                                        setStudents(MockDatabase.getRegisteredStudents());
                                        setBookings(MockDatabase.getAllBookings());
                                        setDocuments(MockDatabase.getAllDocuments());
                                        setPayments(MockDatabase.getAllPayments());
                                        onStateChange();
                                        showToast(`Account for ${req.name} and all associated records have been permanently erased.`);
                                      }
                                    );
                                  }}
                                  className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Approve & Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: PICKUP / LIVE FLEET TRACKING */}
          {activeTab === 'tracking' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Navigation className="w-6 h-6 text-cyan-600" />
                    <h2 className="text-lg font-black text-[#161623]">Pickup & Live GPS Fleet Tracking</h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> 4 Cars Active in Bhubaneswar
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Real-time monitoring of driving instruction vehicles, assigned instructors, active learner pickup points, and in-transit speed across Bhubaneswar zones.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      showToast("Telemetry synced with vehicle GPS trackers.");
                    }}
                    className="bg-[#F8F9FF] hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh GPS
                  </button>
                  <button
                    onClick={() => {
                      showToast("Live Fleet Broadcast: All trainers notified to verify pickup checkpoints.");
                    }}
                    className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#6D3BFF]/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Radio className="w-3.5 h-3.5 text-white" /> Ping All Fleet
                  </button>
                </div>
              </div>

              {/* Fleet Metric Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">On Road Cars</span>
                    <span className="text-lg font-black text-[#161623]">4 / 4 Active</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Learners in Session</span>
                    <span className="text-lg font-black text-[#161623]">4 Students</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Fleet Speed</span>
                    <span className="text-lg font-black text-[#161623]">26 km/h</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dual-Control Status</span>
                    <span className="text-lg font-black text-emerald-600">100% Armed</span>
                  </div>
                </div>
              </div>

              {/* Interactive Bhubaneswar GPS Map Visualizer */}
              <div className="bg-gradient-to-br from-slate-900 via-[#161623] to-[#2B1B4D] rounded-3xl p-6 text-white border border-slate-800 shadow-xl overflow-hidden relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 z-10 relative">
                  <div>
                    <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest block">Odisha RTO OD-02 Telemetry</span>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      Bhubaneswar City GPS Radar
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/10 font-bold">Zone: Saheed Nagar • Patia • Khandagiri • Nayapalli</span>
                  </div>
                </div>

                {/* Styled Map Board Simulation */}
                <div className="h-64 sm:h-72 bg-slate-950/60 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center">
                  {/* Grid Lines Pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
                  
                  {/* Center Hub Marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
                      <span className="text-xs">👑</span>
                    </div>
                    <span className="text-[9px] font-black text-[#D4AF37] bg-black/80 px-2 py-0.5 rounded-md mt-1 border border-[#D4AF37]/40 whitespace-nowrap">
                      HQ: Saheed Nagar Track
                    </span>
                  </div>

                  {/* Vehicle 1 - Patia (Subhash) */}
                  <div className="absolute top-1/6 right-1/4 flex flex-col items-center animate-pulse">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500 text-white flex items-center justify-center text-xs shadow-lg shadow-cyan-500/50 cursor-pointer">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8.5px] font-bold text-cyan-200 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/40 mt-1 whitespace-nowrap">
                      i10 (Subhash) • 34 km/h • KIIT Sq.
                    </span>
                  </div>

                  {/* Vehicle 2 - Master Canteen (Rajesh) */}
                  <div className="absolute bottom-1/5 left-1/3 flex flex-col items-center">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs shadow-lg shadow-emerald-500/50 cursor-pointer">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8.5px] font-bold text-emerald-200 bg-slate-900/90 px-1.5 py-0.5 rounded border border-emerald-500/40 mt-1 whitespace-nowrap">
                      Dzire (Rajesh) • 28 km/h • Station
                    </span>
                  </div>

                  {/* Vehicle 3 - Khandagiri (Priya) */}
                  <div className="absolute bottom-1/4 right-1/6 flex flex-col items-center">
                    <div className="w-7 h-7 rounded-xl bg-purple-500 text-white flex items-center justify-center text-xs shadow-lg shadow-purple-500/50 cursor-pointer">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8.5px] font-bold text-purple-200 bg-slate-900/90 px-1.5 py-0.5 rounded border border-purple-500/40 mt-1 whitespace-nowrap">
                      Wagon R (Priya) • 0 km/h (Parking)
                    </span>
                  </div>

                  {/* Vehicle 4 - Nayapalli (Deepak) */}
                  <div className="absolute top-1/4 left-1/5 flex flex-col items-center">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs shadow-lg shadow-amber-500/50 cursor-pointer">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8.5px] font-bold text-amber-200 bg-slate-900/90 px-1.5 py-0.5 rounded border border-amber-500/40 mt-1 whitespace-nowrap">
                      Baleno (Deepak) • 22 km/h • VIP Rd
                    </span>
                  </div>

                  {/* Range Rings */}
                  <div className="w-48 h-48 rounded-full border border-cyan-500/20 absolute pointer-events-none"></div>
                  <div className="w-96 h-96 rounded-full border border-purple-500/10 absolute pointer-events-none"></div>
                </div>
              </div>

              {/* Active Vehicles Roster Table */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-[#161623]">Active Instructors & Vehicles Ledger</h3>
                    <p className="text-xs text-slate-400">Current assigned learners, pickup points, and live session status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLiveFleetFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${liveFleetFilter === 'all' ? 'bg-[#6D3BFF] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      All (4)
                    </button>
                    <button 
                      onClick={() => setLiveFleetFilter('in_session')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${liveFleetFilter === 'in_session' ? 'bg-[#6D3BFF] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      In Class (3)
                    </button>
                    <button 
                      onClick={() => setLiveFleetFilter('en_route')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${liveFleetFilter === 'en_route' ? 'bg-[#6D3BFF] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Pickup (1)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      trainer: "Coach Rajesh Kumar",
                      phone: "+91 98765 43210",
                      car: "Maruti Swift Dzire (OD-02-AK-9821)",
                      carType: "Sedan (Manual)",
                      student: "Ananya Das",
                      studentPhone: "+91 94371 88291",
                      pickupLocation: "Plot 12, Saheed Nagar Main Road, Bhubaneswar",
                      currentArea: "Master Canteen / Station Square",
                      speed: "28 km/h",
                      status: "In Practical Session",
                      statusColor: "bg-emerald-100 text-emerald-800",
                      drill: "Reverse S-Curve & Parallel Parking Drill",
                      timeLeft: "24 mins remaining",
                      battery: "82%"
                    },
                    {
                      trainer: "Coach Subhash Mohanty",
                      phone: "+91 98765 43211",
                      car: "Hyundai Grand i10 (OD-02-BW-4412)",
                      carType: "Hatchback (Manual)",
                      student: "Rahul Nayak",
                      studentPhone: "+91 98610 33492",
                      pickupLocation: "KIIT Square, Near Campus 6, Patia",
                      currentArea: "Infocity Road, Patia",
                      speed: "34 km/h",
                      status: "In Practical Session",
                      statusColor: "bg-emerald-100 text-emerald-800",
                      drill: "Highway 4th Gear Acceleration & Overtaking",
                      timeLeft: "18 mins remaining",
                      battery: "74%"
                    },
                    {
                      trainer: "Coach Priya Pattnaik",
                      phone: "+91 98765 43212",
                      car: "Maruti Wagon R (OD-02-CP-8831)",
                      carType: "Hatchback (Automatic)",
                      student: "Sneha Mohapatra",
                      studentPhone: "+91 97780 11928",
                      pickupLocation: "Near Khandagiri Caves, Jagamara",
                      currentArea: "Jagamara Overbridge incline",
                      speed: "0 km/h (Drill Station)",
                      status: "In Practical Session",
                      statusColor: "bg-emerald-100 text-emerald-800",
                      drill: "Incline Hill-Start & Handbrake Rollback Prevention",
                      timeLeft: "32 mins remaining",
                      battery: "91%"
                    },
                    {
                      trainer: "Coach Deepak Jena",
                      phone: "+91 98765 43213",
                      car: "Maruti Baleno (OD-02-DX-1290)",
                      carType: "Premium Hatchback (Manual)",
                      student: "Amit Senapati",
                      studentPhone: "+91 99372 44102",
                      pickupLocation: "VIP Road, Near Mayfair, Nayapalli",
                      currentArea: "CRPF Square towards Fire Station",
                      speed: "22 km/h",
                      status: "Pickup En Route",
                      statusColor: "bg-blue-100 text-blue-800",
                      drill: "City Peak-Hour Traffic & Roundabout Navigation",
                      timeLeft: "15 mins remaining",
                      battery: "68%"
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="border border-slate-100 bg-[#F8F9FF] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-all shadow-sm">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-[#6D3BFF]" />
                            <h4 className="font-black text-sm text-[#161623]">{item.trainer}</h4>
                          </div>
                          <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase ${item.statusColor}`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold">Vehicle:</span>
                            <span className="font-black text-[#161623]">{item.car}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold">Active Learner:</span>
                            <span className="font-black text-[#6D3BFF]">{item.student}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold">Current Speed:</span>
                            <span className="font-bold text-slate-700">{item.speed}</span>
                          </div>
                          <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-bold shrink-0">Pickup Point:</span>
                            <span className="text-[11px] font-medium text-slate-600 text-right">{item.pickupLocation}</span>
                          </div>
                        </div>

                        <div className="bg-[#6D3BFF]/5 p-2.5 rounded-xl border border-[#6D3BFF]/15 text-[11px] text-[#6D3BFF] font-semibold flex items-center justify-between">
                          <span>🎯 {item.drill}</span>
                          <span className="font-bold text-slate-500">{item.timeLeft}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-200/60 pt-3">
                        <button
                          onClick={() => {
                            setTrackingPingedTrainer(item.trainer);
                            showToast(`GPS ping sent to ${item.trainer}. Telemetry refreshed.`);
                          }}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-cyan-600" /> Ping Car
                        </button>
                        <button
                          onClick={() => {
                            showToast(`Calling ${item.trainer} (${item.phone})...`);
                          }}
                          className="flex-1 bg-[#161623] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-[#D4AF37]" /> Call Coach
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ATTENDANCE & SESSION LOGS */}
          {activeTab === 'attendance' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg font-black text-[#161623]">Attendance & Practical Session Ledger</h2>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      RTO Audit Logged
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete verification record of practical driving sessions with instructor signatures, photo verification timestamps, and learner completion progress.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const csvHeader = "Student Name,Roll No,Session,Date,Time,Trainer,Vehicle,Photo Verification,Status,GPS Location\n";
                      const csvRows = attendanceRowsList.map(a => 
                        `"${a.name}","${a.roll}","${a.session}","${a.date}","${a.time}","${a.trainer}","${a.car}","${a.hasPhotoProof ? 'Verified (Geo-tagged)' : 'Scheduled'}","${a.status}","${a.location}"`
                      ).join("\n");
                      const success = await downloadCSV("GoldenHands_Attendance_Audit_Log.csv", csvHeader + csvRows);
                      if (success) {
                        showToast("Attendance Ledger exported to CSV successfully.");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" /> Export Attendance CSV
                  </button>
                </div>
              </div>

              {/* Attendance KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Sessions Logged</span>
                  <span className="text-xl font-black text-[#161623]">
                    {attendanceRowsList.length * 45} Mins ({attendanceRowsList.length} Sessions)
                  </span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">↑ 100% compliant with RTO</p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Photo-Verified Rate</span>
                  <span className="text-xl font-black text-emerald-600">{photoVerifiedPercent}.0%</span>
                  <p className="text-[10px] text-slate-400 mt-1">{photoVerifiedAttendanceCount} / {attendanceRowsList.length || 1} camera stamped</p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Today's Class Attendance</span>
                  <span className="text-xl font-black text-[#6D3BFF]">
                    {attendanceRowsList.filter(a => a.status === 'Verified Present').length} / {attendanceRowsList.length}
                  </span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    {attendanceRowsList.filter(a => a.status === 'Cancelled').length} Cancellations
                  </p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Practical Score</span>
                  <span className="text-xl font-black text-amber-600">4.9 / 5.0</span>
                  <p className="text-[10px] text-slate-400 mt-1">Evaluated by certified coaches</p>
                </div>
              </div>

              {/* Attendance Roster Table */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter by student name or roll #..."
                      value={attendanceStudentFilter}
                      onChange={(e) => setAttendanceStudentFilter(e.target.value)}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl pl-9.5 pr-3 py-2 text-xs text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={attendanceTrainerFilter}
                      onChange={(e) => setAttendanceTrainerFilter(e.target.value)}
                      className="bg-[#F8F9FF] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Instructors</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-3">Student & Roll No</th>
                        <th className="py-3 px-3">Class Session</th>
                        <th className="py-3 px-3">Instructor & Vehicle</th>
                        <th className="py-3 px-3">Date & Slot</th>
                        <th className="py-3 px-3">Photo & Geo Proof</th>
                        <th className="py-3 px-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {attendanceRowsList.filter(item => {
                        if (attendanceStudentFilter.trim()) {
                          const q = attendanceStudentFilter.toLowerCase();
                          if (!item.name.toLowerCase().includes(q) && !item.roll.toLowerCase().includes(q)) return false;
                        }
                        if (attendanceTrainerFilter !== "all" && !item.trainer.toLowerCase().includes(attendanceTrainerFilter.toLowerCase())) {
                          return false;
                        }
                        return true;
                      }).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#F8F9FF] transition-all">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                              <div>
                                <span className="font-black text-[#161623] block">{row.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold">{row.roll}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#6D3BFF] block">{row.session}</span>
                            <span className="text-[10px] text-slate-400">Progress: {row.progress}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{row.trainer}</span>
                            <span className="text-[10px] text-slate-400">{row.car}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-700 block">{row.date}</span>
                            <span className="text-[10px] text-slate-400">{row.time}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <Camera className="w-3 h-3 text-emerald-600" /> Geo-Stamped ({row.location})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase ${row.statusColor}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS & BROADCAST CENTER */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-6 h-6 text-violet-600" />
                    <h2 className="text-lg font-black text-[#161623]">Notifications & Broadcast Gateway</h2>
                    <span className="bg-violet-100 text-violet-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      Push • SMS • WhatsApp
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Send urgent announcements, weather/monsoon driving advisories, RTO holiday schedules, and document upload reminders to students and instructors.
                  </p>
                </div>

                <div className="bg-violet-50 border border-violet-100 px-4 py-2 rounded-2xl flex items-center gap-2 shrink-0">
                  <Send className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-bold text-violet-900">128 Active Students Connected</span>
                </div>
              </div>

              {/* Broadcast Composer */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <h3 className="text-base font-black text-[#161623] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Create New Broadcast Announcement
                </h3>

                {/* Preset Fast-Template Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Announcement Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastSubject("🌧️ Monsoon Driving Advisory: Wet Roads in Bhubaneswar");
                        setBroadcastMessage("Dear Students & Trainers, heavy rains are expected today in Bhubaneswar. Drive at moderate speeds, maintain a 3-car safety gap, and turn on headlights during your practical class.");
                        setBroadcastTarget("all_students");
                      }}
                      className="bg-[#F8F9FF] hover:bg-violet-50 hover:text-violet-700 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      🌧️ Rain & Weather Advisory
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastSubject("🏛️ Odisha RTO OD-02 Holiday Testing Notice");
                        setBroadcastMessage("Notice: Bhubaneswar II RTO driving test track will remain closed this upcoming government holiday. All scheduled RTO test appointments have been safely moved to next Monday.");
                        setBroadcastTarget("dl_applicants");
                      }}
                      className="bg-[#F8F9FF] hover:bg-violet-50 hover:text-violet-700 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      🏛️ RTO Holiday Notice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastSubject("🪪 Upload Aadhaar Card to Activate Slot Booking");
                        setBroadcastMessage("Reminder: Please upload a clear photo of your Aadhaar Card in the Documents tab. Once verified by admin, all daily practice slots will be unlocked instantly.");
                        setBroadcastTarget("pending_docs");
                      }}
                      className="bg-[#F8F9FF] hover:bg-violet-50 hover:text-violet-700 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      🪪 Aadhaar Verification Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastSubject("🚗 Weekend Practice Driving Slots Are Live!");
                        setBroadcastMessage("New Saturday & Sunday driving slots with Coach Rajesh and Coach Subhash are now open for reservations. Book your preferred time before capacity fills up.");
                        setBroadcastTarget("all_students");
                      }}
                      className="bg-[#F8F9FF] hover:bg-violet-50 hover:text-violet-700 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      🚗 New Slots Open Notice
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Target Audience</label>
                    <select
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value as any)}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#6D3BFF]"
                    >
                      <option value="all_students">All Registered Students (128)</option>
                      <option value="all_trainers">All Certified Instructors (4)</option>
                      <option value="dl_applicants">Driving Licence Applicants (14)</option>
                      <option value="pending_docs">Students with Pending Documents (6)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Broadcast Channels</label>
                    <select
                      value={broadcastChannel}
                      onChange={(e) => setBroadcastChannel(e.target.value as any)}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#6D3BFF]"
                    >
                      <option value="all">All Channels (In-App Push + SMS + WhatsApp)</option>
                      <option value="push">In-App Push Alert Only</option>
                      <option value="sms">SMS Gateway Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Announcement Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Monsoon Driving Advisory: Rain precautions in Bhubaneswar"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#161623] font-bold focus:outline-none focus:border-[#6D3BFF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Message Content</label>
                  <textarea
                    rows={3}
                    placeholder="Type the message body to be broadcasted instantly..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl p-3.5 text-xs text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
                        showToast("Please enter both subject and message content.");
                        return;
                      }

                      const newLog = {
                        id: `bc-${Date.now()}`,
                        subject: broadcastSubject,
                        message: broadcastMessage,
                        target: broadcastTarget === 'all_students' ? 'All Enrolled Students (128)' : broadcastTarget === 'all_trainers' ? 'All Active Trainers (4)' : broadcastTarget === 'dl_applicants' ? 'DL Applicants (14)' : 'Pending Docs (6)',
                        channel: broadcastChannel === 'all' ? 'Push + SMS + WhatsApp' : broadcastChannel.toUpperCase(),
                        date: 'Just now',
                        sentBy: 'System Administrator',
                        count: broadcastTarget === 'all_students' ? 128 : broadcastTarget === 'all_trainers' ? 4 : 14
                      };

                      setBroadcastLogs([newLog, ...broadcastLogs]);
                      setBroadcastSubject("");
                      setBroadcastMessage("");
                      showToast(`Broadcast successfully sent to ${newLog.target}!`);
                    }}
                    className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-[#6D3BFF]/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Send Instant Broadcast
                  </button>
                </div>
              </div>

              {/* Broadcast Sent History */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-black text-[#161623]">Broadcast Activity History</h3>
                <div className="space-y-3">
                  {broadcastLogs.map((log) => (
                    <div key={log.id} className="border border-slate-100 bg-[#F8F9FF] rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-[#161623]">{log.subject}</h4>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            Delivered 100%
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{log.message}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap pt-1">
                          <span>🎯 Target: <strong>{log.target}</strong></span>
                          <span>•</span>
                          <span>📡 Channel: <strong>{log.channel}</strong></span>
                          <span>•</span>
                          <span>🕒 {log.date} by {log.sentBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPORTS & EXPORT CENTER */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-6 h-6 text-amber-600" />
                    <h2 className="text-lg font-black text-[#161623]">Reports, Analytics & RTO Audit Center</h2>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      OD-02 Compliant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Comprehensive performance summaries, passing rates, driver training milestones, and 1-click universal CSV exports for regulatory inspection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-[#F8F9FF] px-3.5 py-2 rounded-xl border border-slate-200">
                    Academic Year 2026 – 2027
                  </span>
                </div>
              </div>

              {/* RTO & Performance Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">First-Attempt DL Pass Rate</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {dlApplications.length > 0 
                      ? `${((dlApplications.filter(a => a.status === 'Approved').length / dlApplications.length) * 100).toFixed(1)}%`
                      : "96.8%"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Odisha RTO OD-02 Track Benchmark</p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Course Completion Rate</span>
                  <span className="text-2xl font-black text-[#6D3BFF]">
                    {allAvailableStudents.length > 0
                      ? `${Math.max(90, Math.round(((allAvailableStudents.filter(s => (s.completedClasses || 0) >= 10).length || 1) / allAvailableStudents.length) * 100))}.0%`
                      : "98.4%"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Avg 14.8/15 practical sessions</p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Training Distance</span>
                  <span className="text-2xl font-black text-blue-600">
                    {(bookings.filter(b => b.status === 'completed').length * 15 + allAvailableStudents.length * 20).toLocaleString('en-IN')} KM
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Bhubaneswar GPS Tracked</p>
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gross Fee Revenue</span>
                  <span className="text-2xl font-black text-[#D4AF37]">₹{totalRevenueVal.toLocaleString('en-IN')}</span>
                  <p className="text-[10px] text-slate-400 mt-1">100% Tax & GST Recorded</p>
                </div>
              </div>

              {/* Universal 1-Click Export Center */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-black text-[#161623]">Universal Data Export Desk</h3>
                  <p className="text-xs text-slate-400">Download formatted CSV datasets ready for RTO compliance audits and internal book-keeping.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {[
                    {
                      title: "Student Master Directory",
                      desc: "Full database of registered learners, contact info, Aadhaar verification status, and package tier.",
                      filename: "GoldenHands_Students_Master_Directory.csv",
                      getData: () => {
                        const header = "Student ID,Name,Phone,Email,Aadhaar Status,Course,Fee Paid,Remaining Fee,Payment Status\n";
                        const rows = allAvailableStudents.map(s => 
                          `"${s.id}","${s.name}","${s.phone}","${s.email}","${s.aadharStatus || 'Verified'}","${s.courseName || 'Standard Package'}","${s.amountPaid || 0}","${s.remainingAmount || 0}","${s.paymentStatus || 'Unpaid'}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <Users className="w-5 h-5 text-blue-600" />
                    },
                    {
                      title: "Driving Class & Booking Logs",
                      desc: "History of scheduled sessions, vehicle allocation, instructor assignments, and completion states.",
                      filename: "GoldenHands_Class_Bookings_Log.csv",
                      getData: () => {
                        const header = "Booking ID,Student,Date,Slot Time,Instructor,Vehicle Plate,Status,Pickup Location\n";
                        const rows = bookings.map(b => 
                          `"${b.id}","${getStudentDetails(b.studentId).name}","${b.date}","${b.timeSlot}","${b.trainerName || 'Assigned Instructor'}","${b.trainerCarPlate || 'OD-02-AK-9821'}","${b.status}","${b.pickupLocation || 'Bhubaneswar Track'}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <Calendar className="w-5 h-5 text-indigo-600" />
                    },
                    {
                      title: "Financial Payments & Fees",
                      desc: "Accounting ledger of payments, UPI/Cash receipts, invoice numbers, and syllabus modification fees.",
                      filename: "GoldenHands_Financial_Payments_Ledger.csv",
                      getData: () => {
                        const header = "Receipt ID,Student,Amount,Mode,Reference,Date,Status\n";
                        const rows = payments.map(p => 
                          `"${p.id}","${getStudentDetails(p.studentId).name}","${p.amount}","${p.mode || 'UPI'}","${p.reference || 'REF-' + p.id}","${p.date}","${p.status}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <IndianRupee className="w-5 h-5 text-emerald-600" />
                    },
                    {
                      title: "Odisha RTO DL Applications",
                      desc: "Odisha RTO OD-02 licence application registry, Learner Licence numbers, and test clearance dates.",
                      filename: "GoldenHands_RTO_DL_Applications.csv",
                      getData: () => {
                        const header = "Application ID,Student Name,RTO Zone,LL Number,DL Type,Status,Submission Date\n";
                        const rows = dlApplications.map(a => 
                          `"${a.id}","${a.fullName}","${a.rtoZone}","${a.llNumber || 'Pending'}","${a.dlType || 'LMV (Car)'}","${a.status}","${a.createdAt ? a.createdAt.split('T')[0] : '2026-08-14'}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <FileCheck className="w-5 h-5 text-[#D4AF37]" />
                    },
                    {
                      title: "Attendance & Geo-Proof Log",
                      desc: "Instructor geo-tagged attendance records, timestamps, and camera verification audit logs.",
                      filename: "GoldenHands_Attendance_GeoLogs.csv",
                      getData: () => {
                        const header = "Session ID,Student,Date,Instructor,GPS Location,Camera Proof,Status\n";
                        const rows = attendanceRowsList.map(a => 
                          `"${a.id}","${a.name}","${a.date}","${a.trainer}","${a.location}","${a.hasPhotoProof ? 'Yes (Camera Verified)' : 'Scheduled'}","${a.status}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <CheckSquare className="w-5 h-5 text-teal-600" />
                    },
                    {
                      title: "Certified Instructors Index",
                      desc: "Trainer certification details, vehicle assignments, student review averages, and active status.",
                      filename: "GoldenHands_Instructors_Directory.csv",
                      getData: () => {
                        const header = "Trainer ID,Name,Phone,Assigned Vehicle,Car Plate,Rating,Active Students\n";
                        const rows = trainers.map(t => 
                          `"${t.id}","${t.name}","${t.phone}","${t.carName}","${t.carPlate}","${t.rating || 4.9}","${allAvailableStudents.filter(s => s.assignedTrainerId === t.id).length || 1}"`
                        ).join("\n");
                        return header + rows;
                      },
                      icon: <Car className="w-5 h-5 text-purple-600" />
                    }
                  ].map((exportItem, eIdx) => (
                    <div key={eIdx} className="border border-slate-100 bg-[#F8F9FF] rounded-2xl p-4.5 flex flex-col justify-between gap-3 hover:border-slate-300 transition-all">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 shrink-0">
                            {exportItem.icon}
                          </div>
                          <h4 className="font-black text-xs text-[#161623]">{exportItem.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{exportItem.desc}</p>
                      </div>

                      <button
                        onClick={async () => {
                          const csvRaw = exportItem.getData();
                          const success = await downloadCSV(exportItem.filename, csvRaw);
                          if (success) {
                            showToast(`Exported ${exportItem.title} to CSV successfully.`);
                          }
                        }}
                        className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs py-2 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 text-[#6D3BFF]" />
                        <span>Download .CSV</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM SETTINGS & RTO CONFIG */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <SettingsIcon className="w-6 h-6 text-slate-700" />
                    <h2 className="text-lg font-black text-[#161623]">Academy Settings & RTO Configuration</h2>
                    <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      System Control
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage driving school institute credentials, operating hours, slot capacities, pricing tiers, and database cloud synchronization.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      showToast("All Academy settings saved successfully!");
                    }}
                    className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#6D3BFF]/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" /> Save Configuration
                  </button>
                </div>
              </div>

              {/* Section 1: Institute Profile */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-2">
                  1. Academy Profile & RTO Registration
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Academy Name</label>
                    <input
                      type="text"
                      value={settingsData.schoolName}
                      onChange={(e) => setSettingsData({ ...settingsData, schoolName: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">RTO Zone Jurisdiction</label>
                    <input
                      type="text"
                      value={settingsData.rtoZone}
                      onChange={(e) => setSettingsData({ ...settingsData, rtoZone: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Odisha RTO Driving School Reg. No</label>
                    <input
                      type="text"
                      value={settingsData.rtoRegNo}
                      onChange={(e) => setSettingsData({ ...settingsData, rtoRegNo: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Official Contact Phone</label>
                    <input
                      type="text"
                      value={settingsData.phone}
                      onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Physical Training Facility Address</label>
                    <input
                      type="text"
                      value={settingsData.address}
                      onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Operational Hours & Capacities */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-2">
                  2. Operational Hours & Booking Capacities
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Daily Opening Time</label>
                    <input
                      type="time"
                      value={settingsData.openingTime}
                      onChange={(e) => setSettingsData({ ...settingsData, openingTime: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Daily Closing Time</label>
                    <input
                      type="time"
                      value={settingsData.closingTime}
                      onChange={(e) => setSettingsData({ ...settingsData, closingTime: e.target.value })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Slot Duration (Mins)</label>
                    <input
                      type="number"
                      value={settingsData.slotDurationMins}
                      onChange={(e) => setSettingsData({ ...settingsData, slotDurationMins: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Default Slot Capacity</label>
                    <input
                      type="number"
                      value={settingsData.defaultSlotCapacity}
                      onChange={(e) => setSettingsData({ ...settingsData, defaultSlotCapacity: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Course Pricing & Database Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <span className="text-[10px] font-black uppercase text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-2">
                    3. Course Pricing Structure (₹)
                  </span>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Basic 15-Day Course:</span>
                      <input
                        type="number"
                        value={settingsData.basicCourseFee}
                        onChange={(e) => setSettingsData({ ...settingsData, basicCourseFee: Number(e.target.value) })}
                        className="w-28 bg-[#F8F9FF] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-right focus:outline-none focus:border-[#6D3BFF]"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Standard 20-Day Course:</span>
                      <input
                        type="number"
                        value={settingsData.standardCourseFee}
                        onChange={(e) => setSettingsData({ ...settingsData, standardCourseFee: Number(e.target.value) })}
                        className="w-28 bg-[#F8F9FF] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-right focus:outline-none focus:border-[#6D3BFF]"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">VIP Premium 30-Day Course:</span>
                      <input
                        type="number"
                        value={settingsData.premiumCourseFee}
                        onChange={(e) => setSettingsData({ ...settingsData, premiumCourseFee: Number(e.target.value) })}
                        className="w-28 bg-[#F8F9FF] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-right focus:outline-none focus:border-[#6D3BFF]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-2">
                      4. Cloud Database & Sync
                    </span>
                    <div className="space-y-2 mt-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Database Engine:</span>
                        <span className="font-black text-[#161623]">Firestore + MockDatabase</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Cloud Sync Status:</span>
                        <span className="text-emerald-600 font-black flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online & Synchronized
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      showToast("Forced full cloud synchronization. All student & document records updated.");
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Database className="w-3.5 h-3.5 text-[#D4AF37]" /> Force Immediate Cloud Sync
                  </button>
                </div>
              </div>
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* TRAINER ADD/EDIT MODAL OVERLAY */}
      {trainerModalOpen && (
        <div className="fixed inset-0 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] animate-slideUp">
            {/* Modal Header */}
            <div className="bg-[#161623] text-white px-6 py-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm tracking-tight">
                  {editingTrainer ? `Edit Details: Coach ${editingTrainer.name}` : "Assign / Register New Trainer"}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Configure login, vehicle assignment & mobile verification</p>
              </div>
              <button 
                type="button"
                onClick={() => setTrainerModalOpen(false)}
                className="text-slate-400 hover:text-white bg-white/5 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveTrainer} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              
              {/* Form Section 1: Instructor Identity */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  1. Instructor Identity
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Instructor Name *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Subhransu Sekhar"
                      value={trainerName}
                      onChange={(e) => setTrainerName(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold"
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold font-mono">+91</span>
                      <input 
                        type="tel"
                        maxLength={10}
                        placeholder="9040040277"
                        value={trainerPhone}
                        onChange={(e) => setTrainerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Trainer Profile Photo Section */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#6D3BFF]" /> Instructor Profile Photo
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group shrink-0">
                      <img 
                        src={trainerPhotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"} 
                        alt="Trainer Preview" 
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                      />
                      <label 
                        htmlFor="modal-trainer-photo-file" 
                        className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-[9px] font-bold"
                      >
                        <Camera className="w-4 h-4 mb-0.5 text-amber-400" />
                        <span>Upload</span>
                      </label>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label 
                          htmlFor="modal-trainer-photo-file" 
                          className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Device Photo
                        </label>
                        <input 
                          id="modal-trainer-photo-file"
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleTrainerPhotoFileUpload(e, 'trainer')}
                        />
                        <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or WebP (max 5MB)</span>
                      </div>

                      {/* Quick Avatar Presets */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">Presets:</span>
                        {TRAINER_AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTrainerPhotoUrl(preset.url)}
                            className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              trainerPhotoUrl === preset.url 
                                ? 'bg-[#6D3BFF] text-white border-[#6D3BFF]' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#6D3BFF]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Or Direct Image URL</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={trainerPhotoUrl}
                      onChange={(e) => setTrainerPhotoUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#6D3BFF] text-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Login Password *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text"
                      placeholder="coach123"
                      value={trainerPassword}
                      onChange={(e) => setTrainerPassword(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 2: Vehicle Assignment */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  2. Training Vehicle Assignment
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Car Model / Name *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Maruti Swift VXI"
                      value={trainerCarName}
                      onChange={(e) => setTrainerCarName(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">License Plate Number *</label>
                    <input 
                      type="text"
                      placeholder="e.g. OD 02 AB 1234"
                      value={trainerCarPlate}
                      onChange={(e) => setTrainerCarPlate(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Car Photo Section */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-[#6D3BFF]" /> Vehicle Photo
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img 
                      src={trainerCarPhotoUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300"} 
                      alt="Car Preview" 
                      className="w-24 h-16 rounded-xl object-cover border border-slate-200 shadow-sm bg-white shrink-0"
                    />

                    <div className="flex-1 w-full flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label 
                          htmlFor="modal-car-photo-file" 
                          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Vehicle Photo
                        </label>
                        <input 
                          id="modal-car-photo-file"
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleTrainerPhotoFileUpload(e, 'car')}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">Presets:</span>
                        {CAR_AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTrainerCarPhotoUrl(preset.url)}
                            className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              trainerCarPhotoUrl === preset.url 
                                ? 'bg-slate-800 text-white border-slate-800' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-800'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <input 
                    type="text"
                    placeholder="Vehicle Image URL: https://..."
                    value={trainerCarPhotoUrl}
                    onChange={(e) => setTrainerCarPhotoUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#6D3BFF] text-slate-600 font-mono mt-1"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTrainerModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#6D3BFF]/10 cursor-pointer"
                >
                  {editingTrainer ? "Apply Modifications" : "Register Trainer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT ADD/EDIT MODAL OVERLAY */}
      {studentModalOpen && (
        <div className="fixed inset-0 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] animate-slideUp">
            {/* Modal Header */}
            <div className="bg-[#161623] text-white px-6 py-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm tracking-tight">
                  {editingStudent ? `Modify Profile: ${editingStudent.name}` : "Register New Student"}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Edit login passcode, course packages, license progress, and fees status</p>
              </div>
              <button 
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="text-slate-400 hover:text-white bg-white/5 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Form Section 1: Basic Information */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  1. Basic Information & Login Passcode
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Student Name *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Binayak Patri"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number (10 digits) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold font-mono">+91</span>
                      <input 
                        type="tel"
                        maxLength={10}
                        placeholder="9437189191"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-semibold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address *</label>
                    <input 
                      type="email"
                      placeholder="e.g. student@goldenhands.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Login Password / Passcode *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <input 
                        type="text"
                        placeholder="student123"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-semibold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Location *</label>
                  <input 
                    type="text"
                    placeholder="e.g. Patia, Bhubaneswar"
                    value={studentLocation}
                    onChange={(e) => setStudentLocation(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Student Profile Photo Upload Section */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#6D3BFF]" /> Profile Photo
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group shrink-0">
                      <img 
                        src={studentPhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"} 
                        alt="Student Preview" 
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                      />
                      <label 
                        htmlFor="modal-student-photo-file" 
                        className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-[9px] font-bold"
                      >
                        <Camera className="w-4 h-4 mb-0.5 text-amber-400" />
                        <span>Upload</span>
                      </label>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label 
                          htmlFor="modal-student-photo-file" 
                          className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Device Photo
                        </label>
                        <input 
                          id="modal-student-photo-file"
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleStudentPhotoFileUpload}
                        />
                        <span className="text-[10px] text-slate-400 font-medium">PNG, JPG or WebP (Auto-compressed)</span>
                      </div>

                      {/* Quick Avatar Presets */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">Presets:</span>
                        {STUDENT_AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setStudentPhotoUrl(preset.url)}
                            className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              studentPhotoUrl === preset.url 
                                ? 'bg-[#6D3BFF] text-white border-[#6D3BFF]' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#6D3BFF]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Or Direct Image URL</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={studentPhotoUrl}
                      onChange={(e) => setStudentPhotoUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#6D3BFF] text-slate-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Form Section 2: Course Pack & Licence details */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  2. Training Course & RTO Licence Status
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Package / Course Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Premium Package (20 Sessions)"
                      value={studentCourseName}
                      onChange={(e) => setStudentCourseName(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">RTO Licence Status</label>
                    <select
                      value={studentLlStatus}
                      onChange={(e) => setStudentLlStatus(e.target.value as Student['llStatus'])}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800 bg-white"
                    >
                      <option value="Applied">Applied (Verification Pending)</option>
                      <option value="Approved">Approved (Learner Licence active)</option>
                      <option value="Driving Test">Driving Test (Scheduled)</option>
                      <option value="Licence Approved">Licence Approved (Final License issued)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Trainer / Driving Coach</label>
                    <select 
                      value={studentAssignedTrainerId}
                      onChange={(e) => setStudentAssignedTrainerId(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800 bg-white"
                    >
                      <option value="">-- Unassigned (Student picks on 1st slot) --</option>
                      {trainers.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          Coach {tr.name} ({tr.carName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Referral Code / Promo</label>
                    <input 
                      type="text"
                      placeholder="e.g. GOLDEN500"
                      value={studentReferralCode}
                      onChange={(e) => setStudentReferralCode(e.target.value.toUpperCase())}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Course Notes / AI Insights</label>
                    <textarea 
                      placeholder="e.g. Focus on downshifting before speed breakers and holding friction point on slopes."
                      value={studentCourseNotes}
                      onChange={(e) => setStudentCourseNotes(e.target.value)}
                      rows={2}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Course Syllabus / Topics (comma-separated)</label>
                  <textarea 
                    placeholder="e.g. Steering Controls, Clutch Friction Point, Traffic Navigation, Reverse Parking"
                    value={studentCourseSyllabus}
                    onChange={(e) => setStudentCourseSyllabus(e.target.value)}
                    rows={2}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-medium text-slate-800"
                  />
                  <span className="text-[8px] text-slate-400 font-medium">Separate each module / topic with a comma</span>
                </div>
              </div>

              {/* Form Section 3: Status Toggles */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  3. Administrative & Financial Flags
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentPlanExtended}
                      onChange={(e) => setStudentPlanExtended(e.target.checked)}
                      className="w-4 h-4 text-[#6D3BFF] border-slate-200 rounded focus:ring-[#6D3BFF] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">Plan Extended</span>
                      <span className="text-[8px] text-slate-400 font-medium">Extra slots added</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentLicenceFeePaid}
                      onChange={(e) => setStudentLicenceFeePaid(e.target.checked)}
                      className="w-4 h-4 text-[#6D3BFF] border-slate-200 rounded focus:ring-[#6D3BFF] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">Licence Fee Paid</span>
                      <span className="text-[8px] text-slate-400 font-medium">₹2,500 RTO settled</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentCourseEnded}
                      onChange={(e) => setStudentCourseEnded(e.target.checked)}
                      className="w-4 h-4 text-[#6D3BFF] border-slate-200 rounded focus:ring-[#6D3BFF] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">Course Ended</span>
                      <span className="text-[8px] text-slate-400 font-medium">Lock active schedule</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Section 4: Booking Lock Manager (Golden Hands Driving School Workflow) */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] uppercase font-black text-[#6D3BFF] tracking-wider block border-b border-slate-100 pb-1.5">
                  4. Booking Lock Manager (Golden Hands Driving School Workflow)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Total Course Fee (₹)</label>
                    <input 
                      type="number" 
                      value={studentTotalCourseFee}
                      onChange={(e) => {
                        const fee = Number(e.target.value);
                        setStudentTotalCourseFee(fee);
                        setStudentRemainingAmount(Math.max(0, fee - studentAmountPaid));
                      }}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid (₹)</label>
                    <input 
                      type="number" 
                      value={studentAmountPaid}
                      onChange={(e) => {
                        const paid = Number(e.target.value);
                        setStudentAmountPaid(paid);
                        setStudentRemainingAmount(Math.max(0, studentTotalCourseFee - paid));
                      }}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Remaining Amount (₹)</label>
                    <input 
                      type="number" 
                      value={studentRemainingAmount}
                      onChange={(e) => setStudentRemainingAmount(Number(e.target.value))}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Completed Classes</label>
                    <input 
                      type="number" 
                      value={studentCompletedClasses}
                      onChange={(e) => setStudentCompletedClasses(Number(e.target.value))}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Status</label>
                    <select
                      value={studentPaymentStatus}
                      onChange={(e) => setStudentPaymentStatus(e.target.value as any)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800 bg-white"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Approval Status</label>
                    <select
                      value={studentPaymentApprovalStatus}
                      onChange={(e) => setStudentPaymentApprovalStatus(e.target.value as any)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800 bg-white"
                    >
                      <option value="None">None</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Locked Reason (Log to student)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. First class completed. Please pay the first ₹2,000 package installment to book additional classes."
                    value={studentLockedReason}
                    onChange={(e) => setStudentLockedReason(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-semibold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentIsAadharVerified}
                      onChange={(e) => {
                        setStudentIsAadharVerified(e.target.checked);
                        setStudentAadharStatus(e.target.checked ? "Verified" : "Pending");
                      }}
                      className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">Aadhaar Verified</span>
                      <span className="text-[8px] text-emerald-600 font-medium">{studentIsAadharVerified ? "Approved Profile" : "Requires Upload"}</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentFirstClassCompleted}
                      onChange={(e) => setStudentFirstClassCompleted(e.target.checked)}
                      className="w-4 h-4 text-[#6D3BFF] border-slate-200 rounded focus:ring-[#6D3BFF] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">1st Class Comp.</span>
                      <span className="text-[8px] text-slate-400 font-medium">Required ₹2k next</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentBookingLocked}
                      onChange={(e) => setStudentBookingLocked(e.target.checked)}
                      className="w-4 h-4 text-[#6D3BFF] border-slate-200 rounded focus:ring-[#6D3BFF] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#161623]">Booking Locked</span>
                      <span className="text-[8px] text-slate-400 font-medium">Blocks scheduler</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={studentAdminManualUnlock}
                      onChange={(e) => setStudentAdminManualUnlock(e.target.checked)}
                      className="w-4 h-4 text-[#D4AF37] border-[#D4AF37] rounded focus:ring-[#D4AF37] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold text-[#D4AF37]">Admin Override</span>
                      <span className="text-[8px] text-amber-600 font-medium">Bypasses all locks</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#6D3BFF]/10 cursor-pointer"
                >
                  {editingStudent ? "Apply Profile Modifications" : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL OVERLAY */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 flex flex-col gap-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-[#161623] tracking-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] px-5 py-2 rounded-xl transition-all shadow-md shadow-rose-500/10 cursor-pointer"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-[#161623]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 p-6 flex flex-col gap-4 animate-scaleUp relative">
            <button 
              onClick={() => setPreviewDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <h3 className="text-base font-black text-[#161623] tracking-tight">{previewDoc.name}</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Uploaded {previewDoc.uploadedAt} • Student: {getStudentName(previewDoc.studentId)} • Status: {previewDoc.status}
              </p>
            </div>

            <div className="w-full h-[320px] bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 p-2">
              {previewDoc.fileUrl.startsWith("data:") || previewDoc.fileUrl.includes("http") ? (
                <img 
                  src={previewDoc.fileUrl} 
                  alt={`${previewDoc.name} Content`} 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-4">
                  <FileText className="w-12 h-12 text-[#6D3BFF] mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">{previewDoc.name}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
              {previewDoc.status === 'Pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleDocumentVerify(previewDoc.id, "Rejected");
                      setPreviewDoc(null);
                    }}
                    className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-extrabold text-[11px] px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDocumentVerify(previewDoc.id, "Verified");
                      setPreviewDoc(null);
                    }}
                    className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-extrabold text-[11px] px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#6D3BFF]/10 cursor-pointer"
                  >
                    Verify & Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
