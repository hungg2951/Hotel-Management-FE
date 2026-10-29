import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppRole, LoginRequest, User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục session khi mở trang
  useEffect(() => {
    const savedToken = authService.getAccessToken();
    const savedUser = authService.getCurrentUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);

      // Luôn đồng bộ dữ liệu hồ sơ mới nhất từ Database khi mở ứng dụng
      authService
        .getMe()
        .then((updatedUser) => {
          setUser(updatedUser);
        })
        .catch(() => {
          // Giữ phiên hiện tại nếu offline hoặc mạng lỗi
        });
    }
    setIsLoading(false);

    // Lắng nghe sự kiện hết hạn token (401)
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      setToken(res.accessToken);
      setUser({
        username: res.username,
        role: res.role || 'ADMIN',
        userId: res.userId,
        employeeId: res.employeeId,
        fullName: res.fullName,
        email: res.email,
        phone: res.phone,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: AppRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: AppRole[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const isAdmin = user?.role === 'ADMIN';

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      logout,
      updateUser,
      hasRole,
      hasAnyRole,
      isAdmin,
    }),
    [user, token, isLoading, login, logout, updateUser, hasRole, hasAnyRole, isAdmin]
  );

  return (
    <AuthContext.Provider value={contextValue}>
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
