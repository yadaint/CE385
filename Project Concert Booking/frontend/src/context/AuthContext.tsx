import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { TOKEN_STORAGE_KEY } from "../services/api";
import { authService, type RegisterPayload } from "../services/authService";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  /** ลบบัญชีตัวเอง — ลบการจองทั้งหมดตามไปด้วย แล้วออกจากระบบ */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On first load, restore the session from the stored JWT by validating
   * it against the backend (GET /auth/me). Expired/invalid tokens are removed.
   */
  useEffect(() => {
    const restoreSession = async (): Promise<void> => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const { token, user: loggedInUser } = await authService.login({ email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    // 1) สมัครบัญชี (multipart พร้อมรูปบัตรประชาชนหน้า/หลัง)
    await authService.register(payload);

    // 2) สมัครสำเร็จ → เข้าสู่ระบบอัตโนมัติทันที
    const { token, user: loggedInUser } = await authService.login({
      email: payload.email,
      password: payload.password,
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback((): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  /** ผู้ใช้ลบบัญชีตัวเอง — ลบข้อมูลทั้งหมดตาม แล้วออกจากระบบ */
  const deleteAccount = useCallback(async (): Promise<void> => {
    await authService.deleteAccount();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      deleteAccount,
    }),
    [user, isLoading, login, register, logout, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider />");
  }
  return context;
}
