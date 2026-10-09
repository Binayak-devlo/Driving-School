import React, { useState, useEffect } from "react";
import { Fingerprint, Lock, Shield, Smartphone, LogOut } from "lucide-react";
import { AppLockManager } from "../utils/appLock";

interface SystemLockGateProps {
  onSignOut?: () => void;
}

export default function SystemLockGate({ onSignOut }: SystemLockGateProps) {
  const [isLocked, setIsLocked] = useState<boolean>(() => AppLockManager.isLocked());
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = AppLockManager.subscribe((locked) => {
      setIsLocked(locked);
      if (locked) {
        // Automatically request phone's system screen lock upon returning to app
        handleVerifyScreenLock();
      }
    });

    if (isLocked) {
      handleVerifyScreenLock();
    }

    return () => unsubscribe();
  }, []);

  const handleVerifyScreenLock = async () => {
    if (verifying) return;
    setVerifying(true);
    setErrorMsg(null);

    const res = await AppLockManager.authenticateWithSystemLock(
      "Verify your phone's screen lock to continue using Golden Hands"
    );

    if (!res.success) {
      setErrorMsg(res.error || "System screen lock authentication was cancelled or failed.");
    }
    setVerifying(false);
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-[#0c0d14]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-fadeIn select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* App Logo / Shield Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl">
            <Fingerprint className="w-10 h-10 animate-pulse text-[#D4AF37]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* System Message */}
        <h2 className="text-lg font-black tracking-tight text-white mb-1.5">
          Phone Screen Lock Required
        </h2>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6 font-medium">
          Golden Hands is locked for security. Please verify using your phone's fingerprint, face unlock, PIN, pattern, or password.
        </p>

        {/* Error notification if OS prompt was dismissed or failed */}
        {errorMsg && (
          <div className="w-full mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-medium animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Primary Action Button: Triggers Phone's Real Screen Lock Prompt */}
        <button
          type="button"
          onClick={handleVerifyScreenLock}
          disabled={verifying}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Fingerprint className="w-4 h-4 text-black" />
          <span>{verifying ? "Verifying..." : "Verify Screen Lock"}</span>
        </button>

        {/* Optional Sign Out button if user cannot unlock */}
        {onSignOut && (
          <button
            type="button"
            onClick={() => {
              AppLockManager.unlock();
              onSignOut();
            }}
            className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        )}

        {/* Android Studio Integration Notice */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-amber-500/60" />
          <span>Protected via Android System Biometrics & Screen Lock</span>
        </div>
      </div>
    </div>
  );
}
