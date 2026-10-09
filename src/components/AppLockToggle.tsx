import React, { useState, useEffect } from "react";
import { Fingerprint, ShieldCheck, Shield, Lock, Smartphone, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";
import { AppLockManager, PortalRole } from "../utils/appLock";

interface AppLockToggleProps {
  role: PortalRole;
  theme?: 'dark' | 'light';
  onStatusChange?: (enabled: boolean) => void;
}

export default function AppLockToggle({ role, theme = 'light', onStatusChange }: AppLockToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(() => AppLockManager.isAppLockEnabled(role));
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deviceSupported, setDeviceSupported] = useState<boolean>(true);

  useEffect(() => {
    // Check initial device screen lock support
    AppLockManager.isPlatformAuthenticatorAvailable().then((supported) => {
      setDeviceSupported(supported);
    });
    // Set active role for AppLockManager
    AppLockManager.setActiveRole(role);
  }, [role]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    const willEnable = !enabled;

    if (willEnable) {
      // Prompt phone's existing system screen lock (fingerprint, face unlock, PIN, pattern, or password)
      const result = await AppLockManager.authenticateWithSystemLock(
        "Verify your phone's screen lock to enable App Lock"
      );

      if (result.success) {
        AppLockManager.setAppLockEnabled(true, role);
        setEnabled(true);
        setFeedback({
          type: 'success',
          message: "App Lock activated for this device's local cache. Your phone's screen lock will be required when reopening or returning from background on this device."
        });
        if (onStatusChange) onStatusChange(true);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || "System screen lock verification was not completed. App Lock remains OFF."
        });
      }
    } else {
      // Prompt system verification before turning OFF for security
      const result = await AppLockManager.authenticateWithSystemLock(
        "Verify your phone's screen lock to turn OFF App Lock"
      );

      if (result.success) {
        AppLockManager.setAppLockEnabled(false, role);
        setEnabled(false);
        AppLockManager.unlock();
        setFeedback({
          type: 'info',
          message: "App Lock turned OFF. The app will open normally without requiring phone screen lock."
        });
        if (onStatusChange) onStatusChange(false);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || "Screen lock verification required to disable security."
        });
      }
    }

    setLoading(false);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl p-4 transition-all border ${
      isDark 
        ? 'bg-slate-900/90 border-slate-800 text-white' 
        : 'bg-white border-slate-100 text-[#161623] shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            enabled 
              ? (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-100')
              : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')
          }`}>
            {enabled ? <Fingerprint className="w-5 h-5 animate-pulse" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-xs font-black tracking-tight ${isDark ? 'text-white' : 'text-[#161623]'}`}>
                App Lock (Phone Screen Lock)
              </h4>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                enabled
                  ? (isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-100 text-emerald-800')
                  : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                {enabled ? "ON" : "OFF"}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <HardDrive className="w-2.5 h-2.5" /> Local Device Cache Only
              </span>
            </div>
            <p className={`text-[10px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Require your phone's system screen lock (fingerprint, face unlock, PIN, pattern, or password) whenever the app is reopened or returns from the background.
            </p>
            <p className={`text-[9.5px] mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              🔒 Stored strictly in this device's local cache. If you log in from another phone or computer, it will open normally unless you enable this feature on that device as well.
            </p>
          </div>
        </div>

        {/* Master ON/OFF Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={loading}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled 
              ? (isDark ? 'bg-amber-500' : 'bg-emerald-500') 
              : (isDark ? 'bg-slate-700' : 'bg-slate-200')
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div className={`mt-3 p-2.5 rounded-xl text-[10px] flex items-start gap-2 animate-fadeIn ${
          feedback.type === 'success'
            ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-800 border border-emerald-100')
            : feedback.type === 'error'
            ? (isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40' : 'bg-rose-50 text-rose-800 border border-rose-100')
            : (isDark ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'bg-blue-50 text-blue-800 border border-blue-100')
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-tight">{feedback.message}</span>
        </div>
      )}

      {/* Device & Android Studio Integration Specs */}
      <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[9px] ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3 h-3 text-amber-500" />
          <span>Native Android Studio Ready: <code className="font-mono text-[8.5px] bg-black/10 px-1 py-0.5 rounded">window.AndroidAppLock</code></span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className={`w-3 h-3 ${enabled ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span>{enabled ? "Device Screen Lock Enforced" : "Normal Boot (Unlocked)"}</span>
        </div>
      </div>
    </div>
  );
}
