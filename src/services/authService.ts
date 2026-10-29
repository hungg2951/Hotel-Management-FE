import { api } from './api';
import { normalizeRole, type LoginRequest, type LoginResponse, type User } from '../types/auth';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>('/auth/login', credentials);
    api.setToken(data.accessToken);

    // Backend trả về mảng roles: ["ROLE_ADMIN"]
    const rawRole = data.roles && data.roles.length > 0 ? data.roles[0] : data.role;
    const cleanRole = normalizeRole(rawRole);

    const user: User = {
      username: data.username,
      role: cleanRole,
      userId: data.userId,
      employeeId: data.employeeId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    };
    localStorage.setItem('hotel_user', JSON.stringify(user));
    return { ...data, role: cleanRole };
  },

  async getMe(): Promise<User> {
    const data = await api.get<LoginResponse>('/auth/me');
    const rawRole = data.roles && data.roles.length > 0 ? data.roles[0] : data.role;
    const cleanRole = normalizeRole(rawRole);

    const user: User = {
      username: data.username,
      role: cleanRole,
      userId: data.userId,
      employeeId: data.employeeId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    };
    localStorage.setItem('hotel_user', JSON.stringify(user));
    return user;
  },

  async updateProfile(profileData: { fullName: string; email?: string; phone?: string }): Promise<User> {
    const data = await api.put<LoginResponse>('/auth/profile', profileData);
    const rawRole = data.roles && data.roles.length > 0 ? data.roles[0] : data.role;
    const cleanRole = normalizeRole(rawRole);

    const user: User = {
      username: data.username,
      role: cleanRole,
      userId: data.userId,
      employeeId: data.employeeId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    };
    localStorage.setItem('hotel_user', JSON.stringify(user));
    return user;
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('hotel_user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as User;
      if (!parsed || !parsed.username) return null;
      return {
        ...parsed,
        role: normalizeRole(parsed.role),
      };
    } catch {
      return null;
    }
  },

  getAccessToken(): string | null {
    return localStorage.getItem('hotel_access_token');
  },

  logout(): void {
    api.removeToken();
  },

  async changePassword(passwords: { oldPassword: string; newPassword: string }): Promise<void> {
    await api.post('/auth/change-password', passwords);
  },
};
