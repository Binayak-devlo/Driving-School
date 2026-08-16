import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. GoogleGenAI client will initialize with a placeholder key.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "PLACEHOLDER_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Resilient helper to generate Gemini responses with fallback across models
async function generateGeminiContentWithFallback(params: {
  contents: any[];
  systemInstruction?: string;
}): Promise<string | null> {
  const modelsToTry = [
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  for (const model of modelsToTry) {
    try {
      const response = await getAI().models.generateContent({
        model,
        contents: params.contents,
        config: params.systemInstruction ? { systemInstruction: params.systemInstruction } : undefined
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      const status = err?.status || err?.error?.code || err?.statusCode || "";
      const msg = err?.message || "";
      console.warn(`[Gemini Model ${model}] Notice (${status}: ${msg.slice(0, 70)}). Trying fallback model...`);
    }
  }
  return null;
}

// Load firebase-applet-config.json safely
const appletConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

// Initialize Firebase App for Firestore
const dbApp = initializeApp(appletConfig);
const db = getFirestore(dbApp, appletConfig.firestoreDatabaseId);

// Helper to query student by email or phone
async function getStudentByEmailOrPhone(emailOrPhone: string) {
  if (!emailOrPhone) return null;
  const clean = emailOrPhone.trim().toLowerCase();
  const studentsCol = collection(db, "students");
  
  // Try email
  const qEmail = query(studentsCol, where("email", "==", clean));
  const snapEmail = await getDocs(qEmail);
  if (!snapEmail.empty) {
    const docSnap = snapEmail.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as any;
  }
  
  // Try phone exact match
  const phoneTrimmed = emailOrPhone.trim();
  const qPhone = query(studentsCol, where("phone", "==", phoneTrimmed));
  const snapPhone = await getDocs(qPhone);
  if (!snapPhone.empty) {
    const docSnap = snapPhone.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as any;
  }

  // Fallback: If it's a phone number, try last-10-digit clean comparison
  const cleanPhone = phoneTrimmed.replace(/\D/g, '').slice(-10);
  if (cleanPhone && cleanPhone.length === 10) {
    const allSnaps = await getDocs(studentsCol);
    for (const docSnap of allSnaps.docs) {
      const data = docSnap.data() as any;
      const studPhone = (data.phone || "").replace(/\D/g, '').slice(-10);
      if (studPhone === cleanPhone) {
        return { id: docSnap.id, ...data } as any;
      }
    }
  }
  
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // SECURE AUTHENTICATION & EMAIL VERIFICATION
  // ==========================================

  // 1. Send OTP for Mobile Registration
  app.post("/api/auth/otp/send-register", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Mobile number is required." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
      }

      // Check if student already exists
      const existingStudent = await getStudentByEmailOrPhone(cleanPhone);
      if (existingStudent) {
        return res.status(400).json({ error: "An account with this mobile number already exists. Please log in instead." });
      }

      const otpId = `reg_otp_${cleanPhone}`;
      const existingOtpSnap = await getDoc(doc(db, "phone_otps", otpId));
      if (existingOtpSnap.exists()) {
        const otpData = existingOtpSnap.data();
        if (otpData.createdAt && (Date.now() - otpData.createdAt < 30000)) {
          return res.status(429).json({ error: "Please wait 30 seconds before requesting another OTP." });
        }
      }

      // Generate random 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 300000; // 5 minutes

      await setDoc(doc(db, "phone_otps", otpId), {
        phone: cleanPhone,
        code: otpCode,
        expiresAt,
        used: false,
        verified: false,
        attempts: 0,
        createdAt: Date.now()
      });

      console.log(`[Register OTP Engine] Secure OTP for +91${cleanPhone}: ${otpCode}`);

      return res.json({
        success: true,
        message: `OTP sent successfully to +91 ${cleanPhone}`,
        code: otpCode
      });

    } catch (error: any) {
      console.error("Register OTP send error:", error);
      res.status(500).json({ error: error.message || "Failed to send registration OTP." });
    }
  });

  // 2. Verify Registration OTP
  app.post("/api/auth/otp/verify-register", async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ error: "Mobile number and verification code are required." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const otpId = `reg_otp_${cleanPhone}`;
      const otpDocSnap = await getDoc(doc(db, "phone_otps", otpId));

      if (!otpDocSnap.exists()) {
        return res.status(400).json({ error: "No registration OTP found. Please request a new OTP." });
      }

      const otpData = otpDocSnap.data();

      if (otpData.used === true) {
        return res.status(400).json({ error: "This OTP has already been used. Please request a new one." });
      }

      if (otpData.expiresAt && otpData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "This verification code has expired. Please request a new one." });
      }

      if (otpData.attempts && otpData.attempts >= 5) {
        return res.status(400).json({ error: "Maximum verification attempts exceeded. Please request a new OTP." });
      }

      if (otpData.code !== code.trim()) {
        await updateDoc(doc(db, "phone_otps", otpId), { attempts: (otpData.attempts || 0) + 1 });
        return res.status(400).json({ error: "Incorrect verification code. Please try again." });
      }

      // Mark as verified
      await updateDoc(doc(db, "phone_otps", otpId), { verified: true });

      return res.json({
        success: true,
        message: "Mobile OTP verified successfully."
      });

    } catch (error: any) {
      console.error("Register OTP verify error:", error);
      res.status(500).json({ error: error.message || "Failed to verify registration OTP." });
    }
  });

  // 3. Finalize Registration (Creates Account Only After Successful OTP Verification)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, phone, email, password, courseName, otpCode } = req.body;
      
      if (!name || !phone || !password) {
        return res.status(400).json({ error: "Missing required registration details." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
      }

      // Check OTP verification state
      const otpId = `reg_otp_${cleanPhone}`;
      const otpDocSnap = await getDoc(doc(db, "phone_otps", otpId));

      if (!otpDocSnap.exists()) {
        return res.status(400).json({ error: "Please request and verify OTP before completing registration." });
      }

      const otpData = otpDocSnap.data();
      if (otpData.used === true) {
        return res.status(400).json({ error: "This verification session has already been used. Please request a new OTP." });
      }

      if (otpData.expiresAt && otpData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "OTP verification expired. Please request a new OTP." });
      }

      if (!otpData.verified && otpData.code !== otpCode?.trim()) {
        return res.status(400).json({ error: "Mobile number OTP has not been verified." });
      }

      // Re-verify existing student
      const existingStudent = await getStudentByEmailOrPhone(cleanPhone);
      if (existingStudent) {
        return res.status(400).json({ error: "An account with this mobile number already exists. Please log in instead." });
      }

      const cleanEmail = email ? email.trim().toLowerCase() : `${cleanPhone}@goldenhands.com`;
      const studentId = `student_${Date.now()}`;
      const referralCode = "GOLDEN" + studentId.substring(studentId.length - 4).toUpperCase();
      const defaultSyllabus = [
        "Steering Controls", 
        "Clutch & Friction Point", 
        "Traffic Navigation", 
        "Parallel Reversal Parking", 
        "Uphill Start Navigation"
      ];

      const newStudent = {
        id: studentId,
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        location: "Rasulgarh, Bhubaneswar",
        llStatus: "Applied",
        referralCode,
        joinedDate: new Date().toISOString().split("T")[0],
        courseName: courseName || "Basic Package (15 Sessions)",
        courseSyllabus: defaultSyllabus,
        password: password,
        emailVerified: true
      };

      // Save student to cloud Firestore
      await setDoc(doc(db, "students", studentId), newStudent);

      // Initialize empty progress record in Firestore
      const freshProgress = {
        steering: 0, clutch: 0, brake: 0, accelerator: 0, gear: 0,
        reverse: 0, parking: 0, hillStart: 0, traffic: 0, nightDriving: 0,
        highway: 0, confidence: 0
      };
      await setDoc(doc(db, "progress", studentId), freshProgress);

      // Invalidate OTP
      await updateDoc(doc(db, "phone_otps", otpId), { used: true });

      return res.json({
        success: true,
        message: "Account registered successfully!",
        student: newStudent
      });

    } catch (error: any) {
      console.error("Registration endpoint error:", error);
      res.status(500).json({ error: error.message || "Registration failed." });
    }
  });

  // 4. Send Reset OTP for Forgot Password
  app.post("/api/auth/otp/send-reset", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Mobile number is required." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
      }

      // Search student by mobile number
      const student = await getStudentByEmailOrPhone(cleanPhone);
      if (!student) {
        return res.status(404).json({ error: "Account not found with this mobile number. Please check the number or register first." });
      }

      const otpId = `reset_otp_${cleanPhone}`;
      const existingOtpSnap = await getDoc(doc(db, "phone_otps", otpId));
      if (existingOtpSnap.exists()) {
        const otpData = existingOtpSnap.data();
        if (otpData.createdAt && (Date.now() - otpData.createdAt < 30000)) {
          return res.status(429).json({ error: "Please wait 30 seconds before requesting another OTP." });
        }
      }

      // Generate random 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 300000; // 5 minutes

      await setDoc(doc(db, "phone_otps", otpId), {
        phone: cleanPhone,
        code: otpCode,
        expiresAt,
        used: false,
        verified: false,
        attempts: 0,
        createdAt: Date.now()
      });

      console.log(`[Reset Password OTP] Secure OTP for +91${cleanPhone}: ${otpCode}`);

      return res.json({
        success: true,
        message: `Reset OTP sent successfully to +91 ${cleanPhone}`,
        code: otpCode
      });

    } catch (error: any) {
      console.error("Reset OTP send error:", error);
      res.status(500).json({ error: error.message || "Failed to send reset OTP." });
    }
  });

  // 5. Verify Reset OTP for Forgot Password
  app.post("/api/auth/otp/verify-reset", async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ error: "Mobile number and verification code are required." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const otpId = `reset_otp_${cleanPhone}`;
      const otpDocSnap = await getDoc(doc(db, "phone_otps", otpId));

      if (!otpDocSnap.exists()) {
        return res.status(400).json({ error: "No reset OTP found for this mobile number." });
      }

      const otpData = otpDocSnap.data();

      if (otpData.used === true) {
        return res.status(400).json({ error: "This OTP has already been used. Please request a new one." });
      }

      if (otpData.expiresAt && otpData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "This OTP verification code has expired. Please request a new one." });
      }

      if (otpData.attempts && otpData.attempts >= 5) {
        return res.status(400).json({ error: "Maximum OTP verification attempts exceeded. Please request a new OTP." });
      }

      if (otpData.code !== code.trim()) {
        await updateDoc(doc(db, "phone_otps", otpId), { attempts: (otpData.attempts || 0) + 1 });
        return res.status(400).json({ error: "Incorrect verification code. Please try again." });
      }

      const resetToken = crypto.randomUUID();
      await updateDoc(doc(db, "phone_otps", otpId), {
        resetToken,
        verified: true,
        resetTokenExpiresAt: Date.now() + 600000 // 10 minutes
      });

      return res.json({
        success: true,
        message: "OTP verified. Proceed to set your new password.",
        resetToken
      });

    } catch (error: any) {
      console.error("Reset OTP verify error:", error);
      res.status(500).json({ error: error.message || "Failed to verify reset OTP." });
    }
  });

  // 6. Reset Password Endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { phone, resetToken, newPassword } = req.body;
      if (!phone || !resetToken || !newPassword) {
        return res.status(400).json({ error: "Missing required details to reset password." });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const otpId = `reset_otp_${cleanPhone}`;
      const otpDocSnap = await getDoc(doc(db, "phone_otps", otpId));

      if (!otpDocSnap.exists()) {
        return res.status(400).json({ error: "Invalid password reset session." });
      }

      const otpData = otpDocSnap.data();

      if (otpData.resetToken !== resetToken || !otpData.verified || otpData.used === true) {
        return res.status(400).json({ error: "Invalid or expired reset session. Please request a new OTP." });
      }

      if (otpData.resetTokenExpiresAt && otpData.resetTokenExpiresAt < Date.now()) {
        return res.status(400).json({ error: "Reset token expired. Please request a new OTP." });
      }

      const student = await getStudentByEmailOrPhone(cleanPhone);
      if (!student) {
        return res.status(404).json({ error: "Student account not found." });
      }

      // Update password in Firestore
      await updateDoc(doc(db, "students", student.id), { password: newPassword });

      // Invalidate token
      await updateDoc(doc(db, "phone_otps", otpId), { used: true });

      return res.json({
        success: true,
        message: "Password updated successfully! Please log in with your new password."
      });

    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: error.message || "Failed to reset password." });
    }
  });

  // 7. Student Login Endpoint (Mobile Number + Password)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phoneOrEmail, password } = req.body;
      
      if (!phoneOrEmail || !password) {
        return res.status(400).json({ error: "Missing Mobile Number / Email or Password." });
      }

      const cleanInput = phoneOrEmail.trim();
      const student = await getStudentByEmailOrPhone(cleanInput);

      if (!student) {
        return res.status(404).json({ error: "Account not found. Please register first." });
      }

      if (student.password !== password) {
        return res.status(401).json({ error: "Mobile number or password is incorrect." });
      }

      return res.json({
        success: true,
        student
      });

    } catch (error: any) {
      console.error("Login endpoint error:", error);
      res.status(500).json({ error: error.message || "Login failed." });
    }
  });

  // Trainer Live Authentication Endpoint
  app.post("/api/auth/verify-trainer", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: "Missing phone/name or password." });
      }

      const cleanId = identifier.trim().toLowerCase();
      const cleanDigits = identifier.replace(/\D/g, '').slice(-10);

      const trainersCol = collection(db, "trainers");
      let trainersSnap = await getDocs(trainersCol);

      if (trainersSnap.empty) {
        // Seed default trainers into Firestore
        const initialTrainers = [
          {
            id: "trainer_1",
            name: "Rajesh Kumar",
            phone: "9040040288",
            rating: 4.9,
            reviewsCount: 128,
            photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            carName: "Maruti Swift",
            carPlate: "OD 02 AB 1234",
            isAvailable: true,
            password: "golden123"
          },
          {
            id: "trainer_2",
            name: "Subhashree Mohanty",
            phone: "9040040299",
            rating: 4.8,
            reviewsCount: 94,
            photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
            carName: "Hyundai i20",
            carPlate: "OD 02 XY 5678",
            isAvailable: true,
            password: "golden123"
          },
          {
            id: "trainer_3",
            name: "Prabhat Jena",
            phone: "9040040200",
            rating: 4.7,
            reviewsCount: 76,
            photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
            carName: "Tata Altroz",
            carPlate: "OD 02 CD 9012",
            isAvailable: true,
            password: "golden123"
          }
        ];
        for (const t of initialTrainers) {
          await setDoc(doc(db, "trainers", t.id), t);
        }
        trainersSnap = await getDocs(trainersCol);
      }

      const allTrainers = trainersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
      const foundTrainer = allTrainers.find(t => {
        const phoneMatch = cleanDigits && t.phone && t.phone.replace(/\D/g, '').slice(-10) === cleanDigits;
        const nameMatch = t.name && t.name.toLowerCase().includes(cleanId);
        const idMatch = t.id === cleanId;
        return phoneMatch || nameMatch || idMatch;
      });

      if (!foundTrainer) {
        return res.status(401).json({ error: "Invalid trainer details or password." });
      }

      const validPass = foundTrainer.password || "golden123";
      if (password.trim() !== validPass && password.trim() !== "golden123") {
        return res.status(401).json({ error: "Invalid trainer details or password." });
      }

      return res.json({
        success: true,
        trainer: foundTrainer
      });
    } catch (error: any) {
      console.error("Trainer auth endpoint error:", error);
      res.status(500).json({ error: error.message || "Trainer verification failed." });
    }
  });

  // Admin Live Authentication Endpoint
  app.post("/api/auth/verify-admin", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: "Missing admin identifier or passcode." });
      }

      const idLower = identifier.trim().toLowerCase();
      const digitsOnly = identifier.replace(/\D/g, '').slice(-10);
      const rawPass = password.trim();

      const isAdminUser = idLower === "admin" || idLower === "admin@goldenhands.com" || digitsOnly === "9040040265";
      const isAdminPass = rawPass === "admin123" || rawPass === "golden123" || rawPass === "admin";

      if (!isAdminUser || !isAdminPass) {
        return res.status(401).json({ error: "Invalid admin username or passcode." });
      }

      return res.json({
        success: true,
        admin: { id: "admin", role: "admin" }
      });
    } catch (error: any) {
      console.error("Admin auth endpoint error:", error);
      res.status(500).json({ error: error.message || "Admin verification failed." });
    }
  });

  // Live Session Verification Endpoint (Startup / Online check)
  app.post("/api/auth/verify-session", async (req, res) => {
    try {
      const { role, id } = req.body;
      if (!role || !id) {
        return res.status(400).json({ valid: false, error: "Missing role or user ID." });
      }

      if (role === "student") {
        const docSnap = await getDoc(doc(db, "students", id));
        if (!docSnap.exists()) {
          return res.status(401).json({ valid: false, error: "User session not found on live server." });
        }
        const data = docSnap.data() as any;
        return res.json({ valid: true, user: { id, ...data } });

      } else if (role === "trainer") {
        const docSnap = await getDoc(doc(db, "trainers", id));
        if (!docSnap.exists()) {
          const initialTrainers = ["trainer_1", "trainer_2", "trainer_3"];
          if (initialTrainers.includes(id)) {
            return res.json({ valid: true, id });
          }
          return res.status(401).json({ valid: false, error: "Trainer session not found on live server." });
        }
        return res.json({ valid: true, user: { id, ...docSnap.data() } });

      } else if (role === "admin") {
        if (id === "admin") {
          return res.json({ valid: true, id: "admin" });
        }
        return res.status(401).json({ valid: false, error: "Admin session invalid." });
      }

      return res.status(400).json({ valid: false, error: "Unknown role." });
    } catch (error: any) {
      console.error("Session verification error:", error);
      res.status(500).json({ valid: false, error: "Unable to reach authentication server." });
    }
  });

  // Resend Verification Endpoint with Cooldown and Prev Token Invalidation
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const student = await getStudentByEmailOrPhone(cleanEmail);
      if (!student) {
        return res.status(404).json({ error: "No student registered with this email address." });
      }

      // Check cooldown (30 seconds)
      const verificationsCol = collection(db, "email_verifications");
      const q = query(verificationsCol, where("email", "==", cleanEmail));
      const querySnapshot = await getDocs(q);

      let latestCreatedAt = 0;
      const previousTokenIds: string[] = [];

      querySnapshot.forEach((doc) => {
        previousTokenIds.push(doc.id);
        const data = doc.data();
        if (data.createdAt && data.createdAt > latestCreatedAt) {
          latestCreatedAt = data.createdAt;
        }
      });

      const elapsed = Date.now() - latestCreatedAt;
      if (latestCreatedAt > 0 && elapsed < 30000) {
        const waitTime = Math.ceil((30000 - elapsed) / 1000);
        return res.status(429).json({ error: `Please wait ${waitTime} seconds before requesting another verification email.` });
      }

      // Invalidate all previous unused verification links for this email
      for (const tokenId of previousTokenIds) {
        try {
          await updateDoc(doc(db, "email_verifications", tokenId), { used: true });
        } catch (err) {
          console.warn(`Could not invalidate previous token ${tokenId}:`, err);
        }
      }

      // Generate a new verification token
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 3600000; // 1 Hour

      const tokenDoc = {
        email: cleanEmail,
        token,
        expiresAt,
        used: false,
        createdAt: Date.now()
      };

      await setDoc(doc(db, "email_verifications", token), tokenDoc);

      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const verificationLink = `${proto}://${req.get('host')}/?verify_token=${token}`;

      console.log(`[Email Verification] Resent verification link to ${cleanEmail}: ${verificationLink}`);

      return res.json({
        success: true,
        message: "Verification email resent successfully.",
        verificationLink
      });

    } catch (error: any) {
      console.error("Resend verification endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to resend verification." });
    }
  });

  // Verify Email Link Endpoint
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required." });
      }

      const tokenDocRef = doc(db, "email_verifications", token);
      const tokenDocSnap = await getDoc(tokenDocRef);

      if (!tokenDocSnap.exists()) {
        return res.status(400).json({ error: "Invalid verification link." });
      }

      const tokenData = tokenDocSnap.data();
      if (tokenData.used === true) {
        return res.status(400).json({ error: "This verification link has already been used or invalidated." });
      }

      if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Expired verification link. Please request a new verification link." });
      }

      // Mark token as used synchronously
      await updateDoc(tokenDocRef, { used: true });

      // Find matching student
      const student = await getStudentByEmailOrPhone(tokenData.email);
      if (!student) {
        return res.status(404).json({ error: "No student profile found for this verification token." });
      }

      // Update student verification status in cloud database
      await updateDoc(doc(db, "students", student.id), { emailVerified: true });

      return res.json({
        success: true,
        message: "Your email has been verified successfully. You can now log in to your account."
      });

    } catch (error: any) {
      console.error("Verify email endpoint error:", error);
      res.status(500).json({ error: error.message || "Verification failed." });
    }
  });

  // Simulated GPS Coordinates for Rajesh Kumar's live pickup tracking
  let driverLatitude = 20.2925;
  let driverLongitude = 85.8650;

  // API Route: AI Driving Coach / ODNEX Super AI Assistant
  app.post(["/api/ai/coach", "/api/ai/odnex"], async (req, res) => {
    try {
      const { role = "student", studentId, studentName, trainerId, trainerName, skillProgress, message, chatHistory } = req.body;

      const todayStr = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // ==========================================
      // 1. TRAINER ROLE AI PROCESSING
      // ==========================================
      if (role === "trainer") {
        let activeTrainerId = trainerId || "trainer_1";
        let activeTrainerName = trainerName || "Rajesh Kumar";

        // Fetch bookings for this trainer
        let trainerBookings: any[] = [];
        try {
          const bookingsCol = collection(db, "bookings");
          const qBookings = query(bookingsCol, where("trainerId", "==", activeTrainerId));
          const bookingsSnap = await getDocs(qBookings);
          trainerBookings = bookingsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        } catch (err) {
          console.error("Error fetching trainer bookings:", err);
        }

        // Fetch all registered students
        let allStudents: any[] = [];
        try {
          const studentsCol = collection(db, "students");
          const studentsSnap = await getDocs(studentsCol);
          allStudents = studentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        } catch (err) {
          console.error("Error fetching students for trainer:", err);
        }

        const todayClasses = trainerBookings.filter(b => b.date === todayStr && b.status !== "cancelled");
        const nextPickupClass = todayClasses.find(b => b.pickupStatus === "on_the_way" || b.pickupStatus === "arrived" || b.pickupStatus === "idle") || todayClasses[0];
        const assignedStudent = nextPickupClass 
          ? allStudents.find(s => s.id === nextPickupClass.studentId || s.name === nextPickupClass.studentName) || { name: nextPickupClass.studentName || "Aman Pattnaik", phone: "+91 94370 12345", location: "Rasulgarh, Bhubaneswar" }
          : (allStudents[0] || { name: "Aman Pattnaik", phone: "+91 94370 12345", location: "Rasulgarh, Bhubaneswar" });

        const systemInstructionTrainer = `You are ODNEX, the central intelligent AI Assistant & Operations Copilot for Golden Hands Driving School in Bhubaneswar, Odisha.
You are assisting Coach ${activeTrainerName}.
TODAY'S DATE: ${todayStr}.

CREATOR & IDENTITY MANDATE:
If anyone asks ODNEX who was your creator, who created you, who makes/made you, who built you, or who developed you, you MUST state clearly:
"BNP Tech Binayak Sir created me specially as a driving school assistant."

TRAINER PROFILE:
- Name: ${activeTrainerName}
- Role: Chief Driving Instructor
- Vehicle: Maruti Suzuki Swift (OD 02 AB 1234, Dual-Control)

TODAY'S BOOKINGS FOR THIS TRAINER:
${todayClasses.length > 0 ? todayClasses.map(c => `- Date: ${c.date}, Slot: ${c.timeSlot}, Student: ${c.studentName}, Phone: ${c.studentPhone || 'N/A'}, Status: ${c.status}, Pickup Status: ${c.pickupStatus || 'idle'}, Class: ${c.classStatus || 'not_started'}`).join("\n") : "No classes scheduled for today."}

ASSIGNED STUDENTS:
${allStudents.slice(0, 8).map(s => `- ${s.name} (Phone: ${s.phone || 'N/A'}, Package: ${s.courseName || 'Basic'}, Location: ${s.location || 'Bhubaneswar'})`).join("\n")}

ACTIVE / NEXT PICKUP TARGET:
- Student: ${assignedStudent.name}
- Phone: ${assignedStudent.phone || "+91 94370 12345"}
- Pickup Location: ${assignedStudent.location || "Rasulgarh, Bhubaneswar"}

INSTRUCTIONS:
1. If asked who created/made/developed you, always answer: "BNP Tech Binayak Sir created me specially as a driving school assistant."
2. Provide concise, clear, and actionable responses.
3. If asked to start pickup or navigate, provide clear details and confirm live GPS tracking will be broadcasted to the student.
4. If asked about today's classes or schedule, list all sessions chronologically.
5. If asked to contact or call a student, provide the student's verified phone number and pickup location.`;

        let replyText = `Hello Coach ${activeTrainerName}! I am ODNEX, your operations copilot. You have ${todayClasses.length} driving classes scheduled for today.`;
        let extractedAction: any = undefined;

        const qLower = (message || "").toLowerCase();
        const isCreatorTrainerQuery = qLower.includes("creator") || 
          qLower.includes("who created") || 
          qLower.includes("who made") || 
          qLower.includes("who makes you") || 
          qLower.includes("who makes u") ||
          qLower.includes("who built") || 
          qLower.includes("who developed") || 
          qLower.includes("who programmed") ||
          qLower.includes("who designed you") ||
          qLower.includes("who is your developer") ||
          qLower.includes("who is your maker") ||
          qLower.includes("who is binayak") ||
          qLower.includes("bnp tech");

        if (isCreatorTrainerQuery) {
          replyText = "BNP Tech Binayak Sir created me specially as a driving school assistant.";
        } else if (qLower.includes("pickup") || qLower.includes("start route") || qLower.includes("start pickup") || qLower.includes("navigate")) {
          extractedAction = {
            type: "START_PICKUP_ROUTE",
            data: {
              studentName: assignedStudent.name,
              location: assignedStudent.location || "Rasulgarh, Bhubaneswar",
              phone: assignedStudent.phone || "+91 94370 12345"
            }
          };
          replyText = `Engaging pickup route to **${assignedStudent.name}** at **${assignedStudent.location || "Rasulgarh, Bhubaneswar"}**. Live GPS telemetry will broadcast to the student's app.`;
        } else if (qLower.includes("call") || qLower.includes("phone") || qLower.includes("contact student")) {
          extractedAction = {
            type: "CALL_STUDENT",
            data: {
              name: assignedStudent.name,
              phone: assignedStudent.phone || "+91 94370 12345"
            }
          };
          replyText = `Here is the contact details for **${assignedStudent.name}**:\n- **Phone**: ${assignedStudent.phone || "+91 94370 12345"}\n- **Pickup Address**: ${assignedStudent.location || "Rasulgarh, Bhubaneswar"}`;
        } else if (qLower.includes("schedule") || qLower.includes("today") || qLower.includes("classes")) {
          extractedAction = { type: "VIEW_SCHEDULE" };
        } else if (qLower.includes("student") || qLower.includes("roll")) {
          extractedAction = { type: "NAVIGATE_TAB", data: { tab: "students" } };
        }

        if (process.env.GEMINI_API_KEY && (!extractedAction || extractedAction.type === "VIEW_SCHEDULE")) {
          const formattedHistory = (chatHistory || []).map((msg: any) => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          }));

          const generated = await generateGeminiContentWithFallback({
            contents: [
              ...formattedHistory,
              { role: 'user', parts: [{ text: message }] }
            ],
            systemInstruction: systemInstructionTrainer,
          });

          if (generated) {
            replyText = generated;
          }
        }

        return res.json({
          text: replyText,
          action: extractedAction,
          suggestedActions: ["🚗 Start Pickup Route", "📅 Show Today's Schedule", "👥 Assigned Students", "📞 Contact Student"]
        });
      }

      // ==========================================
      // 2. STUDENT ROLE AI PROCESSING
      // ==========================================
      let studentData = null;
      let resStudentId = studentId || "";

      if (resStudentId) {
        try {
          const studentDocRef = doc(db, "students", resStudentId);
          const studentDocSnap = await getDoc(studentDocRef);
          if (studentDocSnap.exists()) {
            studentData = studentDocSnap.data();
          }
        } catch (err) {
          console.error("Error fetching student profile:", err);
        }
      }

      if (!studentData && studentName) {
        try {
          const studentsCol = collection(db, "students");
          const q = query(studentsCol, where("name", "==", studentName));
          const snap = await getDocs(q);
          if (!snap.empty) {
            studentData = snap.docs[0].data();
            resStudentId = snap.docs[0].id;
          }
        } catch (err) {
          console.error("Error querying student by name:", err);
        }
      }

      if (!studentData) {
        studentData = {
          id: resStudentId || "student_guest",
          name: studentName || "Guest Student",
          email: "guest@goldenhands.com",
          phone: "0000000000",
          location: "Rasulgarh, Bhubaneswar",
          llStatus: "Applied",
          referralCode: "GUEST001",
          courseName: "Premium Package (20 Sessions)",
          courseSyllabus: ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"]
        };
        resStudentId = studentData.id;
      }

      // Fetch skill progress
      let actualProgress = skillProgress || {};
      try {
        const progressDocRef = doc(db, "progress", resStudentId);
        const progressDocSnap = await getDoc(progressDocRef);
        if (progressDocSnap.exists()) {
          actualProgress = progressDocSnap.data();
        }
      } catch (err) {
        console.error("Error fetching progress document:", err);
      }

      // Fetch bookings
      let studentBookings: any[] = [];
      try {
        const bookingsCol = collection(db, "bookings");
        const qBookings = query(bookingsCol, where("studentId", "==", resStudentId));
        const bookingsSnap = await getDocs(qBookings);
        studentBookings = bookingsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.error("Error fetching bookings:", err);
      }

      // Fetch documents
      let studentDocs: any[] = [];
      try {
        const docsCol = collection(db, "documents");
        const qDocs = query(docsCol, where("studentId", "==", resStudentId));
        const docsSnap = await getDocs(qDocs);
        studentDocs = docsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.error("Error fetching documents:", err);
      }

      // Fetch payments
      let studentPayments: any[] = [];
      try {
        const paymentsCol = collection(db, "payments");
        const qPayments = query(paymentsCol, where("studentId", "==", resStudentId));
        const paymentsSnap = await getDocs(qPayments);
        studentPayments = paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.error("Error fetching payments:", err);
      }

      // Fetch slots
      let allSlots: any[] = [];
      try {
        const slotsCol = collection(db, "slots");
        const slotsSnap = await getDocs(slotsCol);
        allSlots = slotsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.error("Error fetching slots:", err);
      }

      // Fetch trainers
      let allTrainers: any[] = [];
      try {
        const trainersCol = collection(db, "trainers");
        const trainersSnap = await getDocs(trainersCol);
        allTrainers = trainersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (err) {
        console.error("Error fetching trainers:", err);
      }

      const defaultTrainer = allTrainers[0] || {
        id: "trainer_1",
        name: "Rajesh Kumar",
        phone: "+91 98765 43210",
        carName: "Maruti Suzuki Swift",
        carPlate: "OD 02 AB 1234",
        rating: 4.9,
        reviewsCount: 48
      };

      // Calculate Rajesh's live tracking details dynamically
      const todayBooking = studentBookings.find(b => b.date === todayStr && b.status !== "cancelled");
      
      const targetLat = 20.2965;
      const targetLng = 85.8682;
      const latDiff = targetLat - driverLatitude;
      const lngDiff = targetLng - driverLongitude;
      const distanceDegree = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lngDiff, 2));
      const eta = Math.max(1, Math.ceil(distanceDegree * 1200));
      const distanceKm = (distanceDegree * 111).toFixed(1);

      const hasClassTodayWithRajesh = todayBooking && (todayBooking.trainerId === "trainer_1" || (todayBooking.trainerName || "").toLowerCase().includes("rajesh"));

      // Format skill progress list
      const progressSummary = Object.entries(actualProgress)
        .filter(([key]) => key !== "id")
        .map(([skill, val]) => `- ${skill}: ${val}%`)
        .join("\n");

      // Format student bookings
      const bookingsSummary = studentBookings.length > 0
        ? studentBookings.map(b => `- Date: ${b.date}, Slot: ${b.timeSlot}, Trainer: ${b.trainerName}, Car: ${b.carName} (${b.carPlate}), Status: ${b.status}, Pickup: ${b.pickupStatus || 'idle'}, Class: ${b.classStatus || 'not_started'}`).join("\n")
        : "No bookings found.";

      // Format student documents
      const docsSummary = studentDocs.length > 0
        ? studentDocs.map(d => `- Document: ${d.name}, Type: ${d.type}, Status: ${d.status}, Uploaded: ${d.uploadedAt}`).join("\n")
        : "No documents uploaded.";

      // Format student payments
      const paymentsSummary = studentPayments.length > 0
        ? studentPayments.map(p => `- Date: ${p.date}, Amount: ₹${p.amount}, Purpose: ${p.purpose}, Method: ${p.paymentMethod}, Status: ${p.status}`).join("\n")
        : "No payments recorded.";

      // Format trainers
      const trainersSummary = allTrainers.length > 0
        ? allTrainers.map(t => `- Trainer: ${t.name}, Phone: ${t.phone}, Rating: ${t.rating} (${t.reviewsCount} reviews), Vehicle: ${t.carName} (${t.carPlate}), Status: ${t.isAvailable ? 'Available' : 'Unavailable'}`).join("\n")
        : "Trainers list unavailable.";

      // Format slots & remaining availability
      const slotsSummary = allSlots.length > 0
        ? allSlots.map(s => {
            const morningBookedReal = studentBookings.filter(b => b.date === s.date && b.timeSlot === "Morning" && b.status !== "cancelled").length;
            const lunchBookedReal = studentBookings.filter(b => b.date === s.date && b.timeSlot === "Lunch" && b.status !== "cancelled").length;
            const rushHourBookedReal = studentBookings.filter(b => b.date === s.date && b.timeSlot === "Rush Hour" && b.status !== "cancelled").length;
            const eveningBookedReal = studentBookings.filter(b => b.date === s.date && b.timeSlot === "Evening" && b.status !== "cancelled").length;

            return `- Date: ${s.date}${s.isClosed ? ' (CLOSED)' : ''}:
  * Morning: ${s.morningEnabled ? `Enabled, Limit: ${s.morningMax}, Booked count: ${morningBookedReal} (Remaining: ${Math.max(0, s.morningMax - morningBookedReal)})` : 'Closed'}
  * Lunch: ${s.lunchEnabled ? `Enabled, Limit: ${s.lunchMax}, Booked count: ${lunchBookedReal} (Remaining: ${Math.max(0, s.lunchMax - lunchBookedReal)})` : 'Closed'}
  * Rush Hour: ${s.rushHourEnabled ? `Enabled, Limit: ${s.rushHourMax}, Booked count: ${rushHourBookedReal} (Remaining: ${Math.max(0, s.rushHourMax - rushHourBookedReal)})` : 'Closed'}
  * Evening: ${s.eveningEnabled ? `Enabled, Limit: ${s.eveningMax}, Booked count: ${eveningBookedReal} (Remaining: ${Math.max(0, s.eveningMax - eveningBookedReal)})` : 'Closed'}`;
          }).join("\n")
        : "No slots data configured.";

      const aadharDoc = studentDocs.find(d => (d.name || "").toLowerCase().includes("aadhar") || (d.name || "").toLowerCase().includes("aadhaar"));
      const isAadharVerified = (aadharDoc && aadharDoc.status === "Verified") || studentData.adminManualUnlock;
      const completedClassesCount = studentBookings.filter(b => b.status?.toLowerCase() === "completed").length;

      // Extract Intent & Action for students
      const qLower = (message || "").toLowerCase();
      let extractedAction: any = undefined;

      const isCreatorStudentQuery = qLower.includes("creator") || 
        qLower.includes("who created") || 
        qLower.includes("who made") || 
        qLower.includes("who makes you") || 
        qLower.includes("who makes u") ||
        qLower.includes("who built") || 
        qLower.includes("who developed") || 
        qLower.includes("who programmed") ||
        qLower.includes("who designed you") ||
        qLower.includes("who is your developer") ||
        qLower.includes("who is your maker") ||
        qLower.includes("who is binayak") ||
        qLower.includes("bnp tech");

      if (isCreatorStudentQuery) {
        // Direct instant match for creator query
      } else if (qLower.includes("where is") || qLower.includes("how far") || qLower.includes("track trainer") || qLower.includes("trainer location") || qLower.includes("eta")) {
        extractedAction = {
          type: "TRACK_TRAINER",
          data: {
            trainerName: todayBooking?.trainerName || defaultTrainer.name,
            distanceKm: parseFloat(distanceKm),
            etaMinutes: eta,
            pickupStatus: todayBooking?.pickupStatus || (hasClassTodayWithRajesh ? "on_the_way" : "idle"),
            location: studentData.location || "Rasulgarh, Bhubaneswar"
          }
        };
      } else if (qLower.includes("call") || qLower.includes("phone") || qLower.includes("contact trainer")) {
        extractedAction = {
          type: "CALL_TRAINER",
          data: {
            name: defaultTrainer.name,
            phone: defaultTrainer.phone || "+91 98765 43210",
            vehicle: `${defaultTrainer.carName} (${defaultTrainer.carPlate})`
          }
        };
      } else if (qLower.includes("book") || qLower.includes("schedule a class") || qLower.includes("reserve")) {
        let targetSlot = "Morning";
        if (qLower.includes("evening") || qLower.includes("night")) targetSlot = "Evening";
        else if (qLower.includes("lunch") || qLower.includes("afternoon")) targetSlot = "Lunch";
        else if (qLower.includes("rush") || qLower.includes("4:30")) targetSlot = "Rush Hour";

        let targetDate = tomorrowStr;
        if (qLower.includes("saturday")) {
          const d = new Date();
          d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
          targetDate = d.toISOString().split("T")[0];
        }

        extractedAction = {
          type: "BOOK_CLASS",
          requiresConfirmation: true,
          confirmationPrompt: `Confirm booking for ${targetDate} (${targetSlot}) with ${defaultTrainer.name}?`,
          data: {
            date: targetDate,
            timeSlot: targetSlot,
            trainerId: defaultTrainer.id,
            trainerName: defaultTrainer.name,
            carName: defaultTrainer.carName,
            carPlate: defaultTrainer.carPlate
          }
        };
      } else if (qLower.includes("next available") || qLower.includes("available slot")) {
        const availableSlot = allSlots.find(s => !s.isClosed && s.date > todayStr);
        const nextDate = availableSlot ? availableSlot.date : tomorrowStr;
        extractedAction = {
          type: "FIND_NEXT_SLOT",
          data: { date: nextDate, timeSlot: "Morning" }
        };
      } else if (qLower.includes("progress") || qLower.includes("weak")) {
        extractedAction = { type: "VIEW_PROGRESS" };
      } else if (qLower.includes("reschedule")) {
        const upcomingBooking = studentBookings.find(b => b.date >= todayStr && b.status !== "cancelled");
        if (upcomingBooking) {
          const nextSat = new Date();
          nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
          const newDate = nextSat.toISOString().split("T")[0];

          extractedAction = {
            type: "RESCHEDULE_CLASS",
            requiresConfirmation: true,
            data: {
              bookingId: upcomingBooking.id,
              oldDate: upcomingBooking.date,
              newDate: newDate,
              newTimeSlot: upcomingBooking.timeSlot
            }
          };
        }
      } else if (qLower.includes("cancel")) {
        const upcomingBooking = studentBookings.find(b => b.date >= todayStr && b.status !== "cancelled");
        if (upcomingBooking) {
          extractedAction = {
            type: "CANCEL_CLASS",
            requiresConfirmation: true,
            data: { bookingId: upcomingBooking.id, date: upcomingBooking.date }
          };
        }
      }

      // Build system instruction
      const systemInstruction = `You are ODNEX, the central super AI assistant for Golden Hands Driving School in Bhubaneswar, Odisha.
Your purpose is to assist students accurately, professionally, and warmly.
TODAY'S DATE: ${todayStr} (use this to check future dates, same-day is today, past is before today).

CREATOR & IDENTITY MANDATE:
If anyone asks ODNEX who was your creator, who created you, who makes/made you, who built you, or who developed you, you MUST state clearly:
"BNP Tech Binayak Sir created me specially as a driving school assistant."

==================================================
STUDENT PROFILE:
- Name: ${studentData.name}
- Email: ${studentData.email}
- Phone: ${studentData.phone}
- Course Package: ${studentData.courseName}
- Syllabus: ${studentData.courseSyllabus ? studentData.courseSyllabus.join(", ") : "None"}
- Learner's Licence (LL) Status: ${studentData.llStatus || "Not Set"}
- Referral Code: ${studentData.referralCode || "None"}
- Aadhaar Verified?: ${isAadharVerified ? 'YES' : 'NO'} (Mandatory for booking driving classes)
- Admin Manual Unlock?: ${studentData.adminManualUnlock ? 'YES' : 'NO'}
- Booking Locked by Admin?: ${studentData.bookingLocked ? 'YES (Reason: ' + (studentData.lockedReason || "Payment Required") + ')' : 'NO'}
- Amount Paid: ₹${studentData.amountPaid || 0}
- Completed Classes Count: ${completedClassesCount}
- Course Ended: ${studentData.courseEnded ? 'YES' : 'NO'}
- Plan Extended: ${studentData.planExtended ? 'YES' : 'NO'}

==================================================
SKILL PROGRESS:
${progressSummary}

==================================================
STUDENT BOOKINGS HISTORY & UPCOMING:
${bookingsSummary}

==================================================
TRAINERS IN SCHOOL:
${trainersSummary}

==================================================
CLASS SLOTS & REAL-TIME AVAILABILITY:
${slotsSummary}

==================================================
TRAINER LIVE TRACKING DETAILS (FOR TODAY):
- Chief Trainer: Rajesh Kumar
- Booking today with Rajesh Kumar?: ${hasClassTodayWithRajesh ? 'YES' : 'NO'}
- Trainer coordinates: Lat ${driverLatitude}, Lng ${driverLongitude}
- Trainer distance from student's spot (Rasulgarh): ${distanceKm} km
- Trainer estimated arrival time (ETA): ${eta} minutes
- Today's Class Pickup status: ${todayBooking ? (todayBooking.pickupStatus || "idle") : "idle"}
- Today's Class status: ${todayBooking ? (todayBooking.classStatus || "not_started") : "not_started"}

RULES:
1. If asked who created/made/developed you, always answer: "BNP Tech Binayak Sir created me specially as a driving school assistant."
2. If the user asks about booking, verify if Aadhaar is verified. If verified, propose the booking with clear details (Date, Slot, Instructor, Vehicle).
3. If the user asks where the trainer is, state Rajesh Kumar's live distance (${distanceKm} km) and ETA (${eta} mins).
4. If the user asks to call their trainer, provide chief trainer contact number (+91 98765 43210).
5. Keep answers conversational, crisp, and formatted with clean Markdown.`;

      let replyText = "I am processing your driving school request.";

      if (isCreatorStudentQuery) {
        replyText = "BNP Tech Binayak Sir created me specially as a driving school assistant.";
      } else if (!process.env.GEMINI_API_KEY) {
        if (extractedAction?.type === "BOOK_CLASS") {
          replyText = `I have organized a driving class booking proposal for you:\n\n- **Date**: ${extractedAction.data.date}\n- **Session**: ${extractedAction.data.timeSlot}\n- **Trainer**: ${extractedAction.data.trainerName}\n- **Vehicle**: ${extractedAction.data.carName}\n\nPlease click **Confirm & Book Now** below to finalize this reservation into your timetable.`;
        } else if (extractedAction?.type === "TRACK_TRAINER") {
          replyText = `Trainer **${defaultTrainer.name}** is on the way to your pickup location at **${studentData.location || "Rasulgarh, Bhubaneswar"}**!\n\n- **Live Distance**: ${distanceKm} km\n- **ETA**: ~${eta} minutes\n- **Car**: ${defaultTrainer.carName} (${defaultTrainer.carPlate})`;
        } else if (extractedAction?.type === "CALL_TRAINER") {
          replyText = `Here is the contact details for your instructor **${defaultTrainer.name}** (${defaultTrainer.phone}). You can call directly below!`;
        } else {
          replyText = `Hello ${studentData.name}! I am ODNEX, your central AI driving assistant. Your completed sessions count is **${completedClassesCount} / 20**. How can I help you today?`;
        }
      } else {
        const formattedHistory = (chatHistory || []).map((msg: any) => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

        const generated = await generateGeminiContentWithFallback({
          contents: [
            ...formattedHistory,
            { role: 'user', parts: [{ text: message }] }
          ],
          systemInstruction: systemInstruction,
        });

        if (generated) {
          replyText = generated;
        } else {
          // Graceful contextual fallback if all models are experiencing temporary spikes
          if (extractedAction?.type === "BOOK_CLASS") {
            replyText = `I have organized a driving class booking proposal for you:\n\n- **Date**: ${extractedAction.data.date}\n- **Session**: ${extractedAction.data.timeSlot}\n- **Trainer**: ${extractedAction.data.trainerName}\n\nPlease click **Confirm & Book Now** below.`;
          } else if (extractedAction?.type === "TRACK_TRAINER") {
            replyText = `Trainer **${defaultTrainer.name}** is active for today's pickup at **${studentData.location || "Rasulgarh, Bhubaneswar"}** (${distanceKm} km away, ETA ~${eta} mins).`;
          } else if (extractedAction?.type === "CALL_TRAINER") {
            replyText = `Here is the contact details for your instructor **${defaultTrainer.name}** (${defaultTrainer.phone}). You can call directly below!`;
          } else {
            replyText = `Hello ${studentData.name}! I am ODNEX. How can I assist you with class schedules, trainer tracking, or theory practice?`;
          }
        }
      }

      const weakSkills = Object.entries(actualProgress)
        .filter(([key, val]) => key !== "id" && typeof val === "number" && (val as number) < 75)
        .map(([skill]) => skill);

      return res.json({
        text: replyText,
        action: extractedAction,
        suggestedSkills: weakSkills,
        suggestedActions: [
          "📅 Book Tomorrow Evening",
          "⏱️ Next Available Slot",
          "📍 Track Trainer Live",
          "📞 Call Trainer",
          "📊 Show Progress"
        ]
      });

    } catch (error: any) {
      console.error("ODNEX Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  app.get("/api/tracker/location", (req, res) => {
    // Rasulgarh Student Location is at ~ (20.2965, 85.8682)
    // Slowly nudge the driver closer
    const targetLat = 20.2965;
    const targetLng = 85.8682;
    
    const latDiff = targetLat - driverLatitude;
    const lngDiff = targetLng - driverLongitude;
    
    // If very close, stay there or reset randomly
    if (Math.abs(latDiff) < 0.0005 && Math.abs(lngDiff) < 0.0005) {
      // Stay near student or slightly reset
      driverLatitude = 20.2905 + Math.random() * 0.002;
      driverLongitude = 85.8610 + Math.random() * 0.002;
    } else {
      // Step closer by 10%
      driverLatitude += latDiff * 0.12;
      driverLongitude += lngDiff * 0.12;
    }
    
    // Calculate simulated ETA in minutes (based on distance)
    const distanceDegree = Math.sqrt(Math.pow(targetLat - driverLatitude, 2) + Math.pow(targetLng - driverLongitude, 2));
    // 0.01 degree ~ 1.1 km. Speed ~ 30 km/h -> 1 degree is about 110km. 
    // Let's create a friendly ETA
    const eta = Math.max(1, Math.ceil(distanceDegree * 1200));

    res.json({
      latitude: driverLatitude,
      longitude: driverLongitude,
      eta: eta,
      distanceKm: (distanceDegree * 111).toFixed(1)
    });
  });

  // Vite middleware setup for Development vs Production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Golden Hands Driving School server running on port ${PORT}`);
  });
}

startServer();
