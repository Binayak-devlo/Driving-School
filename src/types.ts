export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  location: string;
  llStatus: 'Applied' | 'Approved' | 'Driving Test' | 'Licence Approved';
  referralCode: string;
  joinedDate: string;
  courseName?: string;
  courseNotes?: string;
  courseSyllabus?: string[]; // list of modules, e.g., ["Clutch control", "Parallel Parking", "Hill start"]
  password?: string;
  
  // Trainer Assignment & Locking
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  
  // Course Modification Workflow States
  proposedCourseName?: string;
  proposedCourseNotes?: string;
  proposedCourseSyllabus?: string[];
  proposedCourseFee?: number;
  modificationStatus?: 'none' | 'proposed' | 'paid_pending_approval' | 'rejected';
  planExtended?: boolean;
  licenceFeePaid?: boolean;
  courseEnded?: boolean;
  emailVerified?: boolean;

  // Payment & Booking Workflow States
  totalCourseFee?: number;
  amountPaid?: number;
  remainingAmount?: number;
  paymentStatus?: 'Unpaid' | 'Partial' | 'Paid';
  paymentApprovalStatus?: 'Pending Approval' | 'Approved' | 'Rejected' | 'None';
  firstClassCompleted?: boolean;
  completedClasses?: number;
  bookingLocked?: boolean;
  lockedReason?: string;
  adminManualUnlock?: boolean;
  paymentHistory?: any[];
  bookingHistory?: any[];

  // Account Deletion Workflow States
  deletionRequested?: boolean;
  deletionRequestedAt?: string; // ISO timestamp
  deletionStatus?: 'none' | 'requested' | 'rejected' | 'approved';
  deletionReason?: string;
  lastLoginAt?: string; // ISO timestamp
}

export interface Trainer {
  id: string;
  name: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  photoUrl: string;
  carName: string;
  carPlate: string;
  carPhotoUrl: string;
  isAvailable: boolean;
  password?: string;
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  carName: string;
  carPlate: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // "10:30 AM - 11:30 AM" etc
  location: string;
  status: 'upcoming' | 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  ratingGiven?: number;
  remarks?: string;
  
  // Attendance face recognition workflow states
  pickupStatus?: 'idle' | 'en_route' | 'picked_up';
  faceVerificationStatus?: 'pending' | 'verified' | 'failed';
  faceVerificationAttempts?: number;
  classStatus?: 'not_started' | 'class_started' | 'completed';
  attendancePresent?: boolean;
  attendanceLoggedAt?: string;
  attendanceLocation?: string;
  capturedPhoto?: string;
}

export interface SkillProgress {
  steering: number;
  clutch: number;
  brake: number;
  accelerator: number;
  gear: number;
  reverse: number;
  parking: number;
  hillStart: number;
  traffic: number;
  nightDriving: number;
  highway: number;
  confidence: number;
}

export interface Document {
  id: string;
  studentId: string;
  name: string; // "Aadhar", "PAN", "Learner Licence"
  type: string; // "PDF" or "Image"
  fileUrl: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  uploadedAt: string;
}

export interface DrivingLicenceDocumentItem {
  name: string;
  fileName: string;
  fileUrl: string;
  type?: 'Image' | 'PDF' | 'File';
  uploadedAt: string;
}

export interface DrivingLicenceApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentPhotoUrl?: string;
  status: 'Applied' | 'Under Review' | 'Approved' | 'Rejected';
  appliedAt: string;
  updatedAt: string;
  documents: {
    aadhaar?: DrivingLicenceDocumentItem | null;
    twoWheelerLicence?: DrivingLicenceDocumentItem | null;
    learnerLicence?: DrivingLicenceDocumentItem | null;
    otherDocuments?: DrivingLicenceDocumentItem | null;
  };
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  purpose: string; // "Full Course Fee", "Licence Processing", "Extra Practical Session"
  paymentMethod: 'UPI' | 'Card' | 'Net Banking' | 'Wallet';
  status: 'Success' | 'Pending' | 'Failed';
  transactionId: string;
  date: string;
}

export interface Review {
  id: string;
  studentName: string;
  studentPhoto: string;
  trainerId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // "student" or trainerId
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: string; // ISO string
  isRead: boolean;
}

export interface MockTestQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface MockTestAttempt {
  id: string;
  studentId: string;
  score: number; // percentage
  totalQuestions: number;
  correctAnswers: number;
  date: string;
  passed: boolean;
}

export interface SlotDay {
  id: string; // date string (YYYY-MM-DD)
  date: string; // date string (YYYY-MM-DD)
  morningMax: number;
  morningBooked: number;
  morningEnabled: boolean;
  lunchMax: number;
  lunchBooked: number;
  lunchEnabled: boolean;
  rushHourMax: number;
  rushHourBooked: number;
  rushHourEnabled: boolean;
  eveningMax: number;
  eveningBooked: number;
  eveningEnabled: boolean;
  isClosed: boolean;
}

export interface AICoachAdvice {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
}

export type TrackingStatus = 'WAITING' | 'PICKUP_STARTED' | 'ARRIVED' | 'CLASS_STARTED' | 'CLASS_COMPLETED';

export interface TrackingSession {
  trackingSessionId: string;
  studentId: string;
  trainerId: string;
  classId: string;
  status: TrackingStatus;
  isTracking?: boolean;
  routeStatus?: string;
  estimatedArrival?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  startedAt?: string;
  lastUpdatedAt?: string;
  endedAt?: string;
  studentLat?: number;
  studentLng?: number;
  locationUnavailable?: boolean;
  sessionId?: string;
}

export interface TrainerSession {
  trainerId: string;
  activeSessionId: string;
  updatedAt: string;
  timestamp: number;
}

export interface NavState {
  activeView: 'portal' | 'student' | 'trainer' | 'admin';
  studentScreen?: 'splash' | 'onboarding' | 'login' | 'register' | 'otp' | 'app' | 'verify';
  studentTab?: 'home' | 'classes' | 'modify' | 'track' | 'learn' | 'profile';
  studentSubPage?: string | null;
  trainerLoggedIn?: boolean;
  trainerTab?: 'schedule' | 'students' | 'performance';
  trainerSelectedBookingId?: string | null;
  adminLoggedIn?: boolean;
  adminTab?: string;
  adminPreviewDocId?: string | null;
  isFirst?: boolean;
  seq?: number;
}

