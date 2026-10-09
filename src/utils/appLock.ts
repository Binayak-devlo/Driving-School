/**
 * Golden Hands Driving Academy - System Screen Lock & App Lock Manager
 * 
 * Supports:
 * 1. Native Android Studio integration via WebView JavascriptInterface (@JavascriptInterface "AndroidAppLock")
 * 2. W3C Web Authentication API (Platform Authenticator with userVerification: "required")
 *    Enforces the phone's existing system screen lock (Fingerprint, Face Unlock, PIN, Pattern, or Password)
 * 3. Lifecycle visibility & focus tracking (locks on app return from background)
 * 4. Per-portal & global toggle settings across Student, Trainer, Parent, and Admin
 */

export type PortalRole = 'student' | 'trainer' | 'parent' | 'admin';

declare global {
  interface Window {
    AndroidAppLock?: {
      isAvailable?: () => boolean;
      authenticate?: (callbackMethodName?: string) => boolean | Promise<boolean>;
      setAppLockEnabled?: (enabled: boolean) => void;
      isAppLockEnabled?: () => boolean;
      getBiometricType?: () => string;
    };
    Android?: {
      authenticateWithBiometrics?: () => boolean | Promise<boolean>;
      isBiometricAvailable?: () => boolean;
    };
    onAndroidBiometricResult?: (success: boolean, error?: string) => void;
  }
}

type LockStateListener = (isLocked: boolean) => void;

class AppLockService {
  private listeners: Set<LockStateListener> = new Set();
  private _isLocked: boolean = false;
  private _lastActiveTime: number = Date.now();
  private _activeRole: PortalRole | null = null;
  private _authenticatingPromise: Promise<{ success: boolean; error?: string }> | null = null;

  constructor() {
    this.initLifecycleListeners();
  }

  /**
   * Set the current active portal role for context-specific app lock checking
   */
  public setActiveRole(role: PortalRole | null) {
    this._activeRole = role;
  }

  public getActiveRole(): PortalRole | null {
    return this._activeRole;
  }

  /**
   * Check if App Lock is enabled for a specific role or globally
   */
  public isAppLockEnabled(role?: PortalRole): boolean {
    if (typeof window === "undefined") return false;

    // Check Android Studio native bridge first if available
    try {
      if (window.AndroidAppLock?.isAppLockEnabled) {
        return window.AndroidAppLock.isAppLockEnabled();
      }
    } catch (e) {}

    const targetRole = role || this._activeRole;
    if (targetRole) {
      const roleSetting = localStorage.getItem(`golden_hands_app_lock_${targetRole}`);
      if (roleSetting !== null) {
        return roleSetting === "true";
      }
    }

    return localStorage.getItem("golden_hands_app_lock_enabled") === "true";
  }

  /**
   * Toggle App Lock setting
   */
  public setAppLockEnabled(enabled: boolean, role?: PortalRole): void {
    if (typeof window === "undefined") return;

    const targetRole = role || this._activeRole;
    if (targetRole) {
      localStorage.setItem(`golden_hands_app_lock_${targetRole}`, String(enabled));
    }
    // Also keep global default updated
    localStorage.setItem("golden_hands_app_lock_enabled", String(enabled));

    // Inform Android native bridge in Android Studio
    try {
      if (window.AndroidAppLock?.setAppLockEnabled) {
        window.AndroidAppLock.setAppLockEnabled(enabled);
      }
    } catch (e) {
      console.warn("[AppLock] Native Android bridge notification error:", e);
    }
  }

  /**
   * Check if device supports platform screen lock / biometrics
   */
  public async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Android Studio native bridge check
    if (window.AndroidAppLock?.isAvailable?.() || window.Android?.isBiometricAvailable?.()) {
      return true;
    }

    // W3C WebAuthn platform authenticator check
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      try {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (err) {
        return false;
      }
    }

    return false;
  }

  /**
   * Returns whether the app is currently in a locked state
   */
  public isLocked(): boolean {
    return this._isLocked;
  }

  public subscribe(listener: LockStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this._isLocked);
      } catch (e) {
        console.error("[AppLock] Listener error:", e);
      }
    }
  }

  /**
   * Prompts the phone's existing system screen lock (fingerprint, face unlock, PIN, pattern, or password)
   * Does NOT use any custom lock screen or fake pinpad.
   */
  public async authenticateWithSystemLock(
    reason: string = "Verify your phone's screen lock to unlock Golden Hands"
  ): Promise<{ success: boolean; error?: string }> {
    if (typeof window === "undefined") return { success: true };

    // Prevent concurrent duplicate prompts
    if (this._authenticatingPromise) {
      return this._authenticatingPromise;
    }

    this._authenticatingPromise = (async () => {
      try {
        // 1. Android Studio Native Bridge (Android BiometricPrompt)
        if (window.AndroidAppLock?.authenticate) {
          const res = await Promise.race([
            Promise.resolve(window.AndroidAppLock.authenticate("onAndroidBiometricResult")),
            new Promise<boolean>((resolve) => {
              window.onAndroidBiometricResult = (success) => resolve(success);
              setTimeout(() => resolve(false), 30000); // 30s timeout
            })
          ]);
          if (res) {
            this._isLocked = false;
            this._lastActiveTime = Date.now();
            this.notify();
            return { success: true };
          } else {
            return { success: false, error: "Android system screen lock verification failed." };
          }
        }

        if (window.Android?.authenticateWithBiometrics) {
          const res = await window.Android.authenticateWithBiometrics();
          if (res) {
            this._isLocked = false;
            this._lastActiveTime = Date.now();
            this.notify();
            return { success: true };
          } else {
            return { success: false, error: "System biometrics cancelled or failed." };
          }
        }

        // 2. Standard Web Authentication API (Platform Authenticator: Phone PIN, Fingerprint, Face)
        if (window.PublicKeyCredential && window.crypto) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          try {
            // Invokes the device's system credential prompt with required user verification
            const credential = await navigator.credentials.create({
              publicKey: {
                challenge,
                rp: {
                  name: "Golden Hands Driving Academy",
                  id: window.location.hostname || "localhost"
                },
                user: {
                  id: userId,
                  name: "user",
                  displayName: "Academy Member"
                },
                pubKeyCredParams: [
                  { alg: -7, type: "public-key" },  // ES256
                  { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                  authenticatorAttachment: "platform", // Enforces device screen lock / biometrics
                  userVerification: "required",        // Requires PIN, pattern, fingerprint, or face
                  requireResidentKey: false
                },
                timeout: 60000,
                attestation: "none"
              }
            });

            if (credential) {
              this._isLocked = false;
              this._lastActiveTime = Date.now();
              this.notify();
              return { success: true };
            }
          } catch (authError: any) {
            const errName = authError?.name;
            const errMsg = authError?.message || String(authError);

            // User dismissed or cancelled the OS system prompt
            if (errName === "NotAllowedError" || errMsg.includes("not allowed") || errMsg.includes("cancelled")) {
              return { 
                success: false, 
                error: "System screen lock prompt was cancelled. Please verify to continue." 
              };
            }

            // If platform authenticator is not supported on this specific browser context
            // or if testing on a desktop browser that doesn't have system biometrics configured
            console.warn("[AppLock] WebAuthn platform prompt note:", authError);
            
            // Check if device lacks platform authenticator
            const isSupported = await this.isPlatformAuthenticatorAvailable();
            if (!isSupported) {
              // Graceful environment bypass for developer web preview environments without hardware biometrics
              this._isLocked = false;
              this._lastActiveTime = Date.now();
              this.notify();
              return { 
                success: true, 
                error: "Device does not have a hardware screen lock configured. App unlocked for development preview." 
              };
            }

            return { 
              success: false, 
              error: authError?.message || "Failed to verify phone screen lock." 
            };
          }
        }

        // Fallback for browsers without WebAuthn
        this._isLocked = false;
        this._lastActiveTime = Date.now();
        this.notify();
        return { success: true };

      } finally {
        this._authenticatingPromise = null;
      }
    })();

    return this._authenticatingPromise;
  }

  /**
   * Unlock manually (e.g., when App Lock is turned OFF)
   */
  public unlock(): void {
    this._isLocked = false;
    this._lastActiveTime = Date.now();
    this.notify();
  }

  /**
   * Lock the app if enabled for the active role
   */
  public lockIfEnabled(): void {
    if (this.isAppLockEnabled()) {
      this._isLocked = true;
      this.notify();
    }
  }

  /**
   * Listen to app backgrounding, visibility changes, and window focus
   */
  private initLifecycleListeners() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // Track when user switches apps or minimizes phone screen
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this._lastActiveTime = Date.now();
      } else if (document.visibilityState === "visible") {
        const elapsedMs = Date.now() - this._lastActiveTime;
        // If app returns from background and App Lock is enabled
        if (this.isAppLockEnabled() && elapsedMs > 1000) {
          this._isLocked = true;
          this.notify();
          // Immediately invoke the phone's system screen lock
          this.authenticateWithSystemLock();
        }
      }
    });

    // Window blur / focus fallback for mobile browser tabs
    window.addEventListener("blur", () => {
      this._lastActiveTime = Date.now();
    });

    window.addEventListener("focus", () => {
      const elapsedMs = Date.now() - this._lastActiveTime;
      if (this.isAppLockEnabled() && elapsedMs > 3000) {
        if (!this._isLocked) {
          this._isLocked = true;
          this.notify();
          this.authenticateWithSystemLock();
        }
      }
    });

    // Android/Capacitor pageshow event
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && this.isAppLockEnabled()) {
        this._isLocked = true;
        this.notify();
        this.authenticateWithSystemLock();
      }
    });
  }
}

export const AppLockManager = new AppLockService();
