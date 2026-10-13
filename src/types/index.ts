export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'superadmin';
  phone?: string;
  tenant_id: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  pix_key?: string;
  pix_name?: string;
  pix_city?: string;
  phone_whatsapp?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  package_total_classes: number;
  package_price: number;
  weekly_schedules?: string;
  active: number;
  notes?: string;
}

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  package_total_classes: number;
  package_price: number;
  weekly_schedules?: string;
  notes?: string;
  active: number;
  current_package_id?: string;
  package_status?: 'in_progress' | 'pending_payment' | 'paid';
  package_price_actual?: number;
  completed_classes_in_package: number;
  future_classes_in_package?: number;
}

export interface PackageInfo {
  id: string;
  total_classes: number;
  completed_classes?: number;
  scheduled_classes?: number;
  percentage?: number;
  price: number;
  status: 'in_progress' | 'pending_payment' | 'paid';
  payment_method?: 'pix' | 'cash' | null;
  pix_payload?: string;
  pix_qrcode?: string;
  closed_at?: string;
  paid_at?: string;
}

export interface CurrentPackageResponse {
  student: {
    id: string;
    name: string;
    phone?: string;
    weekly_schedules?: string;
    package_total_classes: number;
    package_price: number;
  };
  in_progress: PackageInfo | null;
  pending_payment: PackageInfo | null;
}

export interface ClassSession {
  id: string;
  tenant_id: string;
  student_id: string;
  package_id?: string;
  date: string;
  title: string;
  summary?: string;
  modality: 'presencial' | 'online';
  status: 'completed' | 'scheduled' | 'planned';
  online_url?: string;
  homework?: string;
  teacher_notes?: string;
  materials?: MaterialItem[];
}

export interface MaterialItem {
  id: string;
  tenant_id: string;
  student_id?: string;
  class_id?: string;
  title: string;
  type: 'pdf' | 'ebook' | 'md' | 'zip' | 'link' | 'audio' | 'slides';
  file_url?: string;
  external_url?: string;
  content_md?: string;
  class_title?: string;
  class_date?: string;
  created_at: string;
}

export interface TeacherStats {
  totalStudents: number;
  totalClassesGiven: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  paidCount: number;
  paidAmount: number;
}
