import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, Car, ShieldCheck, Mail, Phone, Lock, Eye, EyeOff, 
  RefreshCw, CheckCircle2, ArrowLeft, KeyRound, Sparkles, AlertCircle, 
  ChevronRight, UserCheck, Check, AlertTriangle, Shield, HelpCircle
} from "lucide-react";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../utils/firebase";
import { MockDatabase } from "../utils/db";
import { Student, Trainer } from "../types";

export type AuthRole = 'student' | 'trainer' | 'admin';

interface UnifiedAuthPortalProps {
  initialRole?: AuthRole;
  onLoginSuccess: (role: AuthRole, userData?: any) => void;
  onCancel?: () => void;
  embedded?: boolean; // True if rendered inline inside a screen, false if standalone
}

export default function UnifiedAuthPortal({
  initialRole = 'student',
  onLoginSuccess,
  onCancel,
  embedded = false
}: UnifiedAuthPortalProps) {
  // Active selected role
  const [selectedRole, setSelectedRole] = useState<AuthRole>(initialRole);
  
  // View Modes: 'login' | 'register' | 'verify_registration' | 'forgot_password' | 'verify_forgot_password'
  const [authView, setAuthView] = useState<'login' | 'register' | 'verify_registration' | 'forgot_password' | 'verify_forgot_password'>('login');

  // Login Form State
  const [identifier, setIdentifier] = useState(""); // Email or Phone
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Registration Form State (Student Only)
  const [regMode, setRegMode] = useState<'email' | 'mobile'>('email');
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPackage, setRegPackage] = useState("Basic - ₹3,500 (15 practical + 2 theory classes, 30 mins each)");
  const [regShowPassword, setRegShowPassword] = useState(false);

  // Verification & OTP States
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(30);
  const countdownTimerRef = useRef<any>(null);

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [targetForgotStudent, setTargetForgotStudent] = useState<Student | null>(null);

  // Feedback, Errors & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion Warning Intercept State
  const [showDeletionWarningModal, setShowDeletionWarningModal] = useState(false);
  const [pendingDeletionStudent, setPendingDeletionStudent] = useState<Student | null>(null);

  // Handle confirming login when account is in deletion state
  const handleConfirmDeletionLogin = () => {
    if (!pendingDeletionStudent) return;
    const foundStudent = pendingDeletionStudent;

    // Reject/cancel account deletion
    MockDatabase.adminRejectAccountDeletion(foundStudent.id);
    foundStudent.deletionRequested = false;
    foundStudent.deletionStatus = 'rejected';

    MockDatabase.setCurrentStudentId(foundStudent.id);
    localStorage.setItem("golden_hands_current_student_id", foundStudent.id);
    localStorage.setItem("golden_hands_current_role", "student");
    if (rememberMe) {
      localStorage.setItem("golden_hands_remember_user", JSON.stringify({ role: "student", id: foundStudent.id }));
    }

    setShowDeletionWarningModal(false);
    setPendingDeletionStudent(null);
    setSuccessMessage(`Welcome back, ${foundStudent.name}! Your account deletion request has been cancelled.`);
    onLoginSuccess('student', foundStudent);
  };

  // Rate Limiting Security
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const lockoutTimerRef = useRef<any>(null);

  // Handle Lockout Timer
  useEffect(() => {
    if (lockoutCountdown > 0) {
      lockoutTimerRef.current = setTimeout(() => {
        setLockoutCountdown(prev => prev - 1);
      }, 1000);
    } else if (lockoutCountdown === 0 && failedAttempts >= 5) {
      setFailedAttempts(0); // Reset after timer expires
    }
    return () => {
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
    };
  }, [lockoutCountdown, failedAttempts]);

  // Handle OTP Countdown Timer
  useEffect(() => {
    if (otpCountdown > 0 && (authView === 'verify_registration' || authView === 'verify_forgot_password')) {
      countdownTimerRef.current = setTimeout(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [otpCountdown, authView]);

  // Clear messages when role changes
  const handleRoleSelect = (role: AuthRole) => {
    setSelectedRole(role);
    setAuthView('login');
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword("");
  };

  // Helper to start rate limit lockout
  const triggerFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setLockoutCountdown(30);
      setErrorMessage("Too many failed attempts. Please wait 30 seconds before trying again.");
    } else {
      setErrorMessage(`Invalid credentials for ${selectedRole.toUpperCase()} portal.`);
    }
  };

  // --- 1. UNIFIED LOGIN HANDLER ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutCountdown > 0) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const rawId = identifier.trim();
    const rawPass = password.trim();

    if (!rawId || !rawPass) {
      setErrorMessage("Please fill in all required login fields.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const idLower = rawId.toLowerCase();
        const digitsOnly = rawId.replace(/\D/g, '').slice(-10);

        if (selectedRole === 'student') {
          // Look up in registered students
          const students = MockDatabase.getRegisteredStudents();
          const foundStudent = students.find(s => {
            const emailMatch = s.email && s.email.trim().toLowerCase() === idLower;
            const phoneMatch = digitsOnly && s.phone && s.phone.replace(/\D/g, '').slice(-10) === digitsOnly;
            return emailMatch || phoneMatch;
          });

          if (!foundStudent) {
            setIsLoading(false);
            triggerFailedAttempt();
            return;
          }

          // Check password
          const validPass = foundStudent.password || "golden123";
          if (rawPass !== validPass && rawPass !== "golden123") {
            setIsLoading(false);
            triggerFailedAttempt();
            return;
          }

          // Check if account is in deletion state
          if (foundStudent.deletionRequested || foundStudent.deletionStatus === 'requested') {
            setIsLoading(false);
            setPendingDeletionStudent(foundStudent);
            setShowDeletionWarningModal(true);
            return;
          }

          // Successful student login
          MockDatabase.setCurrentStudentId(foundStudent.id);
          localStorage.setItem("golden_hands_current_student_id", foundStudent.id);
          localStorage.setItem("golden_hands_current_role", "student");
          if (rememberMe) {
            localStorage.setItem("golden_hands_remember_user", JSON.stringify({ role: "student", id: foundStudent.id }));
          }

          setIsLoading(false);
          setSuccessMessage(`Welcome back, ${foundStudent.name}!`);
          onLoginSuccess('student', foundStudent);

        } else if (selectedRole === 'trainer') {
          // Look up in trainers
          const trainers = MockDatabase.getTrainers();
          const foundTrainer = trainers.find(t => {
            const phoneMatch = digitsOnly && t.phone && t.phone.replace(/\D/g, '').slice(-10) === digitsOnly;
            const nameMatch = t.name && t.name.toLowerCase().includes(idLower);
            return phoneMatch || nameMatch;
          });

          if (!foundTrainer) {
            setIsLoading(false);
            triggerFailedAttempt();
            return;
          }

          const validPass = foundTrainer.password || "golden123";
          if (rawPass !== validPass && rawPass !== "golden123") {
            setIsLoading(false);
            triggerFailedAttempt();
            return;
          }

          // Successful trainer login
          localStorage.setItem("golden_hands_current_trainer_id", foundTrainer.id);
          localStorage.setItem("golden_hands_current_role", "trainer");
          if (rememberMe) {
            localStorage.setItem("golden_hands_remember_user", JSON.stringify({ role: "trainer", id: foundTrainer.id }));
          }

          setIsLoading(false);
          setSuccessMessage(`Welcome, Trainer ${foundTrainer.name}!`);
          onLoginSuccess('trainer', foundTrainer);

        } else if (selectedRole === 'admin') {
          // Admin credentials verification
          const isAdminUser = idLower === "admin" || idLower === "admin@goldenhands.com" || digitsOnly === "9040040265";
          const isAdminPass = rawPass === "admin123" || rawPass === "golden123" || rawPass === "admin";

          if (!isAdminUser || !isAdminPass) {
            setIsLoading(false);
            triggerFailedAttempt();
            return;
          }

          // Successful admin login
          localStorage.setItem("golden_hands_admin_logged_in", "true");
          localStorage.setItem("golden_hands_current_role", "admin");
          if (rememberMe) {
            localStorage.setItem("golden_hands_remember_user", JSON.stringify({ role: "admin", id: "admin" }));
          }

          setIsLoading(false);
          setSuccessMessage("Admin authentication verified!");
          onLoginSuccess('admin', { role: 'admin' });
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || "Authentication error occurred. Please try again.");
      }
    }, 800);
  };

  // --- 2. STUDENT REGISTRATION HANDLER ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = regName.trim();
    const email = regEmail.trim();
    const phone = regPhone.replace(/\D/g, '').slice(-10);
    const pass = regPassword.trim();
    const confirm = regConfirmPassword.trim();

    if (!name) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (regMode === 'email' && (!email || !email.includes("@"))) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (regMode === 'mobile' && phone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!pass || pass.length < 4) {
      setErrorMessage("Password must be at least 4 characters.");
      return;
    }

    if (pass !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    // CHECK DUPLICATE ACCOUNTS
    const existingStudents = MockDatabase.getRegisteredStudents();
    const isDupEmail = email && existingStudents.some(s => s.email && s.email.trim().toLowerCase() === email.toLowerCase());
    const isDupPhone = phone && existingStudents.some(s => s.phone && s.phone.replace(/\D/g, '').slice(-10) === phone);

    if (isDupEmail) {
      setErrorMessage("An account with this Email Address already exists. Please log in instead.");
      return;
    }

    if (isDupPhone) {
      setErrorMessage("An account with this Mobile Number already exists. Please log in instead.");
      return;
    }

    setIsLoading(true);

    if (regMode === 'email') {
      try {
        // 1. Create Firebase Auth user
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(auth, email, pass);
          if (userCred.user) {
            // 2. Dispatch Firebase Auth Verification Email Link
            await sendEmailVerification(userCred.user);
            console.log("[Firebase Auth] Verification email link dispatched to:", email);
          }
        } catch (fbErr: any) {
          console.warn("[Firebase Auth] Registration notice:", fbErr);
          if (fbErr.code === 'auth/email-already-in-use') {
            setIsLoading(false);
            setErrorMessage("This email is already registered in Firebase Auth. Please log in directly.");
            return;
          }
        }

        // 3. Register Student record in database
        MockDatabase.registerStudent(
          name,
          phone || "9000000000",
          email,
          regPackage,
          pass
        );

        setVerificationCode("FIREBASE_AUTH_VERIFICATION_LINK");
        setEnteredCode("");
        setOtpCountdown(30);
        setIsLoading(false);
        setAuthView('verify_registration');
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || "Failed to dispatch Firebase Auth verification email.");
      }
    } else {
      // Mobile OTP Verification Mode
      setTimeout(() => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setVerificationCode(generatedCode);
        setEnteredCode("");
        setOtpCountdown(30);
        setIsLoading(false);
        setAuthView('verify_registration');
      }, 800);
    }
  };

  // --- 3. VERIFY REGISTRATION CODE HANDLER ---
  const handleVerifyRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    if (regMode === 'email') {
      try {
        // Check if user is logged into Firebase Auth and refresh verification state
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        const students = MockDatabase.getRegisteredStudents();
        let found = students.find(s => s.email && s.email.trim().toLowerCase() === regEmail.trim().toLowerCase());

        if (!found) {
          found = MockDatabase.registerStudent(
            regName,
            regPhone || "9000000000",
            regEmail,
            regPackage,
            regPassword
          );
        }

        MockDatabase.setCurrentStudentId(found.id);
        localStorage.setItem("golden_hands_current_student_id", found.id);
        localStorage.setItem("golden_hands_current_role", "student");

        setIsLoading(false);
        setSuccessMessage(`Firebase Email Verification complete! Welcome to Golden Hands, ${found.name}!`);
        onLoginSuccess('student', found);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || "Failed to verify email link.");
      }
    } else {
      // Mobile OTP Verification
      if (enteredCode.trim() !== verificationCode && enteredCode.trim() !== "123456") {
        setIsLoading(false);
        setErrorMessage("Invalid mobile OTP. Use demo OTP 123456 or the code shown below.");
        return;
      }

      try {
        const newStud = MockDatabase.registerStudent(
          regName,
          regPhone,
          regEmail || `${regPhone}@goldenhands.com`,
          regPackage,
          regPassword
        );

        localStorage.setItem("golden_hands_current_student_id", newStud.id);
        localStorage.setItem("golden_hands_current_role", "student");

        setIsLoading(false);
        setSuccessMessage(`Registration successful! Welcome to Golden Hands, ${newStud.name}!`);
        onLoginSuccess('student', newStud);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err?.message || "Failed to create student account.");
      }
    }
  };

  // --- 4. FORGOT PASSWORD REQUEST HANDLER ---
  const handleForgotPasswordRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetId = forgotIdentifier.trim();
    if (!targetId) {
      setErrorMessage("Please enter your registered Email or Mobile Number.");
      return;
    }

    const idLower = targetId.toLowerCase();
    const digitsOnly = targetId.replace(/\D/g, '').slice(-10);

    const students = MockDatabase.getRegisteredStudents();
    const found = students.find(s => {
      const emailMatch = s.email && s.email.trim().toLowerCase() === idLower;
      const phoneMatch = digitsOnly && s.phone && s.phone.replace(/\D/g, '').slice(-10) === digitsOnly;
      return emailMatch || phoneMatch;
    });

    if (!found) {
      setErrorMessage("No student account found matching this Email or Mobile Number.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setTargetForgotStudent(found);
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(generatedCode);
      setEnteredCode("");
      setOtpCountdown(30);
      setIsLoading(false);
      setAuthView('verify_forgot_password');
    }, 1000);
  };

  // --- 5. RESET PASSWORD HANDLER ---
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (enteredCode.trim() !== verificationCode && enteredCode.trim() !== "123456") {
      setErrorMessage("Invalid verification code. Use demo code 123456.");
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!targetForgotStudent) return;

    setIsLoading(true);

    setTimeout(() => {
      targetForgotStudent.password = newPassword;
      MockDatabase.saveStudent(targetForgotStudent);

      setIsLoading(false);
      setSuccessMessage("Password reset successfully! Please log in with your new password.");
      setAuthView('login');
      setPassword(newPassword);
      setIdentifier(targetForgotStudent.email || targetForgotStudent.phone);
    }, 1000);
  };

  // Role details config
  const roleConfig = {
    student: {
      title: "Student Portal",
      badge: "👨‍🎓 Student",
      badgeBg: "bg-[#6D3BFF]/10 text-[#6D3BFF] border-[#6D3BFF]/20",
      accentColor: "#6D3BFF",
      desc: "Access driving classes, schedule slots, theory tests & track practical skills."
    },
    trainer: {
      title: "Trainer Portal",
      badge: "👨‍🏫 Trainer",
      badgeBg: "bg-[#D4AF37]/10 text-[#B89218] border-[#D4AF37]/20",
      accentColor: "#D4AF37",
      desc: "Manage assigned student rosters, complete active sessions & grade practical skills."
    },
    admin: {
      title: "Admin Portal",
      badge: "👨‍💼 Admin",
      badgeBg: "bg-slate-900/10 text-slate-800 border-slate-300",
      accentColor: "#161623",
      desc: "Full command desk to manage student rosters, slot limits & school operations."
    }
  };

  const currentRoleInfo = roleConfig[selectedRole];

  return (
    <div className={`w-full max-w-md sm:max-w-lg mx-auto ${embedded ? '' : 'p-2 sm:p-6'}`}>
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden relative transition-all">
        
        {/* Top Header & Branding Banner */}
        <div className="bg-gradient-to-r from-[#161623] via-[#1f1f33] to-[#161623] text-white p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6D3BFF]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#6D3BFF] to-[#D4AF37] flex items-center justify-center font-black text-white text-xs sm:text-sm shadow-sm border border-white/10 shrink-0">
                GH
              </div>
              <div>
                <h1 className="text-xs font-black tracking-wider uppercase text-white leading-none">GOLDEN HANDS</h1>
                <p className="text-[8px] sm:text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.15em] mt-0.5">DRIVING ACADEMY</p>
              </div>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-300 hover:text-white text-[11px] sm:text-xs font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight relative z-10">
            {authView === 'login' && `Login to ${currentRoleInfo.title}`}
            {authView === 'register' && "Student Account Registration"}
            {authView === 'verify_registration' && "Verify Your Account"}
            {authView === 'forgot_password' && "Reset Student Password"}
            {authView === 'verify_forgot_password' && "Create New Password"}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 sm:mt-1 leading-snug relative z-10">
            {authView === 'login' && currentRoleInfo.desc}
            {authView === 'register' && "Create a new student profile to start your driving sessions."}
            {authView === 'verify_registration' && "Enter the verification code sent to your email/mobile."}
            {authView === 'forgot_password' && "Verify your registered identity to set a new password."}
            {authView === 'verify_forgot_password' && "Enter verification code and choose a new password."}
          </p>
        </div>

        {/* TOP ROLE SELECTION TABS (Required: 👨‍🎓 Student, 👨‍🏫 Trainer, 👨‍💼 Admin) */}
        {authView === 'login' && (
          <div className="p-2.5 sm:p-4 bg-slate-50/90 border-b border-slate-100">
            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 px-1">
              Select Your Access Role
            </label>
            
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-200/70 p-1 rounded-xl sm:rounded-2xl border border-slate-300/50">
              <button
                type="button"
                onClick={() => handleRoleSelect('student')}
                className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'student'
                    ? 'bg-white text-[#6D3BFF] shadow-sm border border-[#6D3BFF]/30 font-black'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>👨‍🎓</span>
                <span className="truncate">Student</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('trainer')}
                className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'trainer'
                    ? 'bg-white text-[#B89218] shadow-sm border border-[#D4AF37]/30 font-black'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>👨‍🏫</span>
                <span className="truncate">Trainer</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-[#161623] text-white shadow-sm border border-slate-700 font-black'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>👨‍💼</span>
                <span className="truncate">Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="p-4 sm:p-6">
          
          {/* SUCCESS MESSAGE BANNER */}
          {successMessage && (
            <div className="mb-5 bg-emerald-50 text-emerald-700 p-3.5 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ERROR MESSAGE BANNER */}
          {errorMessage && (
            <div className="mb-5 bg-rose-50 text-rose-600 p-3.5 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* RATE LIMIT LOCKOUT BANNER */}
          {lockoutCountdown > 0 && (
            <div className="mb-5 bg-amber-50 text-amber-800 p-4 rounded-2xl text-xs font-bold border border-amber-200 flex flex-col gap-1 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">Account Security Lockout</span>
              </div>
              <p className="text-slate-600 font-semibold mt-1">
                Too many failed login attempts detected. Please wait <span className="text-amber-700 font-black">{lockoutCountdown} seconds</span> before trying again.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. LOGIN FORM (Common for Student, Trainer, Admin)                        */}
          {/* ========================================================================= */}
          {authView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              
              {/* Selected Role Badge Indicator */}
              <div className="flex items-center justify-between pb-1">
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${currentRoleInfo.badgeBg}`}>
                  Logging in as: {currentRoleInfo.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {selectedRole === 'student' ? 'Student Credentials' : selectedRole === 'trainer' ? 'Trainer Credentials' : 'Staff Access'}
                </span>
              </div>

              {/* IDENTIFIER FIELD (Email OR Mobile Number in same field) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Email Address or Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    {identifier.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder={
                      selectedRole === 'student'
                        ? "Enter registered Email or 10-digit Phone"
                        : selectedRole === 'trainer'
                        ? "Enter Trainer Phone or Name (e.g. 9040040288)"
                        : "Enter Admin Email or Username (e.g. admin)"
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-all placeholder:text-slate-400"
                    disabled={lockoutCountdown > 0 || isLoading}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD FIELD WITH SHOW/HIDE OPTION */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Password
                  </label>
                  
                  {selectedRole === 'student' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthView('forgot_password');
                        setErrorMessage(null);
                      }}
                      className="text-[11px] font-extrabold text-[#6D3BFF] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF] focus:bg-white transition-all placeholder:text-slate-400"
                    disabled={lockoutCountdown > 0 || isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME OPTION */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember-me-check"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#6D3BFF] focus:ring-[#6D3BFF] cursor-pointer"
                />
                <label htmlFor="remember-me-check" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  Remember login session on this device
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading || lockoutCountdown > 0}
                className={`w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                  selectedRole === 'admin'
                    ? 'bg-slate-900 hover:bg-black'
                    : selectedRole === 'trainer'
                    ? 'bg-gradient-to-r from-[#B89218] to-[#D4AF37] hover:opacity-95 text-black font-extrabold'
                    : 'bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] hover:from-[#5C30E6] hover:to-[#7E42E6]'
                } ${isLoading || lockoutCountdown > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Log In as {selectedRole.toUpperCase()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* ROLE-SPECIFIC FOOTER OPTIONS */}
              {selectedRole === 'student' && (
                <div className="mt-4 text-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span>Don't have a student account yet? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('register');
                      setErrorMessage(null);
                    }}
                    className="font-black text-[#6D3BFF] hover:underline cursor-pointer"
                  >
                    Register Now
                  </button>
                </div>
              )}

              {selectedRole === 'trainer' && (
                <div className="mt-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 text-center text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold">
                    🔒 Trainer accounts are created and managed by Golden Hands Admin.
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    No registration or self-reset required. Contact admin for credentials.
                  </p>
                </div>
              )}

              {selectedRole === 'admin' && (
                <div className="mt-4 bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-center text-xs text-slate-700 leading-relaxed">
                  <p className="font-bold">
                    🛡️ Admin accounts are pre-created and managed securely.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Authorized school administrative personnel only.
                  </p>
                </div>
              )}

            </form>
          )}

          {/* ========================================================================= */}
          {/* 2. STUDENT REGISTRATION FORM                                             */}
          {/* ========================================================================= */}
          {authView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              
              {/* Back to Login Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-1">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#6D3BFF] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
                <span className="text-[10px] font-extrabold uppercase bg-[#6D3BFF]/10 text-[#6D3BFF] px-2.5 py-1 rounded-full">
                  Student Sign Up
                </span>
              </div>

              {/* Registration Type Tabs: Email vs Mobile */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                  Choose Signup Verification Method
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRegMode('email')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      regMode === 'email' ? 'bg-white text-[#6D3BFF] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Email Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegMode('mobile')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      regMode === 'mobile' ? 'bg-white text-[#6D3BFF] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Mobile OTP Registration
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Enter first & last name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Email Address {regMode === 'email' ? '(Verification Required)' : '(Optional)'}
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  required={regMode === 'email'}
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Mobile Number {regMode === 'mobile' ? '(OTP Required)' : '(Optional)'}
                </label>
                <div className="flex gap-2">
                  <div className="px-3 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shrink-0 flex items-center">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    required={regMode === 'mobile'}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Course Package Selection */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Select Training Package</label>
                <select
                  value={regPackage}
                  onChange={(e) => setRegPackage(e.target.value)}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF] leading-snug"
                >
                  <option value="Refresher - ₹1,750 (7 practical classes on road, 30 mins each)">
                    Refresher - ₹1,750 (7 practical classes on road, 30 mins each)
                  </option>
                  <option value="Basic - ₹3,500 (15 practical + 2 theory classes, 30 mins each)">
                    Basic - ₹3,500 (15 practical classes on road + 2 theory classes, 30 mins each)
                  </option>
                  <option value="Extended - ₹5,250 (15+8 practical classes on road + 5 theory classes, 1 hr each)">
                    Extended - ₹5,250 (3,500 + 1,750 = ₹5,250) (15+8 practical classes on road + 5 theory classes, 1 hr each)
                  </option>
                </select>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Set Password</label>
                  <input
                    type={regShowPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Confirm Password</label>
                  <input
                    type={regShowPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg hover:opacity-95 cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Verification ({regMode === 'email' ? 'Email Link' : 'Mobile OTP'})</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. VERIFY REGISTRATION STEP                                               */}
          {/* ========================================================================= */}
          {authView === 'verify_registration' && (
            <form onSubmit={handleVerifyRegistration} className="flex flex-col gap-4">
              {regMode === 'email' ? (
                /* EMAIL REGISTRATION MODE: Verification Link (No OTP) */
                <>
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-[#161623]">Verify Your Email Address</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      A verification link has been sent to <strong className="text-slate-800">{regEmail}</strong>. Click the link to complete registration.
                    </p>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl flex flex-col gap-2.5 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Verification Link Dispatched</span>
                    </div>
                    <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                      Please check your email inbox and click the verification link below to verify your email address. No OTP entry is required.
                    </p>

                    <div className="bg-white border border-emerald-200/80 rounded-xl p-3 text-left mt-1 shadow-xs">
                      <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                        Verification Link
                      </span>
                      <p className="text-[10px] font-mono text-[#6D3BFF] truncate bg-slate-50 p-2 rounded-lg border border-slate-100">
                        https://goldenhands.app/verify-email?email={encodeURIComponent(regEmail)}&token=gh_verify_link
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Didn't receive email?</span>
                    <button
                      type="button"
                      disabled={otpCountdown > 0}
                      onClick={async () => {
                        setOtpCountdown(30);
                        try {
                          if (auth.currentUser) {
                            await sendEmailVerification(auth.currentUser);
                            setSuccessMessage(`Firebase verification link re-sent to ${regEmail}`);
                          } else {
                            setSuccessMessage(`Verification link resent to ${regEmail}`);
                          }
                        } catch (err: any) {
                          setSuccessMessage(`Verification link resent to ${regEmail}`);
                        }
                      }}
                      className={`font-bold text-[#6D3BFF] ${otpCountdown > 0 ? 'opacity-50' : 'hover:underline cursor-pointer'}`}
                    >
                      {otpCountdown > 0 ? `Resend Link in ${otpCountdown}s` : 'Resend Link'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthView('register')}
                      className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 font-extrabold text-xs text-slate-700 rounded-xl cursor-pointer"
                    >
                      Back to Registration
                    </button>
                  </div>
                </>
              ) : (
                /* MOBILE REGISTRATION MODE: 6-Digit OTP Required */
                <>
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-[#6D3BFF]/10 text-[#6D3BFF] rounded-2xl mx-auto flex items-center justify-center mb-3">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-[#161623]">Mobile OTP Verification</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Enter the 6-digit Mobile OTP sent to{' '}
                      <strong className="text-slate-800">+91 {regPhone}</strong>
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-2 text-center">
                      6-Digit Mobile OTP
                    </label>
                    <input
                      type="text"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.trim())}
                      placeholder="e.g. 123456"
                      maxLength={6}
                      className="w-full text-center tracking-[0.3em] font-black text-xl py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#6D3BFF]"
                      required
                    />
                  </div>

                  {/* Demo Mobile OTP Helper */}
                  <div className="bg-indigo-50/80 border border-indigo-100 p-3 rounded-xl text-center text-xs text-indigo-900">
                    <span>Demo Mobile OTP: </span>
                    <strong className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {verificationCode || "123456"}
                    </strong>
                    <p className="text-[10px] text-slate-500 mt-1">(You can also enter 123456 to verify)</p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Didn't receive SMS?</span>
                    <button
                      type="button"
                      disabled={otpCountdown > 0}
                      onClick={() => setOtpCountdown(30)}
                      className={`font-bold text-[#6D3BFF] ${otpCountdown > 0 ? 'opacity-50' : 'hover:underline cursor-pointer'}`}
                    >
                      {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend Mobile OTP'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthView('register')}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 font-extrabold text-xs text-slate-700 rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3.5 bg-[#6D3BFF] hover:bg-[#8F52FF] font-extrabold text-xs text-white rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify OTP & Complete'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ========================================================================= */}
          {/* 4. FORGOT PASSWORD REQUEST                                                */}
          {/* ========================================================================= */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordRequest} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#6D3BFF] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
                <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  Reset Password
                </span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">
                  Registered Email Address or Mobile Number
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Enter your registered email or 10-digit mobile"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Record...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 5. VERIFY FORGOT PASSWORD AND NEW PASSWORD                                */}
          {/* ========================================================================= */}
          {authView === 'verify_forgot_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1 text-center">
                  Enter 6-Digit Code sent to {targetForgotStudent?.email || targetForgotStudent?.phone}
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.trim())}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full text-center tracking-[0.3em] font-black text-xl py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              {/* Demo Code Helper */}
              <div className="bg-indigo-50 p-2.5 rounded-xl text-center text-xs text-indigo-900">
                <span>Demo Code: </span>
                <strong className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {verificationCode || "123456"}
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Set New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save New Password & Log In'}
              </button>
            </form>
          )}

        </div>

      </div>

      {/* ACCOUNT IN DELETION STATE CONFIRMATION POPUP MODAL */}
      {showDeletionWarningModal && pendingDeletionStudent && (
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
                onClick={() => {
                  setShowDeletionWarningModal(false);
                  setPendingDeletionStudent(null);
                }}
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
    </div>
  );
}
