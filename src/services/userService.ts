import { api } from './api';
import type { AppRole } from '../types/auth';

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: AppRole;
  position: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  role: AppRole;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
}

export interface UpdateUserData {
  role: AppRole;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
}

export const userService = {
  async getAllUsers(): Promise<UserAccount[]> {
    return await api.get<UserAccount[]>('/users');
  },

  async adminResetPassword(userId: number, newPassword: string): Promise<void> {
    await api.post(`/users/${userId}/reset-password`, { newPassword });
  },

  async createUser(data: CreateUserData): Promise<UserAccount> {
    return await api.post<UserAccount>('/users', data);
  },

  async updateUser(userId: number, data: UpdateUserData): Promise<UserAccount> {
    return await api.put<UserAccount>(`/users/${userId}`, data);
  },

  async toggleUserStatus(userId: number): Promise<UserAccount> {
    return await api.patch<UserAccount>(`/users/${userId}/status`, {});
  },

  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/users/${userId}`);
  },
};
