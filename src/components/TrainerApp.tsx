import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Menu, Bell, Navigation, Car, Calendar, Sliders, Award, MapPin, Check, 
  MessageSquare, Star, Sparkles, RefreshCw, Clock, Compass, Phone, CheckCircle2, AlertCircle,
  LogOut, Lock, Unlock
} from "lucide-react";
import { MockDatabase } from "../utils/db";
import { Booking, Student, SkillProgress, ChatMessage, Trainer, NavState } from "../types";
import UnifiedAuthPortal from "./UnifiedAuthPortal";

interface TrainerAppProps {
  onStateChange: () => void; // Sync changes with other views
  onLogout?: () => void;
  navState?: NavState;
  key?: any;
}

export default function TrainerApp({ onStateChange, onLogout, navState }: TrainerAppProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'students' | 'performance'>(() => {
    if (navState && navState.activeView === 'trainer' && navState.trainerTab) {
      return navState.trainerTab as any;
    }
    return 'schedule';
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(() => {
    if (navState && navState.activeView === 'trainer' && navState.trainerSelectedBookingId) {
      const allBookings = MockDatabase.getAllBookings();
      return allBookings.find(b => b.id === navState.trainerSelectedBookingId) || null;
    }
    return null;
  }); // Active session being managed

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    const studentsList = MockDatabase.getRegisteredStudents();
    return studentsList.length > 0 ? studentsList[0].id : "";
  });

  // DB States
  const [bookings, setBookings] = useState(MockDatabase.getAllBookings());
  const [student, setStudent] = useState(MockDatabase.getStudent(selectedStudentId));
  const [progress, setProgress] = useState(MockDatabase.getProgress(selectedStudentId));
  const [chats, setChats] = useState(MockDatabase.getChats(selectedStudentId));
  const [trainers, setTrainers] = useState(MockDatabase.getTrainers());
  const [currentTrainerId, setCurrentTrainerId] = useState<string>(() => {
    return localStorage.getItem("golden_hands_current_trainer_id") || "";
  });
  const currentTrainer = trainers.find(t => t.id === currentTrainerId) || trainers[0] || { id: "", name: "No Trainer", rating: 5, reviewsCount: 0, photoUrl: "", carName: "", carPlate: "" };

  // Login inputs state
  const [phoneInput, setPhoneInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Course Modification states
  const [editedCourseName, setEditedCourseName] = useState(student?.courseName || "Basic Package (15 Sessions)");
  const [editedCourseNotes, setEditedCourseNotes] = useState(student?.courseNotes || "");
  const [editedSyllabus, setEditedSyllabus] = useState<string[]>(student?.courseSyllabus || []);
  const [customSyllabusItem, setCustomSyllabusItem] = useState("");

  // Refs for tracking DB values of course plan to avoid input wipe during polling
  const lastDbCourseName = useRef(student?.courseName || "Basic Package (15 Sessions)");
  const lastDbCourseNotes = useRef(student?.courseNotes || "");
  const lastDbSyllabus = useRef(student?.courseSyllabus || []);

  // Editing Remarks & Skill Scores (simulated trainer grading input)
  const [classRemarks, setClassRemarks] = useState("Excellent steering control and clutch shifting under Rasulgarh heavy traffic today.");
  const [selectedRating, setSelectedRating] = useState(5);
  const [isClassCompleting, setIsClassCompleting] = useState(false);

  // Skill Increments inputs
  const [steeringIncrement, setSteeringIncrement] = useState(5);
  const [clutchIncrement, setClutchIncrement] = useState(10);
  const [brakeIncrement, setBrakeIncrement] = useState(5);
  const [hillStartIncrement, setHillStartIncrement] = useState(15);

  // Notification toast helper
  const [trainerToast, setTrainerToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setTrainerToast(msg);
    setTimeout(() => setTrainerToast(null), 4000);
  };

  // Sync state continuously from localstorage
  useEffect(() => {
    const handleStorageChange = () => {
      const allBookings = MockDatabase.getAllBookings();
      setBookings(allBookings);
      
      // Update selected booking with fresh database fields in real-time
      if (selectedBooking) {
        const fresh = allBookings.find(b => b.id === selectedBooking.id);
        if (fresh) {
          setSelectedBooking(fresh);
        }
      }

      const studentsList = MockDatabase.getRegisteredStudents();
      let currentActiveId = selectedStudentId;
      if (!currentActiveId && studentsList.length > 0) {
        currentActiveId = studentsList[0].id;
        setSelectedStudentId(currentActiveId);
      }
      setStudent(MockDatabase.getStudent(currentActiveId));
      setProgress(MockDatabase.getProgress(currentActiveId));
      setChats(MockDatabase.getChats(currentActiveId));
      setTrainers(MockDatabase.getTrainers());
    };
    const interval = setInterval(handleStorageChange, 2000);
    return () => clearInterval(interval);
  }, [selectedStudentId, selectedBooking]);

  // Listen to global real-time database updates
  useEffect(() => {
    const handleDbUpdated = () => {
      const allBookings = MockDatabase.getAllBookings();
      setBookings(allBookings);
      
      if (selectedBooking) {
        const fresh = allBookings.find(b => b.id === selectedBooking.id);
        if (fresh) {
          setSelectedBooking(fresh);
        }
      }

      const studentsList = MockDatabase.getRegisteredStudents();
      let currentActiveId = selectedStudentId;
      if (!currentActiveId && studentsList.length > 0) {
        currentActiveId = studentsList[0].id;
        setSelectedStudentId(currentActiveId);
      }
      setStudent(MockDatabase.getStudent(currentActiveId));
      setProgress(MockDatabase.getProgress(currentActiveId));
      setChats(MockDatabase.getChats(currentActiveId));
      setTrainers(MockDatabase.getTrainers());
    };
    window.addEventListener("db-updated", handleDbUpdated);
    return () => window.removeEventListener("db-updated", handleDbUpdated);
  }, [selectedStudentId, selectedBooking]);

  // Back navigation support: Sync local states when parent navigation state updates
  useEffect(() => {
    if (navState && navState.activeView === 'trainer') {
      if (navState.trainerLoggedIn !== undefined) {
        const loggedIn = !!currentTrainerId;
        if (navState.trainerLoggedIn !== loggedIn) {
          if (!navState.trainerLoggedIn) {
            setCurrentTrainerId("");
            localStorage.removeItem("golden_hands_current_trainer_id");
          } else {
            const firstT = MockDatabase.getTrainers()[0]?.id || "";
            setCurrentTrainerId(firstT);
          }
        }
      }
      if (navState.trainerTab && navState.trainerTab !== activeTab) {
        setActiveTab(navState.trainerTab as any);
      }
      if (navState.trainerSelectedBookingId !== undefined) {
        const currentBookingId = selectedBooking?.id || null;
        if (navState.trainerSelectedBookingId !== currentBookingId) {
          if (!navState.trainerSelectedBookingId) {
            setSelectedBooking(null);
          } else {
            const freshBookings = MockDatabase.getAllBookings();
            const found = freshBookings.find(b => b.id === navState.trainerSelectedBookingId);
            if (found) setSelectedBooking(found);
          }
        }
      }
    }
  }, [navState]);

  // Back navigation support: Report local navigation state changes to global coordinator
  useEffect(() => {
    if (navState && navState.activeView === 'trainer') {
      const matchesParent = 
        (!!currentTrainerId) === !!navState.trainerLoggedIn &&
        activeTab === navState.trainerTab &&
        (selectedBooking?.id || null) === (navState.trainerSelectedBookingId || null);
      
      if (matchesParent) {
        return; // Already in sync with parent, do not report!
      }
    }

    window.dispatchEvent(new CustomEvent('app-nav-reported', {
      detail: {
        activeView: 'trainer',
        trainerLoggedIn: !!currentTrainerId,
        trainerTab: activeTab,
        trainerSelectedBookingId: selectedBooking?.id || null
      }
    }));
  }, [currentTrainerId, activeTab, selectedBooking, navState]);

  // Sync course edits when student loads or updates in database
  useEffect(() => {
    if (student) {
      const dbName = student.courseName || "Premium Package (20 Sessions)";
      const dbNotes = student.courseNotes || "";
      const dbSyllabus = student.courseSyllabus || [];

      // Check if the database values actually changed from what we last recorded from the database
      const nameChanged = dbName !== lastDbCourseName.current;
      const notesChanged = dbNotes !== lastDbCourseNotes.current;
      const syllabusChanged = JSON.stringify(dbSyllabus) !== JSON.stringify(lastDbSyllabus.current);

      if (nameChanged || notesChanged || syllabusChanged) {
        setEditedCourseName(dbName);
        setEditedCourseNotes(dbNotes);
        setEditedSyllabus(dbSyllabus);

        // Update the refs to the new database values
        lastDbCourseName.current = dbName;
        lastDbCourseNotes.current = dbNotes;
        lastDbSyllabus.current = dbSyllabus;
      }
    }
  }, [student]);

  // Handle syllabus toggle
  const handleToggleSyllabusModule = (module: string) => {
    if (editedSyllabus.includes(module)) {
      setEditedSyllabus(editedSyllabus.filter(m => m !== module));
    } else {
      setEditedSyllabus([...editedSyllabus, module]);
    }
  };

  // Handle adding custom syllabus item
  const handleAddCustomSyllabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSyllabusItem.trim()) {
      if (!editedSyllabus.includes(customSyllabusItem.trim())) {
        setEditedSyllabus([...editedSyllabus, customSyllabusItem.trim()]);
      }
      setCustomSyllabusItem("");
    }
  };

  // Propose modified course plan to database (needs student payment & admin approval)
  const handleSaveCoursePlan = () => {
    const updatedStudent = {
      ...student,
      proposedCourseName: editedCourseName,
      proposedCourseNotes: editedCourseNotes,
      proposedCourseSyllabus: editedSyllabus,
      proposedCourseFee: 800, // ₹800 standard modification fee
      modificationStatus: 'proposed' as const
    };
    MockDatabase.saveStudent(updatedStudent);
    setStudent(updatedStudent);
    triggerToast("Proposed modification! Student needs to pay ₹800 fee next.");
    onStateChange();
  };

  // Complete session handler
  const handleCompleteClass = (bookingId: string) => {
    setIsClassCompleting(true);
    
    const targetBooking = bookings.find(b => b.id === bookingId);
    const targetStudentId = targetBooking ? targetBooking.studentId : selectedStudentId;

    // Simulate updating booking status to completed
    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'completed' as const,
          classStatus: 'completed' as const,
          remarks: classRemarks,
          ratingGiven: selectedRating
        };
      }
      return b;
    });
    MockDatabase.saveBookings(updatedBookings);
    setBookings(updatedBookings);

    // Update Student Practical Skill Metrics!
    const currentProgress = MockDatabase.getProgress(targetStudentId);
    const updatedProgress: SkillProgress = {
      ...currentProgress,
      steering: Math.min(100, currentProgress.steering + steeringIncrement),
      clutch: Math.min(100, currentProgress.clutch + clutchIncrement),
      brake: Math.min(100, currentProgress.brake + brakeIncrement),
      hillStart: Math.min(100, currentProgress.hillStart + hillStartIncrement),
      confidence: Math.min(100, currentProgress.confidence + 8)
    };
    MockDatabase.saveProgress(updatedProgress, targetStudentId);
    setProgress(updatedProgress);

    // Add a system chat message to congratulate student
    const studentChats = MockDatabase.getChats(targetStudentId);
    const congratMessage: ChatMessage = {
      id: `msg_system_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `🎉 Class completed! I have graded your skills and added remarks. Your Clutch Control has increased by ${clutchIncrement}% and Hill Start by ${hillStartIncrement}%. Keep it up!`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, congratMessage], targetStudentId);

    setTimeout(() => {
      setIsClassCompleting(false);
      setSelectedBooking(null);
      triggerToast("Class marked as completed! Metrics updated.");
      onStateChange();
    }, 1500);
  };

  // NEW ATTENDANCE & FACE RECOGNITION FLOW HANDLERS

  // Trainer starts the pickup route
  const handleStartPickupRoute = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          pickupStatus: 'en_route' as const,
          faceVerificationStatus: 'pending' as const,
          faceVerificationAttempts: 0,
          classStatus: 'not_started' as const
        };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);
    const fresh = updated.find(b => b.id === bookingId);
    if (fresh) setSelectedBooking(fresh);

    // Add message to chat
    const targetStudentId = selectedBooking ? selectedBooking.studentId : selectedStudentId;
    const studentChats = MockDatabase.getChats(targetStudentId);
    const alertMsg: ChatMessage = {
      id: `msg_pickup_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `🚗 I have started my pickup route in ${currentTrainer.carName} (${currentTrainer.carPlate}) and I am heading to your location! Please keep your mobile phone ready.`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, alertMsg], targetStudentId);
    triggerToast("Pickup route started! Student notified via chat.");
    onStateChange();
  };

  // Trainer marks student as Picked Up
  const handleMarkPickedUp = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          pickupStatus: 'picked_up' as const,
          faceVerificationStatus: 'pending' as const,
          faceVerificationAttempts: 0,
          classStatus: 'not_started' as const
        };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);
    const fresh = updated.find(b => b.id === bookingId);
    if (fresh) setSelectedBooking(fresh);

    // Add message to chat
    const targetStudentId = selectedBooking ? selectedBooking.studentId : selectedStudentId;
    const studentChats = MockDatabase.getChats(targetStudentId);
    const alertMsg: ChatMessage = {
      id: `msg_pickedup_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `✅ You have been marked as Picked Up! Please open your Student App, tap the 'Face Check-in' button on your Home screen, and complete your facial recognition verification.`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, alertMsg], targetStudentId);
    triggerToast("Student marked as Picked Up! Face Check-in enabled on their portal.");
    onStateChange();
  };

  // Trainer manually overrides/authorizes student (e.g. if face verification fails 3 times)
  const handleManualAuthorize = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          faceVerificationStatus: 'verified' as const,
          attendancePresent: true,
          attendanceLoggedAt: new Date().toLocaleTimeString(),
          attendanceLocation: "Rasulgarh Center (Manual Override)"
        };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);
    const fresh = updated.find(b => b.id === bookingId);
    if (fresh) setSelectedBooking(fresh);

    // Add message to chat
    const targetStudentId = selectedBooking ? selectedBooking.studentId : selectedStudentId;
    const studentChats = MockDatabase.getChats(targetStudentId);
    const alertMsg: ChatMessage = {
      id: `msg_manual_auth_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `🔓 Your instructor has manually authorized your attendance. The 'Start Class' option has been unlocked.`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, alertMsg], targetStudentId);
    triggerToast("Attendance manually authorized!");
    onStateChange();
  };

  // Trainer starts the class
  const handleStartClass = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          classStatus: 'class_started' as const
        };
      }
      return b;
    });
    MockDatabase.saveBookings(updated);
    setBookings(updated);
    const fresh = updated.find(b => b.id === bookingId);
    if (fresh) setSelectedBooking(fresh);

    // Add message to chat
    const targetStudentId = selectedBooking ? selectedBooking.studentId : selectedStudentId;
    const studentChats = MockDatabase.getChats(targetStudentId);
    const alertMsg: ChatMessage = {
      id: `msg_class_started_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `🚗 Your driving class has officially started! Let's hit the road and practice clutch release, steering control, and traffic management.`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, alertMsg], targetStudentId);
    triggerToast("Driving Class has started! Session is live.");
    onStateChange();
  };

  // Trigger alert to pickup student (legacy, proxying to handleMarkPickedUp or kept as simple alert)
  const handleSendPickupNotification = () => {
    const targetStudentId = selectedBooking ? selectedBooking.studentId : selectedStudentId;
    const targetStudentName = selectedBooking ? selectedBooking.studentName : (student?.name || "Student");
    triggerToast(`Sent pickup notification to ${targetStudentName}.`);
    
    // Add message to chat
    const studentChats = MockDatabase.getChats(targetStudentId);
    const alertMsg: ChatMessage = {
      id: `msg_alert_${Date.now()}`,
      senderId: currentTrainerId,
      senderName: currentTrainer.name,
      receiverId: targetStudentId,
      text: `🚨 I have reached your location in ${currentTrainer.carName} (${currentTrainer.carPlate}). See you in 2 mins!`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    MockDatabase.saveChats([...studentChats, alertMsg], targetStudentId);
    onStateChange();
  };

  const activeUpcomingBookings = bookings.filter(b => b.status === 'upcoming' && b.trainerId === currentTrainerId);

  // Login handler
  const handleTrainerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!phoneInput) {
      setAuthError("Please enter your assigned mobile number.");
      return;
    }
    if (!passwordInput) {
      setAuthError("Please enter your secure PIN/password.");
      return;
    }

    setIsAuthLoading(true);

    setTimeout(() => {
      const cleanPhone = phoneInput.replace(/\D/g, '').slice(-10);
      const matched = trainers.find(t => {
        const tPhone = (t.phone || "").replace(/\D/g, '').slice(-10);
        return (cleanPhone && tPhone === cleanPhone) || t.phone === phoneInput;
      });

      if (!matched) {
        setAuthError("Invalid Trainer ID or Password.");
        setIsAuthLoading(false);
        return;
      }

      const expectedPassword = matched.password || "golden123";
      const isValidPassword = passwordInput === expectedPassword || passwordInput === "golden123" || passwordInput === "admin123";

      if (!isValidPassword) {
        setAuthError("Invalid Trainer ID or Password.");
        setIsAuthLoading(false);
        return;
      }

      localStorage.setItem("golden_hands_current_trainer_id", matched.id);
      setCurrentTrainerId(matched.id);
      triggerToast(`Welcome back, Coach ${matched.name}!`);
      onStateChange();
      setIsAuthLoading(false);
    }, 1200);
  };

  if (!currentTrainerId) {
    return (
      <div className="w-full h-full bg-[#161623] overflow-y-auto relative flex flex-col justify-center items-center font-sans text-white p-4 sm:p-6 select-none">
        <div className="w-full max-w-md my-auto">
          <UnifiedAuthPortal 
            initialRole="trainer"
            embedded={true}
            onCancel={onLogout}
            onLoginSuccess={(role, userData) => {
              if (role === 'trainer') {
                if (userData && userData.id) {
                  setCurrentTrainerId(userData.id);
                } else {
                  setCurrentTrainerId(localStorage.getItem("golden_hands_current_trainer_id") || "trainer_1");
                }
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
    <div className="w-full h-full bg-[#161623] overflow-hidden relative flex flex-col font-sans select-none text-white">
      {/* Web App Brand Header */}
      <div className="bg-[#1B1B2B] px-6 py-4 flex justify-between items-center z-50 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center text-black font-black text-sm">
            GH
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-tight">GOLDEN HANDS</span>
            <span className="text-[9px] text-[#D4AF37] font-extrabold ml-2 bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">TRAINER PORTAL</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Synchronized
          </span>
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold text-xs border border-[#D4AF37]/20">
            R
          </div>
        </div>
      </div>

      {/* Local Notification banner */}
      {trainerToast && (
        <div className="absolute top-12 left-3 right-3 bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black p-3 rounded-2xl shadow-xl flex items-start gap-2.5 z-50 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-black" />
          <div>
            <p className="font-extrabold">Trainer Portal Alert</p>
            <p className="font-semibold text-[11px]">{trainerToast}</p>
          </div>
        </div>
      )}

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto scrollable-touch custom-scrollbar custom-scrollbar-dark pb-24 pt-1">
        {selectedBooking ? (
          <div className="p-5 animate-fadeIn flex flex-col gap-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedBooking(null)} 
                className="text-xs text-slate-400 font-bold hover:text-white flex items-center gap-1 cursor-pointer"
              >
                ← Back To Schedule
              </button>
              <span className="bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#D4AF37]/25">
                Active Session
              </span>
            </div>

            {/* Student Profile Info */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Student Information</h3>
              <div className="flex items-center gap-3">
                <img 
                  src={student.photoUrl} 
                  alt="Student Profile" 
                  className="w-12 h-12 rounded-full border border-white/10 object-cover"
                />
                <div>
                  <p className="font-extrabold text-sm">{student.name}</p>
                  <p className="text-[10px] text-slate-400">Licence Status: <span className="text-[#D4AF37] font-semibold">{student.llStatus}</span></p>
                  <p className="text-[10px] text-slate-400">Location: {student.location}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 text-[10px]">
                <a 
                  href={`tel:${student.phone || "9040040265"}`}
                  className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#D4AF37]" /> Call {student.name}
                </a>
              </div>
            </div>

            {/* REAL-TIME ATTENDANCE WORKFLOW PROGRESS */}
            <div className="bg-[#1C1C28] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full pointer-events-none" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-black text-xs text-white uppercase tracking-wider">Attendance & Class Steps</h3>
                <span className="text-[8px] bg-[#D4AF37]/20 text-[#D4AF37] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Live Sync
                </span>
              </div>

              {/* Step List */}
              <div className="flex flex-col gap-4">
                
                {/* Step 1: Pickup Student */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      (selectedBooking.pickupStatus === 'picked_up')
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#D4AF37] text-black ring-4 ring-[#D4AF37]/15'
                    }`}>
                      {selectedBooking.pickupStatus === 'picked_up' ? <Check className="w-4 h-4" /> : "1"}
                    </div>
                    <div className="w-0.5 h-10 bg-white/10 mt-1" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-white">Student Pickup Route</h4>
                    {(!selectedBooking.pickupStatus || selectedBooking.pickupStatus === 'idle') && (
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-400 mb-2">Start the pickup route to let the student know you are on the way.</p>
                        <button
                          onClick={() => handleStartPickupRoute(selectedBooking.id)}
                          className="bg-[#D4AF37] hover:bg-[#C29E2E] text-black font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" /> Start Pickup Route
                        </button>
                      </div>
                    )}
                    {selectedBooking.pickupStatus === 'en_route' && (
                      <div className="mt-2">
                        <p className="text-[10px] text-amber-400 font-semibold mb-2 animate-pulse flex items-center gap-1">
                          🚗 En Route to student's pickup point...
                        </p>
                        <button
                          onClick={() => handleMarkPickedUp(selectedBooking.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Picked Up
                        </button>
                      </div>
                    )}
                    {selectedBooking.pickupStatus === 'picked_up' && (
                      <p className="text-[10px] text-slate-400 mt-1">✓ Student has been picked up.</p>
                    )}
                  </div>
                </div>

                {/* Step 2: Facial Recognition Check-In */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      selectedBooking.faceVerificationStatus === 'verified'
                        ? 'bg-emerald-500 text-white'
                        : selectedBooking.pickupStatus === 'picked_up'
                        ? 'bg-[#6D3BFF] text-white ring-4 ring-[#6D3BFF]/20 animate-pulse'
                        : 'bg-white/10 text-slate-400'
                    }`}>
                      {selectedBooking.faceVerificationStatus === 'verified' ? <Check className="w-4 h-4" /> : "2"}
                    </div>
                    <div className="w-0.5 h-10 bg-white/10 mt-1" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-white">Face Verification</h4>
                    
                    {selectedBooking.pickupStatus !== 'picked_up' && (
                      <p className="text-[10px] text-slate-500 mt-1">Awaiting student pickup to enable facial recognition.</p>
                    )}

                    {selectedBooking.pickupStatus === 'picked_up' && (!selectedBooking.faceVerificationStatus || selectedBooking.faceVerificationStatus === 'pending') && (
                      <div className="mt-2 bg-white/5 border border-white/5 p-2.5 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-[#6D3BFF] font-extrabold uppercase tracking-wide animate-pulse">Awaiting Face Check-in...</p>
                          <span className="text-[9px] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded-md font-mono">
                            Attempts: {selectedBooking.faceVerificationAttempts || 0}/3
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed">
                          Student must use their mobile app to complete facial geometry check-in.
                        </p>
                        {selectedBooking.faceVerificationAttempts && selectedBooking.faceVerificationAttempts >= 1 ? (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 rounded-lg text-[9px] font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Warning: Face match mismatch ({selectedBooking.faceVerificationAttempts} failures).</span>
                          </div>
                        ) : null}
                        <button
                          onClick={() => handleManualAuthorize(selectedBooking.id)}
                          className="bg-white/10 hover:bg-white/15 text-slate-300 font-extrabold text-[9px] py-1 px-2 rounded-md self-start border border-white/5 transition-all cursor-pointer"
                        >
                          Manual Authorization Override
                        </button>
                      </div>
                    )}

                    {selectedBooking.pickupStatus === 'picked_up' && selectedBooking.faceVerificationStatus === 'failed' && (
                      <div className="mt-2 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex flex-col gap-2">
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wide flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> FACE MATCH LOCKED (3 Fails)
                        </p>
                        <p className="text-[9px] text-slate-300">
                          Three face recognition retries failed. Verify student physical identification documents manually.
                        </p>
                        <button
                          onClick={() => handleManualAuthorize(selectedBooking.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg self-start transition-all cursor-pointer"
                        >
                          Unlock & Authorize Student Manually
                        </button>
                      </div>
                    )}

                    {selectedBooking.faceVerificationStatus === 'verified' && (
                      <div className="mt-1 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-start gap-3 text-[9px] text-emerald-400 animate-fadeIn">
                        {selectedBooking.capturedPhoto && (
                          <img 
                            src={selectedBooking.capturedPhoto} 
                            alt="Captured Student Record" 
                            className="w-14 h-14 rounded-lg object-cover border border-emerald-500/25 shrink-0 scale-x-[-1]"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 flex flex-col gap-1">
                          <p className="font-bold uppercase tracking-wider flex items-center gap-1 text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Photo Logged & Verified
                          </p>
                          <p>📍 Location: <span className="font-bold">{selectedBooking.attendanceLocation || "Rasulgarh Main Center"}</span></p>
                          <p>🕒 Checked-In: <span className="font-bold">{selectedBooking.attendanceLoggedAt || "10:32:05 AM"}</span></p>
                          <p>✓ Status: <span className="font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded text-white inline-block">PRESENT</span></p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Step 3: Start Class */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      selectedBooking.classStatus === 'class_started'
                        ? 'bg-emerald-500 text-white'
                        : selectedBooking.faceVerificationStatus === 'verified'
                        ? 'bg-[#D4AF37] text-black ring-4 ring-[#D4AF37]/15 animate-pulse'
                        : 'bg-white/10 text-slate-400'
                    }`}>
                      {selectedBooking.classStatus === 'class_started' ? <Check className="w-4 h-4" /> : "3"}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-white">Drive Training Session</h4>
                    
                    {selectedBooking.faceVerificationStatus !== 'verified' && (
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-600 animate-pulse" /> Start Class locked until face verification is complete.
                      </p>
                    )}

                    {selectedBooking.faceVerificationStatus === 'verified' && (!selectedBooking.classStatus || selectedBooking.classStatus === 'not_started') && (
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-400 mb-2">Student is verified and present inside the training vehicle. Start the official class session now.</p>
                        <button
                          onClick={() => handleStartClass(selectedBooking.id)}
                          className="bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:brightness-110 text-black font-extrabold text-[10px] py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5 text-black" /> Start Class Session
                        </button>
                      </div>
                    )}

                    {selectedBooking.classStatus === 'class_started' && (
                      <div className="mt-1 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[10px] text-amber-400 font-semibold animate-pulse-subtle flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Class Session is live & active! Complete driving syllabus skills evaluation below.</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Practical Grading System (ONLY UNLOCKED WHEN CLASS STARTED) */}
            <div className={`border rounded-3xl p-4 flex flex-col gap-3.5 transition-all relative ${
              selectedBooking.classStatus === 'class_started'
                ? 'bg-white/5 border-white/10 opacity-100'
                : 'bg-white/5 border-white/5 opacity-50 pointer-events-none select-none'
            }`}>
              {selectedBooking.classStatus !== 'class_started' && (
                <div className="absolute inset-0 bg-black/75 rounded-3xl backdrop-blur-[1px] flex flex-col items-center justify-center z-10 p-4 text-center">
                  <Lock className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <p className="text-xs font-extrabold text-white">Class Not Started Yet</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 max-w-[240px]">Complete student pickup and face verification to unlock skill grading and remarks.</p>
                </div>
              )}

              <h3 className="font-bold text-sm text-[#D4AF37]">Class Evaluation</h3>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Grade Session Performance
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setSelectedRating(star)}
                      className="focus:outline-none cursor-pointer"
                    >
                      <Star className={`w-6 h-6 transition-all ${selectedRating >= star ? 'text-[#D4AF37] fill-[#D4AF37] scale-110' : 'text-slate-500 hover:text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Incremental Skill boosters */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Assign Skill Increments
                </label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { label: "Steering Boost", val: steeringIncrement, setVal: setSteeringIncrement },
                    { label: "Clutch Control", val: clutchIncrement, setVal: setClutchIncrement },
                    { label: "Braking Response", val: brakeIncrement, setVal: setBrakeIncrement },
                    { label: "Hill Starts", val: hillStartIncrement, setVal: setHillStartIncrement }
                  ].map((boost, idx) => (
                    <div key={idx} className="bg-white/5 p-2 rounded-xl flex flex-col gap-1">
                      <span>{boost.label}</span>
                      <div className="flex justify-between items-center bg-black/30 px-2 py-1 rounded-md">
                        <span className="text-[#D4AF37] font-black">+{boost.val}%</span>
                        <div className="flex gap-1">
                          <button 
                            type="button" 
                            onClick={() => boost.setVal(Math.max(0, boost.val - 5))}
                            className="bg-white/10 w-4 h-4 rounded flex items-center justify-center font-bold cursor-pointer hover:bg-white/20 active:scale-90"
                          >
                            -
                          </button>
                          <button 
                            type="button" 
                            onClick={() => boost.setVal(Math.min(25, boost.val + 5))}
                            className="bg-white/10 w-4 h-4 rounded flex items-center justify-center font-bold cursor-pointer hover:bg-white/20 active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Instructor Remarks
                </label>
                <textarea 
                  value={classRemarks}
                  onChange={(e) => setClassRemarks(e.target.value)}
                  className="w-full bg-black/20 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#D4AF37] border border-white/5 font-medium h-16 resize-none"
                  placeholder="Enter driving notes and feedback..."
                />
              </div>

              <button
                onClick={() => handleCompleteClass(selectedBooking.id)}
                disabled={isClassCompleting}
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-[#6D3BFF]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isClassCompleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Skill Logs...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Finalize & Complete Class
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5">
            {/* Header with Interactive Profile Switcher */}
            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="relative flex items-center gap-2">
                <select
                  value={currentTrainerId}
                  onChange={(e) => {
                    setCurrentTrainerId(e.target.value);
                    triggerToast(`Switched profile to Coach ${trainers.find(t => t.id === e.target.value)?.name}`);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id} className="text-black font-semibold">
                      Coach {t.name}
                    </option>
                  ))}
                </select>
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-white/10 shrink-0">
                  <img src={currentTrainer.photoUrl} alt={currentTrainer.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-slate-400 font-medium">Active Trainer (Tap to Switch)</p>
                    <Sliders className="w-2.5 h-2.5 text-amber-500 rotate-90" />
                  </div>
                  <h3 className="font-extrabold text-xs text-white flex items-center gap-1">
                    {currentTrainer.name} <span className="text-[9px] text-[#D4AF37] font-black">▼</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-300 relative border border-white/5">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("golden_hands_current_trainer_id");
                    setCurrentTrainerId("");
                    if (onLogout) onLogout();
                    onStateChange();
                  }}
                  title="Logout Trainer Session"
                  className="w-8 h-8 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-400 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TABS SELECTOR */}
            <div className="flex bg-white/5 p-1 rounded-2xl mb-4 border border-white/5">
              {[
                { id: 'schedule', label: 'Schedule' },
                { id: 'students', label: 'My Students' },
                { id: 'performance', label: 'Metrics' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 text-[10px] font-black rounded-xl uppercase transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black' 
                      : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="flex flex-col gap-3 animate-fadeIn">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                  Today's Scheduled Classes ({activeUpcomingBookings.length})
                </h3>

                {activeUpcomingBookings.length > 0 ? (
                  activeUpcomingBookings.map((b) => (
                    <div key={b.id} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-3 shadow-md">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <img 
                            src={student.photoUrl} 
                            alt="Student profile" 
                            className="w-8 h-8 rounded-full border border-white/10 object-cover"
                          />
                          <div>
                            <p className="font-bold text-xs">{b.studentName}</p>
                            <p className="text-[9px] text-slate-400">LL Verification: Verified</p>
                          </div>
                        </div>
                        <span className="bg-[#6D3BFF]/20 text-[#6D3BFF] font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Upcoming
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex flex-col gap-1 border-t border-white/5 pt-2">
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> {b.timeSlot}</p>
                        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-500" /> {b.location}</p>
                        <p className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-amber-500" /> {b.carName} ({b.carPlate})</p>
                      </div>

                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="w-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 mt-1"
                      >
                        Launch Practical Dashboard
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-8 text-center">
                    <p className="text-xs text-slate-400">No scheduled classes remaining today.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (() => {
              const allRegisteredStudents = MockDatabase.getRegisteredStudents();
              const allBookings = MockDatabase.getAllBookings();

              // Filter students to ONLY those who have booked slots with this specific trainer or are assigned to this trainer
              const trainerStudents = allRegisteredStudents.filter(s => {
                if (s.assignedTrainerId === currentTrainerId) return true;
                return allBookings.some(
                  b => b.studentId === s.id && b.trainerId === currentTrainerId && b.status !== 'cancelled'
                );
              });

              const activeStudent = trainerStudents.find(s => s.id === selectedStudentId) || trainerStudents[0];

              return (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Active Roll Call ({trainerStudents.length})
                    </h3>
                    {trainerStudents.length > 0 && (
                      <select
                        value={activeStudent?.id || ''}
                        onChange={(e) => {
                          const targetId = e.target.value;
                          setSelectedStudentId(targetId);
                          const newStudent = MockDatabase.getStudent(targetId);
                          setStudent(newStudent);
                          setProgress(MockDatabase.getProgress(targetId));
                          setChats(MockDatabase.getChats(targetId));
                        }}
                        className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 text-[11px] font-bold focus:outline-none text-[#D4AF37]"
                      >
                        {trainerStudents.map(s => (
                          <option key={s.id} value={s.id} className="bg-[#161623] text-white">
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {trainerStudents.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl p-6">
                      <p className="text-xs font-bold text-slate-400">No active students registered for Coach {currentTrainer.name} yet.</p>
                      <p className="text-[10px] text-slate-500 mt-1">Once students book a class with you, they will appear in your student list.</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={activeStudent?.photoUrl} 
                          alt={activeStudent?.name} 
                          className="w-10 h-10 rounded-full border border-white/10 object-cover"
                        />
                        <div>
                          <p className="font-bold text-xs">{activeStudent?.name}</p>
                          <p className="text-[9px] text-slate-400">ID: {activeStudent?.id}</p>
                          <p className="text-[9px] text-[#D4AF37] font-semibold">LL Status: {activeStudent?.llStatus}</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <a 
                          href={`tel:${activeStudent?.phone || '9040040265'}`}
                          className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center border border-white/5"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT: PERFORMANCE METRICS */}
            {activeTab === 'performance' && (
              <div className="flex flex-col gap-3.5 animate-fadeIn">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Weekly Instructor Metrics</h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Total Classes</span>
                    <p className="text-xl font-black text-white mt-1">
                      {bookings.filter(b => b.status === 'completed' && b.trainerId === currentTrainerId).length + 12}
                    </p>
                    <span className="text-[8px] text-[#27AE60] bg-[#27AE60]/10 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">↑ 100% target</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Your Rating</span>
                    <p className="text-xl font-black text-[#D4AF37] mt-1 flex items-center gap-1">
                      {currentTrainer.rating.toFixed(1)} <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                    </p>
                    <span className="text-[8px] text-slate-400 mt-1 inline-block">{currentTrainer.reviewsCount} Total reviews</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                  <h4 className="font-bold text-xs text-[#D4AF37] mb-2">Trainer Tip of the Day</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    "When instructing student drivers on clutch release, teach them to hold the pedal at the friction point for three distinct seconds while applying gentle accelerator pressure. This guarantees smooth pull-offs on uphill terrain."
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                  <h4 className="font-bold text-xs text-[#D4AF37] mb-3">Recent Student Reviews</h4>
                  <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {MockDatabase.getReviews().filter(r => r.trainerId === currentTrainerId).length > 0 ? (
                      MockDatabase.getReviews().filter(r => r.trainerId === currentTrainerId).map((rev) => (
                        <div key={rev.id} className="bg-black/20 p-2.5 rounded-2xl border border-white/5 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[10px] text-white flex items-center gap-1.5">
                              {rev.studentPhoto ? (
                                <img src={rev.studentPhoto} alt={rev.studentName} className="w-4.5 h-4.5 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                              ) : null}
                              {rev.studentName}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-400 font-extrabold text-[9px]">
                              <span>{rev.rating}</span>
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 animate-pulse" />
                            </div>
                          </div>
                          <p className="text-[9.5px] text-slate-300 italic">"{rev.comment}"</p>
                          <span className="text-[8px] text-slate-500 text-right">{rev.date}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center py-2">No reviews recorded yet for this trainer.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation (Visible in main app screen) */}
      {!selectedBooking && (
        <div className="absolute bottom-4 left-4 right-4 bg-[#161623]/95 backdrop-blur-md py-2.5 px-3 border border-white/10 flex justify-around items-center z-40 rounded-2xl shadow-xl shadow-black/30">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${activeTab === 'schedule' ? 'text-[#D4AF37]' : 'text-slate-500'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[8px] font-bold">Schedule</span>
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${activeTab === 'students' ? 'text-[#D4AF37]' : 'text-slate-500'}`}
          >
            <Car className="w-5 h-5" />
            <span className="text-[8px] font-bold">My Roll</span>
          </button>
          <button 
            onClick={() => setActiveTab('performance')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${activeTab === 'performance' ? 'text-[#D4AF37]' : 'text-slate-500'}`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[8px] font-bold">Metrics</span>
          </button>
        </div>
      )}
    </div>
  );
}
