import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  type Credentials,
  type User,
} from "../api/authApi";
import { AUTH_TOKEN_KEY } from "../api/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    function handleUnauthorized() {
      setUser(null);
    }

    restoreSession();
    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  async function login(credentials: Credentials) {
    const response = await loginRequest(credentials);
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    setUser(response.user);
  }

  async function register(credentials: Credentials) {
    const response = await registerRequest(credentials);
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    setUser(response.user);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}