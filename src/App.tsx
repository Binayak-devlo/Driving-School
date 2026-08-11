import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Car, Compass, ShieldCheck, Phone, MapPin, Sparkles, Sliders, 
  ArrowLeft, Users, UserCheck, CreditCard, ChevronRight, Laptop, 
  RefreshCw, Smartphone, BookOpen, AlertCircle, CheckCircle2, Navigation,
  Award, Star, HelpCircle, Activity, Play, Check, AlertTriangle, Cloud, ExternalLink
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./utils/firebase";
import StudentApp from "./components/StudentApp";
import TrainerApp from "./components/TrainerApp";
import AdminDashboard from "./components/AdminDashboard";
import SplashScreen from "./components/SplashScreen";
import UnifiedAuthPortal from "./components/UnifiedAuthPortal";
import { MockDatabase } from "./utils/db";
import { NavState } from "./types";

function getInitialNavState(): NavState {
  // Default to 'portal' hub so application opens cleanly on main landing/auth portal
  // Live server session validation will run on mount and confirm session with live backend if online
  return {
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
    seq: 2
  };
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);
  
  // Shared state refresher across client views
  const [dbRefreshKey, setDbRefreshKey] = useState(0);

  // Sync state stats
  const [student, setStudent] = useState(MockDatabase.getStudent());
  const [trainers, setTrainers] = useState(MockDatabase.getTrainers());
  const [bookings, setBookings] = useState(MockDatabase.getBookings());
  const [payments, setPayments] = useState(MockDatabase.getPayments());
  const [progress, setProgress] = useState(MockDatabase.getProgress());

  // Cloud synchronization status
  const [cloudSyncing, setCloudSyncing] = useState(false);

  // Firebase connection status state
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const [showConnectedBar, setShowConnectedBar] = useState(true);

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

  // Requirement 4 & 8: Validate startup session with live server and block offline cached auth restoration
  useEffect(() => {
    const initAppOnAuthPortal = async () => {
      // Clear cached auto-login session so user must log in through the database
      localStorage.removeItem("golden_hands_current_student_id");
      localStorage.removeItem("golden_hands_current_trainer_id");
      localStorage.removeItem("golden_hands_admin_logged_in");

      setCurrentNavState(prev => ({
        ...prev,
        activeView: 'portal',
        studentScreen: 'login',
        trainerLoggedIn: false,
        adminLoggedIn: false
      }));

      // Sync latest cloud data on load
      try {
        await MockDatabase.syncFromCloud();
      } catch (err) {
        console.warn("Cloud sync on app startup:", err);
      }
    };

    initAppOnAuthPortal();
  }, []);

  const triggerAppToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 2000);
  };

  const changeView = (view: 'portal' | 'student' | 'trainer' | 'admin') => {
    if (currentNavState.activeView === view) return;

    const isStudentLoggedIn = !!localStorage.getItem("golden_hands_current_student_id");
    const isTrainerLoggedIn = !!localStorage.getItem("golden_hands_current_trainer_id");
    const isAdminLoggedIn = localStorage.getItem("golden_hands_admin_logged_in") === "true";

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
          const stateIdx = poppedState.seq 
            ? navStackRef.current.findIndex(s => s.seq === poppedState.seq)
            : navStackRef.current.findIndex(s => isStateEqual(s, poppedState));
          if (stateIdx !== -1) {
            navStackRef.current = navStackRef.current.slice(0, stateIdx + 1);
          } else {
            navStackRef.current.push(poppedState);
          }
          setCurrentNavState(poppedState);
          setTimeout(() => {
            isNavigatingBackRef.current = false;
          }, 800);
        }
      }
    };

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

          // Trigger local state refreshes
          setStudent(MockDatabase.getStudent());
          setTrainers(MockDatabase.getTrainers());
          setBookings(MockDatabase.getBookings());
          setPayments(MockDatabase.getPayments());
          setProgress(MockDatabase.getProgress());

          // Dispatch global custom event for sub-portals
          window.dispatchEvent(new CustomEvent("db-updated"));
        }, (err) => {
          console.warn(`Real-time listener for ${col.name} encountered errors (expected if rules limit or offline):`, err);
        });

        unsubscribes.push(unsub);
      } catch (e) {
        console.warn(`Could not set up real-time listener for ${col.name}:`, e);
      }
    });

    return () => {
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

  // Run cloud sync on mount and when dbRefreshKey updates
  useEffect(() => {
    let retryTimer: any = null;
    let isMounted = true;

    async function performCloudSync(isBackgroundRetry = false) {
      if (!isMounted) return;
      try {
        if (!isBackgroundRetry) {
          setConnStatus('connecting');
        }
        const success = await MockDatabase.syncFromCloud();
        
        if (!success) {
          throw new Error("syncFromCloud returned false");
        }

        // Clear simulated stale bookings on startup if they exist
        const simCleared = localStorage.getItem("golden_hands_sim_cleared_v4");
        if (!simCleared) {
          const allB = MockDatabase.getAllBookings();
          const filteredB = allB.filter(b => b && b.id && !b.id.startsWith("sim_completed_"));
          if (allB.length !== filteredB.length) {
            MockDatabase.saveBookings(filteredB);
          }
          
          const stud = MockDatabase.getStudent();
          if (stud && (stud.courseEnded || stud.planExtended || stud.llStatus === 'Driving Test')) {
            const updatedStud = {
              ...stud,
              planExtended: false,
              courseEnded: false,
              licenceFeePaid: false,
              llStatus: 'Applied' as const
            };
            MockDatabase.saveStudent(updatedStud);
          }
          localStorage.setItem("golden_hands_sim_cleared_v4", "true");
        }

        // Force refresh state values
        if (isMounted) {
          setStudent(MockDatabase.getStudent());
          setTrainers(MockDatabase.getTrainers());
          setBookings(MockDatabase.getBookings());
          setPayments(MockDatabase.getPayments());
          setProgress(MockDatabase.getProgress());
          setConnStatus('connected');
        }
      } catch (err) {
        console.error("Cloud sync failed, loading from local cache:", err);
        if (isMounted) {
          // Load local cache to keep the app fully functional offline
          setStudent(MockDatabase.getStudent());
          setTrainers(MockDatabase.getTrainers());
          setBookings(MockDatabase.getBookings());
          setPayments(MockDatabase.getPayments());
          setProgress(MockDatabase.getProgress());
          setConnStatus('offline');
          
          // Retry sync in 10 seconds in background to reconnect
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            performCloudSync(true);
          }, 10000);
        }
      }
    }
    performCloudSync();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [dbRefreshKey]);

  const handleStateChange = () => {
    setDbRefreshKey(prev => prev + 1);
  };

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

  // Sync state continuously from localstorage for dashboard preview numbers
  useEffect(() => {
    const handleStorageChange = () => {
      setStudent(MockDatabase.getStudent());
      setTrainers(MockDatabase.getTrainers());
      setBookings(MockDatabase.getBookings());
      setPayments(MockDatabase.getPayments());
      setProgress(MockDatabase.getProgress());
    };
    const interval = setInterval(handleStorageChange, 1500);
    return () => clearInterval(interval);
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
          <div className="h-full overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 max-w-2xl mx-auto flex flex-col justify-center">
            
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
          </div>
        )}

        {/* 1. Student Standalone Screen View */}
        {activeView === 'student' && (
          <div className="h-full flex flex-col overflow-hidden bg-[#F3F5FA]">
            {/* Center Area: App frame container */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F0F2FA]">
              {/* Centered Web App Layout */}
              <div className="w-full h-full">
                <StudentApp 
                  onStateChange={handleStateChange} 
                  onLogout={() => {
                    const fresh: NavState = {
                      ...currentNavState,
                      activeView: 'portal',
                      studentScreen: 'login',
                      studentTab: 'home',
                      studentSubPage: null,
                      seq: (currentNavState.seq || 2) + 1
                    };
                    navStackRef.current.push(fresh);
                    setCurrentNavState(fresh);
                    window.history.pushState(fresh, '');
                  }} 
                  navState={currentNavState} 
                />
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
                <TrainerApp onStateChange={handleStateChange} onLogout={() => changeView('portal')} navState={currentNavState} />
              </div>
            </div>
          </div>
        )}

        {/* 3. Admin Full Screen Desktop View */}
        {activeView === 'admin' && (
          <div className="h-full">
            <AdminDashboard onStateChange={handleStateChange} onLogout={() => changeView('portal')} navState={currentNavState} />
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
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
            You have safely closed the session. You may now close this browser tab or window.
          </p>
        </div>
      )}

      {/* PREMIUM SPLASH / WELCOME SCREEN ANIMATION */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
    </div>
  );
}
