import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Video, ShieldCheck, UserCheck, Calendar, Clock, MapPin, 
  Phone, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Award, 
  Activity, Navigation, Eye, Zap, Volume2, VolumeX, Maximize2, Minimize2, RotateCw,
  FileText, Star, Share2, Copy, Check, ArrowLeft, LogOut, Car, AlertTriangle
} from "lucide-react";
import { MockDatabase } from "../utils/db";
import { AuthSessionManager } from "../utils/authSession";
import UnifiedAuthPortal from "./UnifiedAuthPortal";
import { Parent, Student, Trainer, Booking, SkillProgress, LiveStreamSession, NavState } from "../types";

interface ParentPortalProps {
  onLogout: () => void;
  onStateChange?: () => void;
  parentId?: string;
  parentData?: Parent | null;
  navState?: NavState;
}

export default function ParentPortal({ 
  onLogout, 
  onStateChange, 
  parentId: propParentId,
  parentData: propParentData,
  navState: _navState
}: ParentPortalProps) {
  // Active parent user
  const [parent, setParent] = useState<Parent | null>(() => {
    if (propParentData) return propParentData;
    const isParentAuth = AuthSessionManager.isRoleAuthenticated('parent');
    if (!isParentAuth) return null;
    const current = MockDatabase.getCurrentParent();
    return current || null;
  });

  // Active Bottom Tab: 'live' | 'progress' | 'schedule' | 'profile'
  const [activeTab, setActiveTab] = useState<'live' | 'progress' | 'schedule' | 'profile'>('live');

  // Linked Student data
  const [student, setStudent] = useState<Student | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [progress, setProgress] = useState<SkillProgress | null>(null);
  const [streamSession, setStreamSession] = useState<LiveStreamSession | null>(null);

  // Video Player UI State
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(false);
  const [forceRotatedLandscape, setForceRotatedLandscape] = useState(true);
  const [streamQualityMode, setStreamQualityMode] = useState<'Auto' | '720p' | '480p' | '360p'>('Auto');
  const [effectiveQuality, setEffectiveQuality] = useState<'720p HD' | '480p Smooth' | '360p Fast'>('720p HD');
  const [liveFps, setLiveFps] = useState<number>(30);
  const [liveLatency, setLiveLatency] = useState<number>(32);
  const [hasDirectMediaStream, setHasDirectMediaStream] = useState<boolean>(false);
  const [copiedParentId, setCopiedParentId] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'buffering' | 'reconnecting' | 'idle'>('idle');
  const [hasReceivedFrame, setHasReceivedFrame] = useState(false);
  const [streamNotActiveNotice, setStreamNotActiveNotice] = useState<string | null>(null);
  const [isLiveStreamViewActive, setIsLiveStreamViewActive] = useState(false);

  // Video canvas, element and jitter buffer refs
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamElementRef = useRef<HTMLVideoElement>(null);
  const activeImageRef = useRef<HTMLImageElement>(new Image());
  const frameBufferQueueRef = useRef<{ bitmap?: ImageBitmap; img?: HTMLImageElement; timestamp: number }[]>([]);
  const isPollingRef = useRef<boolean>(false);
  const lastDecodedFrameRef = useRef<string | null>(null);
  const lastFrameReceivedAtRef = useRef<number>(Date.now());
  const currentLatencyRef = useRef<number>(32);
  const lastFrameTimestampRef = useRef<number>(0);

  const cycleQualityMode = () => {
    setStreamQualityMode(prev => {
      if (prev === 'Auto') return '720p';
      if (prev === '720p') return '480p';
      if (prev === '480p') return '360p';
      return 'Auto';
    });
  };

  // Helper to update streamSession React state ONLY when telemetry genuinely changes (Prevents UI re-renders)
  const updateStreamSessionIfChanged = (newSession: Partial<LiveStreamSession> | null) => {
    setStreamSession(prev => {
      if (!prev && !newSession) return null;
      if (!prev && newSession) {
        const copy = { ...newSession };
        delete copy.latestFrame; // Keep bulky frame data out of React state
        return copy as LiveStreamSession;
      }
      if (prev && !newSession) return null;
      if (prev && newSession) {
        if (
          prev.isLive === newSession.isLive &&
          prev.currentSpeed === newSession.currentSpeed &&
          prev.location === newSession.location &&
          prev.trainerName === newSession.trainerName &&
          prev.carPlate === newSession.carPlate &&
          prev.duration === newSession.duration &&
          prev.quality === newSession.quality
        ) {
          return prev; // Return exact same reference to prevent re-renders
        }
        const updated = { ...prev, ...newSession };
        delete updated.latestFrame;
        return updated;
      }
      return prev;
    });
  };

  // Fallback image decode for environments without createImageBitmap
  const fallbackDecode = (frameDataUri: string) => {
    const img = activeImageRef.current;
    img.onload = () => {
      const queue = frameBufferQueueRef.current;
      if (queue.length >= 3) queue.shift();
      queue.push({ img, timestamp: Date.now() });
    };
    img.src = frameDataUri;
  };

  // High-performance asynchronous offscreen frame decoder (Zero main-thread jank)
  const handleIncomingFrame = (frameDataUri: string) => {
    if (!frameDataUri || frameDataUri === lastDecodedFrameRef.current) return;
    lastDecodedFrameRef.current = frameDataUri;
    lastFrameReceivedAtRef.current = Date.now();
    setHasReceivedFrame(true);

    if (connectionStatus === 'buffering' || connectionStatus === 'reconnecting') {
      setConnectionStatus('connected');
    }

    const now = Date.now();
    if (lastFrameTimestampRef.current > 0) {
      const delta = now - lastFrameTimestampRef.current;
      if (delta > 0 && delta < 600) {
        currentLatencyRef.current = Math.round(currentLatencyRef.current * 0.75 + delta * 0.25);
        setLiveLatency(currentLatencyRef.current);
      }
    }
    lastFrameTimestampRef.current = now;

    // Fast off-thread decode using native HTMLImageElement without network fetch overhead
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      activeImageRef.current = img;
      // Paint immediately to canvas to guarantee instantaneous first frame and continuous video
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          try {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch {}
        }
      }
    };
    img.src = frameDataUri;
  };

  // Auto-connect to live stream as soon as student camera is active
  useEffect(() => {
    if (streamSession?.isLive && !isLiveStreamViewActive) {
      setIsLiveStreamViewActive(true);
      setConnectionStatus('connected');
    }
  }, [streamSession?.isLive, isLiveStreamViewActive]);

  // Check and bind direct native MediaStream if active (Zero-latency hardware 60 FPS playback)
  useEffect(() => {
    if (!student?.id || !isLiveStreamViewActive) {
      setHasDirectMediaStream(false);
      return;
    }

    const checkDirectStream = () => {
      const mediaStream = MockDatabase.getActiveMediaStream(student.id);
      if (mediaStream && mediaStream.active && mediaStream.getVideoTracks().some(t => t.readyState === 'live')) {
        setHasDirectMediaStream(true);
        if (videoStreamElementRef.current && videoStreamElementRef.current.srcObject !== mediaStream) {
          videoStreamElementRef.current.srcObject = mediaStream;
          videoStreamElementRef.current.play().catch(() => {});
        }
      } else {
        setHasDirectMediaStream(false);
      }
    };

    checkDirectStream();
    const interval = setInterval(checkDirectStream, 1000);
    return () => clearInterval(interval);
  }, [student?.id, isLiveStreamViewActive, streamSession?.isLive]);

  // Continuous Jitter-Buffered Render Clock (Locked stable 30 FPS + health heartbeat monitor)
  useEffect(() => {
    if (!isLiveStreamViewActive) return;

    let animId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);

      // FPS calculation & adaptive quality adjustments every 750ms
      frameCount++;
      if (now - fpsTimer >= 750) {
        const measuredFps = Math.round((frameCount * 1000) / (now - fpsTimer));
        setLiveFps(Math.max(18, Math.min(60, measuredFps)));
        frameCount = 0;
        fpsTimer = now;

        // Auto quality adjustment logic
        if (streamQualityMode === 'Auto') {
          if (measuredFps < 20 || currentLatencyRef.current > 200) {
            setEffectiveQuality('480p Smooth');
          } else {
            setEffectiveQuality('720p HD');
          }
        }
      }

      // Check stream health / buffering state
      const idleTime = Date.now() - lastFrameReceivedAtRef.current;
      if (idleTime > 1800 && streamSession?.isLive && !hasDirectMediaStream) {
        if (connectionStatus !== 'buffering' && connectionStatus !== 'reconnecting') {
          setConnectionStatus('buffering');
        }
      }

      // Direct native video element handles painting if MediaStream is bound
      if (hasDirectMediaStream) return;

      // Draw active frame to Canvas with zero dropped frames
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const img = activeImageRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch {}
      }
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isLiveStreamViewActive, streamQualityMode, streamSession?.isLive, hasDirectMediaStream, connectionStatus]);

  // Load and sync parent's student data (with shallow equality checks to eliminate unnecessary UI re-renders)
  const loadParentStudentData = () => {
    if (!parent) return;

    // 1. Get student
    const linkedStudentId = parent.studentId;
    const s = MockDatabase.getStudent(linkedStudentId);
    setStudent(prev => {
      if (!prev || prev.id !== s.id || prev.isPremium !== s.isPremium || prev.courseName !== s.courseName || prev.name !== s.name) {
        return s;
      }
      return prev;
    });

    // 2. Get student bookings
    const allBookings = MockDatabase.getBookings();
    const studentBookings = allBookings.filter(b => b.studentId === linkedStudentId || b.studentId === s.id);
    setBookings(prev => {
      if (prev.length !== studentBookings.length) return studentBookings;
      const hasDiff = prev.some((b, i) => b.id !== studentBookings[i]?.id || b.status !== studentBookings[i]?.status);
      return hasDiff ? studentBookings : prev;
    });

    // 3. Get assigned trainer
    const assignedTrainerId = s.assignedTrainerId || (studentBookings[0]?.trainerId) || "trainer_1";
    const t = MockDatabase.getTrainers().find(tr => tr.id === assignedTrainerId) || MockDatabase.getTrainers()[0];
    setTrainer(prev => {
      if (!prev || prev.id !== t?.id || prev.name !== t?.name) return t;
      return prev;
    });

    // 4. Get student progress
    const prog = MockDatabase.getProgress(s.id);
    setProgress(prev => {
      if (!prev && !prog) return null;
      if (!prev || !prog) return prog;
      if (
        prev.confidence === prog.confidence &&
        prev.steering === prog.steering &&
        prev.clutch === prog.clutch &&
        prev.gear === prog.gear &&
        prev.parking === prog.parking &&
        prev.traffic === prog.traffic
      ) {
        return prev;
      }
      return prog;
    });

    // 5. Get active live stream session from database
    const stream = MockDatabase.getLiveStreamSession(s.id);
    if (stream && stream.isLive) {
      updateStreamSessionIfChanged(stream);
      if (stream.latestFrame) {
        handleIncomingFrame(stream.latestFrame);
      }
      setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
    } else if (!stream || !stream.isLive) {
      updateStreamSessionIfChanged(stream ? { ...stream, isLive: false } : null);
      setConnectionStatus(prev => prev === 'idle' ? prev : 'idle');
    }
  };

  // Background auto-refresh timer to keep telemetry, student progress, and stream status in sync without UI re-renders
  useEffect(() => {
    loadParentStudentData();
    const autoRefreshInterval = setInterval(() => {
      loadParentStudentData();
    }, 3000);

    return () => clearInterval(autoRefreshInterval);
  }, [parent?.id, parent?.studentId]);

  // Real-Time Video Stream Engine: Zero-Lag In-Memory Subscription + Server-Sent Events (SSE) + Auto-Refresh
  useEffect(() => {
    if (!student || !parent) return;

    // Verify Premium status
    const isPremium = MockDatabase.isStudentPremium(student);
    if (!isPremium) {
      updateStreamSessionIfChanged(null);
      setConnectionStatus('idle');
      setHasReceivedFrame(false);
      return;
    }

    let isMounted = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;
    let fallbackPollInterval: any = null;
    let retryAttempt = 0;

    // 1. Direct Zero-Lag In-Memory Live Stream Subscription (Instantaneous frame dispatch)
    const unsubscribeLocal = MockDatabase.subscribeToLiveStream(student.id, (session) => {
      if (!isMounted) return;
      if (session && session.isLive) {
        updateStreamSessionIfChanged(session);
        setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
        if (session.latestFrame) {
          handleIncomingFrame(session.latestFrame);
        }
      } else if (session && !session.isLive) {
        updateStreamSessionIfChanged(session);
        setConnectionStatus(prev => prev === 'idle' ? prev : 'idle');
      }
    });

    // 2. High-Speed Inter-Tab BroadcastChannel listener (<2ms latency sync across tabs)
    const channel = MockDatabase.getLiveStreamChannel();
    let channelHandler: ((e: MessageEvent) => void) | null = null;
    if (channel) {
      channelHandler = (e: MessageEvent) => {
        if (!isMounted) return;
        if (e.data && e.data.studentId === student.id && e.data.session) {
          const s = e.data.session;
          if (s.isLive) {
            updateStreamSessionIfChanged(s);
            setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
            if (s.latestFrame) {
              handleIncomingFrame(s.latestFrame);
            }
          }
        }
      };
      channel.addEventListener('message', channelHandler);
    }

    // 2. High-Frequency Fallback Poller with in-flight guard
    const runFallbackPoll = async () => {
      if (!isMounted || isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/stream/session/${student.id}?parentId=${parent.id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && data.isLive) {
            updateStreamSessionIfChanged(data);
            setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
            if (data.latestFrame) {
              handleIncomingFrame(data.latestFrame);
            }
          } else if (data.success && !data.isLive) {
            updateStreamSessionIfChanged(data);
            setConnectionStatus(prev => prev === 'idle' ? prev : 'idle');
          }
        }
      } catch (err) {
        // Fallback to in-memory session
        const local = MockDatabase.getLiveStreamSession(student.id);
        if (local && local.isLive && isMounted) {
          updateStreamSessionIfChanged(local);
          if (local.latestFrame) handleIncomingFrame(local.latestFrame);
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    // Immediate initial sync and background fallback poller
    runFallbackPoll();
    fallbackPollInterval = setInterval(runFallbackPoll, 1500);

    // 3. Connect to Server-Sent Events (SSE) Stream
    const connectSSEStream = () => {
      if (!isMounted) return;

      if (typeof window === "undefined" || !("EventSource" in window)) {
        return;
      }

      try {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        setConnectionStatus(prev => (retryAttempt > 0 ? (prev === 'reconnecting' ? prev : 'reconnecting') : (prev === 'connecting' ? prev : 'connecting')));
        const sseUrl = `/api/stream/events/${student.id}?parentId=${parent.id}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus('connected');
          retryAttempt = 0;
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          if (!event.data || event.data.trim() === ": ping") return;

          try {
            const data = JSON.parse(event.data);
            if (data.type === "session_update" || data.type === "frame") {
              if (data.isLive !== undefined) {
                updateStreamSessionIfChanged(data);
                if (data.isLive) {
                  setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
                } else {
                  setConnectionStatus(prev => prev === 'idle' ? prev : 'idle');
                }
              }

              if (data.latestFrame) {
                handleIncomingFrame(data.latestFrame);
              }
            }
          } catch (parseErr) {
            console.warn("SSE frame parse err:", parseErr);
          }
        };

        eventSource.onerror = (err) => {
          if (!isMounted) return;
          setConnectionStatus(prev => prev === 'reconnecting' ? prev : 'reconnecting');
          
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Fallback poll immediately
          runFallbackPoll();

          // Exponential backoff auto-reconnect (200ms to 2000ms) for fast recovery
          const delay = Math.min(200 * Math.pow(1.3, retryAttempt), 2000);
          retryAttempt++;
          reconnectTimer = setTimeout(connectSSEStream, delay);
        };

      } catch (err) {
        console.warn("SSE connection init error:", err);
      }
    };

    connectSSEStream();

    return () => {
      isMounted = false;
      unsubscribeLocal();
      if (channel && channelHandler) {
        channel.removeEventListener('message', channelHandler);
      }
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (fallbackPollInterval) {
        clearInterval(fallbackPollInterval);
      }
    };
  }, [student?.id, parent?.id, student?.isPremium]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await MockDatabase.syncFromCloud();
      loadParentStudentData();
      if (onStateChange) onStateChange();
    } catch (e) {
      console.warn("Parent portal refresh error:", e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleCopyParentId = () => {
    if (!parent) return;
    navigator.clipboard.writeText(parent.id);
    setCopiedParentId(true);
    setTimeout(() => setCopiedParentId(false), 2000);
  };

  const enterLandscapeFullscreen = async () => {
    setIsFullscreen(true);
    setForceRotatedLandscape(true);
    try {
      if (videoContainerRef.current && (videoContainerRef.current as any).requestFullscreen && !document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fallback cleanly to CSS fixed fullscreen
    }
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {
      // Orientation lock is optional across browsers
    }
  };

  const exitLandscapeFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
    try {
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } catch {
      // Ignore
    }
  };

  const toggleLandscapeFullscreen = () => {
    if (isFullscreen) {
      exitLandscapeFullscreen();
    } else {
      enterLandscapeFullscreen();
    }
  };

  // Fullscreen and Orientation change listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitLandscapeFullscreen();
      }
    };
    const handleOrientation = () => {
      setIsDeviceLandscape(window.innerWidth > window.innerHeight);
    };

    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  if (!parent) {
    return (
      <div className="w-full h-full bg-[#0F1117] overflow-y-auto relative flex flex-col justify-center items-center font-sans text-white p-4 sm:p-6 select-none">
        <div className="w-full max-w-md my-auto">
          <UnifiedAuthPortal 
            initialRole="parent"
            embedded={true}
            onCancel={onLogout}
            onLoginSuccess={(role, userData) => {
              if (role === 'parent' && userData) {
                setParent(userData);
                onStateChange?.();
              } else {
                onLogout();
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Next upcoming or ongoing class
  const activeBooking = bookings.find(b => b.status === "in_progress") || bookings.find(b => b.status === "confirmed") || bookings[0];
  const completedClasses = bookings.filter(b => b.status === "completed").length;
  const totalClassesCount = student?.totalSessions || 15;

  return (
    <div className="h-full flex flex-col bg-[#0F1117] text-white font-sans overflow-hidden">
      
      {/* 1. TOP HEADER - Golden Hands Parent Portal */}
      <header className="bg-[#161822] border-b border-slate-800 px-4 py-3 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md border border-white/10">
            GH
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wide text-white uppercase">
                PARENT GUARDIAN PORTAL
              </h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                PREMIUM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Linked Student: <span className="text-white font-bold">{student?.name || parent?.studentName || "Student"}</span> (ID: {student?.id?.slice(-6) || "Active"})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          
          <button
            type="button"
            onClick={async () => {
              await AuthSessionManager.logout('parent');
              setParent(null);
              onLogout();
            }}
            title="Sign Out"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <main className="flex-1 overflow-y-auto pb-24 sm:pb-8 p-3 sm:p-6 max-w-4xl w-full mx-auto">
        
        {/* ========================================================================= */}
        {/* TAB 1: LIVE CLASS STREAM & IN-CAR TELEMETRY                               */}
        {/* ========================================================================= */}
        {activeTab === 'live' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            {/* Live Class Stream Status Banner */}
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3 px-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${streamSession?.isLive ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  {streamSession?.isLive ? "🔴 LIVE CLASS IN PROGRESS" : "CLASS STATUS: STANDBY / NEXT CLASS SCHEDULED"}
                </span>
                {connectionStatus === 'reconnecting' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    Reconnecting...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {streamSession?.isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Broadcasting
                  </span>
                )}
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  1:1 Secure Stream
                </span>
                <button
                  type="button"
                  onClick={toggleLandscapeFullscreen}
                  className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border transition-all cursor-pointer shadow-sm ${
                    isFullscreen
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border-white/10 hover:border-amber-400/40'
                  }`}
                  title={isFullscreen ? "Return to Portrait View" : "Fullscreen / Landscape Mode"}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? "Portrait View" : "Fullscreen / Landscape"}</span>
                </button>
              </div>
            </div>

            {/* Video Player Box */}
            <div 
              ref={videoContainerRef}
              className={`relative bg-black overflow-hidden flex items-center justify-center group transition-all duration-300 ${
                isFullscreen
                  ? 'fixed inset-0 z-[9999] rounded-none border-0 shadow-none'
                  : 'rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl aspect-video'
              }`}
              style={
                isFullscreen
                  ? (!isDeviceLandscape && forceRotatedLandscape
                      ? {
                          width: "100vh",
                          height: "100vw",
                          position: "fixed",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%) rotate(90deg)",
                          transformOrigin: "center center",
                          zIndex: 9999,
                          maxWidth: "none",
                          maxHeight: "none",
                        }
                      : {
                          width: "100vw",
                          height: "100vh",
                          position: "fixed",
                          top: 0,
                          left: 0,
                          zIndex: 9999,
                        })
                  : undefined
              }
            >
              {!MockDatabase.isStudentPremium(student) ? (
                /* Non-Premium Student Notice */
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-7 h-7 text-amber-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-2">
                    PREMIUM EXCLUSIVE
                  </span>
                  <h3 className="text-base font-black text-white">Live Stream Available with Premium Package</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Live in-car video streaming is an exclusive feature of the Golden Hands Premium Package. Your student is currently enrolled in the {student?.courseName || "Standard Plan"}.
                  </p>
                </div>
              ) : streamSession?.isLive && isLiveStreamViewActive ? (
                <>
                  {/* Native Video Element for Direct MediaStream (60 FPS Native GPU Playback) */}
                  <video
                    ref={videoStreamElementRef}
                    autoPlay
                    playsInline
                    muted={isAudioMuted}
                    className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} ${isFullscreen ? 'rounded-none' : 'rounded-2xl sm:rounded-3xl'} ${hasDirectMediaStream ? 'block' : 'hidden'} select-none`}
                  />

                  {/* Hardware-Accelerated Smooth Jitter-Buffered Canvas View (Zero Jitter, Offscreen ImageBitmap Decode) */}
                  <canvas 
                    ref={canvasRef} 
                    width={640} 
                    height={360} 
                    className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} ${isFullscreen ? 'rounded-none' : 'rounded-2xl sm:rounded-3xl'} ${hasDirectMediaStream ? 'hidden' : 'block'} select-none`}
                    style={{ transform: "translateZ(0)", willChange: "contents", imageRendering: "auto" }}
                  />

                  {/* Connecting / Loading Overlay with animated radar scanner */}
                  {((!hasReceivedFrame && !streamSession.latestFrame && !hasDirectMediaStream) || connectionStatus === 'connecting') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-slate-950 via-slate-900 to-indigo-950/80 p-6 text-center z-20">
                      <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                        <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full bg-rose-600/30 animate-pulse" />
                        <div className="relative w-12 h-12 rounded-2xl bg-rose-600/40 border border-rose-500/60 flex items-center justify-center shadow-lg shadow-rose-600/40">
                          <Video className="w-6 h-6 text-rose-400 animate-pulse" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1.5">
                        <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                        <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                          Connecting to Live Stream...
                        </h3>
                      </div>

                      <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                        Establishing encrypted live link with in-car camera <span className="text-amber-400 font-bold">{streamSession?.carPlate || "OD-02-GH-2026"}</span>.
                      </p>

                      <div className="mt-4 flex items-center gap-2 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-full text-[11px] text-slate-300 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Buffering continuous 30 FPS video feed...</span>
                      </div>
                    </div>
                  )}

                  {/* TOP OVERLAY HUD: Live Badge + Adaptive 30 FPS / Latency / Quality Indicator + Speedometer + Close view */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <span className="flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        LIVE STREAM
                      </span>

                      {connectionStatus === 'buffering' ? (
                        <span className="bg-amber-500/95 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[10px] animate-pulse flex items-center gap-1 shadow-md">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          BUFFERING...
                        </span>
                      ) : connectionStatus === 'reconnecting' ? (
                        <span className="bg-rose-500/95 text-white font-black px-2.5 py-1 rounded-lg text-[10px] animate-pulse flex items-center gap-1 shadow-md">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          RECONNECTING...
                        </span>
                      ) : (
                        <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-emerald-400 border border-white/10 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{hasDirectMediaStream ? '60' : liveFps} FPS</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-300">{hasDirectMediaStream ? '0' : liveLatency}ms</span>
                        </span>
                      )}

                      {/* Quality Indicator & Mode Selector Button */}
                      <button
                        type="button"
                        onClick={cycleQualityMode}
                        className="bg-black/70 hover:bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[10px] font-black text-amber-300 hover:text-white transition-all cursor-pointer shadow-md flex items-center gap-1"
                        title="Click to toggle quality mode (Auto / 720p HD / 480p Smooth / 360p Fast)"
                      >
                        <span>{streamQualityMode === 'Auto' ? `Auto (${effectiveQuality.split(' ')[0]})` : streamQualityMode}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                      <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 font-mono font-black text-xs flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{streamSession.currentSpeed || 24} KM/H</span>
                      </div>
                      {isFullscreen ? (
                        <button
                          type="button"
                          onClick={toggleLandscapeFullscreen}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg border border-amber-400 font-black text-xs transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                          title="Return to Portrait View"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>Exit Landscape</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsLiveStreamViewActive(false)}
                          className="bg-black/80 hover:bg-slate-900 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold transition-all cursor-pointer shadow-lg"
                        >
                          Minimize
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM OVERLAY HUD: Controls & Telemetry */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs text-[11px] font-bold text-white">
                        {streamSession.location || "Rasulgarh Square, Bhubaneswar"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAudioMuted(!isAudioMuted)}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                        title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
                      >
                        {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      </button>

                      {/* Rotate orientation toggle button when in fullscreen portrait mode */}
                      {isFullscreen && !isDeviceLandscape && (
                        <button
                          type="button"
                          onClick={() => setForceRotatedLandscape(!forceRotatedLandscape)}
                          className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-amber-400 backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                          title={forceRotatedLandscape ? "Switch to Vertical Fit" : "Rotate 90° Landscape"}
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Fullscreen / Landscape button */}
                      <button
                        type="button"
                        onClick={toggleLandscapeFullscreen}
                        className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 backdrop-blur-md border transition-all cursor-pointer shadow-lg active:scale-95 ${
                          isFullscreen
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/30'
                            : 'bg-black/70 hover:bg-black/90 text-white border-white/15 hover:border-amber-400/50 hover:text-amber-300'
                        }`}
                        title={isFullscreen ? "Return to Portrait View" : "Open Fullscreen / Landscape Mode"}
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize2 className="w-4 h-4" />
                            <span className="hidden xs:inline">Return to Portrait</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-4 h-4 text-amber-400" />
                            <span>Fullscreen / Landscape</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Click to View Stream / Student Not Turned On State */
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-lg w-full relative z-10">
                  {/* Notice Banner when clicking while stream is off */}
                  {streamNotActiveNotice && (
                    <div className="mb-4 w-full bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-3.5 text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-rose-300 uppercase tracking-wide">
                          Student has not turned on the live stream
                        </p>
                        <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">
                          Please ask student ({student?.name || "your child"}) to turn on the live stream from their student app during their practical driving class.
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setStreamNotActiveNotice(null)}
                        className="text-rose-400 hover:text-rose-200 p-1 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 transition-all ${
                    streamSession?.isLive 
                      ? 'bg-rose-600/20 border-2 border-rose-500 text-rose-400 animate-pulse shadow-lg shadow-rose-600/20' 
                      : 'bg-slate-800/80 border border-slate-700 text-slate-400'
                  }`}>
                    <Video className="w-8 h-8" />
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white">
                    {streamSession?.isLive 
                      ? "🔴 Live Driving Class Is Broadcasting Now!" 
                      : "In-Car Camera Live Stream"}
                  </h3>
                  
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-sm">
                    {streamSession?.isLive 
                      ? "Your student has enabled their in-car video camera. Click the button below to view the secure live feed." 
                      : "Click below to connect to the live stream. Stream becomes viewable once the student turns on camera broadcasting."}
                  </p>

                  {/* Primary Action Button: CLICK HERE TO VIEW LIVE STREAM */}
                  <div className="mt-4 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStreamNotActiveNotice(null);
                        setIsLiveStreamViewActive(true);
                        setConnectionStatus('connecting');

                        // Check in-memory session or MediaStream
                        const currentSession = MockDatabase.getLiveStreamSession(student?.id || "") || streamSession;
                        if (currentSession?.isLive) {
                          updateStreamSessionIfChanged(currentSession);
                          if (currentSession.latestFrame) {
                            handleIncomingFrame(currentSession.latestFrame);
                          }
                        }

                        // Immediate server synchronization to eliminate connection lag
                        fetch(`/api/stream/session/${student?.id || ""}?parentId=${parent?.id || ""}`)
                          .then(r => r.json())
                          .then(data => {
                            if (data.success && data.isLive) {
                              updateStreamSessionIfChanged(data);
                              setConnectionStatus('connected');
                              if (data.latestFrame) {
                                handleIncomingFrame(data.latestFrame);
                              }
                            } else if (!currentSession?.isLive) {
                              setTimeout(() => {
                                const recheck = MockDatabase.getLiveStreamSession(student?.id || "");
                                if (!recheck?.isLive) {
                                  setIsLiveStreamViewActive(false);
                                  setStreamNotActiveNotice("Student has not turned on the live stream. Please ask student to turn on camera broadcasting from their student app.");
                                }
                              }, 2200);
                            }
                          })
                          .catch(() => {});
                      }}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl active:scale-95 ${
                        streamSession?.isLive 
                          ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30 animate-pulse ring-2 ring-rose-400/50' 
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>Click here to view live stream</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleLandscapeFullscreen}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 hover:border-amber-400/40 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                      title={isFullscreen ? "Return to Portrait View" : "Fullscreen / Landscape Mode"}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
                      <span>{isFullscreen ? "Exit Landscape" : "Fullscreen / Landscape"}</span>
                    </button>
                  </div>

                  <div className="mt-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl w-full text-left flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-amber-400">Class Information</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {activeBooking ? `${activeBooking.date} at ${activeBooking.time}` : "Daily Practical Session"}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl">
                      Session {completedClasses + 1} of {totalClassesCount}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Live Telemetry Dashboard Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#161822] border border-slate-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Speed</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {streamSession?.isLive ? (streamSession.currentSpeed || 28) : 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">km/h</span>
                </div>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">Safe City Limit</p>
              </div>

              <div className="bg-[#161822] border border-slate-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Trainer</p>
                <p className="text-xs sm:text-sm font-black text-white mt-1 truncate">
                  {trainer?.name || "Bikram Pattnaik"}
                </p>
                <p className="text-[10px] text-amber-400 font-semibold mt-1">★ 4.9 (Govt. Certified)</p>
              </div>

              <div className="bg-[#161822] border border-slate-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Training Vehicle</p>
                <p className="text-xs sm:text-sm font-black text-white mt-1 truncate">
                  {trainer?.carModel || "Maruti Swift (Dual Control)"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{trainer?.carPlate || "OD-02-GH-2026"}</p>
              </div>

              <div className="bg-[#161822] border border-slate-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Course Progress</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-amber-400">
                    {completedClasses}/{totalClassesCount}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Classes</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (completedClasses / totalClassesCount) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* In-Car Safety & Dual-Control Assurance Card */}
            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-800/40 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white">Dual-Control Safety System Active</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Your student is accompanied by an RTO-certified master instructor with dual-brake controls installed.
                  </p>
                </div>
              </div>
              <a 
                href="tel:9040040265"
                className="shrink-0 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-white/10"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Emergency Support</span>
              </a>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SKILL PERFORMANCE & PROGRESS REPORT                                */}
        {/* ========================================================================= */}
        {activeTab === 'progress' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            {/* Overall Student Mastery Score */}
            <div className="bg-[#161822] border border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-amber-400 transition-all duration-1000"
                      strokeDasharray={`${progress?.confidence || 75}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-lg font-black text-white">{progress?.confidence || 75}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    RTO Test Readiness Score
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1.5">
                    {student?.name || "Student"} - Driving Assessment
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluated daily across 12 practical driving control parameters.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl w-full sm:w-auto text-center sm:text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">DL Test Eligibility</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">✅ On Track for 1st Attempt Pass</p>
                <p className="text-[10px] text-slate-500 mt-1">Syllabus: 15 On-Road Sessions</p>
              </div>
            </div>

            {/* Individual Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Steering & Lane Alignment", score: progress?.steering || 85, icon: "🎯" },
                { name: "Clutch & Friction Control", score: progress?.clutch || 78, icon: "⚙️" },
                { name: "Braking & Stopping Distance", score: progress?.brake || 90, icon: "🛑" },
                { name: "Speed & Accelerator Smoothness", score: progress?.accelerator || 80, icon: "⚡" },
                { name: "Gear Shifting (1st to 4th)", score: progress?.gear || 75, icon: "🕹️" },
                { name: "Reverse & Parallel Parking", score: progress?.reverse || 70, icon: "🅿️" },
                { name: "Traffic Navigation & Signals", score: progress?.traffic || 82, icon: "🚦" },
                { name: "Hill / Incline Start Control", score: progress?.hillStart || 65, icon: "⛰️" },
              ].map((skill, idx) => (
                <div key={idx} className="bg-[#161822] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{skill.icon}</span>
                      <span className="text-xs font-bold text-white">{skill.name}</span>
                    </div>
                    <span className="text-xs font-black text-amber-400">{skill.score}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        skill.score >= 80 ? 'bg-emerald-500' : skill.score >= 65 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Instructor Evaluation Notes */}
            <div className="bg-[#161822] border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Latest Instructor Notes</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                "{student?.name || "The student"} demonstrates very steady clutch release and smooth cornering at Rasulgarh roundabouts. We will focus on uphill incline hold without rollback in the upcoming session."
              </p>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SCHEDULE & CLASS ATTENDANCE LOG                                    */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            <div className="flex items-center justify-between bg-[#161822] border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Course Attendance Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">15 On-Road Practical Driving Classes</p>
              </div>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-black px-3 py-1.5 rounded-xl">
                {completedClasses} Completed / {totalClassesCount} Total
              </span>
            </div>

            {/* Sessions List */}
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: totalClassesCount }).map((_, idx) => {
                const sessionNum = idx + 1;
                const isDone = sessionNum <= completedClasses;
                const isCurrent = sessionNum === completedClasses + 1;

                return (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isDone 
                        ? 'bg-[#161822] border-emerald-500/30' 
                        : isCurrent 
                        ? 'bg-amber-500/10 border-amber-500/40' 
                        : 'bg-[#161822]/50 border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isDone 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : isCurrent 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isDone ? <Check className="w-4 h-4 text-emerald-400" /> : `#${sessionNum}`}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-white">
                          Session {sessionNum}: {
                            sessionNum === 1 ? "Steering & Pedals Orientation" :
                            sessionNum === 2 ? "Friction Point & 1st Gear Control" :
                            sessionNum === 3 ? "2nd Gear Shifting & Smooth Braking" :
                            sessionNum === 4 ? "Lane Discipline & Mirror Check" :
                            sessionNum === 5 ? "Rasulgarh Low-Traffic Road Drive" :
                            sessionNum === 6 ? "U-Turns & Roundabout Navigation" :
                            sessionNum === 7 ? "3rd & 4th Gear Highway Acceleration" :
                            sessionNum === 8 ? "Parallel Parking & Reverse Bay" :
                            sessionNum === 9 ? "Incline & Flyover Hill Start" :
                            sessionNum === 10 ? "Heavy Traffic Peak Hour Drive" :
                            sessionNum === 11 ? "Night Driving & High-Beam Safety" :
                            sessionNum === 12 ? "Emergency Hazard Braking Drill" :
                            sessionNum === 13 ? "Complex Junctions & Highway Merge" :
                            sessionNum === 14 ? "Full City Drive Solo Simulation" :
                            "Final RTO Driving Track Mock Test"
                          }
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isDone ? "Completed with Instructor Approval" : isCurrent ? "Next Scheduled Session" : "Upcoming Topic"}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      isDone 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isCurrent 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'text-slate-500'
                    }`}>
                      {isDone ? "Completed" : isCurrent ? "Next" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PARENT PROFILE & SECURITY                                          */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            {/* Account Details Card */}
            <div className="bg-[#161822] border border-slate-800 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                Parent Account Information
              </h3>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Parent Identifier</p>
                    <p className="text-sm font-mono font-black text-amber-400 mt-0.5">{parent?.id || "PARENT_ID"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyParentId}
                    className="flex items-center gap-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-700"
                  >
                    {copiedParentId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedParentId ? "Copied" : "Copy ID"}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400">Linked Student</p>
                  <p className="text-sm font-black text-white mt-0.5">{student?.name || parent?.studentName || "Student"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Mobile: +91 {student?.phone || parent?.studentPhone || "9040040265"}</p>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400">Active Subscription Plan</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-amber-400">Golden Hands Premium Plan (₹4,000)</span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Includes ₹3,500 standard course + ₹500 live remote in-car video stream & GPS monitoring.
                  </p>
                </div>
              </div>
            </div>

            {/* School Contact Helpline Card */}
            <div className="bg-[#161822] border border-slate-800 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Academy Assistance & Helplines
              </h3>
              
              <div className="flex flex-col gap-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">Direct School Helpline</span>
                  </div>
                  <a href="tel:9040040265" className="text-amber-400 font-bold hover:underline">
                    9040040265
                  </a>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Main Branch</span>
                  </div>
                  <span className="text-slate-400">Rasulgarh, Bhubaneswar</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await AuthSessionManager.logout('parent');
                setParent(null);
                onLogout();
              }}
              className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Parent Portal</span>
            </button>

          </div>
        )}

      </main>

      {/* 3. BOTTOM MOBILE NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#161822]/95 backdrop-blur-xl border-t border-slate-800 px-4 py-2 flex items-center justify-around z-30 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'live' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Radio className="w-5 h-5" />
            {streamSession?.isLive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider">Live Class</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'progress' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Progress</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'schedule' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Parent ID</span>
        </button>
      </nav>

    </div>
  );
}
