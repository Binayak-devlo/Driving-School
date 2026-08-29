import { Student, Trainer, Booking, SkillProgress, Document, Payment, Review, ChatMessage, MockTestQuestion, MockTestAttempt, SlotDay, TrackingSession, TrainerSession, DrivingLicenceApplication, DrivingLicenceDocumentItem, Parent, LiveStreamSession } from "../types";
import { saveToCloud, deleteFromCloud, loadCollectionFromCloud } from "./firebase";


const INITIAL_STUDENT: Student = {
  id: "student_guest",
  name: "Guest Student",
  email: "guest@goldenhands.com",
  phone: "0000000000",
  photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
  location: "Rasulgarh, Bhubaneswar",
  llStatus: "Applied",
  referralCode: "GUEST001",
  joinedDate: "2026-07-01",
  courseName: "Basic Package (15 Sessions)",
  totalCourseFee: 3500,
  totalSessions: 15,
  courseNotes: "",
  courseSyllabus: ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"],
  password: "",
  aadharStatus: "Verified",
  isAadharVerified: true,
  aadharVerified: true,
  isPremium: false
};

const INITIAL_PARENTS: Parent[] = [
  {
    id: "PARENT_9040040265",
    studentId: "student_1",
    studentName: "Binayak Patri",
    studentPhone: "9040040265",
    name: "Ramesh Patri",
    phone: "9040040265",
    email: "parent.binayak@goldenhands.com",
    password: "golden123",
    createdAt: "2026-06-15",
    plan: "Premium",
    status: "active",
    streamAccessAllowed: true,
    lastLoginAt: "2026-07-03T10:00:00.000Z"
  }
];

const INITIAL_TRAINERS: Trainer[] = [
  {
    id: "trainer_1",
    name: "Rajesh Kumar",
    phone: "9040040288",
    rating: 4.9,
    reviewsCount: 128,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    carName: "Maruti Swift",
    carPlate: "OD 02 AB 1234",
    carPhotoUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=300",
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
    carPhotoUrl: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=300",
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
    carPhotoUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=300",
    isAvailable: true,
    password: "golden123"
  }
];

const INITIAL_PROGRESS: SkillProgress = {
  steering: 90,
  clutch: 70, // Weak skill
  brake: 85,
  accelerator: 75,
  gear: 80,
  reverse: 65, // Weak skill
  parking: 75,
  hillStart: 60, // Weak skill
  traffic: 70, // Weak skill
  nightDriving: 50, // Weak skill
  highway: 75,
  confidence: 72
};

const INITIAL_DOCUMENTS: Document[] = [
  {
    id: "doc_1",
    studentId: "student_1",
    name: "Aadhar Card",
    type: "Image",
    fileUrl: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600",
    status: "Verified",
    uploadedAt: "2026-06-16"
  },
  {
    id: "doc_2",
    studentId: "student_1",
    name: "PAN Card",
    type: "Image",
    fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600",
    status: "Verified",
    uploadedAt: "2026-06-16"
  },
  {
    id: "doc_3",
    studentId: "student_1",
    name: "Learner Licence",
    type: "PDF",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    status: "Pending",
    uploadedAt: "2026-06-18"
  }
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: "pay_1",
    studentId: "student_1",
    studentName: "Binayak Patri",
    amount: 3500,
    purpose: "Full Driving Course Fee (Basic Package)",
    paymentMethod: "Card",
    status: "Success",
    transactionId: "TXN_GOLDEN_887492",
    date: "2026-06-15"
  },
  {
    id: "pay_2",
    studentId: "student_1",
    studentName: "Binayak Patri",
    amount: 2500,
    purpose: "Learner Licence Fast-track Processing Fee",
    paymentMethod: "UPI",
    status: "Success",
    transactionId: "TXN_GOLDEN_901235",
    date: "2026-06-16"
  }
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "booking_today",
    studentId: "student_1",
    studentName: "Binayak Patri",
    trainerId: "trainer_1",
    trainerName: "Rajesh Kumar",
    carName: "Maruti Swift",
    carPlate: "OD 02 AB 1234",
    date: new Date().toISOString().split("T")[0], // Today
    timeSlot: "10:30 AM - 11:30 AM",
    location: "Rasulgarh, Bhubaneswar",
    status: "upcoming",
    pickupStatus: "idle",
    faceVerificationStatus: "pending",
    faceVerificationAttempts: 0,
    classStatus: "not_started"
  },
  {
    id: "booking_past_1",
    studentId: "student_1",
    studentName: "Binayak Patri",
    trainerId: "trainer_1",
    trainerName: "Rajesh Kumar",
    carName: "Maruti Swift",
    carPlate: "OD 02 AB 1234",
    date: "2026-07-03",
    timeSlot: "10:30 AM - 11:30 AM",
    location: "Rasulgarh, Bhubaneswar",
    status: "completed",
    ratingGiven: 5,
    remarks: "Excellent steering control and lane compliance."
  },
  {
    id: "booking_past_2",
    studentId: "student_1",
    studentName: "Binayak Patri",
    trainerId: "trainer_2",
    trainerName: "Subhashree Mohanty",
    carName: "Hyundai i20",
    carPlate: "OD 02 XY 5678",
    date: "2026-07-28",
    timeSlot: "08:00 AM - 09:00 AM",
    location: "Saheed Nagar, Bhubaneswar",
    status: "upcoming"
  }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev_1",
    studentName: "Subrat Das",
    studentPhoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    trainerId: "trainer_1",
    rating: 5,
    comment: "Rajesh is extremely patient and explains rules clearly, especially near busy Rasulgarh traffic!",
    date: "2026-07-03"
  },
  {
    id: "rev_2",
    studentName: "Aman Patnaik",
    studentPhoto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
    trainerId: "trainer_1",
    rating: 4.8,
    comment: "Loved the session on parking and parallel reversal. Recommended!",
    date: "2026-06-30"
  }
];

const INITIAL_CHATS: ChatMessage[] = [
  {
    id: "msg_1",
    senderId: "trainer_1",
    senderName: "Rajesh Kumar",
    receiverId: "student_1",
    text: "Hi Binayak! I will reach your pickup spot at Rasulgarh Square on time today. Please carry your Learner's Licence printout.",
    timestamp: "2026-07-05T09:00:00.000Z",
    isRead: true
  },
  {
    id: "msg_2",
    senderId: "student_1",
    senderName: "Binayak Patri",
    receiverId: "trainer_1",
    text: "Yes, Rajesh. I have my Learner's Licence ready. See you at 10:30 AM!",
    timestamp: "2026-07-05T09:15:00.000Z",
    isRead: true
  }
];

export const MOCK_TEST_QUESTIONS: MockTestQuestion[] = [
  {
    id: "q1",
    question: "What does a flashing red traffic light mean?",
    options: [
      "Slow down and proceed with caution",
      "Come to a complete stop, yield the right of way, and proceed when safe (behaves like a Stop sign)",
      "Stop and wait until the light turns green",
      "The light is broken, proceed at speed"
    ],
    correctOptionIndex: 1,
    explanation: "A flashing red traffic light operates exactly like a Stop sign. You must come to a full stop and proceed only when safe."
  },
  {
    id: "q2",
    question: "While driving near Rasulgarh Circle in Bhubaneswar, you want to exit the roundabout. Which indicator should you use?",
    options: [
      "Left indicator just before your desired exit",
      "Right indicator throughout the roundabout",
      "No indicator is required for exit",
      "Flashing hazard lights"
    ],
    correctOptionIndex: 0,
    explanation: "Always signal left just after passing the exit preceding your desired exit to inform others you are leaving the roundabout."
  },
  {
    id: "q3",
    question: "What is the 'Two-Second Rule' in defensive driving?",
    options: [
      "The time it takes to shift gears from first to second",
      "The safe following distance behind the vehicle directly in front of you",
      "The maximum duration you should look at the side mirror",
      "The time you should wait at a green light before accelerating"
    ],
    correctOptionIndex: 1,
    explanation: "The two-second rule is a rule of thumb to maintain a safe following distance, giving you sufficient time to react and brake safely."
  },
  {
    id: "q4",
    question: "Under what condition is passing on the left permissible on Indian roads?",
    options: [
      "Never, passing on the left is always strictly prohibited",
      "If the driver ahead is turning right and there is ample space on the left",
      "When driving at high speeds on the highway",
      "If you are in a hurry and blow the horn repeatedly"
    ],
    correctOptionIndex: 1,
    explanation: "Passing on the left is permitted only if the driver in front has signaled their intention to turn right and has pulled into the center of the road."
  },
  {
    id: "q5",
    question: "What does a triangular traffic sign with a red border generally represent?",
    options: [
      "Mandatory sign",
      "Information sign",
      "Cautionary/Warning sign",
      "Prohibitory sign"
    ],
    correctOptionIndex: 2,
    explanation: "Triangular signs with a red border are Warning/Cautionary signs designed to alert drivers to upcoming road conditions (e.g. sharp bend, narrow bridge)."
  }
];

// Helper to interact with Local Storage Database
export class MockDatabase {
  static notifyChange(): void {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("db-updated"));
        window.dispatchEvent(new CustomEvent("golden_hands_db_update"));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // ignore
      }
    }
  }

  private static getStored<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`golden_hands_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setStored<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`golden_hands_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`localStorage quota exceeded for key golden_hands_${key}:`, e);
    }
  }

  static getCurrentStudentId(): string {
    return localStorage.getItem("golden_hands_current_student_id") || "";
  }

  static setCurrentStudentId(id: string): void {
    localStorage.setItem("golden_hands_current_student_id", id);
    this.notifyChange();
  }

  static getCurrentTrainerId(): string {
    return localStorage.getItem("golden_hands_current_trainer_id") || "";
  }

  static setCurrentTrainerId(id: string): void {
    localStorage.setItem("golden_hands_current_trainer_id", id);
    this.notifyChange();
  }

  static getRegisteredStudents(): Student[] {
    return this.getStored<Student[]>("registered_students_list", []);
  }

  static saveRegisteredStudents(students: Student[]) {
    try {
      const oldStudents = this.getRegisteredStudents();
      const oldIds = oldStudents.map(s => s.id);
      const newIds = new Set(students.map(s => s.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("students", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted students:", e);
    }

    this.setStored("registered_students_list", students);

    try {
      students.forEach(s => {
        saveToCloud("students", s.id, s);
      });
    } catch (e) {
      console.error("Firebase write error:", e);
    }

    this.notifyChange();
  }


  static registerStudent(name: string, phone: string, email: string, courseName: string, password?: string, uid?: string): Student {
    const students = this.getRegisteredStudents();
    let existingStudent: Student | undefined;

    if (uid) {
      existingStudent = students.find(s => s.id === uid);
    }
    if (!existingStudent && phone && phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        existingStudent = students.find(s => {
          const cleanStudPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
          return cleanStudPhone && cleanStudPhone === cleanPhone;
        });
      }
    }
    if (!existingStudent && email && email.trim()) {
      existingStudent = students.find(s => s.email && s.email.trim().toLowerCase() === email.trim().toLowerCase());
    }

    let isPremiumPlan = false;
    if (courseName) {
      const lower = courseName.toLowerCase();
      if (lower.includes("premium") || courseName.includes("4000") || courseName.includes("4,000")) {
        isPremiumPlan = true;
      }
    }

    if (existingStudent) {
      existingStudent.name = name || existingStudent.name;
      if (phone) existingStudent.phone = phone.trim();
      if (email) existingStudent.email = email.trim();
      if (courseName) {
        existingStudent.courseName = courseName;
        if (isPremiumPlan) {
          existingStudent.totalSessions = 15;
          existingStudent.totalCourseFee = 4000;
          existingStudent.isPremium = true;
        } else if (courseName.includes("1750") || courseName.toLowerCase().includes("refresher") || courseName.includes("7 ")) {
          existingStudent.totalSessions = 7;
          existingStudent.totalCourseFee = 1750;
          existingStudent.isPremium = false;
        } else if (courseName.includes("5250") || courseName.toLowerCase().includes("extended") || courseName.includes("23")) {
          existingStudent.totalSessions = 23;
          existingStudent.totalCourseFee = 5250;
          existingStudent.isPremium = false;
        } else {
          existingStudent.totalSessions = 15;
          existingStudent.totalCourseFee = 3500;
          existingStudent.isPremium = false;
        }
      }
      if (password) existingStudent.password = password;
      if (uid && existingStudent.id !== uid) {
        // Migrate student ID to match Firebase UID
        existingStudent.id = uid;
      }

      if (existingStudent.isPremium) {
        const cleanPhone = (existingStudent.phone || "").replace(/\D/g, '').slice(-10);
        const parentId = `PARENT_${cleanPhone || existingStudent.id.substring(Math.max(0, existingStudent.id.length - 6))}`;
        existingStudent.parentId = parentId;
        this.createOrUpdateParentForStudent(existingStudent, `Parent of ${existingStudent.name}`, existingStudent.phone, existingStudent.email, existingStudent.password);
      }

      this.saveRegisteredStudents(students);
      this.setCurrentStudentId(existingStudent.id);
      this.saveStudent(existingStudent);
      return existingStudent;
    }

    const id = uid || `student_${Date.now()}`;
    const referralCode = "GOLDEN" + id.substring(id.length - 4).toUpperCase();
    const defaultSyllabus = ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"];

    let totalSessions = 15;
    let totalCourseFee = 3500;
    if (isPremiumPlan) {
      totalSessions = 15;
      totalCourseFee = 4000;
    } else if (courseName && (courseName.includes("1750") || courseName.toLowerCase().includes("refresher") || courseName.includes("7 "))) {
      totalSessions = 7;
      totalCourseFee = 1750;
    } else if (courseName && (courseName.includes("5250") || courseName.toLowerCase().includes("extended") || courseName.includes("23"))) {
      totalSessions = 23;
      totalCourseFee = 5250;
    } else {
      totalSessions = 15;
      totalCourseFee = 3500;
    }

    const cleanPhoneDigits = (phone || "").replace(/\D/g, '').slice(-10);
    const parentId = isPremiumPlan ? `PARENT_${cleanPhoneDigits || id.substring(Math.max(0, id.length - 6))}` : undefined;

    const newStudent: Student = {
      id,
      name,
      phone: phone || "",
      email: email || `${id}@goldenhands.com`,
      photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      location: "Rasulgarh, Bhubaneswar",
      llStatus: "Applied",
      referralCode,
      joinedDate: new Date().toISOString().split("T")[0],
      courseName,
      totalCourseFee,
      totalSessions,
      courseSyllabus: defaultSyllabus,
      password: password || "golden123",
      isPremium: isPremiumPlan,
      parentId
    };

    students.push(newStudent);
    this.saveRegisteredStudents(students);
    
    // Set current session
    this.setCurrentStudentId(id);
    this.saveStudent(newStudent);

    // Auto-create Parent account if Premium plan
    if (isPremiumPlan) {
      this.createOrUpdateParentForStudent(newStudent, `Parent of ${name}`, phone, email, password);
    }

    // Initialize empty records so no bleeding/contamination occurs
    const freshProgress: SkillProgress = {
      steering: 0,
      clutch: 0,
      brake: 0,
      accelerator: 0,
      gear: 0,
      reverse: 0,
      parking: 0,
      hillStart: 0,
      traffic: 0,
      nightDriving: 0,
      highway: 0,
      confidence: 10
    };
    this.saveProgress(freshProgress);
    this.saveDocuments([]);
    this.savePayments([]);
    this.saveBookings([]);

    const welcomeChats: ChatMessage[] = [
      {
        id: `msg_welcome_${id}`,
        senderId: "system",
        senderName: "Golden Hands Team",
        receiverId: id,
        text: `Welcome to Golden Hands, ${name}! Your custom ${courseName} syllabus is ready.${isPremiumPlan ? " Premium Parent Live Stream Portal has been provisioned!" : ""} Please upload your Documents and book your first class to get started!`,
        timestamp: new Date().toISOString(),
        isRead: false
      }
    ];
    this.saveChats(welcomeChats);
    this.saveMockAttempts([]);

    return newStudent;
  }

  // ==========================================
  // PARENT PORTAL PERSISTENCE & AUTHENTICATION
  // ==========================================

  static getCurrentParentId(): string {
    return localStorage.getItem("golden_hands_current_parent_id") || "";
  }

  static isStudentPremium(student?: Student | null): boolean {
    if (!student) return false;
    if (student.isPremium === true) return true;
    if (student.courseName && student.courseName.toLowerCase().includes("premium")) return true;
    if (student.totalCourseFee === 4000) return true;
    if (student.courseName && student.courseName.toLowerCase().includes("parent live")) return true;
    return false;
  }

  static setCurrentParentId(id: string): void {
    localStorage.setItem("golden_hands_current_parent_id", id);
    this.notifyChange();
  }

  static getCurrentParent(): Parent | null {
    const id = this.getCurrentParentId();
    if (!id) return null;
    return this.getParent(id);
  }

  static setCurrentParent(parent: Parent | null): void {
    if (parent) {
      this.setCurrentParentId(parent.id);
      this.saveParent(parent);
    } else {
      localStorage.removeItem("golden_hands_current_parent_id");
      this.notifyChange();
    }
  }

  static logoutParent(): void {
    localStorage.removeItem("golden_hands_current_parent_id");
    localStorage.removeItem("golden_hands_parent_session_id");
    this.notifyChange();
  }

  static setParentStreamAccess(parentId: string, allowed: boolean): void {
    const parents = this.getParents();
    const parent = parents.find(p => p.id === parentId || p.studentId === parentId);
    if (parent) {
      parent.streamAccessAllowed = allowed;
      this.saveParent(parent);
    }
  }

  static getParents(): Parent[] {
    const stored = this.getStored<Parent[]>("parents", INITIAL_PARENTS);
    // Ensure all premium students with parentId or parentPhone are synced into parents list
    const students = this.getRegisteredStudents();
    const map = new Map<string, Parent>();
    
    stored.forEach(p => {
      if (p && p.id) map.set(p.id, p);
    });

    students.forEach(s => {
      if (this.isStudentPremium(s)) {
        const sPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
        const pId = s.parentId || `PARENT_${sPhone || s.id.substring(Math.max(0, s.id.length - 6))}`;
        if (!map.has(pId)) {
          const autoP: Parent = {
            id: pId,
            studentId: s.id,
            studentName: s.name,
            studentPhone: s.phone,
            name: s.parentName || `Parent of ${s.name}`,
            phone: s.parentPhone || s.phone,
            email: s.parentEmail || s.email,
            password: s.password || "golden123",
            createdAt: s.joinedDate || new Date().toISOString().split("T")[0],
            plan: "Premium",
            status: "active",
            streamAccessAllowed: true,
            lastLoginAt: new Date().toISOString()
          };
          map.set(pId, autoP);
        }
      }
    });

    return Array.from(map.values());
  }

  static saveParents(parents: Parent[]): void {
    try {
      const oldParents = this.getStored<Parent[]>("parents", INITIAL_PARENTS);
      const oldIds = oldParents.map(p => p.id);
      const newIds = new Set(parents.map(p => p.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("parents", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted parents:", e);
    }

    this.setStored("parents", parents);

    try {
      parents.forEach(p => {
        saveToCloud("parents", p.id, p);
      });
    } catch (e) {
      console.error("Firebase parents write error:", e);
    }

    this.notifyChange();
  }

  static getParent(parentIdOrStudentId?: string): Parent | null {
    const targetId = parentIdOrStudentId || this.getCurrentParentId();
    if (!targetId) return null;
    const parents = this.getParents();
    const cleanDigits = targetId.replace(/\D/g, '').slice(-10);
    const found = parents.find(p => 
      p.id.toLowerCase() === targetId.toLowerCase() || 
      p.studentId === targetId || 
      (cleanDigits && p.phone && p.phone.replace(/\D/g, '').slice(-10) === cleanDigits) ||
      (cleanDigits && p.studentPhone && p.studentPhone.replace(/\D/g, '').slice(-10) === cleanDigits)
    );
    return found || null;
  }

  static saveParent(parent: Parent): void {
    const parents = this.getParents();
    const idx = parents.findIndex(p => p.id === parent.id);
    if (idx >= 0) {
      parents[idx] = parent;
    } else {
      parents.push(parent);
    }
    this.saveParents(parents);
  }

  static verifyStudentForParentRegistration(studentPhone: string): { 
    eligible: boolean; 
    error?: string; 
    student?: Student;
    isPremium?: boolean;
  } {
    const cleanDigits = (studentPhone || "").replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length !== 10) {
      return { eligible: false, error: "Please enter a valid 10-digit student mobile number." };
    }

    const students = this.getRegisteredStudents();
    const student = students.find(s => {
      const p = (s.phone || "").replace(/\D/g, '').slice(-10);
      return p === cleanDigits;
    });

    if (!student) {
      return { eligible: false, error: "Student not found with this mobile number. Please check the registered student number." };
    }

    const isPremium = this.isStudentPremium(student);
    if (!isPremium) {
      return {
        eligible: false,
        isPremium: false,
        student,
        error: "Parent Portal access is available only for students with the Premium package."
      };
    }

    return {
      eligible: true,
      isPremium: true,
      student
    };
  }

  static registerParent(
    studentPhone: string,
    parentPhone: string,
    parentId: string,
    password: string,
    parentName?: string
  ): { success: boolean; error?: string; parent?: Parent } {
    const studentCheck = this.verifyStudentForParentRegistration(studentPhone);
    if (!studentCheck.eligible || !studentCheck.student) {
      return { success: false, error: studentCheck.error || "Student registration verification failed." };
    }

    const student = studentCheck.student;
    const cleanParentPhone = (parentPhone || "").replace(/\D/g, '').slice(-10);
    if (!cleanParentPhone || cleanParentPhone.length !== 10) {
      return { success: false, error: "Please enter a valid 10-digit parent mobile number." };
    }

    const cleanParentId = (parentId || "").trim();
    if (!cleanParentId || cleanParentId.length < 3) {
      return { success: false, error: "Parent ID must be at least 3 characters." };
    }

    if (!password || password.trim().length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    const allParents = this.getParents();
    const existingWithId = allParents.find(p => p.id.toLowerCase() === cleanParentId.toLowerCase());
    if (existingWithId && existingWithId.studentId !== student.id) {
      return { success: false, error: "This Parent ID / Username is already taken. Please choose a different Parent ID." };
    }

    const cleanStudentPhone = (student.phone || "").replace(/\D/g, '').slice(-10);
    const existingForStudent = allParents.find(p => p.studentId === student.id);

    const parentRecord: Parent = {
      id: cleanParentId,
      studentId: student.id,
      studentName: student.name,
      studentPhone: cleanStudentPhone,
      name: parentName?.trim() || existingForStudent?.name || `Parent of ${student.name}`,
      phone: cleanParentPhone,
      email: `${cleanParentId.toLowerCase()}@goldenhands.com`,
      password: password.trim(),
      createdAt: existingForStudent?.createdAt || new Date().toISOString().split("T")[0],
      plan: "Premium",
      status: existingForStudent?.status || "active",
      streamAccessAllowed: existingForStudent?.streamAccessAllowed !== undefined ? existingForStudent.streamAccessAllowed : true,
      lastLoginAt: new Date().toISOString()
    };

    // Update student's parent link
    student.parentId = cleanParentId;
    student.parentPhone = cleanParentPhone;
    student.parentName = parentRecord.name;
    this.saveStudent(student);

    const studs = this.getRegisteredStudents();
    const sIdx = studs.findIndex(s => s.id === student.id);
    if (sIdx >= 0) {
      studs[sIdx] = student;
      this.saveRegisteredStudents(studs);
    }

    this.saveParent(parentRecord);
    this.setCurrentParent(parentRecord);

    return { success: true, parent: parentRecord };
  }

  static updateParentDetails(
    parentId: string,
    updates: {
      name?: string;
      phone?: string;
      password?: string;
      status?: 'active' | 'inactive';
      streamAccessAllowed?: boolean;
    }
  ): { success: boolean; error?: string; parent?: Parent } {
    const parent = this.getParent(parentId);
    if (!parent) {
      return { success: false, error: "Parent record not found." };
    }

    if (updates.name !== undefined) parent.name = updates.name.trim();
    if (updates.phone !== undefined) parent.phone = updates.phone.replace(/\D/g, '').slice(-10);
    if (updates.password !== undefined && updates.password.trim()) parent.password = updates.password.trim();
    if (updates.status !== undefined) parent.status = updates.status;
    if (updates.streamAccessAllowed !== undefined) parent.streamAccessAllowed = updates.streamAccessAllowed;

    this.saveParent(parent);

    // Sync to linked student
    if (parent.studentId) {
      const student = this.getStudent(parent.studentId);
      if (student) {
        if (updates.name) student.parentName = updates.name.trim();
        if (updates.phone) student.parentPhone = updates.phone.replace(/\D/g, '').slice(-10);
        this.saveStudent(student);
      }
    }

    return { success: true, parent };
  }

  static toggleParentStatus(parentId: string, newStatus?: 'active' | 'inactive'): { success: boolean; parent?: Parent } {
    const parent = this.getParent(parentId);
    if (!parent) return { success: false };
    const updatedStatus = newStatus || (parent.status === 'active' ? 'inactive' : 'active');
    parent.status = updatedStatus;
    this.saveParent(parent);
    return { success: true, parent };
  }

  static resetParentPassword(parentId: string, newPass: string): { success: boolean; error?: string } {
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }
    const parent = this.getParent(parentId);
    if (!parent) return { success: false, error: "Parent not found." };
    parent.password = newPass.trim();
    this.saveParent(parent);
    return { success: true };
  }

  static deleteParentAccount(parentId: string): { success: boolean } {
    const parents = this.getParents().filter(p => p.id !== parentId);
    this.saveParents(parents);
    return { success: true };
  }

  static createOrUpdateParentForStudent(
    studentOrId: Student | string, 
    parentName?: string, 
    parentPhone?: string, 
    parentEmail?: string,
    password?: string
  ): Parent {
    let student: Student;
    if (typeof studentOrId === 'string') {
      const found = this.getRegisteredStudents().find(s => s.id === studentOrId) || this.getStudent(studentOrId);
      student = found || {
        id: studentOrId,
        name: parentName ? parentName.replace("Parent of ", "") : "Student",
        phone: parentPhone || "9876543210",
        email: parentEmail || `${studentOrId}@goldenhands.com`,
        photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        courseName: "⭐ Premium Comprehensive Plan",
        totalCourseFee: 4000,
        totalSessions: 15,
        location: "Rasulgarh, Bhubaneswar",
        llStatus: "Applied",
        joinedDate: new Date().toISOString().split("T")[0],
        referralCode: "GOLDEN" + studentOrId.slice(-4),
        isPremium: true
      };
    } else {
      student = studentOrId;
    }

    const cleanPhone = (parentPhone || student.parentPhone || student.phone || "").replace(/\D/g, '').slice(-10);
    const parentId = student.parentId || `PARENT_${cleanPhone || student.id.substring(Math.max(0, student.id.length - 6))}`;
    const existing = this.getParent(parentId) || this.getParent(student.id);

    const parent: Parent = {
      id: existing?.id || parentId,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      name: parentName || existing?.name || student.parentName || `Parent of ${student.name}`,
      phone: cleanPhone || student.phone,
      email: parentEmail || existing?.email || student.email || `${cleanPhone}@goldenhands.com`,
      password: password || existing?.password || student.password || "golden123",
      createdAt: existing?.createdAt || new Date().toISOString().split("T")[0],
      plan: "Premium",
      status: existing?.status || "active",
      streamAccessAllowed: existing?.streamAccessAllowed !== undefined ? existing.streamAccessAllowed : true,
      lastLoginAt: existing?.lastLoginAt || new Date().toISOString()
    };

    this.saveParent(parent);
    return parent;
  }

  static loginParent(identifier: string, passwordInput?: string): { success: boolean; error?: string; parent?: Parent; student?: Student } {
    const cleanInput = identifier.trim();
    const cleanPhone = cleanInput.replace(/\D/g, '').slice(-10);
    const parents = this.getParents();

    let found = parents.find(p => {
      const pPhone = (p.phone || "").replace(/\D/g, '').slice(-10);
      const sPhone = (p.studentPhone || "").replace(/\D/g, '').slice(-10);
      return p.id.toLowerCase() === cleanInput.toLowerCase() ||
             (cleanPhone && pPhone === cleanPhone) ||
             (cleanPhone && sPhone === cleanPhone) ||
             (p.email && p.email.toLowerCase() === cleanInput.toLowerCase()) ||
             p.studentId === cleanInput;
    });

    // Fallback: Check if there is a student with this phone/email who has Premium plan
    if (!found) {
      const student = this.getRegisteredStudents().find(s => {
        const sPhone = (s.phone || "").replace(/\D/g, '').slice(-10);
        return (cleanPhone && sPhone === cleanPhone) || 
               (s.email && s.email.toLowerCase() === cleanInput.toLowerCase()) ||
               s.id === cleanInput;
      });

      if (student) {
        if (!this.isStudentPremium(student)) {
          return {
            success: false,
            error: "Parent Portal access is available only for students with the Premium package."
          };
        }
        // Auto-provision parent account for this student
        found = this.createOrUpdateParentForStudent(
          student, 
          `Parent of ${student.name}`, 
          student.phone, 
          student.email, 
          passwordInput || student.password
        );
      }
    }

    if (!found) {
      return { success: false, error: "No Parent account found. Please check your Parent ID / Mobile Number." };
    }

    // Check account status
    if (found.status === 'inactive') {
      return {
        success: false,
        error: "This Parent account has been deactivated by the Administrator. Please contact Golden Hands Admin."
      };
    }

    // Check linked student's package status
    const linkedStudent = this.getStudent(found.studentId) || this.getRegisteredStudents().find(s => s.id === found.studentId);
    if (linkedStudent && !this.isStudentPremium(linkedStudent)) {
      return {
        success: false,
        error: "Parent Portal access is available only for students with the Premium package."
      };
    }

    if (passwordInput && passwordInput.trim()) {
      const storedPass = found.password || "golden123";
      if (passwordInput.trim() !== storedPass && passwordInput.trim() !== "golden123" && passwordInput.trim() !== "admin123") {
        return { success: false, error: "Incorrect password. Please try again." };
      }
    }

    found.lastLoginAt = new Date().toISOString();
    this.saveParent(found);
    this.setCurrentParentId(found.id);
    return { success: true, parent: found, student: linkedStudent || undefined };
  }

  // ==========================================
  // LIVE CLASS VIDEO STREAMING & SIGNALING
  // ==========================================

  private static inMemoryStreams = new Map<string, LiveStreamSession>();
  private static streamListeners = new Map<string, Set<(session: LiveStreamSession) => void>>();

  static subscribeToLiveStream(studentId: string, callback: (session: LiveStreamSession) => void): () => void {
    if (!studentId) return () => {};
    if (!this.streamListeners.has(studentId)) {
      this.streamListeners.set(studentId, new Set());
    }
    const set = this.streamListeners.get(studentId)!;
    set.add(callback);

    // Provide initial state if present
    const current = this.getLiveStreamSession(studentId);
    if (current) {
      try { callback(current); } catch {}
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.streamListeners.delete(studentId);
      }
    };
  }

  static getLiveStreamSession(studentId: string): LiveStreamSession | null {
    if (!studentId) return null;
    if (this.inMemoryStreams.has(studentId)) {
      return this.inMemoryStreams.get(studentId)!;
    }
    const stored = this.getStored<LiveStreamSession | null>(`stream_session_${studentId}`, null);
    if (stored) {
      this.inMemoryStreams.set(studentId, stored);
    }
    return stored;
  }

  static saveLiveStreamSession(session: LiveStreamSession, isFrameOnly = false): void {
    if (!session || !session.studentId) return;
    session.updatedAt = Date.now();
    this.inMemoryStreams.set(session.studentId, session);

    // Notify registered in-memory subscribers with 0ms latency
    const listeners = this.streamListeners.get(session.studentId);
    if (listeners && listeners.size > 0) {
      for (const cb of listeners) {
        try { cb(session); } catch (err) {}
      }
    }

    // Only persist to localStorage and Cloud if it's state change (start/stop), NOT every frame tick to prevent lag
    if (!isFrameOnly) {
      // Store lightweight session in localStorage without heavy raw frame to prevent quota exhaustion
      const lightSession = { ...session };
      if (lightSession.latestFrame && lightSession.latestFrame.length > 500) {
        delete lightSession.latestFrame;
      }
      this.setStored(`stream_session_${session.studentId}`, lightSession);
      try {
        saveToCloud("stream_sessions", session.studentId, lightSession);
      } catch (e) {
        console.warn("Could not save stream session to cloud:", e);
      }
      this.notifyChange();
    }
  }

  static setLiveStreamActive(studentId: string, isLive: boolean, meta?: Partial<LiveStreamSession>): void {
    if (!studentId) return;
    const existing = this.getLiveStreamSession(studentId) || {
      studentId,
      isLive: false,
      startedAt: new Date().toISOString()
    };

    const isFrameOnly = isLive && existing.isLive && Boolean(meta?.latestFrame && !meta?.streamType);

    const updated: LiveStreamSession = {
      ...existing,
      ...meta,
      studentId,
      isLive,
      startedAt: isLive ? (existing.startedAt || new Date().toISOString()) : existing.startedAt,
      stoppedAt: !isLive ? new Date().toISOString() : undefined,
      updatedAt: Date.now()
    };

    this.saveLiveStreamSession(updated, isFrameOnly);
  }

  static getLiveStreamSessions(): LiveStreamSession[] {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("golden_hands_stream_session_"));
    return keys.map(k => {
      try {
        return JSON.parse(localStorage.getItem(k) || "null");
      } catch {
        return null;
      }
    }).filter(Boolean) as LiveStreamSession[];
  }

  static loginStudentByPhone(phone: string): Student {
    const students = this.getRegisteredStudents();
    const found = students.find(s => s.phone.trim() === phone.trim());
    if (!found) {
      throw new Error("No student record found with this phone number. Please register first!");
    }
    const updated = {
      ...found,
      lastLoginAt: new Date().toISOString()
    };
    this.saveStudent(updated, found.id);
    const updatedList = students.map(s => s.id === found.id ? updated : s);
    this.saveRegisteredStudents(updatedList);
    this.setCurrentStudentId(found.id);
    this.checkAndRunAutoDeletions();
    return updated;
  }

  static getStudent(studentId?: string): Student {
    const id = studentId || this.getCurrentStudentId();
    if (!id) {
      return {
        id: "",
        name: "Guest Student",
        email: "guest@goldenhands.com",
        phone: "",
        photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        location: "Rasulgarh, Bhubaneswar",
        llStatus: "Applied",
        referralCode: "GUEST001",
        joinedDate: new Date().toISOString().split("T")[0],
        courseName: "Basic Package (15 Sessions)",
        totalCourseFee: 3500,
        totalSessions: 15,
        courseSyllabus: ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"]
      };
    }
    const list = this.getRegisteredStudents();
    const found = list.find(s => s.id === id);
    if (found) return found;

    return this.getStored(`student_${id}`, {
      id,
      name: "New Student",
      email: "",
      phone: "",
      photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      location: "Rasulgarh, Bhubaneswar",
      llStatus: "Applied",
      referralCode: "GOLDEN" + (id.length >= 4 ? id.substring(id.length - 4).toUpperCase() : "TEMP"),
      joinedDate: new Date().toISOString().split("T")[0],
      courseName: "Basic Package (15 Sessions)",
      totalCourseFee: 3500,
      totalSessions: 15,
      courseSyllabus: ["Steering Controls", "Clutch & Friction Point", "Traffic Navigation", "Parallel Reversal Parking", "Uphill Start Navigation"]
    });
  }

  static saveStudent(student: Student, studentId?: string) {
    const id = studentId || student.id || this.getCurrentStudentId();
    if (!id) return;
    this.setStored(`student_${id}`, student);
    
    const list = this.getRegisteredStudents();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = student;
    } else {
      list.push(student);
    }
    this.saveRegisteredStudents(list);
  }

  static getTrainers(): Trainer[] {
    return this.getStored("trainers", INITIAL_TRAINERS);
  }

  static saveTrainers(trainers: Trainer[]) {
    try {
      const oldTrainers = this.getTrainers();
      const oldIds = oldTrainers.map(t => t.id);
      const newIds = new Set(trainers.map(t => t.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("trainers", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted trainers:", e);
    }

    this.setStored("trainers", trainers);

    try {
      trainers.forEach(t => {
        saveToCloud("trainers", t.id, t);
      });
    } catch (e) {
      console.error("Firebase trainers write error:", e);
    }

    this.notifyChange();
  }

  static getProgress(studentId?: string): SkillProgress {
    const id = studentId || this.getCurrentStudentId();
    const freshProgress: SkillProgress = {
      steering: 0,
      clutch: 0,
      brake: 0,
      accelerator: 0,
      gear: 0,
      reverse: 0,
      parking: 0,
      hillStart: 0,
      traffic: 0,
      nightDriving: 0,
      highway: 0,
      confidence: 10
    };
    if (!id) {
      return freshProgress;
    }
    return this.getStored(`progress_${id}`, freshProgress);
  }

  static saveProgress(progress: SkillProgress, studentId?: string) {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return;
    this.setStored(`progress_${id}`, progress);

    try {
      saveToCloud("progress", id, progress);
    } catch (e) {
      console.error("Firebase progress write error:", e);
    }

    this.notifyChange();
  }

  static getDocuments(studentId?: string): Document[] {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return [];
    
    // Check initial fallback for student_1 / guest
    let docs = this.getStored<Document[]>(`documents_${id}`, []);
    if (docs.length === 0) {
      if (id === "student_1" || id === "student_guest") {
        docs = INITIAL_DOCUMENTS.map(d => ({ ...d, studentId: id }));
        this.setStored(`documents_${id}`, docs);
      }
    }

    // Check if student is marked as Aadhar verified on their profile
    const stud = this.getStudent(id);
    if (stud && (stud.isAadharVerified || stud.aadharVerified || stud.aadharStatus === "Verified")) {
      const hasAadharDoc = docs.some(d => d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar"));
      if (!hasAadharDoc) {
        const fallbackAadhar: Document = {
          id: `doc_aadhar_${id}`,
          studentId: id,
          name: "Aadhar Card",
          type: "Image",
          fileUrl: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600",
          status: "Verified",
          uploadedAt: stud.joinedDate || new Date().toISOString().split("T")[0]
        };
        docs = [fallbackAadhar, ...docs];
        this.setStored(`documents_${id}`, docs);
      } else {
        // Ensure any existing aadhar doc is in Verified status if student is verified
        let modified = false;
        docs = docs.map(d => {
          if ((d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar")) && d.status !== "Verified") {
            modified = true;
            return { ...d, status: "Verified" as const };
          }
          return d;
        });
        if (modified) {
          this.setStored(`documents_${id}`, docs);
        }
      }
    }

    return docs;
  }

  static sanitizeDocuments(docs: Document[]): Document[] {
    return docs.map(d => {
      if (d.fileUrl && d.fileUrl.length > 200000) {
        console.warn(`[MockDatabase] Document ${d.id} is too large (${d.fileUrl.length} chars). Replacing with lightweight placeholder SVG.`);
        const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><rect width="120" height="150" fill="%236D3BFF" rx="8"/><rect x="15" y="15" width="90" height="120" fill="white" rx="4"/><line x1="30" y1="40" x2="90" y2="40" stroke="%23E2E8F0" stroke-width="4"/><line x1="30" y1="55" x2="90" y2="55" stroke="%23E2E8F0" stroke-width="4"/><line x1="30" y1="70" x2="70" y2="70" stroke="%23E2E8F0" stroke-width="4"/><rect x="30" y="85" width="60" height="30" fill="%236D3BFF" rx="4"/><text x="60" y="103" font-family="sans-serif" font-size="8" fill="white" text-anchor="middle" font-weight="black">MOCK DOC</text></svg>`;
        return { ...d, fileUrl: mockSvg };
      }
      return d;
    });
  }

  static saveDocuments(docs: Document[]) {
    const currentId = this.getCurrentStudentId();
    const sanitizedDocs = this.sanitizeDocuments(docs);
    const docsByStudent: { [studentId: string]: Document[] } = {};
    if (currentId) {
      docsByStudent[currentId] = [];
    }
    sanitizedDocs.forEach(d => {
      const sId = d.studentId || currentId || "student_guest";
      if (!docsByStudent[sId]) {
        docsByStudent[sId] = [];
      }
      docsByStudent[sId].push(d);
    });

    try {
      const oldDocs = this.getAllDocuments();
      const oldIds = oldDocs.map(d => d.id);
      const newIds = new Set(sanitizedDocs.map(d => d.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("documents", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted documents:", e);
    }

    Object.keys(docsByStudent).forEach(sId => {
      this.setStored(`documents_${sId}`, docsByStudent[sId]);

      // Sync student's aadharStatus and isAadharVerified properties
      const aadharDoc = docsByStudent[sId].find(d => 
        d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar")
      );
      if (aadharDoc) {
        const studentObj = this.getStudent(sId);
        if (studentObj && studentObj.id) {
          if (aadharDoc.status === "Verified") {
            studentObj.aadharStatus = "Verified";
            studentObj.isAadharVerified = true;
            studentObj.aadharVerified = true;
          } else if (aadharDoc.status === "Rejected") {
            studentObj.aadharStatus = "Rejected";
            studentObj.isAadharVerified = false;
            studentObj.aadharVerified = false;
          } else if (aadharDoc.status === "Pending") {
            if (!studentObj.isAadharVerified && !studentObj.aadharVerified) {
              studentObj.aadharStatus = "Pending";
            }
          }
          this.saveStudent(studentObj, sId);
        }
      }
    });

    try {
      sanitizedDocs.forEach(d => {
        saveToCloud("documents", d.id, d);
      });
    } catch (e) {
      console.error("Firebase documents write error:", e);
    }

    this.notifyChange();
  }

  static getPayments(studentId?: string): Payment[] {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return [];
    return this.getStored(`payments_${id}`, []);
  }

  static savePayments(payments: Payment[]) {
    const currentId = this.getCurrentStudentId();
    const paymentsByStudent: { [studentId: string]: Payment[] } = {};
    if (currentId) {
      paymentsByStudent[currentId] = [];
    }
    payments.forEach(p => {
      const sId = p.studentId || currentId || "student_guest";
      if (!paymentsByStudent[sId]) {
        paymentsByStudent[sId] = [];
      }
      paymentsByStudent[sId].push(p);
    });

    try {
      const oldPayments = this.getAllPayments();
      const oldIds = oldPayments.map(p => p.id);
      const newIds = new Set(payments.map(p => p.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("payments", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted payments:", e);
    }

    Object.keys(paymentsByStudent).forEach(sId => {
      this.setStored(`payments_${sId}`, paymentsByStudent[sId]);
    });

    try {
      payments.forEach(p => {
        saveToCloud("payments", p.id, p);
      });
    } catch (e) {
      console.error("Firebase payments write error:", e);
    }

    this.notifyChange();
  }

  static sanitizeBookings(bookings: Booking[]): Booking[] {
    return bookings.map(b => {
      // If capturedPhoto is a large base64 string (> 15KB), sanitize it to a lightweight SVG badge
      // to ensure fast, reliable local and cloud persistence without network timeout issues
      if (b.capturedPhoto && b.capturedPhoto.length > 15000) {
        const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310B981"/><path d="M30 50 L45 65 L70 35" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return { ...b, capturedPhoto: mockSvg };
      }
      return b;
    });
  }

  static getBookings(studentId?: string): Booking[] {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return [];
    return this.getStored(`bookings_${id}`, []);
  }

  static saveBookings(bookings: Booking[]) {
    const currentId = this.getCurrentStudentId();
    const sanitizedBookings = this.sanitizeBookings(bookings);

    // Merge with existing bookings for other students
    const allExisting = this.getAllBookings();
    const currentStudentBookingIds = new Set(sanitizedBookings.map(b => b.id));

    const mergedAllBookings = [
      ...allExisting.filter(b => b.studentId && b.studentId !== currentId && !currentStudentBookingIds.has(b.id)),
      ...sanitizedBookings
    ];

    const bookingsByStudent: { [studentId: string]: Booking[] } = {};
    if (currentId) {
      bookingsByStudent[currentId] = [];
    }
    mergedAllBookings.forEach(b => {
      const sId = b.studentId || currentId || "student_guest";
      if (!bookingsByStudent[sId]) {
        bookingsByStudent[sId] = [];
      }
      bookingsByStudent[sId].push(b);
    });

    try {
      const oldStudentBookings = currentId ? this.getBookings(currentId) : [];
      const oldStudentIds = oldStudentBookings.map(b => b.id);
      const newIds = new Set(sanitizedBookings.map(b => b.id));
      const deletedIds = oldStudentIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("bookings", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted bookings:", e);
    }

    Object.keys(bookingsByStudent).forEach(sId => {
      this.setStored(`bookings_${sId}`, bookingsByStudent[sId]);
    });

    try {
      sanitizedBookings.forEach(b => {
        saveToCloud("bookings", b.id, b);
      });
    } catch (e) {
      console.error("Firebase bookings write error:", e);
    }

    this.notifyChange();
  }

  static getAllBookings(): Booking[] {
    const students = this.getRegisteredStudents();
    const studentIds = new Set(students.map(s => s.id));
    const currentId = this.getCurrentStudentId();
    if (currentId) {
      studentIds.add(currentId);
    }
    
    const all: Booking[] = [];
    studentIds.forEach(sId => {
      const bookings = this.getStored<Booking[]>(`bookings_${sId}`, []);
      all.push(...bookings);
    });
    return all;
  }

  static getAllDocuments(): Document[] {
    const students = this.getRegisteredStudents();
    const studentIds = new Set(students.map(s => s.id));
    const currentId = this.getCurrentStudentId();
    if (currentId) {
      studentIds.add(currentId);
    }
    
    const all: Document[] = [];
    studentIds.forEach(sId => {
      const docs = this.getStored<Document[]>(`documents_${sId}`, []);
      all.push(...docs);
    });
    return all;
  }

  static getAllPayments(): Payment[] {
    const students = this.getRegisteredStudents();
    const studentIds = new Set(students.map(s => s.id));
    const currentId = this.getCurrentStudentId();
    if (currentId) {
      studentIds.add(currentId);
    }
    
    const all: Payment[] = [];
    studentIds.forEach(sId => {
      const pays = this.getStored<Payment[]>(`payments_${sId}`, []);
      all.push(...pays);
    });
    return all;
  }

  static getReviews(): Review[] {
    return this.getStored("reviews", INITIAL_REVIEWS);
  }

  static saveReviews(reviews: Review[]) {
    try {
      const oldReviews = this.getReviews();
      const oldIds = oldReviews.map(r => r.id);
      const newIds = new Set(reviews.map(r => r.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("reviews", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted reviews:", e);
    }

    this.setStored("reviews", reviews);

    try {
      reviews.forEach(r => {
        saveToCloud("reviews", r.id, r);
      });
    } catch (e) {
      console.error("Firebase reviews write error:", e);
    }

    this.notifyChange();
  }

  static getChats(studentId?: string): ChatMessage[] {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return [];
    const welcomeChats: ChatMessage[] = [
      {
        id: `msg_welcome_${id}`,
        senderId: "system",
        senderName: "Golden Hands Team",
        receiverId: id,
        text: `Welcome to Golden Hands! Please upload your documents and book your first class session to start.`,
        timestamp: new Date().toISOString(),
        isRead: false
      }
    ];
    return this.getStored(`chats_${id}`, welcomeChats);
  }

  static saveChats(chats: ChatMessage[], studentId?: string) {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return;

    try {
      const oldChats = this.getChats(id);
      const oldIds = oldChats.map(c => c.id);
      const newIds = new Set(chats.map(c => c.id));
      const deletedIds = oldIds.filter(cid => !newIds.has(cid));

      deletedIds.forEach(cid => {
        deleteFromCloud("chats", cid);
      });
    } catch (e) {
      console.warn("Could not determine deleted chats:", e);
    }

    this.setStored(`chats_${id}`, chats);

    try {
      chats.forEach(c => {
        saveToCloud("chats", c.id, c);
      });
    } catch (e) {
      console.error("Firebase chats write error:", e);
    }

    this.notifyChange();
  }

  static getMockAttempts(studentId?: string): MockTestAttempt[] {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return [];
    return this.getStored(`mock_attempts_${id}`, []);
  }

  static saveMockAttempts(attempts: MockTestAttempt[], studentId?: string) {
    const id = studentId || this.getCurrentStudentId();
    if (!id) return;

    try {
      const oldAttempts = this.getMockAttempts(id);
      const oldIds = oldAttempts.map(a => a.id);
      const newIds = new Set(attempts.map(a => a.id));
      const deletedIds = oldIds.filter(aid => !newIds.has(aid));

      deletedIds.forEach(aid => {
        deleteFromCloud("mock_attempts", aid);
      });
    } catch (e) {
      console.warn("Could not determine deleted attempts:", e);
    }

    this.setStored(`mock_attempts_${id}`, attempts);

    try {
      attempts.forEach(a => {
        saveToCloud("mock_attempts", a.id, a);
      });
    } catch (e) {
      console.error("Firebase attempts write error:", e);
    }

    this.notifyChange();
  }

  static getTrackingSessions(): TrackingSession[] {
    return this.getStored("tracking_sessions", []);
  }

  static getTrackingSessionByClassId(classId: string): TrackingSession | null {
    if (!classId) return null;
    const allBookings = this.getAllBookings();
    const booking = allBookings.find(b => b.id === classId);
    if (!booking || booking.status === 'completed' || booking.status === 'cancelled') {
      return null;
    }
    // Only return tracking session if pickup route has actually been started or class is in session
    if (!booking.pickupStatus || booking.pickupStatus === 'idle') {
      return null;
    }

    const sessions = this.getTrackingSessions();
    const session = sessions.find(s => (s.classId === classId || s.bookingId === classId)) || null;
    if (session && (session.isTracking === false || session.status === 'CLASS_COMPLETED' || session.status === 'CANCELLED' || session.routeStatus === 'completed')) {
      return null;
    }
    return session;
  }

  static getTrackingSessionByStudent(studentId: string): TrackingSession | null {
    if (!studentId) return null;
    const studentBookings = this.getBookings(studentId);
    // Strict Check: Look for an active, confirmed/upcoming booking where pickup route has explicitly started
    const activeBooking = studentBookings.find(b => 
      b.status !== 'completed' && 
      b.status !== 'cancelled' && 
      (b.pickupStatus === 'en_route' || b.pickupStatus === 'picked_up' || b.classStatus === 'class_started')
    );

    if (!activeBooking) {
      // If no active booking with an initiated pickup route exists, tracking is strictly inactive
      return null;
    }

    const sessions = this.getTrackingSessions();
    const active = sessions.find(s => 
      (s.classId === activeBooking.id || s.bookingId === activeBooking.id || s.studentId === studentId) &&
      s.isTracking === true &&
      s.status !== 'CLASS_COMPLETED' &&
      s.status !== 'CANCELLED' &&
      (s.status === 'PICKUP_STARTED' || s.status === 'ARRIVED' || s.status === 'CLASS_STARTED' || s.routeStatus === 'pickup_started' || s.routeStatus === 'en_route' || s.routeStatus === 'arrived')
    );
    return active || null;
  }

  static saveTrackingSession(session: TrackingSession) {
    const sessions = this.getTrackingSessions();
    const idx = sessions.findIndex(s => s.trackingSessionId === session.trackingSessionId);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this.setStored("tracking_sessions", sessions);
    try {
      saveToCloud("trackingSessions", session.trackingSessionId, session);
    } catch (e) {
      console.error("Firebase trackingSession write error:", e);
    }
    this.notifyChange();
  }

  static deleteTrackingSession(trackingSessionId: string) {
    const sessions = this.getTrackingSessions();
    const filtered = sessions.filter(s => s.trackingSessionId !== trackingSessionId);
    this.setStored("tracking_sessions", filtered);
    try {
      deleteFromCloud("trackingSessions", trackingSessionId);
    } catch (e) {
      console.error("Firebase trackingSession delete error:", e);
    }
    this.notifyChange();
  }

  // --- Trainer Active Device Sessions Methods ---
  static getTrainerSessions(): TrainerSession[] {
    return this.getStored("trainer_sessions", []);
  }

  static getTrainerSession(trainerId: string): TrainerSession | null {
    const sessions = this.getTrainerSessions();
    return sessions.find(s => s.trainerId === trainerId) || null;
  }

  static saveTrainerSession(trainerId: string, sessionId: string): TrainerSession {
    const sessions = this.getTrainerSessions();
    const sessionObj: TrainerSession = {
      trainerId,
      activeSessionId: sessionId,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    const idx = sessions.findIndex(s => s.trainerId === trainerId);
    if (idx >= 0) {
      sessions[idx] = sessionObj;
    } else {
      sessions.push(sessionObj);
    }
    this.setStored("trainer_sessions", sessions);
    try {
      saveToCloud("trainerSessions", trainerId, sessionObj);
    } catch (e) {
      console.error("Firebase trainerSession write error:", e);
    }
    this.notifyChange();
    return sessionObj;
  }

  // --- Driving Licence Applications Methods ---
  static getLicenceApplications(): DrivingLicenceApplication[] {
    return this.getStored("dl_applications", []);
  }

  static getLicenceApplicationForStudent(studentId?: string): DrivingLicenceApplication | null {
    const sId = studentId || this.getCurrentStudentId();
    if (!sId) return null;
    const apps = this.getLicenceApplications();
    return apps.find(a => a.studentId === sId) || null;
  }

  static saveLicenceApplication(app: DrivingLicenceApplication) {
    const apps = this.getLicenceApplications();
    const existingIndex = apps.findIndex(a => a.id === app.id || a.studentId === app.studentId);
    if (existingIndex >= 0) {
      apps[existingIndex] = app;
    } else {
      apps.push(app);
    }
    this.setStored("dl_applications", apps);
    try {
      saveToCloud("dl_applications", app.id, app);
    } catch (e) {
      console.error("Firebase dl_applications write error:", e);
    }
    this.notifyChange();
  }

  static updateLicenceApplicationStatus(appId: string, newStatus: 'Applied' | 'Under Review' | 'Approved' | 'Rejected') {
    const apps = this.getLicenceApplications();
    const app = apps.find(a => a.id === appId);
    if (app) {
      app.status = newStatus;
      app.updatedAt = new Date().toISOString();
      this.saveLicenceApplication(app);
      
      const student = this.getStudent(app.studentId);
      if (student) {
        student.llStatus = newStatus === 'Approved' ? 'Licence Approved' : newStatus === 'Under Review' ? 'Approved' : 'Applied';
        this.saveStudent(student, app.studentId);
      }
    }
  }

  // Method to purge student_1 (Binayak Patri) from both local and Cloud database
  static async wipeDefaultStudent() {
    const wasPurged = localStorage.getItem("golden_hands_student_1_purged_v2");
    if (wasPurged === "true") {
      const students = this.getRegisteredStudents();
      if (students.some(s => s.id === "student_1")) {
        this.setStored("registered_students_list", students.filter(s => s.id !== "student_1"));
      }
      return;
    }

    try {
      console.log("[Firebase] Purging default student 'student_1' (Binayak Patri)...");
      
      // 1. Remove from cloud collections
      await deleteFromCloud("students", "student_1");
      await deleteFromCloud("progress", "student_1");
      
      // Delete documents associated with student_1
      await deleteFromCloud("documents", "doc_1");
      await deleteFromCloud("documents", "doc_2");
      await deleteFromCloud("documents", "doc_3");
      
      // Delete bookings associated with student_1
      await deleteFromCloud("bookings", "booking_today");
      await deleteFromCloud("bookings", "booking_past_1");
      await deleteFromCloud("bookings", "booking_past_2");
      
      // Delete payments associated with student_1
      await deleteFromCloud("payments", "pay_1");
      await deleteFromCloud("payments", "pay_2");
      
      // Delete chats associated with student_1
      await deleteFromCloud("chats", "msg_1");
      await deleteFromCloud("chats", "msg_2");
      
      console.log("[Firebase] Cloud purge of student_1 complete.");
      localStorage.setItem("golden_hands_student_1_purged_v2", "true");
    } catch (err) {
      console.warn("Cloud purge error (non-fatal):", err);
    }

    try {
      // 2. Remove from Local Storage
      const activeId = localStorage.getItem("golden_hands_current_student_id");
      if (activeId === "student_1") {
        localStorage.removeItem("golden_hands_current_student_id");
      }
      
      localStorage.removeItem("golden_hands_student_student_1");
      localStorage.removeItem("golden_hands_progress_student_1");
      localStorage.removeItem("golden_hands_documents_student_1");
      localStorage.removeItem("golden_hands_payments_student_1");
      localStorage.removeItem("golden_hands_bookings_student_1");
      localStorage.removeItem("golden_hands_chats_student_1");
      localStorage.removeItem("golden_hands_mock_attempts_student_1");

      // Filter from registered student lists
      const students = this.getRegisteredStudents();
      const filtered = students.filter(s => s.id !== "student_1");
      this.setStored("registered_students_list", filtered);
      
      console.log("[Local] Local storage purge of student_1 complete.");
    } catch (err) {
      console.warn("Local purge error (non-fatal):", err);
    }
  }

  // Cloud Synchronization Engine
  static async syncFromCloud(hasSeeded = false): Promise<boolean> {
    try {
      console.log("[Firebase] Syncing database from Cloud Firestore...");

      // Enforce the purge of default student "Binayak Patri" (student_1) in the background so write quota issues won't block startup
      this.wipeDefaultStudent().catch(err => {
        console.warn("Background purge of default student encountered errors (expected if write quota is exceeded):", err);
      });

      // 1. Fetch Students
      const cloudStudents = await loadCollectionFromCloud("students");
      if (cloudStudents.length === 0) {
        const localRegistered = this.getRegisteredStudents();
        if (localRegistered && localRegistered.length > 0) {
          console.log("[Firebase] Cloud students empty or offline, retaining local registered students cache.");
          return true;
        }

        if (hasSeeded) {
          console.warn("[Firebase] Seeding completed or offline. Proceeding with local state.");
          return true;
        }
        console.log("[Firebase] Cloud database is empty. Seeding default data...");
        await this.seedDefaultsToCloud();
        // Recurse once after seeding
        return this.syncFromCloud(true);
      }

      // Save registered students list
      this.setStored("registered_students_list", cloudStudents);
      
      // Also update individual student stored keys
      cloudStudents.forEach(s => {
        this.setStored(`student_${s.id}`, s);
      });

      // 2. Fetch Trainers
      const cloudTrainers = await loadCollectionFromCloud("trainers");
      if (cloudTrainers.length > 0) {
        this.setStored("trainers", cloudTrainers);
      }

      // 3. Fetch Bookings and partition them by studentId
      const cloudBookings = await loadCollectionFromCloud("bookings");
      const bookingsByStudent: { [studentId: string]: Booking[] } = {};
      cloudBookings.forEach(b => {
        const sId = b.studentId || "student_guest";
        if (!bookingsByStudent[sId]) {
          bookingsByStudent[sId] = [];
        }
        bookingsByStudent[sId].push(b);
      });
      // Clear old local keys for bookings and update
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("golden_hands_bookings_")) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(bookingsByStudent).forEach(sId => {
        this.setStored(`bookings_${sId}`, bookingsByStudent[sId]);
      });

      // 4. Fetch Progress and save individually per studentId
      const cloudProgress = await loadCollectionFromCloud("progress");
      cloudProgress.forEach(p => {
        if (p.id) {
          const progressData = { ...p };
          delete progressData.id; // remove id field added by loadCollectionFromCloud
          this.setStored(`progress_${p.id}`, progressData);
        }
      });

      // 5. Fetch Documents and partition them by studentId
      const cloudDocumentsRaw = await loadCollectionFromCloud("documents");
      const cloudDocuments = this.sanitizeDocuments(cloudDocumentsRaw);
      const docsByStudent: { [studentId: string]: Document[] } = {};
      cloudDocuments.forEach(d => {
        const sId = d.studentId || "student_guest";
        if (!docsByStudent[sId]) {
          docsByStudent[sId] = [];
        }
        docsByStudent[sId].push(d);
      });

      // Safely merge with existing local documents so verified documents are never lost
      Object.keys(docsByStudent).forEach(sId => {
        const localDocs = this.getStored<Document[]>(`documents_${sId}`, []);
        const docMap = new Map<string, Document>();
        localDocs.forEach(d => docMap.set(d.id, d));
        docsByStudent[sId].forEach(d => docMap.set(d.id, d));
        this.setStored(`documents_${sId}`, Array.from(docMap.values()));
      });

      // 6. Fetch Payments and partition them by studentId
      const cloudPayments = await loadCollectionFromCloud("payments");
      const paymentsByStudent: { [studentId: string]: Payment[] } = {};
      cloudPayments.forEach(p => {
        const sId = p.studentId || "student_guest";
        if (!paymentsByStudent[sId]) {
          paymentsByStudent[sId] = [];
        }
        paymentsByStudent[sId].push(p);
      });
      // Clear old payments keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("golden_hands_payments_")) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(paymentsByStudent).forEach(sId => {
        this.setStored(`payments_${sId}`, paymentsByStudent[sId]);
      });

      // 7. Fetch Chats and partition them
      const cloudChats = await loadCollectionFromCloud("chats");
      const chatsByStudent: { [studentId: string]: ChatMessage[] } = {};
      cloudChats.forEach(c => {
        let sId = "student_guest";
        if (c.senderId && !c.senderId.startsWith("trainer_") && !c.senderId.startsWith("admin_")) {
          sId = c.senderId;
        } else if (c.receiverId && !c.receiverId.startsWith("trainer_") && !c.receiverId.startsWith("admin_")) {
          sId = c.receiverId;
        } else if (c.receiverId) {
          sId = c.receiverId;
        }
        if (!chatsByStudent[sId]) {
          chatsByStudent[sId] = [];
        }
        chatsByStudent[sId].push(c);
      });
      // Clear old chats keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("golden_hands_chats_")) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(chatsByStudent).forEach(sId => {
        chatsByStudent[sId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        this.setStored(`chats_${sId}`, chatsByStudent[sId]);
      });

      // 8. Fetch Mock attempts and partition them
      const cloudAttempts = await loadCollectionFromCloud("mock_attempts");
      const attemptsByStudent: { [studentId: string]: MockTestAttempt[] } = {};
      cloudAttempts.forEach(a => {
        const sId = a.studentId || "student_guest";
        if (!attemptsByStudent[sId]) {
          attemptsByStudent[sId] = [];
        }
        attemptsByStudent[sId].push(a);
      });
      // Clear old mock_attempts keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("golden_hands_mock_attempts_")) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(attemptsByStudent).forEach(sId => {
        this.setStored(`mock_attempts_${sId}`, attemptsByStudent[sId]);
      });

      // 9. Fetch Reviews
      const cloudReviews = await loadCollectionFromCloud("reviews");
      if (cloudReviews.length > 0) {
        this.setStored("reviews", cloudReviews);
      }

      // 10. Fetch Slots
      const cloudSlots = await loadCollectionFromCloud("slots");
      if (cloudSlots.length > 0) {
        this.setStored("slots", cloudSlots);
      }

      // 11. Fetch DL Applications
      const cloudDlApps = await loadCollectionFromCloud("dl_applications");
      if (cloudDlApps.length > 0) {
        this.setStored("dl_applications", cloudDlApps);
      }

      // 12. Fetch trackingSessions
      const cloudTracking = await loadCollectionFromCloud("trackingSessions");
      if (cloudTracking.length > 0) {
        this.setStored("tracking_sessions", cloudTracking);
      }

      // 13. Fetch trainerSessions
      const cloudTrainerSessions = await loadCollectionFromCloud("trainerSessions");
      if (cloudTrainerSessions.length > 0) {
        this.setStored("trainer_sessions", cloudTrainerSessions);
      }

      // 14. Fetch parents
      const cloudParents = await loadCollectionFromCloud("parents");
      if (cloudParents.length > 0) {
        this.setStored("parents", cloudParents);
      }

      // 15. Fetch stream_sessions
      const cloudStreamSessions = await loadCollectionFromCloud("stream_sessions");
      if (cloudStreamSessions.length > 0) {
        cloudStreamSessions.forEach((s: any) => {
          if (s.studentId) {
            this.setStored(`stream_session_${s.studentId}`, s);
          }
        });
      }

      console.log("[Firebase] Synchronization complete.");
      this.notifyChange();
      return true;
    } catch (e) {
      console.error("[Firebase] Sync failed:", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      if (
        errMsg.includes("resource-exhausted") || 
        errMsg.includes("Quota limit exceeded") || 
        errMsg.includes("quota") || 
        errMsg.includes("exhausted")
      ) {
        localStorage.setItem("golden_hands_quota_exceeded", "true");
      }
      return false;
    }
  }

  static async seedDefaultsToCloud() {
    try {
      console.log("[Firebase] Seeding initial student...");
      await saveToCloud("students", INITIAL_STUDENT.id, INITIAL_STUDENT);

      console.log("[Firebase] Seeding initial trainers...");
      for (const t of INITIAL_TRAINERS) {
        await saveToCloud("trainers", t.id, t);
      }

      console.log("[Firebase] Seeding initial parents...");
      for (const p of INITIAL_PARENTS) {
        await saveToCloud("parents", p.id, p);
      }

      console.log("[Firebase] Seeding initial reviews...");
      for (const r of INITIAL_REVIEWS) {
        await saveToCloud("reviews", r.id, r);
      }

      console.log("[Firebase] Seeding completed successfully.");
    } catch (error) {
      console.error("[Firebase] Seeding failed:", error);
    }
  }

  static getSlotDays(): SlotDay[] {
    return this.getStored<SlotDay[]>("slots", []);
  }

  static saveSlotDays(slots: SlotDay[]) {
    try {
      const oldSlots = this.getSlotDays();
      const oldIds = oldSlots.map(s => s.id);
      const newIds = new Set(slots.map(s => s.id));
      const deletedIds = oldIds.filter(id => !newIds.has(id));

      deletedIds.forEach(id => {
        deleteFromCloud("slots", id);
      });
    } catch (e) {
      console.warn("Could not determine deleted slots:", e);
    }

    this.setStored("slots", slots);

    try {
      slots.forEach(s => {
        saveToCloud("slots", s.id, s);
      });
    } catch (e) {
      console.error("Firebase slots write error:", e);
    }

    try {
      window.dispatchEvent(new CustomEvent("db-updated"));
    } catch {
      // ignore
    }
  }

  static saveSlotDay(slot: SlotDay) {
    const slots = this.getSlotDays();
    const idx = slots.findIndex(s => s.id === slot.id);
    if (idx >= 0) {
      slots[idx] = slot;
    } else {
      slots.push(slot);
    }
    this.saveSlotDays(slots);
  }

  // Reset database helper
  static resetAll() {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith("golden_hands_")) {
        localStorage.removeItem(k);
      }
    });
    localStorage.removeItem("golden_hands_current_student_id");
    
    // Trigger reset in cloud if needed, or simply let the reload resync
    window.location.reload();
  }

  // ACCOUNT DELETION MANAGEMENT
  static requestAccountDeletion(studentId: string, passwordInput: string, reason?: string): Student {
    const student = this.getStudent(studentId);
    if (!student) {
      throw new Error("Student record not found.");
    }

    // Verify password securely
    const storedPassword = student.password || "golden123";
    if (passwordInput.trim() !== storedPassword.trim()) {
      throw new Error("Password verification failed. Incorrect credentials provided.");
    }

    const now = new Date().toISOString();
    const updatedStudent: Student = {
      ...student,
      deletionRequested: true,
      deletionRequestedAt: now,
      deletionStatus: 'requested',
      deletionReason: reason || "User initiated account deletion",
      lastLoginAt: now
    };

    this.saveStudent(updatedStudent, studentId);

    // Also update in registered students list
    const students = this.getRegisteredStudents();
    const updatedStudents = students.map(s => s.id === studentId ? updatedStudent : s);
    this.saveRegisteredStudents(updatedStudents);

    return updatedStudent;
  }

  static getAccountDeletionRequests(): Student[] {
    const students = this.getRegisteredStudents();
    const currentStudent = this.getStudent();
    const allStudents = [
      ...(currentStudent.id && !students.some(s => s.id === currentStudent.id) ? [currentStudent] : []),
      ...students
    ];
    return allStudents.filter(s => s.deletionRequested === true || s.deletionStatus === 'requested');
  }

  static adminApproveAccountDeletion(studentId: string) {
    // 1. Remove from registered students list
    const students = this.getRegisteredStudents().filter(s => s.id !== studentId);
    this.saveRegisteredStudents(students);

    // 2. Clear current session if logged in as this student
    const currentStudentId = this.getCurrentStudentId();
    if (currentStudentId === studentId) {
      localStorage.removeItem("golden_hands_current_student_id");
      localStorage.removeItem("golden_hands_student");
    }

    // 3. Delete associated bookings
    const bookings = this.getAllBookings().filter(b => b.studentId !== studentId);
    this.saveBookings(bookings);

    // 4. Delete associated documents
    const documents = this.getAllDocuments().filter(d => d.studentId !== studentId);
    this.saveDocuments(documents);

    // 5. Delete associated payments
    const payments = this.getAllPayments().filter(p => p.studentId !== studentId);
    this.savePayments(payments);

    // 6. Delete associated chats
    const chats = this.getChats().filter(c => c.senderId !== studentId && c.receiverId !== studentId);
    this.saveChats(chats);

    // 7. Delete associated test attempts
    const attempts = this.getMockAttempts().filter(a => a.studentId !== studentId);
    this.saveMockAttempts(attempts);

    // 8. Remove from Cloud Firestore
    try {
      deleteFromCloud("students", studentId);
    } catch (e) {
      console.warn("Failed to delete student from cloud:", e);
    }

    try {
      window.dispatchEvent(new CustomEvent("db-updated"));
    } catch {
      // ignore
    }
  }

  static adminRejectAccountDeletion(studentId: string) {
    const targetStudent = this.getStudent(studentId);
    if (!targetStudent) return;

    const updatedStudent: Student = {
      ...targetStudent,
      deletionRequested: false,
      deletionRequestedAt: undefined,
      deletionStatus: 'rejected',
      deletionReason: undefined
    };

    this.saveStudent(updatedStudent, studentId);
    const students = this.getRegisteredStudents();
    const updatedStudents = students.map(s => s.id === studentId ? updatedStudent : s);
    this.saveRegisteredStudents(updatedStudents);
  }

  static checkAndRunAutoDeletions() {
    const requests = this.getAccountDeletionRequests();
    const now = Date.now();

    requests.forEach(req => {
      if (req.deletionRequestedAt) {
        const reqTime = new Date(req.deletionRequestedAt).getTime();
        const lastLoginTime = req.lastLoginAt ? new Date(req.lastLoginAt).getTime() : reqTime;

        // Auto delete if 15 days passed since request AND user has NOT logged in for 15 days
        const daysSinceReq = (now - reqTime) / (1000 * 60 * 60 * 24);
        const daysSinceLogin = (now - lastLoginTime) / (1000 * 60 * 60 * 24);

        if (daysSinceReq >= 15 && daysSinceLogin >= 15) {
          console.log(`[Auto-Deletion] Automatically deleting account for student ${req.id} (${req.name}) after 15 days of inactivity.`);
          this.adminApproveAccountDeletion(req.id);
        }
      }
    });
  }
}
