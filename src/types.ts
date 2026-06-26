/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'superadmin' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  invited_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  gender: 'M' | 'F' | 'Otro';
  birth_date: string; // ISO date YYYY-MM-DD
  age: number;
  hire_date: string; // ISO date YYYY-MM-DD
  years_in_role: number;
  department_id: string;
  position_id: string;
  supervisor_id?: string;
  salary: number;
  status: 'activo' | 'inactivo' | 'vacaciones' | 'licencia';
  termination_date?: string;
  termination_reason?: 'Renuncia Voluntaria' | 'Despido con Causa' | 'Despido sin Causa' | 'Mutuo Acuerdo' | 'Jubilación' | 'Otro';
  termination_notes?: string;
  satisfaction_score: number; // 0 to 10
  performance_score: number; // 0 to 10
  absence_days: number;
  is_satisfied: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Joined fields for display
  department_name?: string;
  position_title?: string;
  supervisor_name?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head_id?: string;
  budget: number;
  created_at: string;
}

export interface Position {
  id: string;
  title: string;
  department_id: string;
  salary_min: number;
  salary_max: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string; // INSERT, UPDATE, DELETE, LOGIN, EXPORT, UNAUTHORIZED_ACCESS, etc.
  table_name?: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id?: string;
  user_email?: string;
  user_role?: UserRole;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  timestamp: string;
}

export interface AccessRequest {
  id: string;
  requester_email: string;
  requester_name: string;
  requested_role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  requested_at: string;
  reviewed_at?: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: 'access_request' | 'alert_absence' | 'alert_performance' | 'system';
  title: string;
  body: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  cost: number;
  department_id: string;
  created_at: string;
}

export interface EmployeeTraining {
  employee_id: string;
  training_id: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'failed';
  completion_date?: string;
  score?: number;
}

export interface SimulatedEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  timestamp: string;
}
