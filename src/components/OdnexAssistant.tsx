import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Send, RefreshCw, Calendar, MapPin, Phone, Car, 
  CheckCircle2, AlertTriangle, ArrowRight, User, Clock, 
  Navigation, Award, Check, X, ShieldCheck, ChevronRight, Mic, Volume2,
  ArrowDown
} from "lucide-react";
import { MockDatabase } from "../utils/db";
import { Booking, Student, Trainer, TrackingSession, SkillProgress } from "../types";
import { calculateDistanceKm, DEFAULT_BHUBANESWAR_LOCATION, getCoordinatesFromLocation } from "../utils/geo";

export interface OdnexAction {
  type: 
    | "BOOK_CLASS" 
    | "RESCHEDULE_CLASS" 
    | "CANCEL_CLASS" 
    | "TRACK_TRAINER" 
    | "CALL_TRAINER" 
    | "CALL_STUDENT" 
    | "VIEW_TRAINER_DETAILS" 
    | "VIEW_SCHEDULE" 
    | "START_PICKUP_ROUTE" 
    | "VIEW_PROGRESS" 
    | "NAVIGATE_TAB" 
    | "FIND_NEXT_SLOT"
    | "PRACTICE_TEST";
  data?: any;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  status?: "pending" | "confirmed" | "cancelled" | "executed" | "failed";
  errorMessage?: string;
}

export interface OdnexMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  action?: OdnexAction;
  suggestedActions?: string[];
}

interface OdnexAssistantProps {
  role: "student" | "trainer" | "admin";
  currentStudent?: Student;
  currentTrainer?: Trainer;
  onNavigateTab?: (tab: string, subPage?: string) => void;
  onStateChange?: () => void;
  onClose?: () => void;
  initialMessage?: string;
}

// In-memory fallback map for restricted Android WebView environments where DOM storage is sandboxed
const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // DOM Storage may throw SecurityError in restricted WebView
    }
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const val = window.sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  }
};

const getApiEndpointUrl = (path: string): string => {
  try {
    if (typeof window !== "undefined" && window.location) {
      if (window.location.protocol === "file:") {
        return path;
      }
    }
  } catch {}
  return path;
};

export default function OdnexAssistant({
  role,
  currentStudent,
  currentTrainer,
  onNavigateTab,
  onStateChange,
  onClose,
  initialMessage
}: OdnexAssistantProps) {
  const [messages, setMessages] = useState<OdnexMessage[]>(() => {
    const storageKey = `odnex_chat_history_${role}_${currentStudent?.id || currentTrainer?.id || 'guest'}`;
    const saved = safeStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved ODNEX history:", e);
      }
    }
    
    // Default initial greeting
    const greetingText = role === "trainer" 
      ? `Greetings, Coach **${currentTrainer?.name || "Trainer"}**! I am **ODNEX**, your centralized platform assistant. I can help coordinate your assigned students, navigate pickup routes, inspect today's schedule, and manage student training milestones.`
      : `Hello **${currentStudent?.name || "Student"}**! I am **ODNEX**, the super AI assistant for Golden Hands Driving School. How can I assist you today? You can ask me to book your next driving class, track your trainer's live arrival, call your coach, or review your skill progress!`;

    const defaultSuggestions = role === "trainer"
      ? [
          "🚗 Start my pickup route",
          "📅 Show today's classes",
          "👥 Show assigned students",
          "📞 Contact my current student"
        ]
      : [
          "📅 Book my driving class for tomorrow evening",
          "⏱️ Find my next available class",
          "📍 Where is my trainer?",
          "📞 Call my trainer",
          "📊 Show my training progress"
        ];

    return [{
      id: `msg_init_${Date.now()}`,
      role: "model",
      text: greetingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: defaultSuggestions
    }];
  });

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeActionExecuting, setActiveActionExecuting] = useState<string | null>(null);
  const [actionSuccessBanner, setActionSuccessBanner] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(messages.length);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
    } else {
      chatBottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  };

  // Scroll position monitor for previous messages
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceToBottom <= 80;
    isNearBottomRef.current = isNearBottom;
    setShowScrollBottom(!isNearBottom);
  };

  // Auto-scroll to bottom only on mount, on user prompt, or if user is already near bottom
  useEffect(() => {
    const isNewUserMsg = messages.length > prevMessagesCountRef.current && messages[messages.length - 1]?.role === "user";
    if (isNewUserMsg || isNearBottomRef.current || prevMessagesCountRef.current === 0) {
      scrollToBottom(true);
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, loading]);

  // Initial mount auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(false), 80);
    return () => clearTimeout(timer);
  }, []);

  // Persist messages reliably across refresh, navigation, login, and app restarts
  useEffect(() => {
    const storageKey = `odnex_chat_history_${role}_${currentStudent?.id || currentTrainer?.id || 'guest'}`;
    safeStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, role, currentStudent?.id, currentTrainer?.id]);

  // Handle initial message if passed from external button
  useEffect(() => {
    if (initialMessage && initialMessage.trim()) {
      handleSendMessage(initialMessage.trim());
    }
  }, []);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMessage: OdnexMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      // If we are running in file:// protocol or offline WebView, execute directly
      if (typeof window !== "undefined" && (window.location?.protocol === "file:" || navigator?.onLine === false)) {
        throw new Error("Offline or file protocol mode");
      }

      // Gather latest client-side state
      const progress = currentStudent ? MockDatabase.getProgress(currentStudent.id) : null;
      
      const payload = {
        role,
        studentId: currentStudent?.id,
        studentName: currentStudent?.name,
        trainerId: currentTrainer?.id,
        trainerName: currentTrainer?.name,
        skillProgress: progress,
        message: queryText,
        chatHistory: messages.slice(-10).map(m => ({ role: m.role, text: m.text }))
      };

      const endpoint = getApiEndpointUrl("/api/ai/coach");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        
        const assistantMessage: OdnexMessage = {
          id: `msg_odnex_${Date.now()}`,
          role: "model",
          text: data.text || "I am processing your request with our driving school systems.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: data.action,
          suggestedActions: data.suggestedActions || (role === 'trainer' 
            ? ["🚗 Start my pickup route", "📅 Show today's classes", "👥 My students"] 
            : ["📅 Book Tomorrow Evening", "📍 Track Trainer", "📞 Call Trainer", "⏱️ Next Available Slot"])
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Server returned non-OK or non-JSON response");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("Using local ODNEX engine response fallback:", err);
      // Intelligent Local Engine Fallback for Android WebView / Offline / Vercel Cold Starts
      const localResult = executeLocalOdnexEngine(queryText, role, currentStudent, currentTrainer);
      
      const fallbackMessage: OdnexMessage = {
        id: `msg_odnex_${Date.now()}`,
        role: "model",
        text: localResult.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: localResult.action,
        suggestedActions: localResult.suggestedActions
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // Local rule-based action processor fallback
  const executeLocalOdnexEngine = (
    query: string, 
    userRole: "student" | "trainer" | "admin",
    st?: Student, 
    tr?: Trainer
  ) => {
    const q = query.toLowerCase();
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Global: Creator & Developer Identification
    if (
      q.includes("creator") || 
      q.includes("who created") || 
      q.includes("who made") || 
      q.includes("who makes you") || 
      q.includes("who makes u") ||
      q.includes("who built") || 
      q.includes("who developed") || 
      q.includes("who programmed") ||
      q.includes("who designed you") ||
      q.includes("who is your developer") ||
      q.includes("who is your maker") ||
      q.includes("who is binayak") ||
      q.includes("bnp tech")
    ) {
      return {
        text: "BNP Tech Binayak Sir created me specially as a driving school assistant.",
        suggestedActions: userRole === 'trainer'
          ? ["🚗 Start Pickup Route", "📅 Today's Schedule", "👥 My Students"]
          : ["📅 Book a Driving Class", "📍 Track Trainer Live", "⏱️ Check Available Slots", "📊 View Progress"]
      };
    }

    // Courses, Fees, & Premium Plan Queries
    if (q.includes("fee") || q.includes("price") || q.includes("cost") || q.includes("plan") || q.includes("package") || q.includes("premium")) {
      return {
        text: `### Golden Hands Driving School Training Plans:\n\n1. **⭐ Premium Comprehensive Plan** — **₹4,000**\n   - Regular Course: ₹3,500 + Premium Upgrade: ₹500\n   - 15 Full Practical Sessions (Dual-Control Car)\n   - **Parent Live In-Car Stream**: 1:1 Live remote video broadcasting for parents & guardians\n   - Real-time GPS Telemetry, Speed & Route tracking\n   - RTO Licence Assistance & Test Preparation\n\n2. **Regular Comprehensive Plan** — **₹3,500**\n   - 15 Practical Driving Classes\n   - RTO Test Training & Road Safety\n\n3. **Refresher Course** — **₹1,750** (7 Sessions)\n4. **Extended Mastery Course** — **₹5,250** (23 Sessions)`,
        suggestedActions: ["⭐ Learn More about Premium", "📅 Book Next Class", "📁 Upload Documents"]
      };
    }

    // Driving School Location & Contact
    if (q.includes("address") || q.includes("where are you located") || q.includes("office") || q.includes("contact") || q.includes("number")) {
      return {
        text: `### Golden Hands Driving School Details:\n- **Location**: Plot 102, Rasulgarh Square, Bhubaneswar, Odisha 751010\n- **Phone**: +91 94370 12345 / +91 98765 43210\n- **Working Hours**: Monday to Sunday: 06:00 AM – 08:30 PM\n- **Vehicles**: Dual-Control Maruti Suzuki Swift, Hyundai i10, WagonR`,
        suggestedActions: ["📞 Call Office Now", "📍 View Map", "📅 Book Class"]
      };
    }

    // Driving Tips: Clutch, Hill Start, Parallel Parking
    if (q.includes("clutch") || q.includes("friction point") || q.includes("biting point")) {
      return {
        text: `### 🚗 Mastering Clutch Control (Biting Point):\n1. Press clutch fully down and engage 1st gear.\n2. Slowly raise your left foot until you hear the engine note drop slightly and feel the car vibrate gently — this is the **Biting Point**.\n3. Release handbrake smoothly while holding the clutch steady at this point.\n4. Gently press the accelerator as the vehicle rolls forward, then release the clutch smoothly over 2–3 seconds.`,
        suggestedActions: ["🚦 Practice Mock Test", "📊 View Clutch Progress", "📅 Book Driving Class"]
      };
    }

    if (q.includes("hill start") || q.includes("slope") || q.includes("uphill")) {
      return {
        text: `### ⛰️ Hill Start Technique (No Rollback):\n1. Apply the **handbrake firmly** and keep your foot brake pressed.\n2. Depress clutch and shift into **1st gear**.\n3. Bring clutch up to the **friction biting point** until the front of the car lifts slightly.\n4. Give gentle accelerator pedal (1,500–2,000 RPM).\n5. Release handbrake smoothly — the car will move uphill without rolling backward!`,
        suggestedActions: ["📊 View Hill Start Skill", "📅 Book Class for Hill Training"]
      };
    }

    if (q.includes("park") || q.includes("parallel parking") || q.includes("reverse")) {
      return {
        text: `### 🅿️ Parallel Parking Formula:\n1. Pull up parallel to the front vehicle (2–3 feet gap, rear bumpers aligned).\n2. Turn steering wheel **1 full lock towards the curb** and reverse slowly at a 45-degree angle.\n3. When your wing mirror aligns with the front car's rear bumper, straighten steering.\n4. Turn full lock the opposite way to tuck the front nose in parallel to the curb!`,
        suggestedActions: ["📊 View Parking Progress", "📅 Book Parking Session"]
      };
    }

    // 1. STUDENT INTENTS
    if (userRole === "student" && st) {
      const allBookings = MockDatabase.getAllBookings();
      const studentBookings = allBookings.filter(b => b.studentId === st.id);
      const docs = MockDatabase.getDocuments(st.id);
      const aadharDoc = docs.find(d => d.name.toLowerCase().includes("aadhar") || d.name.toLowerCase().includes("aadhaar"));
      const isAadharVerified = (aadharDoc && aadharDoc.status === "Verified") || st.adminManualUnlock;
      const completedCount = studentBookings.filter(b => b.status === "completed").length;
      const trainers = MockDatabase.getTrainers();
      const defaultTrainer: Trainer = trainers[0] || { 
        id: "trainer_1", 
        name: "Rajesh Kumar", 
        phone: "+91 98765 43210", 
        rating: 4.9,
        reviewsCount: 38,
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        carName: "Maruti Suzuki Swift", 
        carPlate: "OD 02 AB 1234",
        carPhotoUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=200&auto=format&fit=crop&q=80",
        isAvailable: true
      };

      // A. "Where is my trainer?" / "How far is my trainer?"
      if (q.includes("where is") || q.includes("how far") || q.includes("track trainer") || q.includes("trainer location") || q.includes("eta")) {
        const todayBooking = studentBookings.find(b => b.date === todayStr && b.status !== "cancelled");
        if (!todayBooking) {
          return {
            text: `You do not have a driving class scheduled for today (${todayStr}). Your next classes can be viewed in the Booking or Schedule area!`,
            action: { type: "VIEW_SCHEDULE" as const },
            suggestedActions: ["📅 Book a Class", "⏱️ Next Available Slot", "📊 View Progress"]
          };
        }

        const distKm = 1.8;
        const etaMins = 4;
        const statusText = todayBooking.pickupStatus === 'en_route' 
          ? `Trainer **${todayBooking.trainerName || defaultTrainer.name}** is on the way to your pickup location (**${st.location || "Rasulgarh, Bhubaneswar"}**)!`
          : (todayBooking.pickupStatus === 'picked_up' 
              ? `Trainer **${todayBooking.trainerName || defaultTrainer.name}** has picked you up / arrived at your pickup spot!` 
              : `Your session is booked for today (${todayBooking.timeSlot}). Live tracking will be active when your trainer departs.`);

        return {
          text: `${statusText}\n\n- **Distance**: ${distKm} km\n- **Estimated ETA**: ~${etaMins} minutes\n- **Vehicle**: ${todayBooking.carName || defaultTrainer.carName} (${todayBooking.carPlate || defaultTrainer.carPlate})`,
          action: {
            type: "TRACK_TRAINER" as const,
            data: {
              trainerName: todayBooking.trainerName || defaultTrainer.name,
              distanceKm: distKm,
              etaMinutes: etaMins,
              pickupStatus: todayBooking.pickupStatus || "en_route",
              location: st.location || "Rasulgarh, Bhubaneswar"
            }
          },
          suggestedActions: ["📍 Open Live Map", "📞 Call Trainer", "📅 View My Schedule"]
        };
      }

      // B. "Call my trainer"
      if (q.includes("call") || q.includes("phone") || q.includes("contact trainer")) {
        const targetTrainerName = defaultTrainer.name;
        const targetPhone = defaultTrainer.phone || "+919876543210";
        return {
          text: `Here is the contact details for your chief instructor **${targetTrainerName}**. You can trigger a phone call instantly using your device:`,
          action: {
            type: "CALL_TRAINER" as const,
            data: {
              name: targetTrainerName,
              phone: targetPhone,
              vehicle: `${defaultTrainer.carName} (${defaultTrainer.carPlate})`
            }
          },
          suggestedActions: ["📞 Call Now", "💬 Message in Chat", "📍 Track Location"]
        };
      }

      // C. "Book my driving class" / "Book for tomorrow evening"
      if (q.includes("book") || q.includes("schedule a class") || q.includes("reserve")) {
        // Validation checks
        if (!isAadharVerified) {
          return {
            text: `⚠️ **Aadhaar Verification Required**: You cannot book driving classes until your Aadhaar Card is uploaded and verified by administration. Please visit the Document Vault to upload your ID.`,
            action: { type: "NAVIGATE_TAB" as const, data: { tab: "profile", subPage: "documents" } },
            suggestedActions: ["📁 Upload Aadhaar Card", "📞 Contact Office"]
          };
        }

        if (st.courseEnded && !st.planExtended) {
          return {
            text: `⚠️ **Course Completed**: You have reached the maximum allowed classes for your current package. Please upgrade or pay the Licence Processing Fee to unlock additional training slots.`,
            action: { type: "NAVIGATE_TAB" as const, data: { tab: "modify" } },
            suggestedActions: ["⭐ Upgrade Plan", "💳 Pay Licence Fee"]
          };
        }

        // Detect slot preference
        let targetSlot = "Morning";
        if (q.includes("evening") || q.includes("night")) targetSlot = "Evening";
        else if (q.includes("lunch") || q.includes("afternoon")) targetSlot = "Lunch";
        else if (q.includes("rush") || q.includes("4:30")) targetSlot = "Rush Hour";

        let targetDate = tomorrowStr;
        if (q.includes("saturday")) {
          const d = new Date();
          d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
          targetDate = d.toISOString().split("T")[0];
        }

        return {
          text: `I have prepared a driving class booking proposal for you:\n\n- **Date**: ${targetDate}\n- **Session**: ${targetSlot} (60 mins)\n- **Trainer**: ${defaultTrainer.name}\n- **Vehicle**: ${defaultTrainer.carName}\n- **Pickup**: ${st.location || "Rasulgarh, Bhubaneswar"}\n\nPlease click **Confirm & Book Now** below to finalize this reservation into your official timetable.`,
          action: {
            type: "BOOK_CLASS" as const,
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
          },
          suggestedActions: ["✅ Confirm & Book Now", "📅 Choose Different Date", "⏱️ Next Available Slot"]
        };
      }

      // D. "Find next available class" / "Next available slot"
      if (q.includes("next available") || q.includes("available slot") || q.includes("available class")) {
        const slots = MockDatabase.getSlotDays();
        const availableSlot = slots.find(s => !s.isClosed && s.date > todayStr);
        const nextDate = availableSlot ? availableSlot.date : tomorrowStr;

        return {
          text: `The next available driving session is open on **${nextDate}** for **Morning (10:30 AM)** and **Evening (06:30 PM)** slots with remaining capacity!`,
          action: {
            type: "FIND_NEXT_SLOT" as const,
            data: {
              date: nextDate,
              timeSlot: "Morning"
            }
          },
          suggestedActions: [`📅 Book ${nextDate} Morning`, `📅 Book ${nextDate} Evening`, "📍 Track Trainer"]
        };
      }

      // E. "Show my trainer's details"
      if (q.includes("trainer details") || q.includes("my coach") || q.includes("trainer info")) {
        return {
          text: `### Chief Trainer Profile\n- **Name**: ${defaultTrainer.name}\n- **Rating**: ⭐ ${defaultTrainer.rating || 4.9} (${defaultTrainer.reviewsCount || 48} reviews)\n- **Assigned Vehicle**: ${defaultTrainer.carName} (Dual-Control Training Car)\n- **Plate**: ${defaultTrainer.carPlate}\n- **Contact**: ${defaultTrainer.phone || "+91 98765 43210"}`,
          action: {
            type: "VIEW_TRAINER_DETAILS" as const,
            data: defaultTrainer
          },
          suggestedActions: ["📞 Call Trainer", "💬 Chat with Trainer", "📅 Book Next Class"]
        };
      }

      // F. "Progress" / "Weak points"
      if (q.includes("progress") || q.includes("skill") || q.includes("weak")) {
        const prog = MockDatabase.getProgress(st.id);
        return {
          text: `### Your Driving Skill Progress\n- **Steering Control**: ${prog.steering}% 🎯\n- **Clutch & Friction**: ${prog.clutch}% ⚙️\n- **Braking Precision**: ${prog.brake}% 🛑\n- **Hill Start Maneuvers**: ${prog.hillStart}% ⛰️\n- **Parking Maneuvers**: ${prog.parking}% 🅿️\n\n*Completed Sessions*: **${completedCount} / ${st.totalSessions || 15}**`,
          action: { type: "VIEW_PROGRESS" as const },
          suggestedActions: ["🚦 Practice Mock Test", "📅 Book Class for Clutch Practice", "📞 Ask Trainer Advice"]
        };
      }

      // G. "Reschedule" / "Cancel"
      if (q.includes("reschedule") || q.includes("cancel")) {
        const upcomingBooking = studentBookings.find(b => b.date >= todayStr && b.status !== "cancelled");
        if (!upcomingBooking) {
          return {
            text: "You currently have no active upcoming driving bookings to reschedule or cancel.",
            suggestedActions: ["📅 Book a New Class", "⏱️ Check Available Slots"]
          };
        }

        if (q.includes("cancel")) {
          return {
            text: `You requested to cancel your booked class on **${upcomingBooking.date} (${upcomingBooking.timeSlot})** with **${upcomingBooking.trainerName}**. Would you like to confirm cancellation?`,
            action: {
              type: "CANCEL_CLASS" as const,
              requiresConfirmation: true,
              data: { bookingId: upcomingBooking.id, date: upcomingBooking.date }
            },
            suggestedActions: ["❌ Confirm Cancellation", "🔙 Keep My Class"]
          };
        } else {
          const nextSat = new Date();
          nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
          const newDate = nextSat.toISOString().split("T")[0];

          return {
            text: `I can reschedule your class on **${upcomingBooking.date}** to **Saturday (${newDate})** for the **${upcomingBooking.timeSlot}** slot!`,
            action: {
              type: "RESCHEDULE_CLASS" as const,
              requiresConfirmation: true,
              data: {
                bookingId: upcomingBooking.id,
                oldDate: upcomingBooking.date,
                newDate: newDate,
                newTimeSlot: upcomingBooking.timeSlot
              }
            },
            suggestedActions: ["✅ Confirm Reschedule", "📅 Choose Different Date"]
          };
        }
      }
    }

    // 2. TRAINER INTENTS
    if (userRole === "trainer" && tr) {
      const allBookings = MockDatabase.getAllBookings();
      const trainerBookings = allBookings.filter(b => b.trainerId === tr.id || b.trainerName?.toLowerCase().includes("rajesh"));
      const todayClasses = trainerBookings.filter(b => b.date === todayStr && b.status !== "cancelled");
      const students = MockDatabase.getRegisteredStudents();
      const currentStudentForPickup = students[0] || { id: "student_1", name: "Aman Pattnaik", phone: "+91 94370 12345", location: "Rasulgarh, Bhubaneswar" };

      // A. "Start my pickup route"
      if (q.includes("pickup") || q.includes("start route") || q.includes("start pickup") || q.includes("navigation")) {
        return {
          text: `Starting pickup navigation to student **${currentStudentForPickup.name}** at **${currentStudentForPickup.location || "Rasulgarh, Bhubaneswar"}**. Live GPS broadcasting has been engaged.`,
          action: {
            type: "START_PICKUP_ROUTE" as const,
            data: {
              studentId: currentStudentForPickup.id,
              studentName: currentStudentForPickup.name,
              location: currentStudentForPickup.location || "Rasulgarh, Bhubaneswar",
              phone: currentStudentForPickup.phone
            }
          },
          suggestedActions: ["🗺️ View Pickup Map", "📞 Call Student", "📅 Today's Schedule"]
        };
      }

      // B. "Show assigned students"
      if (q.includes("assigned students") || q.includes("my students") || q.includes("roll")) {
        const studentListText = students.slice(0, 5).map(s => `- **${s.name}**: ${s.courseName || 'Basic Course'} (${s.location || 'Bhubaneswar'}) - 📞 ${s.phone}`).join("\n");
        return {
          text: `### Your Assigned Students (${students.length} Total):\n${studentListText}`,
          action: { type: "NAVIGATE_TAB" as const, data: { tab: "students" } },
          suggestedActions: ["🚗 Start Pickup Route", "📅 Today's Schedule", "📞 Contact Student"]
        };
      }

      // C. "Today's schedule" / "Classes"
      if (q.includes("schedule") || q.includes("classes") || q.includes("today")) {
        const scheduleText = todayClasses.length > 0
          ? todayClasses.map(c => `- **${c.timeSlot}**: ${c.studentName || 'Student'} (${c.carName || tr.carName}) - Status: ${c.status}`).join("\n")
          : "You have no scheduled student classes remaining for today.";
        return {
          text: `### Today's Schedule (${todayStr}):\n${scheduleText}`,
          action: { type: "VIEW_SCHEDULE" as const },
          suggestedActions: ["🚗 Start Pickup Route", "👥 My Students", "⭐ Performance"]
        };
      }

      // D. "Contact student" / "Call student"
      if (q.includes("call") || q.includes("contact student") || q.includes("phone")) {
        return {
          text: `Contact details for your next student **${currentStudentForPickup.name}**:\n- **Phone**: ${currentStudentForPickup.phone}\n- **Pickup Address**: ${currentStudentForPickup.location || "Rasulgarh, Bhubaneswar"}`,
          action: {
            type: "CALL_STUDENT" as const,
            data: {
              name: currentStudentForPickup.name,
              phone: currentStudentForPickup.phone
            }
          },
          suggestedActions: ["📞 Call Student Now", "🚗 Navigate to Pickup", "📅 View Schedule"]
        };
      }
    }

    // Default general response
    return {
      text: `I understand! As **ODNEX**, I am connected to the Golden Hands Driving School management network in Bhubaneswar. I can help coordinate class bookings, track real-time trainer location and ETA, organize schedule updates, and help practice road test questions.`,
      suggestedActions: userRole === 'trainer'
        ? ["🚗 Start Pickup Route", "📅 Show Today's Schedule", "👥 Assigned Students"]
        : ["📅 Book Class for Tomorrow", "📍 Track Trainer Live", "📞 Call Trainer", "⏱️ Next Available Slot", "📊 Check My Progress"]
    };
  };

  // Execution handler for action buttons
  const handleExecuteAction = (action: OdnexAction, msgIndex: number) => {
    setActiveActionExecuting(action.type);

    try {
      if (action.type === "BOOK_CLASS") {
        if (currentStudent && action.data) {
          const newBooking: Booking = {
            id: `book_${Date.now()}`,
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            trainerId: action.data.trainerId || "trainer_1",
            trainerName: action.data.trainerName || "Rajesh Kumar",
            carName: action.data.carName || "Maruti Suzuki Swift",
            carPlate: action.data.carPlate || "OD 02 AB 1234",
            date: action.data.date,
            timeSlot: action.data.timeSlot || "Morning",
            location: currentStudent.location || "Rasulgarh, Bhubaneswar",
            status: "upcoming",
            pickupStatus: "idle",
            classStatus: "not_started"
          };

          const allBookings = MockDatabase.getAllBookings();
          MockDatabase.saveBookings([...allBookings, newBooking]);
          onStateChange?.();

          setActionSuccessBanner(`🎉 Driving class booked for ${action.data.date} (${action.data.timeSlot})!`);
          
          // Update message action status
          setMessages(prev => {
            const copy = [...prev];
            if (copy[msgIndex] && copy[msgIndex].action) {
              copy[msgIndex].action!.status = "executed";
            }
            return copy;
          });

          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: `msg_odnex_${Date.now()}`,
              role: "model",
              text: `✅ **Booking Confirmed!** Your driving class is officially confirmed for **${action.data.date}** (${action.data.timeSlot}) with **${action.data.trainerName}**. You can view this in your Schedule tab.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedActions: ["📍 Track Trainer Location", "📊 View Skill Progress", "🚦 Practice Mock Test"]
            }]);
          }, 400);
        }
      } else if (action.type === "CANCEL_CLASS") {
        if (action.data?.bookingId) {
          const allBookings = MockDatabase.getAllBookings();
          const updated = allBookings.map(b => b.id === action.data.bookingId ? { ...b, status: 'cancelled' as const } : b);
          MockDatabase.saveBookings(updated);
          onStateChange?.();
          setActionSuccessBanner("Class cancelled successfully.");

          setMessages(prev => {
            const copy = [...prev];
            if (copy[msgIndex] && copy[msgIndex].action) {
              copy[msgIndex].action!.status = "executed";
            }
            return copy;
          });
        }
      } else if (action.type === "RESCHEDULE_CLASS") {
        if (action.data?.bookingId && action.data?.newDate) {
          const allBookings = MockDatabase.getAllBookings();
          const updated = allBookings.map(b => b.id === action.data.bookingId ? { 
            ...b, 
            date: action.data.newDate, 
            timeSlot: action.data.newTimeSlot || b.timeSlot 
          } : b);
          MockDatabase.saveBookings(updated);
          onStateChange?.();
          setActionSuccessBanner(`Class rescheduled to ${action.data.newDate}!`);

          setMessages(prev => {
            const copy = [...prev];
            if (copy[msgIndex] && copy[msgIndex].action) {
              copy[msgIndex].action!.status = "executed";
            }
            return copy;
          });
        }
      } else if (action.type === "CALL_TRAINER" || action.type === "CALL_STUDENT") {
        const phone = action.data?.phone;
        if (phone) {
          window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
        }
      } else if (action.type === "TRACK_TRAINER" || action.type === "START_PICKUP_ROUTE") {
        if (role === "trainer") {
          onNavigateTab?.("map");
        } else {
          onNavigateTab?.("tracking");
        }
      } else if (action.type === "VIEW_SCHEDULE") {
        if (role === "trainer") {
          onNavigateTab?.("schedule");
        } else {
          onNavigateTab?.("booking");
        }
      } else if (action.type === "VIEW_PROGRESS") {
        onNavigateTab?.("progress");
      } else if (action.type === "NAVIGATE_TAB") {
        onNavigateTab?.(action.data?.tab || "booking", action.data?.subPage);
      }
    } catch (e) {
      console.error("Action execution error:", e);
    } finally {
      setActiveActionExecuting(null);
      setTimeout(() => setActionSuccessBanner(null), 4000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0E17] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
      {/* Top Futuristic Header */}
      <div className="bg-gradient-to-r from-[#161626] via-[#1F1938] to-[#161626] p-4 border-b border-white/10 flex items-center justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-10 w-32 h-32 bg-[#6D3BFF] opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-5 w-24 h-24 bg-[#D4AF37] opacity-15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D3BFF] via-[#8F52FF] to-[#D4AF37] p-0.5 shadow-lg shadow-[#6D3BFF]/30 flex items-center justify-center">
              <div className="w-full h-full bg-[#12111E] rounded-[14px] flex items-center justify-center font-black text-xs text-[#D4AF37] tracking-wider">
                ODNEX
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#161626] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm tracking-wide bg-gradient-to-r from-white via-slate-100 to-[#D4AF37] bg-clip-text text-transparent">
                ODNEX
              </h3>
              <span className="bg-[#6D3BFF]/30 text-[#A27BFF] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#6D3BFF]/40 uppercase tracking-widest">
                SUPER AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {role === "trainer" ? "Trainer Operations Copilot" : "Central Intelligent Assistant"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {/* Quick Voice Mode indicator */}
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1 font-bold ${
              isVoiceActive 
                ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md shadow-[#D4AF37]/30" 
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
            title="Toggle Voice Mode"
          >
            {isVoiceActive ? <Volume2 className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-[10px] hidden sm:inline">{isVoiceActive ? "Voice Active" : "Voice"}</span>
          </button>

          {onClose && (
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessBanner && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg animate-slideDown z-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessBanner}</span>
          </div>
          <button onClick={() => setActionSuccessBanner(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Interactive Command Hub (Horizontal Scroller) */}
      <div className="bg-[#12111E] py-2.5 px-3 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-none custom-scrollbar">
        {role === "trainer" ? (
          <>
            <button
              onClick={() => handleSendMessage("Start my pickup route")}
              className="whitespace-nowrap bg-[#6D3BFF]/20 hover:bg-[#6D3BFF]/30 border border-[#6D3BFF]/40 text-[#A27BFF] text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-[#D4AF37]" /> Start Pickup Route
            </button>
            <button
              onClick={() => handleSendMessage("Show today's classes")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Today's Schedule
            </button>
            <button
              onClick={() => handleSendMessage("Show assigned students")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" /> My Students
            </button>
            <button
              onClick={() => handleSendMessage("Call current student")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Call Student
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleSendMessage("ODNEX, book my driving class for tomorrow evening")}
              className="whitespace-nowrap bg-[#6D3BFF]/20 hover:bg-[#6D3BFF]/30 border border-[#6D3BFF]/40 text-[#A27BFF] text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Book Class
            </button>
            <button
              onClick={() => handleSendMessage("Find my next available class")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Next Available Slot
            </button>
            <button
              onClick={() => handleSendMessage("Where is my trainer?")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> Track Trainer Live
            </button>
            <button
              onClick={() => handleSendMessage("Call my trainer")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Trainer
            </button>
            <button
              onClick={() => handleSendMessage("Show my skill progress")}
              className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" /> Skill Progress
            </button>
          </>
        )}
      </div>

      {/* Main Conversational Feed */}
      <div 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        data-no-ptr="true"
        className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-[#0E0E17]/80 overscroll-contain select-text"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}
            >
              {/* Sender Tag */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-semibold">
                {isUser ? (
                  <>
                    <span>You</span>
                    <span className="text-slate-600">•</span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" /> ODNEX
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                  isUser
                    ? "bg-gradient-to-br from-[#6D3BFF] to-[#8F52FF] text-white rounded-tr-none shadow-md shadow-[#6D3BFF]/20"
                    : "bg-[#181726] border border-white/10 text-slate-100 rounded-tl-none shadow-md"
                }`}
              >
                {/* Render Markdown text paragraphs */}
                <div className="space-y-1.5">
                  {msg.text.split("\n").map((line, lIdx) => {
                    if (line.startsWith("### ")) {
                      return <h4 key={lIdx} className="font-extrabold text-sm text-[#D4AF37] mt-2 mb-1">{line.replace("### ", "")}</h4>;
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <div key={lIdx} className="flex items-start gap-1.5 pl-1">
                          <span className="text-[#D4AF37]">•</span>
                          <span>{line.replace("- ", "")}</span>
                        </div>
                      );
                    }
                    return line ? <p key={lIdx}>{line}</p> : null;
                  })}
                </div>

                {/* Structured Consequential Action Card */}
                {msg.action && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    {/* 1. BOOK CLASS ACTION CARD */}
                    {msg.action.type === "BOOK_CLASS" && (
                      <div className="bg-[#12111E] rounded-xl p-3 border border-[#6D3BFF]/40 flex flex-col gap-2.5 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A27BFF] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Proposed Class Booking
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                            Action Pending
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Date</span>
                            <span className="font-bold text-white">{msg.action.data?.date}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Slot</span>
                            <span className="font-bold text-emerald-400">{msg.action.data?.timeSlot}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Instructor</span>
                            <span className="font-bold text-white">{msg.action.data?.trainerName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Vehicle</span>
                            <span className="font-bold text-slate-300">{msg.action.data?.carName}</span>
                          </div>
                        </div>

                        {msg.action.status === "executed" ? (
                          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold py-2 rounded-lg text-center flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Booking Successfully Confirmed
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              disabled={activeActionExecuting === msg.action.type}
                              onClick={() => handleExecuteAction(msg.action!, index)}
                              className="flex-1 bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] hover:brightness-110 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              {activeActionExecuting === msg.action.type ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Confirm & Book Now
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. LIVE TRACKING ACTION CARD */}
                    {msg.action.type === "TRACK_TRAINER" && (
                      <div className="bg-[#12111E] rounded-xl p-3 border border-rose-500/30 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Live Telemetry
                          </span>
                          <span className="bg-rose-500/20 text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                            Broadcasting GPS
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Live Distance</span>
                            <span className="font-extrabold text-white text-sm">{msg.action.data?.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Estimated Arrival</span>
                            <span className="font-extrabold text-emerald-400 text-sm">~{msg.action.data?.etaMinutes} mins</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecuteAction(msg.action!, index)}
                          className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Open Live Map View
                        </button>
                      </div>
                    )}

                    {/* 3. CALL TRAINER / STUDENT CARD */}
                    {(msg.action.type === "CALL_TRAINER" || msg.action.type === "CALL_STUDENT") && (
                      <div className="bg-[#12111E] rounded-xl p-3 border border-emerald-500/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> Instant Contact
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{msg.action.data?.name}</span>
                        </div>

                        <a
                          href={`tel:${(msg.action.data?.phone || "").replace(/\s+/g, '')}`}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-center"
                        >
                          <Phone className="w-3.5 h-3.5 animate-bounce" /> Call {msg.action.data?.phone}
                        </a>
                      </div>
                    )}

                    {/* 4. TRAINER START PICKUP ROUTE */}
                    {msg.action.type === "START_PICKUP_ROUTE" && (
                      <div className="bg-[#12111E] rounded-xl p-3 border border-blue-500/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" /> Student Pickup Destination
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">{msg.action.data?.studentName}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          📍 {msg.action.data?.location}
                        </p>
                        <button
                          onClick={() => handleExecuteAction(msg.action!, index)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Open Navigation & Broadcast GPS
                        </button>
                      </div>
                    )}

                    {/* 5. RESCHEDULE / CANCEL CARDS */}
                    {(msg.action.type === "RESCHEDULE_CLASS" || msg.action.type === "CANCEL_CLASS") && (
                      <div className="bg-[#12111E] rounded-xl p-3 border border-amber-500/30 flex flex-col gap-2">
                        {msg.action.status === "executed" ? (
                          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold py-2 rounded-lg text-center">
                            Action Completed Successfully
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExecuteAction(msg.action!, index)}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs py-2 rounded-xl transition-all cursor-pointer"
                            >
                              {msg.action.type === "CANCEL_CLASS" ? "Confirm Cancellation" : "Confirm Reschedule"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Suggested Action Pills below model response */}
              {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                  {msg.suggestedActions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="bg-white/5 hover:bg-[#6D3BFF]/20 border border-white/10 hover:border-[#6D3BFF]/40 text-slate-300 hover:text-white text-[10.5px] font-semibold px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{suggestion}</span>
                      <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-start gap-2 max-w-[85%]">
            <div className="bg-[#181726] border border-white/10 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-[#6D3BFF] animate-spin" />
              <span className="font-medium">ODNEX is reasoning with driving school systems...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Floating Scroll to Latest Button when viewing previous messages */}
      {showScrollBottom && (
        <div className="absolute bottom-[76px] right-4 z-30 animate-fadeIn">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-[11px] font-bold py-1.5 px-3 rounded-full shadow-xl shadow-[#6D3BFF]/50 border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            <span>Latest Messages</span>
          </button>
        </div>
      )}

      {/* Futuristic Bottom Input Area */}
      <div className="p-3 bg-[#12111E] border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={role === "trainer" ? "Ask ODNEX: Start pickup route, today's schedule, call student..." : "Ask ODNEX: Book tomorrow evening, track trainer, call coach..."}
              className="w-full bg-[#1A192B] border border-white/15 focus:border-[#6D3BFF] text-white text-xs rounded-2xl px-3.5 py-3 pr-10 focus:outline-none placeholder:text-slate-500 font-medium"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery("")}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              inputQuery.trim() && !loading
                ? "bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] text-white shadow-lg shadow-[#6D3BFF]/30 hover:brightness-110 cursor-pointer"
                : "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex justify-between items-center px-1 mt-2 text-[9px] text-slate-500 font-medium">
          <span>Protected by Golden Hands Role Verification</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Authorized Context
          </span>
        </div>
      </div>
    </div>
  );
}
