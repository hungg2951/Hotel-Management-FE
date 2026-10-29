import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động đính kèm Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('hotel_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Xử lý dữ liệu trả về và bắt lỗi tự động
apiClient.interceptors.response.use(
  (response) => {
    // Nếu backend trả về format ApiResponse<T> chuẩn
    const resData = response.data;
    if (resData && typeof resData === 'object' && 'data' in resData) {
      return (resData as ApiResponse<unknown>).data;
    }
    return resData;
  },
  (error: AxiosError) => {
    if (!error.response) {
      // Lỗi mạng hoặc server không phản hồi
      return Promise.reject(
        new Error('Không thể kết nối đến máy chủ Backend (cổng 8080). Vui lòng đảm bảo Backend trong thư mục be/ đang chạy.')
      );
    }

    const status = error.response.status;
    const resData = error.response.data as Record<string, unknown> | undefined;
    const errorCode = (resData?.code as string) || (resData?.errorCode as string);
    const serverMessage = (resData?.message as string) || (resData?.error as string);

    // Xử lý tức thì khi tài khoản bị khóa (ACCOUNT_LOCKED)
    if (errorCode === 'ACCOUNT_LOCKED' || serverMessage?.toLowerCase().includes('khóa')) {
      const lockMsg = serverMessage || 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.';
      if (!error.config?.url?.includes('/auth/login')) {
        // Thu hồi phiên làm việc lập tức
        localStorage.removeItem('hotel_access_token');
        localStorage.removeItem('hotel_user');
        sessionStorage.setItem('locked_message', lockMsg);
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      return Promise.reject(new Error(lockMsg));
    }

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('hotel_access_token');
      localStorage.removeItem('hotel_user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(new Error(serverMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
    }

    if (status === 403) {
      return Promise.reject(new Error(serverMessage || 'Bạn không có quyền thực hiện hành động này (403 Forbidden).'));
    }

    if (status === 502 || status === 504) {
      return Promise.reject(
        new Error('Máy chủ Backend (cổng 8080) đang bận hoặc chưa khởi động xong.')
      );
    }

    const message = serverMessage || `Yêu cầu thất bại với mã lỗi HTTP ${status}`;

    return Promise.reject(new Error(message));
  }
);

class ApiService {
  public setToken(token: string): void {
    localStorage.setItem('hotel_access_token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('hotel_access_token');
    localStorage.removeItem('hotel_user');
  }

  public get<T>(url: string, params?: unknown): Promise<T> {
    return apiClient.get(url, { params }) as Promise<T>;
  }

  public post<T>(url: string, data?: unknown): Promise<T> {
    return apiClient.post(url, data) as Promise<T>;
  }

  public put<T>(url: string, data?: unknown): Promise<T> {
    return apiClient.put(url, data) as Promise<T>;
  }

  public patch<T>(url: string, data?: unknown): Promise<T> {
    return apiClient.patch(url, data) as Promise<T>;
  }

  public delete<T>(url: string): Promise<T> {
    return apiClient.delete(url) as Promise<T>;
  }
}

export const api = new ApiService();
