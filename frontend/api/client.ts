import type {
  AnalyticsSummary,
  Booking,
  OccupiedSlot,
  Resource,
  ResourceCategory,
  ResourceStatus,
  User,
  UserRole,
} from '../types';

const TOKEN_KEY = 'campuslab_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  login(email: string, password: string) {
    return apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department: string;
  }) {
    return apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return apiRequest<{ user: User }>('/api/auth/me');
  },

  // Resources
  getResources(filters?: { category?: string; status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters?.status && filters.status !== 'All') params.set('status', filters.status);
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    const qs = params.toString();
    return apiRequest<{ resources: Resource[] }>(`/api/resources${qs ? `?${qs}` : ''}`);
  },

  createResource(payload: {
    name: string;
    asset_code: string;
    category: ResourceCategory;
    status: ResourceStatus;
    specs: string;
    location: string;
    max_duration_hours: number;
  }) {
    return apiRequest<{ resource: Resource }>('/api/resources', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateResource(
    id: number,
    payload: Partial<{
      name: string;
      asset_code: string;
      category: ResourceCategory;
      status: ResourceStatus;
      specs: string;
      location: string;
      max_duration_hours: number;
    }>
  ) {
    return apiRequest<{ resource: Resource }>(`/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteResource(id: number) {
    return apiRequest<{ deleted: boolean }>(`/api/resources/${id}`, {
      method: 'DELETE',
    });
  },

  // Bookings
  getOccupiedSlots(resourceId: number, date: string) {
    const params = new URLSearchParams({
      resource_id: String(resourceId),
      date,
    });
    return apiRequest<{ slots: OccupiedSlot[] }>(`/api/bookings/slots?${params.toString()}`);
  },

  getBookings(status?: string) {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.set('status', status);
    const qs = params.toString();
    return apiRequest<{ bookings: Booking[] }>(`/api/bookings${qs ? `?${qs}` : ''}`);
  },

  createBooking(payload: {
    resource_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    purpose: string;
  }) {
    return apiRequest<{ booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveBooking(id: number) {
    return apiRequest<{ booking: Booking }>(`/api/bookings/${id}/approve`, {
      method: 'PATCH',
    });
  },

  rejectBooking(id: number, rejectionReason?: string) {
    return apiRequest<{ booking: Booking }>(`/api/bookings/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejection_reason: rejectionReason ?? '' }),
    });
  },

  cancelBooking(id: number) {
    return apiRequest<{ booking: Booking }>(`/api/bookings/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  // Analytics & CSV Export
  getAnalyticsSummary() {
    return apiRequest<{ summary: AnalyticsSummary }>('/api/analytics/summary');
  },

  async downloadCsvReport(): Promise<void> {
    const token = getStoredToken();
    const response = await fetch('/api/analytics/export-csv', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV report.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = /filename="([^"]+)"/.exec(disposition);
    const filename = filenameMatch ? filenameMatch[1] : 'campus-lab-bookings-report.csv';

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
