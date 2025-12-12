import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAPI } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { email: string; id: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);

  useEffect(() => {
    // Check if token exists on mount
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Verify token by trying to fetch queue
      adminAPI
        .getQueue()
        .then(() => {
          setIsAuthenticated(true);
          const userEmail = localStorage.getItem('adminEmail');
          const userId = localStorage.getItem('adminUserId');
          if (userEmail && userId) {
            setUser({ email: userEmail, id: userId });
          }
        })
        .catch(() => {
          // Token invalid
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminUserId');
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await adminAPI.login(email, password);

      // Store token
      localStorage.setItem('adminToken', response.data.tokens.accessToken);
      localStorage.setItem('adminEmail', response.data.user.email);
      localStorage.setItem('adminUserId', response.data.user.id);

      // Verify admin access
      await adminAPI.getQueue();

      setUser({
        email: response.data.user.email,
        id: response.data.user.id,
      });
      setIsAuthenticated(true);
    } catch (error: any) {
      // Clear any stored data
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminUserId');

      if (error.response?.status === 403) {
        throw new Error('Admin access required. Your account does not have admin privileges.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid email or password.');
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminUserId');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
