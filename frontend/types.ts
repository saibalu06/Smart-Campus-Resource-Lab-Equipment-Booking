export type UserRole = 'Student' | 'Lab Admin';

export type ResourceCategory = 'Electronics Lab' | 'Computing Lab' | 'Seminar Rooms';

export type ResourceStatus = 'Available' | 'In Use' | 'Maintenance';

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export interface Resource {
  id: number;
  name: string;
  asset_code: string;
  category: ResourceCategory;
  status: ResourceStatus;
  specs: string;
  location: string;
  max_duration_hours: number;
  image_url: string;
  created_at: string;
}

export interface OccupiedSlot {
  id: number;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export interface Booking {
  id: number;
  resource_id: number;
  user_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus;
  rejection_reason: string | null;
  created_at: string;
  resource_name: string;
  resource_asset_code: string;
  resource_category: ResourceCategory;
  resource_location: string;
  user_name: string;
  user_email: string;
  user_department: string;
}

export interface CategoryBreakdown {
  category: ResourceCategory;
  resource_count: number;
  approved_bookings: number;
  pending_bookings: number;
}

export interface AnalyticsSummary {
  totalResources: number;
  availableResources: number;
  inUseResources: number;
  maintenanceResources: number;
  activeBookingsToday: number;
  pendingApprovals: number;
  utilizationPercent: number;
  totalBookedHoursToday: number;
  totalCapacityHoursToday: number;
  categoryBreakdown: CategoryBreakdown[];
}
