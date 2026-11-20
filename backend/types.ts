export type UserRole = 'Student' | 'Lab Admin';

export type ResourceCategory = 'Electronics Lab' | 'Computing Lab' | 'Seminar Rooms';

export type ResourceStatus = 'Available' | 'In Use' | 'Maintenance';

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export interface ResourceRow {
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

export interface BookingRow {
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
}

export interface BookingWithDetails extends BookingRow {
  resource_name: string;
  resource_asset_code: string;
  resource_category: ResourceCategory;
  resource_location: string;
  user_name: string;
  user_email: string;
  user_department: string;
}
