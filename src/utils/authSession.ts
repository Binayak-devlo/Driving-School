import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { MockDatabase } from "./db";

export type PortalRole = 'student' | 'trainer' | 'admin' | 'parent';

export interface ActiveSession {
  role: PortalRole;
  userId: string;
  token: string;
  user?: any;
}

export const AUTH_KEYS = [
  "golden_hands_auth_token",
  "golden_hands_current_role",
  "golden_hands_current_student_id",
  "golden_hands_current_trainer_id",
  "golden_hands_current_parent_id",
  "golden_hands_admin_logged_in",
  "golden_hands_trainer_session_id",
  "golden_hands_parent_session_id",
  "golden_hands_remember_user"
] as const;

export class AuthSessionManager {
  private static broadcastChannel: BroadcastChannel | null = (() => {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        return new BroadcastChannel("golden_hands_auth_events");
      }
    } catch (e) {}
    return null;
  })();

  /**
   * Save a verified session after successful login / registration.
   * Clears any previous role data to ensure one portal's session NEVER bleeds into another.
   */
  static saveSession(params: {
    role: PortalRole;
    userId: string;
    token: string;
    user?: any;
    remember?: boolean;
  }): void {
    const { role, userId, token, user, remember = false } = params;

    // 1. Wipe all existing auth keys first to ensure strict portal isolation
    this.clearClientStorage();

    try {
      // 2. Set active token and role
      localStorage.setItem("golden_hands_auth_token", token);
      localStorage.setItem("golden_hands_current_role", role);

      // 3. Set role-specific credentials
      if (role === 'student') {
        localStorage.setItem("golden_hands_current_student_id", userId);
        MockDatabase.setCurrentStudentId(userId);
        if (user) MockDatabase.saveStudent(user);
      } else if (role === 'trainer') {
        localStorage.setItem("golden_hands_current_trainer_id", userId);
        MockDatabase.setCurrentTrainerId(userId);
      } else if (role === 'admin') {
        localStorage.setItem("golden_hands_admin_logged_in", "true");
      } else if (role === 'parent') {
        localStorage.setItem("golden_hands_current_parent_id", userId);
        if (user) MockDatabase.setCurrentParent(user);
      }

      // 4. Handle Remember Me securely with active token
      if (remember) {
        localStorage.setItem(
          "golden_hands_remember_user",
          JSON.stringify({ role, id: userId, token })
        );
      }

      // Notify window & tabs
      window.dispatchEvent(new CustomEvent("golden_hands_auth_login", { detail: { role, userId } }));
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: "LOGIN", role, userId });
      }
    } catch (err) {
      console.warn("[AuthSessionManager] Error saving session to storage:", err);
    }
  }

  /**
   * Synchronously check if a specific portal role has active, unexpired credentials.
   */
  static isRoleAuthenticated(role: PortalRole): boolean {
    try {
      const activeRole = localStorage.getItem("golden_hands_current_role");
      const token = localStorage.getItem("golden_hands_auth_token");
      if (!token || activeRole !== role) {
        return false;
      }

      if (role === 'student') {
        return !!localStorage.getItem("golden_hands_current_student_id");
      } else if (role === 'trainer') {
        return !!localStorage.getItem("golden_hands_current_trainer_id");
      } else if (role === 'admin') {
        return localStorage.getItem("golden_hands_admin_logged_in") === "true";
      } else if (role === 'parent') {
        return !!localStorage.getItem("golden_hands_current_parent_id");
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  /**
   * Get active session information if present.
   */
  static getActiveSession(): ActiveSession | null {
    try {
      const token = localStorage.getItem("golden_hands_auth_token");
      const role = localStorage.getItem("golden_hands_current_role") as PortalRole;
      if (!token || !role) return null;

      let userId = "";
      if (role === 'student') userId = localStorage.getItem("golden_hands_current_student_id") || "";
      else if (role === 'trainer') userId = localStorage.getItem("golden_hands_current_trainer_id") || "";
      else if (role === 'admin') userId = "admin";
      else if (role === 'parent') userId = localStorage.getItem("golden_hands_current_parent_id") || "";

      if (!userId) return null;

      return { role, userId, token };
    } catch (e) {
      return null;
    }
  }

  /**
   * Completely clean client-side storage, tokens, cookies, and cached auth flags.
   */
  static clearClientStorage(): void {
    try {
      AUTH_KEYS.forEach(k => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });

      // Clear any cookies if set
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith("golden_hands_") || name.includes("auth") || name.includes("session")) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        }
      }

      // Clear database memory pointers
      MockDatabase.logoutParent();
      MockDatabase.setCurrentStudentId("");
      MockDatabase.setCurrentTrainerId("");
    } catch (e) {
      console.warn("[AuthSessionManager] Client storage clear error:", e);
    }
  }

  /**
   * Invalidate session on backend, clear all client credentials, and trigger global logout event.
   */
  static async logout(portalName?: string): Promise<void> {
    const session = this.getActiveSession();
    const token = session?.token || localStorage.getItem("golden_hands_auth_token") || "";
    const role = session?.role || (portalName as PortalRole) || (localStorage.getItem("golden_hands_current_role") as PortalRole) || "";
    const id = session?.userId || "";

    // 1. Immediately request backend session invalidation
    if (token || id) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, role, id })
        });
      } catch (err) {
        console.warn("[AuthSessionManager] Backend logout endpoint notification failed:", err);
      }
    }

    // 2. Terminate Firebase auth session
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("[AuthSessionManager] Firebase signOut warning:", err);
    }

    // 3. Clear all client storage and persistence keys
    this.clearClientStorage();

    // 4. Notify app components and open tabs
    window.dispatchEvent(new CustomEvent("golden_hands_auth_logout", { detail: { role, portalName } }));
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: "LOGOUT", role });
    }
  }

  /**
   * Verify session with the backend on app start or view switch.
   * NEVER auto-log in if server reports invalid or expired session.
   */
  static async verifySessionWithBackend(expectedRole?: PortalRole): Promise<{
    valid: boolean;
    role?: PortalRole;
    userId?: string;
    user?: any;
    error?: string;
  }> {
    const session = this.getActiveSession();

    // If no active token found, check if remember token exists
    let token = session?.token;
    let role = session?.role;
    let userId = session?.userId;

    if (!token) {
      try {
        const remRaw = localStorage.getItem("golden_hands_remember_user");
        if (remRaw) {
          const rem = JSON.parse(remRaw);
          if (rem && rem.token && rem.role && rem.id) {
            token = rem.token;
            role = rem.role;
            userId = rem.id;
          }
        }
      } catch (e) {}
    }

    if (!token || !role || !userId) {
      this.clearClientStorage();
      return { valid: false, error: "No active session." };
    }

    if (expectedRole && role !== expectedRole) {
      return { valid: false, error: `Session is for role ${role}, not ${expectedRole}.` };
    }

    try {
      const res = await fetch("/api/auth/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, role, id: userId })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.valid) {
        console.warn("[AuthSessionManager] Session rejected by server:", data?.error || res.statusText);
        // Stale or invalid session: immediately purge all cached credentials
        this.clearClientStorage();
        try {
          await signOut(auth);
        } catch (e) {}
        return { valid: false, error: data?.error || "Session invalid or expired." };
      }

      // Valid session confirmed by backend
      return {
        valid: true,
        role,
        userId,
        user: data.user
      };
    } catch (netErr) {
      console.warn("[AuthSessionManager] Network issue verifying session with server:", netErr);
      // Under complete network failure, check local integrity but do not trust if token missing
      if (!token) {
        this.clearClientStorage();
        return { valid: false, error: "Offline with no valid token." };
      }
      return { valid: true, role, userId };
    }
  }
}
