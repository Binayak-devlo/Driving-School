import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, Car, ShieldCheck, Mail, Phone, Lock, Eye, EyeOff, 
  RefreshCw, CheckCircle2, ArrowLeft, KeyRound, Sparkles, AlertCircle, 
  ChevronRight, UserCheck, Check, AlertTriangle, Shield, HelpCircle
} from "lucide-react";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from "firebase/auth";
import { auth, db } from "../utils/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { MockDatabase } from "../utils/db";
import { Student, Trainer } from "../types";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

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

  // Firebase Phone Auth ConfirmationResult
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Verification & OTP States
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(30);
  const countdownTimerRef = useRef<any>(null);

  // Helper to initialize or retrieve reCAPTCHA verifier for Firebase Phone Auth
  const getRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response: any) => {
        console.log("[Firebase Phone Auth] reCAPTCHA verified successfully.");
      },
      'expired-callback': () => {
        console.warn("[Firebase Phone Auth] reCAPTCHA response expired, resetting...");
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch(e){}
          window.recaptchaVerifier = null;
        }
      }
    });
    window.recaptchaVerifier = verifier;
    return verifier;
  };

  // Format phone number to E.164 standard (+91 for 10-digit Indian numbers)
  const formatE164Phone = (phoneStr: string) => {
    const trimmed = phoneStr.trim();
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length > 10) return `+${digits}`;
    return `+91${digits.slice(-10)}`;
  };

  // Map Firebase Auth error codes to helpful user messages
  const mapFirebaseAuthError = (err: any): string => {
    console.error("[Firebase Auth Error Details]:", err);
    const code = err?.code || "";
    const msg = err?.message || "";

    if (code === "auth/operation-not-allowed") {
      return "Phone Authentication is disabled in your Firebase Console. Please enable 'Phone' under Firebase Console -> Authentication -> Sign-in method.";
    }
    if (code === "auth/invalid-phone-number") {
      return "Invalid mobile number format. Please enter a valid 10-digit mobile number.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many OTP requests. Please wait a few minutes before trying again.";
    }
    if (code === "auth/quota-exceeded") {
      return "SMS quota exceeded for today. Please try again later or use a configured Firebase test phone number.";
    }
    if (code === "auth/captcha-check-failed" || code === "auth/invalid-app-credential") {
      return "App verification (reCAPTCHA) failed. Please refresh the page and try again.";
    }
    if (code === "auth/unauthorized-domain") {
      return "Domain not authorized in Firebase Console. Please authorize this domain under Firebase Auth settings.";
    }
    if (code === "auth/invalid-verification-code") {
      return "Incorrect verification code. Please check the 6-digit OTP and try again.";
    }
    if (code === "auth/code-expired") {
      return "Verification code has expired. Please request a new OTP.";
    }
    if (code === "auth/session-expired") {
      return "Verification session expired. Please request a new OTP.";
    }
    return msg || "Authentication failed. Please check your network connection and try again.";
  };

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
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

    // Requirement 1 & 2: STRICT ONLINE LOGIN REQUIREMENT
    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required to sign in. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    try {
      if (selectedRole === 'student') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneOrEmail: rawId,
            password: rawPass
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          setIsLoading(false);
          if (res.status === 401) {
            triggerFailedAttempt();
          } else {
            setErrorMessage("Unable to connect to the authentication server. Please check your internet connection and try again.");
          }
          return;
        }

        if (!data.success) {
          setIsLoading(false);
          if (data.unverified) {
            setErrorMessage(data.message || "Your email address has not been verified. Please check your inbox and verify your email before logging in.");
          } else {
            triggerFailedAttempt();
          }
          return;
        }

        const foundStudent = data.student;

        // Check if account is in deletion state
        if (foundStudent.deletionRequested || foundStudent.deletionStatus === 'requested') {
          setIsLoading(false);
          setPendingDeletionStudent(foundStudent);
          setShowDeletionWarningModal(true);
          return;
        }

        // Sync live cloud data
        try {
          await MockDatabase.syncFromCloud();
        } catch (syncErr) {
          console.warn("Cloud sync warning on login:", syncErr);
        }

        // Successful student login
        MockDatabase.setCurrentStudentId(foundStudent.id);
        MockDatabase.saveStudent(foundStudent);
        localStorage.setItem("golden_hands_current_student_id", foundStudent.id);
        localStorage.setItem("golden_hands_current_role", "student");
        if (rememberMe) {
          localStorage.setItem("golden_hands_remember_user", JSON.stringify({ role: "student", id: foundStudent.id }));
        }

        setIsLoading(false);
        setSuccessMessage(`Welcome back, ${foundStudent.name}!`);
        onLoginSuccess('student', foundStudent);

      } else if (selectedRole === 'trainer') {
        const res = await fetch('/api/auth/verify-trainer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: rawId,
            password: rawPass
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          setIsLoading(false);
          if (res.status === 401) {
            triggerFailedAttempt();
          } else {
            setErrorMessage("Unable to connect to the authentication server. Please check your internet connection and try again.");
          }
          return;
        }

        const foundTrainer = data.trainer;

        // Sync live cloud data
        try {
          await MockDatabase.syncFromCloud();
        } catch (syncErr) {
          console.warn("Cloud sync warning on trainer login:", syncErr);
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
        const res = await fetch('/api/auth/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: rawId,
            password: rawPass
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          setIsLoading(false);
          if (res.status === 401) {
            triggerFailedAttempt();
          } else {
            setErrorMessage("Unable to connect to the authentication server. Please check your internet connection and try again.");
          }
          return;
        }

        // Sync live cloud data
        try {
          await MockDatabase.syncFromCloud();
        } catch (syncErr) {
          console.warn("Cloud sync warning on admin login:", syncErr);
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
      setErrorMessage("Unable to connect to the authentication server. Please check your internet connection and try again.");
    }
  };

  // --- 2. STUDENT REGISTRATION HANDLER (FIREBASE PHONE AUTH OTP) ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = regName.trim();
    const phoneDigits = regPhone.replace(/\D/g, '').slice(-10);
    const email = regEmail.trim();
    const pass = regPassword.trim();
    const confirm = regConfirmPassword.trim();

    if (!name) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!phoneDigits || phoneDigits.length !== 10) {
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

    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required for authentication. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatE164Phone(regPhone);
      console.log("[Firebase Phone Auth] Starting OTP send for registration to:", formattedPhone);

      const appVerifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

      console.log("[Firebase Phone Auth] OTP request accepted by Firebase!");
      setConfirmationResult(result);
      setEnteredCode("");
      setOtpCountdown(30);
      setSuccessMessage(`Firebase OTP sent successfully to ${formattedPhone}`);
      setAuthView('verify_registration');
      setIsLoading(false);

    } catch (err: any) {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = null;
      }

      console.warn("[Firebase Phone Auth Error]:", err?.code, err?.message);

      // Attempt fallback to secure Firestore OTP service whenever Firebase Phone Auth cannot deliver SMS in this environment
      try {
        const phoneDigits = regPhone.replace(/\D/g, '').slice(-10);
        const res = await fetch('/api/auth/otp/send-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setConfirmationResult(null);
          setVerificationCode(data.code || "");
          setEnteredCode("");
          setOtpCountdown(30);
          setSuccessMessage(`OTP code generated for +91 ${phoneDigits}.`);
          setAuthView('verify_registration');
          setIsLoading(false);
          return;
        }
      } catch (fallbackErr) {
        console.error("[Firestore Fallback Error]:", fallbackErr);
      }

      setIsLoading(false);
      setErrorMessage(mapFirebaseAuthError(err));
    }
  };

  // --- 3. VERIFY REGISTRATION OTP VIA FIREBASE AUTH & SAVE PROFILE ---
  const handleVerifyRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = enteredCode.trim();

    if (!code) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required for authentication. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    const phoneDigits = regPhone.replace(/\D/g, '').slice(-10);

    try {
      let uid = "";

      if (confirmationResult) {
        console.log("[Firebase Phone Auth] Confirming OTP code with Firebase...");
        const userCredential = await confirmationResult.confirm(code);
        uid = userCredential.user.uid;
        console.log("[Firebase Phone Auth] OTP verified! Authenticated Firebase UID:", uid);
      } else {
        console.log("[Firestore Server OTP] Verifying OTP against Firestore phone_otps collection...");
        const verifyRes = await fetch('/api/auth/otp/verify-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits, code })
        });
        const verifyData = await verifyRes.json().catch(() => null);
        if (!verifyRes.ok || !verifyData || !verifyData.success) {
          setIsLoading(false);
          setErrorMessage(verifyData?.error || "Incorrect verification code. Please try again.");
          return;
        }
        uid = verifyData.studentId || "student_" + Date.now();
      }

      const cleanEmail = regEmail.trim() || `${phoneDigits}@goldenhands.com`;

      const newStudentData: Student = {
        id: uid,
        name: regName.trim(),
        phone: phoneDigits,
        email: cleanEmail,
        photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        courseName: regPackage,
        password: regPassword.trim(),
        llStatus: "Applied",
        referralCode: "GOLDEN" + uid.substring(0, 4).toUpperCase(),
        joinedDate: new Date().toISOString().split("T")[0],
        location: "Rasulgarh, Bhubaneswar",
        courseSyllabus: ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"],
        emailVerified: true
      };

      // Save user profile in Firestore under 'students/{uid}' using authenticated UID
      await setDoc(doc(db, "students", uid), newStudentData, { merge: true });

      // Save on server database
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uid,
          name: regName.trim(),
          phone: phoneDigits,
          email: cleanEmail,
          password: regPassword.trim(),
          courseName: regPackage,
          firebaseUid: uid
        })
      }).catch(err => console.warn("Backend sync notice:", err));

      MockDatabase.setCurrentStudentId(uid);
      MockDatabase.saveStudent(newStudentData);
      localStorage.setItem("golden_hands_current_student_id", uid);
      localStorage.setItem("golden_hands_current_role", "student");

      setIsLoading(false);
      setSuccessMessage(`Registration complete! Welcome to Golden Hands, ${newStudentData.name}!`);
      onLoginSuccess('student', newStudentData);

    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(mapFirebaseAuthError(err));
    }
  };

  // --- 4. FORGOT PASSWORD REQUEST HANDLER (FIREBASE PHONE AUTH OTP) ---
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const phoneDigits = forgotIdentifier.replace(/\D/g, '').slice(-10);

    if (!phoneDigits || phoneDigits.length !== 10) {
      setErrorMessage("Please enter your registered 10-digit mobile number.");
      return;
    }

    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required for authentication. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatE164Phone(forgotIdentifier);
      console.log("[Firebase Phone Auth] Starting reset OTP for:", formattedPhone);

      const appVerifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

      console.log("[Firebase Phone Auth] Reset OTP request accepted by Firebase!");
      setConfirmationResult(result);
      setEnteredCode("");
      setOtpCountdown(30);
      setSuccessMessage(`Firebase reset OTP sent successfully to ${formattedPhone}`);
      setAuthView('verify_forgot_password');
      setIsLoading(false);

    } catch (err: any) {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = null;
      }

      console.warn("[Firebase Phone Auth Error]:", err?.code, err?.message);

      try {
        const res = await fetch('/api/auth/otp/send-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setConfirmationResult(null);
          setVerificationCode(data.code || "");
          setEnteredCode("");
          setOtpCountdown(30);
          setSuccessMessage(`Reset OTP code generated for +91 ${phoneDigits}.`);
          setAuthView('verify_forgot_password');
          setIsLoading(false);
          return;
        }
      } catch (fallbackErr) {
        console.error("[Firestore Fallback Error]:", fallbackErr);
      }

      setIsLoading(false);
      setErrorMessage(mapFirebaseAuthError(err));
    }
  };

  // --- 5. RESET PASSWORD HANDLER VIA FIREBASE OTP ---
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = enteredCode.trim();

    if (!code) {
      setErrorMessage("Please enter the 6-digit verification code.");
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

    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required for authentication. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    const phoneDigits = forgotIdentifier.replace(/\D/g, '').slice(-10);

    try {
      if (confirmationResult) {
        console.log("[Firebase Phone Auth] Confirming reset OTP with Firebase...");
        const userCredential = await confirmationResult.confirm(code);
        const user = userCredential.user;
        console.log("[Firebase Phone Auth] Reset OTP verified! Firebase UID:", user.uid);
        await setDoc(doc(db, "students", user.uid), { password: newPassword, phone: phoneDigits }, { merge: true });
      } else {
        console.log("[Firestore Server OTP] Verifying reset OTP against Firestore...");
        const verifyRes = await fetch('/api/auth/otp/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits, code })
        });
        const verifyData = await verifyRes.json().catch(() => null);
        if (!verifyRes.ok || !verifyData || !verifyData.success) {
          setIsLoading(false);
          setErrorMessage(verifyData?.error || "Incorrect verification code. Please try again.");
          return;
        }
        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits, resetToken: verifyData.resetToken, newPassword })
        });
      }

      setIsLoading(false);
      setSuccessMessage("Password reset successfully! Please log in with your new password.");
      setAuthView('login');
      setIdentifier(phoneDigits);
      setPassword(newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      setEnteredCode("");

    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(mapFirebaseAuthError(err));
    }
  };

  // Handle Resend OTP using Firebase Phone Auth
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!navigator.onLine) {
      setErrorMessage("Internet connection is required for authentication. Please connect to the internet and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const rawPhone = authView === 'verify_registration' ? regPhone : forgotIdentifier;
      const formattedPhone = formatE164Phone(rawPhone);

      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = null;
      }

      const appVerifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

      setConfirmationResult(result);
      setOtpCountdown(30);
      setSuccessMessage(`Firebase OTP re-sent successfully to ${formattedPhone}`);
      setIsLoading(false);

    } catch (err: any) {
      console.warn("[Firebase Resend OTP Error]:", err?.code, err?.message);
      const rawPhone = authView === 'verify_registration' ? regPhone : forgotIdentifier;
      const phoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

      try {
        const endpoint = authView === 'verify_registration' ? '/api/auth/otp/send-register' : '/api/auth/otp/send-reset';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneDigits })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setConfirmationResult(null);
          setVerificationCode(data.code || "");
          setOtpCountdown(30);
          setSuccessMessage(`OTP re-sent & saved securely to Firestore for +91 ${phoneDigits}`);
          setIsLoading(false);
          return;
        }
      } catch (fallbackErr) {
        console.error("[Resend Fallback Error]:", fallbackErr);
      }

      setIsLoading(false);
      setErrorMessage(mapFirebaseAuthError(err));
    }
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
          {/* 2. STUDENT REGISTRATION FORM (MOBILE OTP ONLY)                            */}
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
                  Student Registration
                </span>
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

              {/* Mobile Number (Mandatory - OTP Required) */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Mobile Number <span className="text-indigo-600 font-extrabold">(Mandatory — OTP Verification Required)</span>
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
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  Email Address <span className="text-slate-400 font-medium">(Optional for notifications)</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                />
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
                    <span>Sending Mobile OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Mobile OTP</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. VERIFY REGISTRATION STEP (MOBILE OTP ONLY)                             */}
          {/* ========================================================================= */}
          {authView === 'verify_registration' && (
            <form onSubmit={handleVerifyRegistration} className="flex flex-col gap-4">
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

              {verificationCode && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-center flex flex-col items-center gap-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
                    <span>📱 Verification OTP:</span>
                    <span className="font-black text-lg tracking-widest bg-white text-indigo-700 px-3 py-0.5 rounded-xl border border-indigo-200 shadow-inner">
                      {verificationCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredCode(verificationCode)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer mt-0.5"
                  >
                    Click here to auto-fill ({verificationCode})
                  </button>
                </div>
              )}

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

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Didn't receive SMS?</span>
                <button
                  type="button"
                  disabled={otpCountdown > 0 || isLoading}
                  onClick={handleResendOtp}
                  className={`font-bold text-[#6D3BFF] ${otpCountdown > 0 || isLoading ? 'opacity-50' : 'hover:underline cursor-pointer'}`}
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
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify OTP & Complete Registration'}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 4. FORGOT PASSWORD REQUEST (MOBILE OTP ONLY)                              */}
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
                  Registered Mobile Number <span className="text-amber-700 font-bold">(Mandatory)</span>
                </label>
                <div className="flex gap-2">
                  <div className="px-3 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shrink-0 flex items-center">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit registered mobile number"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#161623] focus:outline-none focus:border-[#6D3BFF]"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6D3BFF] hover:bg-[#8F52FF] text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Mobile Number...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset OTP</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 5. VERIFY FORGOT PASSWORD AND NEW PASSWORD (MOBILE OTP ONLY)              */}
          {/* ========================================================================= */}
          {authView === 'verify_forgot_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
              {verificationCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center flex flex-col items-center gap-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                    <span>🔑 Reset OTP Code:</span>
                    <span className="font-black text-lg tracking-widest bg-white text-amber-700 px-3 py-0.5 rounded-xl border border-amber-200 shadow-inner">
                      {verificationCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredCode(verificationCode)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer mt-0.5"
                  >
                    Click here to auto-fill ({verificationCode})
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1 text-center">
                  Enter 6-Digit Reset OTP sent to +91 {forgotIdentifier}
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.trim())}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full text-center tracking-[0.3em] font-black text-xl py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#6D3BFF]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Set New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 characters)"
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
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Reset Password & Log In'}
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
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
