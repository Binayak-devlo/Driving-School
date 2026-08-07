import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, Calendar, FileText, IndianRupee, ShieldCheck, UserCheck, Car, Star, 
  Download, RefreshCw, Trash2, Search, Check, X, AlertTriangle, TrendingUp, BarChart2,
  Plus, Edit, KeyRound, Lock, LogOut, Eye, ArrowLeft, ChevronRight, Clock, UserX, AlertCircle, ShieldAlert
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line
} from "recharts";
import { MockDatabase } from "../utils/db";
import { Student, Trainer, Booking, Document, Payment, SkillProgress, Review, SlotDay, NavState } from "../types";
import UnifiedAuthPortal from "./UnifiedAuthPortal";

interface AdminDashboardProps {
  onStateChange: () => void; // Sync state changes
  onLogout?: () => void;
  navState?: NavState;
  key?: any;
}

export default function AdminDashboard({ onStateChange, onLogout, navState }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'students' | 'trainers' | 'bookings' | 'documents' | 'payments' | 'feedback' | 'approvals' | 'slots' | 'deletions'>(() => {
    if (navState && navState.activeView === 'admin' && navState.adminTab) {
      return navState.adminTab as any;
    }
    return 'analytics';
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    if (navState && navState.activeView === 'admin' && navState.adminLoggedIn !== undefined) {
      return navState.adminLoggedIn;
    }
    return localStorage.getItem("golden_hands_admin_logged_in") === "true";
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
    if (navState && navState.activeView === 'admin') {
      const matchesParent = 
        isAdminLoggedIn === navState.adminLoggedIn &&
        activeTab === navState.adminTab &&
        (previewDoc?.id || null) === (navState.adminPreviewDocId || null);
      
      if (matchesParent) {
        return; // Already in sync with parent, do not report!
      }
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
    };
    window.addEventListener("db-updated", handleDbUpdated);
    return () => window.removeEventListener("db-updated", handleDbUpdated);
  }, []);

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
    if (targetDoc && status === "Verified") {
      if (targetDoc.name === "Learner Licence") {
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

  // CSV Mock download
  const handleExportCSV = (dataset: string) => {
    showToast(`Exported ${dataset} records to CSV format. Check your browser downloads!`);
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
      adminManualUnlock: studentAdminManualUnlock
    };

    MockDatabase.saveStudent(updatedStudent, targetId);
    
    setStudents(MockDatabase.getRegisteredStudents());
    setStudent(MockDatabase.getStudent());
    onStateChange();
    setStudentModalOpen(false);
    showToast(`Successfully saved student profile for ${studentName}`);
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
    // Base historical realistic data for Jan-Jun
    const monthlyMap: { [month: string]: { revenue: number, bookings: number } } = {
      "Jan": { revenue: 85000, bookings: 42 },
      "Feb": { revenue: 98000, bookings: 54 },
      "Mar": { revenue: 112000, bookings: 68 },
      "Apr": { revenue: 125000, bookings: 75 },
      "May": { revenue: 145000, bookings: 88 },
      "Jun": { revenue: 168000, bookings: 104 },
      "Jul": { revenue: 0, bookings: 0 }
    };

    // Calculate from actual successful payments in active database
    payments.forEach(p => {
      if (p.status === 'Success' && p.date) {
        const parts = p.date.split('-');
        if (parts.length === 3) {
          const mNum = parseInt(parts[1], 10);
          if (mNum >= 1 && mNum <= 12) {
            const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthName = shortMonths[mNum - 1];
            if (monthlyMap[monthName] !== undefined) {
              monthlyMap[monthName].revenue += p.amount;
            } else {
              monthlyMap[monthName] = { revenue: p.amount, bookings: 0 };
            }
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
            const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthName = shortMonths[mNum - 1];
            if (monthlyMap[monthName] !== undefined) {
              monthlyMap[monthName].bookings += 1;
            } else {
              monthlyMap[monthName] = { revenue: 0, bookings: 1 };
            }
          }
        }
      }
    });

    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const activeMonths = allMonths.filter(m => monthlyMap[m] !== undefined);
    
    return activeMonths.map(m => ({
      name: m,
      revenue: monthlyMap[m].revenue,
      bookings: monthlyMap[m].bookings
    }));
  };

  const REVENUE_DATA = getDynamicRevenueData();
  const totalRevenueVal = REVENUE_DATA.reduce((acc, curr) => acc + curr.revenue, 0);
  const currentMonthRevenueVal = REVENUE_DATA.find(r => r.name === "Jul")?.revenue || 0;

  const chartStudentProgress = MockDatabase.getProgress(selectedStudentForChart || student.id);

  const SKILL_COMPLIANCE_DATA = [
    { name: "Steering", score: chartStudentProgress.steering || 0 },
    { name: "Clutch", score: chartStudentProgress.clutch || 0 },
    { name: "Braking", score: chartStudentProgress.brake || 0 },
    { name: "Parking", score: chartStudentProgress.parking || 0 },
    { name: "Hill Start", score: chartStudentProgress.hillStart || 0 },
    { name: "Confidence", score: chartStudentProgress.confidence || 0 }
  ];

  const VEHICLE_USAGE_DATA = [
    { name: "Maruti Swift", value: 65, color: "#6D3BFF" },
    { name: "Hyundai i20", value: 25, color: "#8F52FF" },
    { name: "Tata Altroz", value: 10, color: "#D4AF37" }
  ];

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
      <header className="bg-white px-4 md:px-8 py-5 md:py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-xl">👑</span>
            <h1 className="text-xl md:text-lg font-black text-[#161623] tracking-tight">Golden Hands Admin</h1>
          </div>
          <p className="text-xs md:text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Bhubaneswar, Odisha</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-xs font-black text-[#161623]">System Administrator</p>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Server: Active (Port 3000)
            </p>
          </div>
          <button 
            onClick={() => {
              askConfirmation(
                "Restore Sandbox Defaults",
                "Are you sure you want to reset the database to original sandboxed default settings? All custom progress updates and registered entries will be cleared.",
                () => {
                  MockDatabase.resetAll();
                  onStateChange();
                  showToast("Sandbox database restored to original parameters.");
                }
              );
            }}
            className="flex-1 sm:flex-none p-3.5 sm:p-2.5 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-600 font-bold text-sm sm:text-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
            title="Reset Database to original parameters"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow shrink-0" /> <span className="text-xs">Reset DB</span>
          </button>
          <button 
            onClick={() => {
              setIsAdminLoggedIn(false);
              localStorage.removeItem("golden_hands_admin_logged_in");
              showToast("Logged out of Admin Portal successfully.");
            }}
            className="flex-1 sm:flex-none p-3.5 sm:p-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 font-bold text-sm sm:text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-100 min-h-[44px]"
            title="Log out of admin session"
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" /> <span className="text-xs">Sign Out</span>
          </button>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="flex-1 sm:flex-none p-3.5 sm:p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-sm sm:text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 min-h-[44px]"
              title="Close Admin Desk and return to hub"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" /> <span className="text-xs">Exit</span>
            </button>
          )}
        </div>
      </header>

      {/* Dashboard split content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-row lg:flex-col justify-between p-4 lg:p-5 shrink-0 overflow-x-auto lg:overflow-x-visible gap-4 lg:gap-0 select-none">
          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            {[
              { id: 'analytics', label: 'Analytics Dashboard', icon: <BarChart2 className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'students', label: 'Student Directory', icon: <Users className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'trainers', label: 'Trainer Allocations', icon: <Car className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'bookings', label: 'Driving Slots', icon: <Calendar className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'slots', label: 'Slot Management', icon: <Clock className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'documents', label: 'Documents Desk', icon: <FileText className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'payments', label: 'Financial Logs', icon: <IndianRupee className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'approvals', label: 'Payment Approvals', icon: <ShieldCheck className="w-5 h-5 lg:w-4 lg:h-4" /> },
              { id: 'feedback', label: 'Feedback Desk', icon: <Star className="w-5 h-5 lg:w-4 lg:h-4 text-amber-500 fill-amber-500" /> },
              { id: 'deletions', label: 'Deletion Requests', icon: <UserX className="w-5 h-5 lg:w-4 lg:h-4 text-rose-500" /> }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const deletionRequestsCount = MockDatabase.getAccountDeletionRequests().length;
              return (
                <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center justify-between px-4 lg:px-4 py-3 lg:py-3.5 rounded-xl text-left text-sm lg:text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal gap-3 ${
                    isActive 
                      ? 'bg-[#6D3BFF] text-white shadow-md shadow-[#6D3BFF]/10' 
                      : 'text-slate-500 hover:bg-[#F8F9FF] hover:text-[#6D3BFF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 lg:gap-3.5">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tab.id === 'deletions' && deletionRequestsCount > 0 && (
                      <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 lg:px-2 py-0.5 rounded-full animate-pulse shrink-0">
                        {deletionRequestsCount}
                      </span>
                    )}
                    {tab.id === 'approvals' && student.modificationStatus === 'paid_pending_approval' && (
                      <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 lg:px-2 py-0.5 rounded-full animate-pulse shrink-0">
                        1 Pending
                      </span>
                    )}
                    {tab.id === 'documents' && documents.filter(d => d.status === 'Pending').length > 0 && (
                      <span className="bg-amber-500 text-white text-[9px] font-black px-1 lg:px-1.5 py-0.5 rounded-full shrink-0">
                        {documents.filter(d => d.status === 'Pending').length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block bg-[#161623] text-white p-4 rounded-3xl border border-white/5 shadow-inner mt-4">
            <h4 className="font-extrabold text-xs text-[#D4AF37]">RTO Coordination</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              OD-02 Bhubaneswar RTO-II approvals take approx. 48 hours from document validation.
            </p>
          </div>
        </nav>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-[#F8F9FF]">
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
                      ₹{currentMonthRevenueVal.toLocaleString('en-IN')} in Jul (Current Month)
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
                      { text: `${student.name || "Guest Student"} requested clutch & parking coaching via AI Coach`, time: "2 mins ago" },
                      { text: `Licence verification status changed to '${student.llStatus || "Applied"}' for student ${student.name || "Guest Student"}`, time: "1 hour ago" },
                      { text: `Trainer ${trainers[0]?.name || "Rajesh Kumar"} completed scheduled class '${trainers[0]?.carPlate || "OD 02 AB 1234"}'`, time: "3 hours ago" }
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
                              <img src={stud.photoUrl} alt={stud.name} className="w-9 h-9 rounded-full object-cover border border-slate-100 shadow-sm" />
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
                          <img src={tr.photoUrl} alt={tr.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm shrink-0" />
                          <div>
                            <h4 className="font-extrabold text-[#161623] text-sm leading-tight">{tr.name}</h4>
                            <span className="text-[10px] text-slate-400">ID: {tr.id} • Rasulgarh Division</span>
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
        </main>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Profile Photo URL</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={trainerPhotoUrl}
                      onChange={(e) => setTrainerPhotoUrl(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] text-slate-500 font-mono"
                    />
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

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Image URL</label>
                  <input 
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={trainerCarPhotoUrl}
                    onChange={(e) => setTrainerCarPhotoUrl(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] text-slate-500 font-mono"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Profile Photo URL</label>
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={studentPhotoUrl}
                      onChange={(e) => setStudentPhotoUrl(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6D3BFF] font-mono text-slate-500"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
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
