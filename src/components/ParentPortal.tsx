import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Video, ShieldCheck, UserCheck, Calendar, Clock, MapPin, 
  Phone, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Award, 
  Activity, Navigation, Eye, Zap, Volume2, VolumeX, Maximize2, 
  FileText, Star, Share2, Copy, Check, ArrowLeft, LogOut, Car, AlertTriangle
} from "lucide-react";
import { MockDatabase } from "../utils/db";
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
    const current = MockDatabase.getCurrentParent();
    if (current) return current;
    const parents = MockDatabase.getParents();
    return parents[0] || null;
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
  const [streamQuality, setStreamQuality] = useState<'HD 720p' | 'Auto 480p'>('HD 720p');
  const [copiedParentId, setCopiedParentId] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'idle'>('idle');

  // Video canvas and element refs
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Load and sync parent's student data
  const loadParentStudentData = () => {
    if (!parent) return;

    // 1. Get student
    const linkedStudentId = parent.studentId;
    const s = MockDatabase.getStudent(linkedStudentId);
    setStudent(s);

    // 2. Get student bookings
    const allBookings = MockDatabase.getBookings();
    const studentBookings = allBookings.filter(b => b.studentId === linkedStudentId || b.studentId === s.id);
    setBookings(studentBookings);

    // 3. Get assigned trainer
    const assignedTrainerId = s.assignedTrainerId || (studentBookings[0]?.trainerId) || "trainer_1";
    const t = MockDatabase.getTrainers().find(tr => tr.id === assignedTrainerId) || MockDatabase.getTrainers()[0];
    setTrainer(t);

    // 4. Get student progress
    const prog = MockDatabase.getProgress(s.id);
    setProgress(prog);

    // 5. Get active live stream session for this student
    const stream = MockDatabase.getLiveStreamSession(s.id);
    setStreamSession(stream);

    if (stream && stream.isLive) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('idle');
    }
  };

  useEffect(() => {
    loadParentStudentData();
    const interval = setInterval(() => {
      loadParentStudentData();
    }, 2000);

    return () => clearInterval(interval);
  }, [parent]);

  // Handle Poll for Live Stream Video & WebRTC Signaling
  useEffect(() => {
    if (!student || !parent) return;

    // Verify Premium status
    const isPremium = MockDatabase.isStudentPremium(student);
    if (!isPremium) {
      setStreamSession(null);
      setConnectionStatus('idle');
      return;
    }

    let isSubscribed = true;

    const pollStream = async () => {
      try {
        const res = await fetch(`/api/stream/session/${student.id}?parentId=${parent.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && data.success) {
            if (data.isLive) {
              setStreamSession(data);
              setConnectionStatus('connected');

              // If frame available and canvas exists, draw frame
              if (data.latestFrame && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  const img = new Image();
                  img.onload = () => {
                    if (canvasRef.current) {
                      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                  };
                  img.src = data.latestFrame;
                }
              }
            } else {
              setStreamSession(prev => prev && prev.isLive ? { ...prev, isLive: false } : prev);
            }
          }
        }
      } catch (e) {
        // Fallback to local DB
        const local = MockDatabase.getLiveStreamSession(student.id);
        if (isSubscribed) setStreamSession(local);
      }
    };

    pollStream();
    const streamInterval = setInterval(pollStream, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(streamInterval);
    };
  }, [student, parent]);

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

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

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
            onClick={onLogout}
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
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                1:1 Secure Stream
              </span>
            </div>

            {/* Video Player Box */}
            <div 
              ref={videoContainerRef}
              className="relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-video flex items-center justify-center group"
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
              ) : streamSession?.isLive ? (
                <>
                  {/* Real-time Video / Canvas Stream View */}
                  <canvas 
                    ref={canvasRef} 
                    width={640} 
                    height={360} 
                    className="w-full h-full object-cover"
                  />

                  {/* Instant Frame render fallback for ultra-fluid rendering */}
                  {streamSession.latestFrame && (
                    <img
                      src={streamSession.latestFrame}
                      alt="Student Live In-Car Camera"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ zIndex: 1 }}
                    />
                  )}

                  {/* Fallback Simulation Feed in case no hardware video */}
                  {!streamSession.latestFrame && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-slate-950 via-slate-900 to-indigo-950/60 p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center mb-3 animate-pulse">
                        <Video className="w-8 h-8 text-rose-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">Live In-Car Camera Active</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Receiving encrypted video signal from vehicle {streamSession.carPlate || "OD-02-GH-2026"} (Trainer: {streamSession.trainerName || trainer?.name || "Instructor"}).
                      </p>
                    </div>
                  )}

                  {/* TOP OVERLAY HUD: Live Badge + Speedometer + Battery/Signal */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        LIVE 1080P
                      </span>
                      <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300 border border-white/10">
                        ⏱️ {streamSession.duration || "Live Class"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 font-mono font-black text-xs flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{streamSession.currentSpeed || 28} KM/H</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM OVERLAY HUD: Controls & Telemetry */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs text-[11px] font-bold text-white">
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

                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                        title="Fullscreen Mode"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Offline / Standby State with scheduled class countdown */
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
                    <Video className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">No Live Class Broadcasting Now</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Live video stream automatically starts when the student turns on live streaming during their driving session.
                  </p>

                  <div className="mt-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl w-full text-left flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-amber-400">Next Scheduled Class</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {activeBooking ? `${activeBooking.date} at ${activeBooking.time}` : "Tomorrow at 08:30 AM"}
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
              onClick={onLogout}
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
