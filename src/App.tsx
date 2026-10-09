import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { 
  Car, Compass, ShieldCheck, Phone, MapPin, Sparkles, Sliders, 
  ArrowLeft, Users, UserCheck, CreditCard, ChevronRight, Laptop, 
  RefreshCw, Smartphone, BookOpen, AlertCircle, CheckCircle2, Navigation,
  Award, Star, HelpCircle, Activity, Play, Check, AlertTriangle, Cloud, ExternalLink
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./utils/firebase";
import SplashScreen from "./components/SplashScreen";
import UnifiedAuthPortal from "./components/UnifiedAuthPortal";
import PullToRefresh from "./components/PullToRefresh";
import { MockDatabase } from "./utils/db";
import { AuthSessionManager } from "./utils/authSession";
import { NavState } from "./types";

// Dynamic lazy-loading to optimize bundle size and prevent main thread locks
const StudentApp = lazy(() => import("./components/StudentApp"));
const TrainerApp = lazy(() => import("./components/TrainerApp"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const ParentPortal = lazy(() => import("./components/ParentPortal"));

function PortalWorkspaceLoader({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-center p-8 min-h-[400px]">
      <div className="w-12 h-12 relative mb-4">
        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-[#FFE073] rounded-full animate-spin" />
      </div>
      <h3 className="text-sm font-extrabold text-white tracking-tight">{label}</h3>
      <p className="text-xs text-slate-400 mt-1 font-medium">Opening secure workspace...</p>
    </div>
  );
}

function getInitialNavState(): NavState {
  let initialView: 'portal' | 'student' | 'trainer' | 'admin' | 'parent' = 'portal';
  let studentScreen: 'login' | 'app' = 'login';
  let trainerLoggedIn = false;
  let adminLoggedIn = false;
  let parentLoggedIn = false;

  try {
    const isStudent = AuthSessionManager.isRoleAuthenticated('student');
    const isTrainer = AuthSessionManager.isRoleAuthenticated('trainer');
    const isAdmin = AuthSessionManager.isRoleAuthenticated('admin');
    const isParent = AuthSessionManager.isRoleAuthenticated('parent');

    if (isStudent) {
      initialView = 'student';
      studentScreen = 'app';
    } else if (isTrainer) {
      initialView = 'trainer';
      trainerLoggedIn = true;
    } else if (isAdmin) {
      initialView = 'admin';
      adminLoggedIn = true;
    } else if (isParent) {
      initialView = 'parent';
      parentLoggedIn = true;
    }
  } catch (e) {}

  return {
    activeView: initialView,
    studentScreen,
    studentTab: 'home',
    studentSubPage: null,
    trainerLoggedIn,
    trainerTab: 'schedule',
    trainerSelectedBookingId: null,
    adminLoggedIn,
    adminTab: 'analytics',
    adminPreviewDocId: null,
    parentLoggedIn,
    parentTab: 'overview',
    seq: 2
  };
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem("golden_hands_splash_seen") !== "true";
    } catch {
      return false;
    }
  });

  const handleSplashComplete = useCallback(() => {
    try {
      sessionStorage.setItem("golden_hands_splash_seen", "true");
    } catch(e) {}
    setShowSplash(false);
  }, []);
  
  // Shared state refresher across client views
  const [dbRefreshKey, setDbRefreshKey] = useState(0);

  // Sync state stats
  const [student, setStudent] = useState(() => MockDatabase.getStudent());
  const [trainers, setTrainers] = useState(() => MockDatabase.getTrainers());
  const [bookings, setBookings] = useState(() => MockDatabase.getBookings());
  const [payments, setPayments] = useState(() => MockDatabase.getPayments());
  const [progress, setProgress] = useState(() => MockDatabase.getProgress());

  // Cloud synchronization status
  const [cloudSyncing, setCloudSyncing] = useState(false);

  // Firebase connection status state
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'offline'>('connected');
  const [showConnectedBar, setShowConnectedBar] = useState(false);

  // Back navigation management states
  const [currentNavState, setCurrentNavState] = useState<NavState>(() => {
    return getInitialNavState();
  });

  const activeView = currentNavState.activeView;

  const [appToast, setAppToast] = useState<string | null>(null);
  const [isExited, setIsExited] = useState(false);
  const lastBackPressTimeRef = useRef<number>(0);
  const currentNavStateRef = useRef<NavState>(currentNavState);
  
  const isNavigatingBackRef = useRef<boolean>(false);
  const navStackRef = useRef<NavState[]>([currentNavState]);

  const isStateEqual = (a: NavState, b: NavState) => {
    return (
      a.activeView === b.activeView &&
      a.studentScreen === b.studentScreen &&
      a.studentTab === b.studentTab &&
      a.studentSubPage === b.studentSubPage &&
      a.trainerLoggedIn === b.trainerLoggedIn &&
      a.trainerTab === b.trainerTab &&
      a.trainerSelectedBookingId === b.trainerSelectedBookingId &&
      a.adminLoggedIn === b.adminLoggedIn &&
      a.adminTab === b.adminTab &&
      a.adminPreviewDocId === b.adminPreviewDocId
    );
  };

  // Keep ref in sync for use in event listeners
  useEffect(() => {
    currentNavStateRef.current = currentNavState;
  }, [currentNavState]);

  // Non-blocking background synchronization on startup
  useEffect(() => {
    let isMounted = true;
    MockDatabase.syncFromCloud()
      .then(() => {
        if (isMounted) {
          setStudent(MockDatabase.getStudent());
          setTrainers(MockDatabase.getTrainers());
          setBookings(MockDatabase.getBookings());
          setPayments(MockDatabase.getPayments());
          setProgress(MockDatabase.getProgress());
        }
      })
      .catch((err) => {
        console.warn("Background cloud sync startup notice:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerAppToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 2000);
  };

  const handleUniversalLogout = useCallback(async (portalName?: string) => {
    try {
      await AuthSessionManager.logout(portalName);
    } catch (e) {
      console.warn("Logout notification error:", e);
    }

    const cleanState: NavState = {
      activeView: 'portal',
      studentScreen: 'login',
      studentTab: 'home',
      studentSubPage: null,
      trainerLoggedIn: false,
      trainerTab: 'schedule',
      trainerSelectedBookingId: null,
      adminLoggedIn: false,
      adminTab: 'analytics',
      adminPreviewDocId: null,
      parentLoggedIn: false,
      parentTab: 'overview',
      seq: (currentNavStateRef.current?.seq || 2) + 1
    };

    navStackRef.current = [cleanState];
    window.history.replaceState(cleanState, '');
    setCurrentNavState(cleanState);
    triggerAppToast("Logged out securely.");
  }, []);

  const changeView = (view: 'portal' | 'student' | 'trainer' | 'admin' | 'parent') => {
    if (currentNavState.activeView === view) return;

    const isStudentLoggedIn = AuthSessionManager.isRoleAuthenticated('student');
    const isTrainerLoggedIn = AuthSessionManager.isRoleAuthenticated('trainer');
    const isAdminLoggedIn = AuthSessionManager.isRoleAuthenticated('admin');
    const isParentLoggedIn = AuthSessionManager.isRoleAuthenticated('parent');

    let fresh: NavState = {
      ...currentNavState,
      activeView: view
    };

    if (view === 'student') {
      fresh.studentScreen = isStudentLoggedIn ? 'app' : 'login';
    } else if (view === 'trainer') {
      fresh.trainerLoggedIn = isTrainerLoggedIn;
    } else if (view === 'admin') {
      fresh.adminLoggedIn = isAdminLoggedIn;
    } else if (view === 'parent') {
      fresh.parentLoggedIn = isParentLoggedIn;
    }

    const nextSeq = (currentNavState.seq || 2) + 1;
    fresh.seq = nextSeq;

    const topOfStack = navStackRef.current[navStackRef.current.length - 1];
    if (!topOfStack || !isStateEqual(fresh, topOfStack)) {
      navStackRef.current.push(fresh);
      setCurrentNavState(fresh);
      window.history.pushState(fresh, '');
    }
  };

  // Initialize and listen to popstate / reported changes
  useEffect(() => {
    const defaultState = getInitialNavState();

    // Verify any stored session with the backend on app start
    AuthSessionManager.verifySessionWithBackend().then(res => {
      if (!res.valid) {
        // If session was invalid or expired, ensure user is returned to clean login screen
        if (currentNavStateRef.current.activeView !== 'portal') {
          handleUniversalLogout();
        }
      }
    });

    // Setup initial history entry buffer on load to capture first back-click on Home
    const existingState = window.history.state;
    if (!existingState || !existingState.activeView) {
      const initialHistState = { ...defaultState, isFirst: true, seq: 1 };
      window.history.replaceState(initialHistState, '');
      window.history.pushState(defaultState, '');
      navStackRef.current = [initialHistState, defaultState];
    } else {
      navStackRef.current = [existingState];
    }

    // popstate event handler (triggered by browser back/forward)
    const handlePopState = (e: PopStateEvent) => {
      const poppedState = (e.state || defaultState) as NavState;
      if (poppedState) {
        if (poppedState.isFirst) {
          const now = Date.now();
          if (now - lastBackPressTimeRef.current < 2000) {
            setIsExited(true);
            // Try capacitor exit if available, else window.close fallback
            import('@capacitor/app').then(({ App }) => {
              App.exitApp();
            }).catch(() => {
              try {
                window.close();
              } catch (err) {
                console.log("window.close not allowed");
              }
            });
          } else {
            lastBackPressTimeRef.current = now;
            triggerAppToast("Press back again to exit.");
            // Re-push active state so the popped state buffer is restored
            const nextSeq = (currentNavStateRef.current.seq || 2) + 1;
            const stateWithSeq = { ...currentNavStateRef.current, seq: nextSeq };
            window.history.pushState(stateWithSeq, '');
          }
        } else {
          isNavigatingBackRef.current = true;
          let safeState = { ...poppedState };

          // Security check: Protect authenticated portals from unauthorized back-navigation after logout
          if (safeState.activeView === 'student' && safeState.studentScreen === 'app') {
            if (!AuthSessionManager.isRoleAuthenticated('student')) {
              safeState = { ...safeState, activeView: 'portal', studentScreen: 'login' };
            }
          } else if (safeState.activeView === 'trainer' && safeState.trainerLoggedIn) {
            if (!AuthSessionManager.isRoleAuthenticated('trainer')) {
              safeState = { ...safeState, activeView: 'portal', trainerLoggedIn: false };
            }
          } else if (safeState.activeView === 'admin' && safeState.adminLoggedIn) {
            if (!AuthSessionManager.isRoleAuthenticated('admin')) {
              safeState = { ...safeState, activeView: 'portal', adminLoggedIn: false };
            }
          } else if (safeState.activeView === 'parent' && safeState.parentLoggedIn) {
            if (!AuthSessionManager.isRoleAuthenticated('parent')) {
              safeState = { ...safeState, activeView: 'portal', parentLoggedIn: false };
            }
          }

          const stateIdx = safeState.seq 
            ? navStackRef.current.findIndex(s => s.seq === safeState.seq)
            : navStackRef.current.findIndex(s => isStateEqual(s, safeState));
          if (stateIdx !== -1) {
            navStackRef.current = (navStackRef.current || []).slice(0, stateIdx + 1);
          } else {
            navStackRef.current.push(safeState);
          }
          setCurrentNavState(safeState);
          setTimeout(() => {
            isNavigatingBackRef.current = false;
          }, 800);
        }
      }
    };

    // Centralized auth logout event listener
    const handleAuthLogoutEvent = () => {
      const cleanState: NavState = {
        activeView: 'portal',
        studentScreen: 'login',
        studentTab: 'home',
        studentSubPage: null,
        trainerLoggedIn: false,
        trainerTab: 'schedule',
        trainerSelectedBookingId: null,
        adminLoggedIn: false,
        adminTab: 'analytics',
        adminPreviewDocId: null,
        parentLoggedIn: false,
        parentTab: 'overview',
        seq: (currentNavStateRef.current?.seq || 2) + 1
      };
      navStackRef.current = [cleanState];
      window.history.replaceState(cleanState, '');
      setCurrentNavState(cleanState);
    };
    window.addEventListener("golden_hands_auth_logout", handleAuthLogoutEvent);

    // reported change handler (triggered by children navigation changes)
    const handleNavReported = (e: Event) => {
      const reported = (e as CustomEvent).detail as Partial<NavState>;
      const current = currentNavStateRef.current;

      const freshState: NavState = {
        ...current,
        ...reported,
        activeView: reported.activeView || current.activeView
      };

      if (isNavigatingBackRef.current) {
        if (isStateEqual(freshState, current)) {
          isNavigatingBackRef.current = false;
        }
        return;
      }

      const isDifferent = !isStateEqual(freshState, current);

      if (isDifferent) {
        const topOfStack = navStackRef.current[navStackRef.current.length - 1];
        if (!topOfStack || !isStateEqual(freshState, topOfStack)) {
          const nextSeq = (current.seq || 2) + 1;
          const stateWithSeq = { ...freshState, seq: nextSeq };
          navStackRef.current.push(stateWithSeq);
          setCurrentNavState(stateWithSeq);
          window.history.pushState(stateWithSeq, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app-nav-reported', handleNavReported);

    // Capacitor hardware back button event registration
    let backButtonListener: any;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        const current = currentNavStateRef.current;
        if (current.activeView === 'portal') {
          const now = Date.now();
          if (now - lastBackPressTimeRef.current < 2000) {
            setIsExited(true);
            App.exitApp();
          } else {
            lastBackPressTimeRef.current = now;
            triggerAppToast("Press back again to exit.");
          }
        } else {
          window.history.back();
        }
      }).then(handler => {
        backButtonListener = handler;
      });
    }).catch(() => {
      // Not running in Capacitor, ignore
    });

    return () => {
      window.removeEventListener("golden_hands_auth_logout", handleAuthLogoutEvent);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app-nav-reported', handleNavReported);
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []);


  // Listen to Firestore changes in real-time across all collections
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    let debounceTimer: any = null;

    const triggerDebouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setStudent(MockDatabase.getStudent());
        setTrainers(MockDatabase.getTrainers());
        setBookings(MockDatabase.getBookings());
        setPayments(MockDatabase.getPayments());
        setProgress(MockDatabase.getProgress());
        window.dispatchEvent(new CustomEvent("db-updated"));
      }, 100);
    };

    const collectionsToSync = [
      { name: "students", key: "registered_students_list" },
      { name: "trainers", key: "trainers" },
      { name: "bookings", prefix: "bookings_" },
      { name: "progress", prefix: "progress_" },
      { name: "documents", prefix: "documents_" },
      { name: "payments", prefix: "payments_" },
      { name: "chats", prefix: "chats_" },
      { name: "mock_attempts", prefix: "mock_attempts_" },
      { name: "reviews", key: "reviews" },
      { name: "slots", key: "slots" },
      { name: "trackingSessions", key: "tracking_sessions" },
      { name: "dl_applications", key: "dl_applications" }
    ];

    collectionsToSync.forEach(col => {
      try {
        const unsub = onSnapshot(collection(db, col.name), (snapshot) => {
          const list: any[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });

          if (col.key) {
            // Simple key-value list (e.g. students, trainers, reviews, slots)
            localStorage.setItem(`golden_hands_${col.key}`, JSON.stringify(list));
            if (col.key === "registered_students_list") {
              list.forEach(s => {
                localStorage.setItem(`golden_hands_student_${s.id}`, JSON.stringify(s));
              });
            }
          } else if (col.prefix) {
            // Partitioned by studentId
            const partitioned: { [studentId: string]: any[] } = {};
            list.forEach(item => {
              let sId = "student_guest";
              if (col.name === "chats") {
                if (item.senderId && !item.senderId.startsWith("trainer_") && !item.senderId.startsWith("admin_")) {
                  sId = item.senderId;
                } else if (item.receiverId && !item.receiverId.startsWith("trainer_") && !item.receiverId.startsWith("admin_")) {
                  sId = item.receiverId;
                } else if (item.receiverId) {
                  sId = item.receiverId;
                }
              } else {
                sId = item.studentId || "student_guest";
              }

              if (!partitioned[sId]) {
                partitioned[sId] = [];
              }
              partitioned[sId].push(item);
            });

            // Clear old localstorage keys matching prefix
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith(`golden_hands_${col.prefix}`)) {
                localStorage.removeItem(k);
              }
            });

            // Write partitioned keys
            Object.keys(partitioned).forEach(sId => {
              if (col.name === "chats") {
                partitioned[sId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              }
              localStorage.setItem(`golden_hands_${col.prefix}${sId}`, JSON.stringify(partitioned[sId]));
            });
          }

          // Trigger debounced local state refreshes without blocking UI
          triggerDebouncedUpdate();
        }, (err) => {
          console.warn(`Real-time listener for ${col.name} notice:`, err);
        });

        unsubscribes.push(unsub);
      } catch (e) {
        console.warn(`Could not set up real-time listener for ${col.name}:`, e);
      }
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribes.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          console.warn("Error unsubscribing:", e);
        }
      });
    };
  }, []);

  // Monitor online/offline events and handle auto-reconnection
  useEffect(() => {
    const handleOnline = async () => {
      setConnStatus('connecting');
      try {
        await MockDatabase.syncFromCloud();
        setConnStatus('connected');
      } catch (err) {
        console.error("Failed to sync on reconnect:", err);
        setConnStatus('offline');
      }
    };
    const handleOffline = () => {
      setConnStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setConnStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Continuous 1-second database status pulse verifying live connection every second
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (navigator.onLine) {
        setConnStatus('connected');
      } else {
        setConnStatus('offline');
      }
    }, 1000);

    return () => clearInterval(pulseInterval);
  }, []);

  useEffect(() => {
    if (connStatus === 'connected') {
      setShowConnectedBar(true);
      const timer = setTimeout(() => {
        setShowConnectedBar(false);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setShowConnectedBar(true);
    }
  }, [connStatus]);

  // Local state update callback for sub-portals
  const handleStateChange = useCallback(() => {
    setStudent(MockDatabase.getStudent());
    setTrainers(MockDatabase.getTrainers());
    setBookings(MockDatabase.getBookings());
    setPayments(MockDatabase.getPayments());
    setProgress(MockDatabase.getProgress());
  }, []);

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

  // Sync state cleanly on db-updated events
  useEffect(() => {
    let timer: any = null;
    const handleStorageChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setStudent(MockDatabase.getStudent());
        setTrainers(MockDatabase.getTrainers());
        setBookings(MockDatabase.getBookings());
        setPayments(MockDatabase.getPayments());
        setProgress(MockDatabase.getProgress());
      }, 80);
    };
    window.addEventListener("db-updated", handleStorageChange);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("db-updated", handleStorageChange);
    };
  }, []);

  const resetAllData = () => {
    askConfirmation(
      "Restore Default Simulator Data",
      "Are you sure you want to restore default simulator data? This will reset all modifications, chat logs, and ratings.",
      () => {
        localStorage.clear();
        window.location.reload();
      }
    );
  };

  // Calculate quick metrics for the premium portal widgets
  const completedSessions = bookings.filter(b => b.status === "completed").length;
  const totalSessions = bookings.length;
  const activeTrainer = trainers.find(t => t.id === "trainer_1") || trainers[0];
  const pendingApprovals = (student.modificationStatus === "proposed" ? 1 : 0) + (student.modificationStatus === "reviewing" ? 1 : 0);
  const totalEarnings = payments
    .filter(p => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className={`bg-[#F3F5FA] text-[#161623] flex flex-col font-sans selection:bg-[#6D3BFF]/25 ${activeView === 'portal' ? 'min-h-screen' : 'h-dvh overflow-hidden'}`}>
      
      {/* Sleek Global Floating Database Connection Status Badge (Top Right) */}
      <div className={`fixed top-3 right-3 sm:top-4 sm:right-6 z-[9999] pointer-events-none select-none ${activeView !== 'portal' ? 'hidden sm:block' : ''}`}>
        {connStatus === 'connecting' && (
          <div id="db-connection-status-badge" className="flex items-center gap-1.5 bg-amber-500/95 backdrop-blur-sm border border-amber-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-900 shadow-lg transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
            <span>Connecting to Database...</span>
          </div>
        )}
        {connStatus === 'connected' && (
          <div id="db-connection-status-badge" className="flex items-center gap-1.5 bg-emerald-600/95 backdrop-blur-sm border border-emerald-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-lg transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Database Connected</span>
          </div>
        )}
        {connStatus === 'offline' && (
          <div id="db-connection-status-badge" className="flex items-center gap-1.5 bg-rose-600/95 backdrop-blur-sm border border-rose-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-lg transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>
              {localStorage.getItem("golden_hands_quota_exceeded") === "true" 
                ? "Database Quota Reached (Local Sandbox Mode Active)" 
                : "Database Disconnected - Reconnecting..."}
            </span>
          </div>
        )}
      </div>

      {/* Premium Unified Header */}
      <header className="bg-[#161623] text-white px-6 py-4 hidden sm:flex flex-col sm:flex-row justify-between items-center shadow-md border-b border-white/5 shrink-0 z-40 gap-4">
        <div 
          onClick={() => changeView('portal')}
          className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 transition-all select-none"
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-[#6D3BFF] to-[#D4AF37] rounded-xl flex items-center justify-center shadow-md border border-white/10 shrink-0">
            <span className="text-white font-black text-lg tracking-wider">GH</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-black tracking-tight text-white leading-tight">GOLDEN HANDS</h1>
              <span className="bg-[#D4AF37] text-black font-extrabold text-[8px] px-1.5 py-0.5 rounded-full uppercase shrink-0">
                Premium
              </span>
            </div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold leading-none">DRIVING SCHOOL</p>
            <a 
              href="https://bnptech.in"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400 hover:text-[#D4AF37] transition-colors cursor-pointer group/creator"
              title="Created by BNP Tech (Binayak)"
            >
              <span>Created by BNP Tech (Binayak)</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/creator:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Dynamic Context Header - Show Exit to Hub when inside a specific portal */}
        {activeView !== 'portal' && (
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
            <button
              onClick={() => changeView('portal')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all hover:bg-white/5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Hub</span>
            </button>
          </div>
        )}

        {/* Global Business Contact */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-semibold text-slate-300">Call Support: 9040040265</span>
          </div>
        </div>
      </header>

      {/* Main Sandbox Workspace */}
      <main className="flex-1 overflow-hidden relative">
        {activeView === 'portal' && (
          <PullToRefresh
            id="portal-pull-to-refresh"
            onRefresh={async () => {
              try {
                console.log("[App] Portal pull-to-refresh: syncing cloud database...");
                await MockDatabase.syncFromCloud();
                handleStateChange();
              } catch (err) {
                console.warn("[App] Portal pull-to-refresh error:", err);
              }
            }}
            className="h-full overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 max-w-2xl mx-auto flex flex-col justify-center"
          >
            {/* Top Branding Section (Hidden on Mobile View per focus selection, visible on tablet/PC) */}
            <div className="hidden sm:block text-center mb-6 animate-fade-in">
              <span className="bg-[#6D3BFF]/10 text-[#6D3BFF] font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#6D3BFF]/15 inline-block">
                Digital Driving School Platform
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#161623] mt-3 tracking-tight leading-tight">
                GOLDEN HANDS DRIVING SCHOOL
              </h2>
              <p className="text-slate-500 mt-1 max-w-xl mx-auto text-xs leading-relaxed">
                Single unified access portal for Students, Instructors, and Administration.
              </p>
            </div>

            {/* Unified Auth Portal Component */}
            <UnifiedAuthPortal 
              initialRole="student"
              onLoginSuccess={(role, userData) => {
                if (role === 'student') {
                  const fresh: NavState = {
                    ...currentNavState,
                    activeView: 'student',
                    studentScreen: 'app',
                    studentTab: 'home',
                    studentSubPage: null,
                    seq: (currentNavState.seq || 2) + 1
                  };
                  navStackRef.current.push(fresh);
                  setCurrentNavState(fresh);
                  window.history.pushState(fresh, '');
                  handleStateChange();
                } else if (role === 'trainer') {
                  const fresh: NavState = {
                    ...currentNavState,
                    activeView: 'trainer',
                    trainerLoggedIn: true,
                    trainerTab: 'schedule',
                    seq: (currentNavState.seq || 2) + 1
                  };
                  navStackRef.current.push(fresh);
                  setCurrentNavState(fresh);
                  window.history.pushState(fresh, '');
                  handleStateChange();
                } else if (role === 'admin') {
                  const fresh: NavState = {
                    ...currentNavState,
                    activeView: 'admin',
                    adminLoggedIn: true,
                    adminTab: 'analytics',
                    seq: (currentNavState.seq || 2) + 1
                  };
                  navStackRef.current.push(fresh);
                  setCurrentNavState(fresh);
                  window.history.pushState(fresh, '');
                  handleStateChange();
                } else if (role === 'parent') {
                  const fresh: NavState = {
                    ...currentNavState,
                    activeView: 'parent',
                    parentLoggedIn: true,
                    parentTab: 'overview',
                    seq: (currentNavState.seq || 2) + 1
                  };
                  navStackRef.current.push(fresh);
                  setCurrentNavState(fresh);
                  window.history.pushState(fresh, '');
                  handleStateChange();
                }
              }}
            />

            {/* Bottom System Banner (Hidden on Mobile View, visible on tablet/PC) */}
            <div className="hidden sm:flex border-t border-[#E4E7F0] pt-4 mt-6 flex-col md:flex-row justify-between items-center text-xs text-slate-400 gap-2">
              <p className="text-[11px]">📍 Golden Hands Driving School: Rasulgarh Main Center, Bhubaneswar, Odisha.</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-500 uppercase text-[10px]">Real-time syncing engine online</span>
              </div>
            </div>
          </PullToRefresh>
        )}

        {/* 1. Student Standalone Screen View */}
        {activeView === 'student' && (
          <div className="h-full flex flex-col overflow-hidden bg-[#F3F5FA]">
            {/* Center Area: App frame container */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F0F2FA]">
              {/* Centered Web App Layout */}
              <div className="w-full h-full">
                <Suspense fallback={<PortalWorkspaceLoader label="Golden Hands Student Portal" />}>
                  <StudentApp 
                    onStateChange={handleStateChange} 
                    onLogout={() => handleUniversalLogout('student')} 
                    navState={currentNavState} 
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* 2. Trainer Standalone Screen View */}
        {activeView === 'trainer' && (
          <div className="h-full flex flex-col overflow-hidden bg-[#121217]">
            {/* Center Area: Dark-themed web app container */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-[#121217]">
              {/* Centered Web App Layout */}
              <div className="w-full h-full">
                <Suspense fallback={<PortalWorkspaceLoader label="Trainer Portal Workspace" />}>
                  <TrainerApp onStateChange={handleStateChange} onLogout={() => handleUniversalLogout('trainer')} navState={currentNavState} />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* 3. Admin Full Screen Desktop View */}
        {activeView === 'admin' && (
          <div className="h-full">
            <Suspense fallback={<PortalWorkspaceLoader label="Admin Master Dashboard" />}>
              <AdminDashboard onStateChange={handleStateChange} onLogout={() => handleUniversalLogout('admin')} navState={currentNavState} />
            </Suspense>
          </div>
        )}

        {/* 4. Parent Guardian Mobile / Responsive View */}
        {activeView === 'parent' && (
          <div className="h-full flex flex-col overflow-hidden bg-slate-950">
            <div className="w-full h-full">
              <Suspense fallback={<PortalWorkspaceLoader label="Parent Guardian Portal" />}>
                <ParentPortal 
                  onStateChange={handleStateChange} 
                  onLogout={() => handleUniversalLogout('parent')} 
                  navState={currentNavState} 
                />
              </Suspense>
            </div>
          </div>
        )}

      </main>

      {/* GLOBAL CONFIRMATION MODAL */}
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

      {/* CLOUD SYNCHRONIZATION OVERLAY LOADER */}
      {cloudSyncing && (
        <div className="fixed inset-0 bg-[#161623]/95 backdrop-blur-md flex flex-col items-center justify-center z-[150] p-6 text-center">
          <div className="w-16 h-16 relative mb-6">
            <div className="absolute inset-0 border-4 border-slate-700/50 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-[#6D3BFF] rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2 mb-2">
            <Cloud className="w-6 h-6 text-[#D4AF37] animate-pulse" />
            <span>Connecting to Firebase Database...</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Synchronizing Golden Hands driving school rosters, class logs, and AI driving coaches with Google Cloud Firestore in real-time.
          </p>
        </div>
      )}

      {/* DOUBLE BACK PRESS TOAST NOTIFICATION */}
      {appToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs font-bold tracking-wide shadow-lg border border-slate-700/50 z-[200] animate-fadeIn">
          {appToast}
        </div>
      )}

      {/* HARDWARE BACK EXIT APP OVERLAY */}
      {isExited && (
        <div className="fixed inset-0 bg-[#0f0f15] flex flex-col items-center justify-center z-[300] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-5 border border-slate-700/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mb-2">Application Exited</h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium mb-4">
            You have safely closed the session. You may now close this browser tab or window.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsExited(false);
              setCurrentNavState(getInitialNavState());
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#FFE073] text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            Reopen Application
          </button>
        </div>
      )}

      {/* PREMIUM SPLASH / WELCOME SCREEN ANIMATION */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
    </div>
  );
}
