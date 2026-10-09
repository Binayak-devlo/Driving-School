import React, { useState, useEffect } from "react";
import { 
  Fingerprint, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code, 
  X, 
  Shield, 
  KeyRound,
  AlertCircle
} from "lucide-react";
import { Student, SecurityLockConfig, SecurityLockType } from "../types";
import { MockDatabase } from "../utils/db";

interface SecurityLockSettingCardProps {
  student: Student;
  onUpdate?: (config: SecurityLockConfig) => void;
  showNotification?: (msg: string) => void;
}

export const SecurityLockSettingCard: React.FC<SecurityLockSettingCardProps> = ({
  student,
  onUpdate,
  showNotification
}) => {
  const [securityLock, setSecurityLock] = useState<SecurityLockConfig>(() => {
    return MockDatabase.getSecurityLock(student?.id);
  });

  const [pinInput, setPinInput] = useState<string>(() => {
    const lock = MockDatabase.getSecurityLock(student?.id);
    return lock.pinCode || '';
  });

  const [showPin, setShowPin] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulatedPin, setSimulatedPin] = useState('');
  const [simulatedUnlocked, setSimulatedUnlocked] = useState(false);
  const [simulatedError, setSimulatedError] = useState<string | null>(null);

  useEffect(() => {
    if (student?.id) {
      const current = MockDatabase.getSecurityLock(student.id);
      setSecurityLock(current);
      if (current.pinCode) {
        setPinInput(current.pinCode);
      }
    }
  }, [student?.id]);

  const notify = (msg: string) => {
    if (showNotification) {
      showNotification(msg);
    }
  };

  const handleToggle = (enabled: boolean) => {
    const updated: SecurityLockConfig = {
      ...securityLock,
      enabled,
      configuredAt: enabled ? new Date().toISOString() : securityLock.configuredAt,
      targetPlatform: 'android',
      androidBiometricClass: 'androidx.biometric.BiometricPrompt'
    };

    setSecurityLock(updated);
    MockDatabase.saveSecurityLock(updated, student?.id);
    if (onUpdate) onUpdate(updated);

    if (enabled) {
      const typeLabel = 
        updated.lockType === 'fingerprint' 
          ? 'Fingerprint Biometric Lock' 
          : updated.lockType === 'pin' 
          ? 'App Password / PIN Lock' 
          : 'Biometric + PIN Fallback';
      notify(`Security Lock Enabled: ${typeLabel} configured for Android Studio`);
    } else {
      notify('Security Lock Disabled: Normal app access allowed');
    }
  };

  const handleSelectType = (lockType: SecurityLockType) => {
    const updated: SecurityLockConfig = {
      ...securityLock,
      lockType,
      configuredAt: new Date().toISOString(),
      targetPlatform: 'android',
      androidBiometricClass: 'androidx.biometric.BiometricPrompt'
    };

    setSecurityLock(updated);
    MockDatabase.saveSecurityLock(updated, student?.id);
    if (onUpdate) onUpdate(updated);

    const labels: Record<SecurityLockType, string> = {
      fingerprint: 'Fingerprint Biometric Lock',
      pin: 'App Password / PIN Lock',
      biometric_or_pin: 'Biometric + PIN Fallback'
    };
    notify(`Security option configured: ${labels[lockType]}`);
  };

  const handleSavePin = () => {
    const clean = pinInput.trim();
    if (clean.length < 4) {
      notify('Please enter a 4 to 6 digit PIN or Password');
      return;
    }
    const updated: SecurityLockConfig = {
      ...securityLock,
      pinCode: clean,
      configuredAt: new Date().toISOString()
    };

    setSecurityLock(updated);
    MockDatabase.saveSecurityLock(updated, student?.id);
    if (onUpdate) onUpdate(updated);
    notify('App PIN saved successfully for Android Studio configuration!');
  };

  const androidIntegrationSpecCode = `// ========================================================
// Golden Hands Android Studio Native BiometricPrompt Integration
// File: app/src/main/java/com/goldenhands/security/AppSecurityLock.kt
// ========================================================

package com.goldenhands.security

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

object AppSecurityLockManager {

    /**
     * Stored Web App / SharedPreferences Bridge
     * securityLockEnabled: ${securityLock.enabled}
     * securityLockType: "${securityLock.lockType}"
     * pinConfigured: ${Boolean(securityLock.pinCode)}
     */

    fun authenticateWithBiometrics(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    // Verified via Android Biometric Hardware Sensor
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onError(errString.toString())
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onError("Fingerprint not recognized. Try again.")
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Golden Hands Driving Academy")
            .setSubtitle("Confirm fingerprint or device lock to proceed")
            .setNegativeButtonText("${securityLock.lockType === 'biometric_or_pin' ? "Use App PIN" : "Cancel"}")
            .build()

        prompt.authenticate(promptInfo)
    }
}

/*
Gradle Dependency (app/build.gradle):
implementation("androidx.biometric:biometric:1.2.0-alpha05")

AndroidManifest.xml Permissions:
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
*/`;

  const copySpec = () => {
    navigator.clipboard?.writeText(androidIntegrationSpecCode);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  const handleSimulatePinSubmit = () => {
    if (securityLock.pinCode && simulatedPin === securityLock.pinCode) {
      setSimulatedUnlocked(true);
      setSimulatedError(null);
    } else if (!securityLock.pinCode && simulatedPin.length >= 4) {
      // Default simulation pin
      setSimulatedUnlocked(true);
      setSimulatedError(null);
    } else {
      setSimulatedError("Incorrect PIN. Please re-enter your configured PIN.");
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-3.5 transition-all">
      {/* Card Header & Master ON/OFF Switch */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            securityLock.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Fingerprint className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs text-[#161623]">Security Lock</h4>
              {securityLock.enabled ? (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ON • Android Ready
                </span>
              ) : (
                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  OFF • Normal Access
                </span>
              )}
            </div>
            <p className="text-[9.5px] text-slate-400">App Password / Fingerprint Lock</p>
          </div>
        </div>

        {/* Master ON/OFF Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={securityLock.enabled}
          onClick={() => handleToggle(!securityLock.enabled)}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
            securityLock.enabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={securityLock.enabled ? "Disable Security Lock" : "Enable Security Lock"}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm transition-transform ${
              securityLock.enabled ? 'right-1' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* OFF STATE: Normal app access permitted */}
      {!securityLock.enabled ? (
        <div className="p-3 bg-[#F8F9FF] border border-slate-100 rounded-2xl">
          <div className="flex items-start gap-2.5">
            <Unlock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-700">Normal App Access Allowed</p>
              <p className="text-[9.5px] text-slate-500 leading-relaxed mt-0.5">
                Security lock is turned off. You can access all app features, timetables, and courses directly without requiring an App Password or Biometric check. Turn this switch ON to configure your preferred security lock for the upcoming Android Studio build.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ON STATE: Configured for future Android Studio implementation */
        <div className="space-y-3">
          {/* Active Configuration Callout */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-emerald-900">Configured for Future Android Studio Integration</p>
                </div>
                <p className="text-[9.5px] text-emerald-700 leading-relaxed mt-0.5">
                  Your selected lock setting is configured and saved. When compiled in Android Studio with native biometric hardware libraries (<code className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">BiometricPrompt</code>), this setting will protect app launch and resuming.
                </p>
              </div>
            </div>
          </div>

          {/* Security Option Selector */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              Select Security Lock Option
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Fingerprint */}
              <div
                onClick={() => handleSelectType('fingerprint')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  securityLock.lockType === 'fingerprint'
                    ? 'bg-[#6D3BFF]/10 border-[#6D3BFF] ring-1 ring-[#6D3BFF]'
                    : 'bg-[#F8F9FF] border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Fingerprint className={`w-4 h-4 ${securityLock.lockType === 'fingerprint' ? 'text-[#6D3BFF]' : 'text-slate-500'}`} />
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    securityLock.lockType === 'fingerprint' ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'
                  }`}>
                    {securityLock.lockType === 'fingerprint' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs font-bold text-[#161623]">Fingerprint Lock</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">Android device fingerprint biometric sensor</p>
              </div>

              {/* Option 2: App Password / PIN */}
              <div
                onClick={() => handleSelectType('pin')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  securityLock.lockType === 'pin'
                    ? 'bg-[#6D3BFF]/10 border-[#6D3BFF] ring-1 ring-[#6D3BFF]'
                    : 'bg-[#F8F9FF] border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Lock className={`w-4 h-4 ${securityLock.lockType === 'pin' ? 'text-[#6D3BFF]' : 'text-slate-500'}`} />
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    securityLock.lockType === 'pin' ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'
                  }`}>
                    {securityLock.lockType === 'pin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs font-bold text-[#161623]">App Password / PIN</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">Custom 4–6 digit application passcode</p>
              </div>

              {/* Option 3: Biometric + PIN Fallback */}
              <div
                onClick={() => handleSelectType('biometric_or_pin')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  securityLock.lockType === 'biometric_or_pin'
                    ? 'bg-[#6D3BFF]/10 border-[#6D3BFF] ring-1 ring-[#6D3BFF]'
                    : 'bg-[#F8F9FF] border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <ShieldCheck className={`w-4 h-4 ${securityLock.lockType === 'biometric_or_pin' ? 'text-[#6D3BFF]' : 'text-slate-500'}`} />
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    securityLock.lockType === 'biometric_or_pin' ? 'border-[#6D3BFF] bg-[#6D3BFF]' : 'border-slate-300'
                  }`}>
                    {securityLock.lockType === 'biometric_or_pin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs font-bold text-[#161623]">Biometric + PIN</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">Fingerprint primary with PIN backup</p>
              </div>
            </div>
          </div>

          {/* App Password / PIN Setup Box */}
          {(securityLock.lockType === 'pin' || securityLock.lockType === 'biometric_or_pin') && (
            <div className="p-3 bg-[#F8F9FF] border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#161623]">Set App Password / Access PIN</p>
                  <p className="text-[9px] text-slate-400">Enter a 4 to 6 digit code for application security</p>
                </div>
                {securityLock.pinCode ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    PIN Saved
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                    Setup Required
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-6 digit PIN"
                    className="w-full text-xs font-mono font-bold tracking-widest px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-[#6D3BFF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSavePin}
                  disabled={pinInput.length < 4}
                  className="px-3.5 py-2 bg-[#6D3BFF] hover:bg-[#5B2FE0] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  Save PIN
                </button>
              </div>

              {securityLock.pinCode && (
                <div className="flex items-center justify-between text-[9px] pt-1">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Configured PIN: ••••{securityLock.pinCode.slice(-2)}
                  </span>
                  <span className="text-slate-400">Stored for Android Keystore bridge</span>
                </div>
              )}
            </div>
          )}

          {/* Android Target Specifications & Actions */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">Configured Option:</span>
              <span className="font-bold text-slate-800 uppercase font-mono">
                {securityLock.lockType === 'fingerprint' 
                  ? 'Fingerprint Biometric' 
                  : securityLock.lockType === 'pin' 
                  ? 'App Password / PIN' 
                  : 'Biometric + PIN Fallback'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">Target Android API:</span>
              <span className="font-mono text-violet-700 font-bold bg-violet-100/70 px-1.5 py-0.5 rounded">
                androidx.biometric.BiometricPrompt
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-medium">Hardware Biometric Access:</span>
              <span className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded">
                Deferred to Native Android Build
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowSpecModal(true)}
                className="text-[10px] text-[#6D3BFF] hover:text-[#5B2FE0] font-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
                View Android Studio Code
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimulatedPin('');
                  setSimulatedUnlocked(false);
                  setSimulatedError(null);
                  setShowSimulateModal(true);
                }}
                className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-3 h-3 text-slate-500" />
                Simulate Lock UI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Android Studio Native Integration Specification */}
      {showSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#161623]">Android Studio Implementation Spec</h3>
                  <p className="text-[10px] text-slate-400">Native BiometricPrompt & Android Keystore Architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs text-slate-600">
              <div className="p-3 bg-violet-50/60 rounded-2xl border border-violet-100">
                <p className="font-bold text-violet-900 text-[11px] mb-1">Architecture Overview:</p>
                <p className="text-[10px] text-violet-700 leading-relaxed">
                  In this web app, the security setting is configured, validated, and persisted. When exported or packaged in Android Studio (Capacitor/Java/Kotlin), the native runtime will invoke the official AndroidX <code className="font-mono bg-violet-100 px-1 rounded">BiometricPrompt</code> dialog for fingerprint recognition, falling back to the configured App PIN.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 text-[11px]">Android Kotlin Implementation</span>
                  <button
                    onClick={copySpec}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedSpec ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedSpec ? "Copied!" : "Copy Code"}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-[9.5px] overflow-x-auto leading-relaxed max-h-56">
                  {androidIntegrationSpecCode}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
              <button
                onClick={() => setShowSpecModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Simulated Android Lock Screen UI Preview (Zero hardware calls) */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12121A] text-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-800 text-center relative">
            <button
              onClick={() => setShowSimulateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Android Biometric Dialog Simulation */}
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-[#6D3BFF] flex items-center justify-center mx-auto mb-3 border border-violet-500/30">
              <Fingerprint className="w-6 h-6 text-violet-400 animate-pulse" />
            </div>

            <h3 className="font-extrabold text-base text-white mb-1">
              Golden Hands Driving Academy
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {securityLock.lockType === 'fingerprint' 
                ? "Touch the fingerprint sensor to unlock"
                : securityLock.lockType === 'pin'
                ? "Enter your App PIN to continue"
                : "Confirm fingerprint or enter backup PIN"}
            </p>

            {simulatedUnlocked ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="font-black text-sm">Authenticated Successfully!</p>
                <p className="text-[10px] text-emerald-300">
                  Simulation verified. On native Android Studio build, device biometric sensors will complete this unlock.
                </p>
                <button
                  onClick={() => setShowSimulateModal(false)}
                  className="mt-2 w-full py-2 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer hover:bg-emerald-400"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Fingerprint Touch Simulation Button */}
                {(securityLock.lockType === 'fingerprint' || securityLock.lockType === 'biometric_or_pin') && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] text-slate-300 mb-2">Simulate Fingerprint Sensor Contact:</p>
                    <button
                      type="button"
                      onClick={() => setSimulatedUnlocked(true)}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Fingerprint className="w-4 h-4" />
                      Simulate Sensor Touch (Success)
                    </button>
                  </div>
                )}

                {/* PIN Entry Simulation */}
                {(securityLock.lockType === 'pin' || securityLock.lockType === 'biometric_or_pin') && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                    <p className="text-[10px] text-slate-300">
                      Or enter configured PIN {securityLock.pinCode ? `(Code: ••••${securityLock.pinCode.slice(-2)})` : ''}:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={6}
                        value={simulatedPin}
                        onChange={(e) => setSimulatedPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="4-6 digit PIN"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-center text-white focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleSimulatePinSubmit}
                        className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                      >
                        Unlock
                      </button>
                    </div>
                    {simulatedError && (
                      <p className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {simulatedError}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-2 text-[10px] text-slate-500">
                  Preview mode only • No device biometric hardware accessed
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
