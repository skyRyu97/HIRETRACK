import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  aiCallsToday?: number;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore user session on application load via httpOnly refresh token
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshRes = await api.post('/api/auth/refresh');
        const newAccessToken = refreshRes.data.accessToken;
        setAccessToken(newAccessToken);
        setToken(newAccessToken);

        const meRes = await api.get('/api/auth/me');
        setUser(meRes.data.user);
      } catch {
        // No valid session found; user stays logged out
        setAccessToken(null);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user: userData, accessToken } = res.data;
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/api/auth/register', { name, email, password });
    const { user: userData, accessToken } = res.data;
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const loginDemo = async () => {
    const res = await api.post('/api/auth/demo');
    const { user: userData, accessToken } = res.data;
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: token,
        isLoading,
        login,
        register,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
