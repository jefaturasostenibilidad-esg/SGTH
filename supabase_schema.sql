-- SCHEMA DE BASE DE DATOS PARA SGTH EN SUPABASE
-- Ejecute este script en el editor SQL de su proyecto de Supabase para habilitar la persistencia relacional completa.

-- 1. Habilitar extensiones si no están activas
create extension if not exists "uuid-ossp";

-- 2. Eliminar tablas existentes (opcional, en orden de dependencias)
-- drop table if exists employee_trainings CASCADE;
-- drop table if exists training_programs CASCADE;
-- drop table if exists notifications CASCADE;
-- drop table if exists access_requests CASCADE;
-- drop table if exists audit_logs CASCADE;
-- drop table if exists employees CASCADE;
-- drop table if exists positions CASCADE;
-- drop table if exists departments CASCADE;
-- drop table if exists profiles CASCADE;
-- drop table if exists simulated_emails CASCADE;

-- 3. Tabla: perfiles de usuarios (Profiles)
create table if not exists profiles (
  id text primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('superadmin', 'editor', 'viewer')),
  is_active boolean default true,
  invited_by text,
  approved_at text,
  created_at text not null,
  updated_at text not null
);

-- 4. Tabla: departamentos (Departments)
create table if not exists departments (
  id text primary key,
  name text not null,
  code text unique not null,
  head_id text,
  budget numeric not null,
  created_at text not null
);

-- 5. Tabla: cargos (Positions)
create table if not exists positions (
  id text primary key,
  title text not null,
  department_id text references departments(id) on delete cascade,
  salary_min numeric not null,
  salary_max numeric not null,
  created_at text not null
);

-- 6. Tabla: colaboradores / empleados (Employees)
create table if not exists employees (
  id text primary key,
  employee_code text unique not null,
  full_name text not null,
  gender text not null check (gender in ('M', 'F', 'Otro')),
  birth_date text not null,
  age integer not null,
  hire_date text not null,
  years_in_role numeric not null,
  department_id text references departments(id) on delete set null,
  position_id text references positions(id) on delete set null,
  supervisor_id text,
  salary numeric not null,
  status text not null check (status in ('activo', 'inactivo', 'vacaciones', 'licencia')),
  termination_date text,
  termination_reason text,
  termination_notes text,
  satisfaction_score integer not null,
  performance_score integer not null,
  absence_days integer not null,
  is_satisfied boolean not null,
  created_by text,
  updated_by text,
  created_at text not null,
  updated_at text not null
);

-- 7. Tabla: bitácora de auditorías (Audit Logs)
create table if not exists audit_logs (
  id text primary key,
  action text not null,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  changed_fields jsonb,
  user_id text,
  user_email text,
  user_role text,
  ip_address text,
  user_agent text,
  session_id text,
  severity text not null check (severity in ('INFO', 'WARN', 'CRITICAL')),
  timestamp text not null
);

-- 8. Tabla: solicitudes de acceso (Access Requests)
create table if not exists access_requests (
  id text primary key,
  requester_email text not null,
  requester_name text not null,
  requested_role text not null check (requested_role in ('superadmin', 'editor', 'viewer')),
  status text not null check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  review_notes text,
  requested_at text not null,
  reviewed_at text
);

-- 9. Tabla: notificaciones (Notifications)
create table if not exists notifications (
  id text primary key,
  recipient_id text not null,
  type text not null check (type in ('access_request', 'alert_absence', 'alert_performance', 'system')),
  title text not null,
  body text not null,
  is_read boolean default false,
  metadata jsonb,
  created_at text not null
);

-- 10. Tabla: programas de capacitación (Training Programs)
create table if not exists training_programs (
  id text primary key,
  name text not null,
  description text,
  start_date text not null,
  end_date text not null,
  cost numeric not null,
  department_id text references departments(id) on delete cascade,
  created_at text not null
);

-- 11. Tabla: inscripciones de colaboradores en capacitaciones (Employee Trainings)
create table if not exists employee_trainings (
  employee_id text references employees(id) on delete cascade,
  training_id text references training_programs(id) on delete cascade,
  status text not null check (status in ('enrolled', 'in_progress', 'completed', 'failed')),
  completion_date text,
  score numeric,
  primary key (employee_id, training_id)
);

-- 12. Tabla: correos electrónicos simulados (Simulated Emails)
create table if not exists simulated_emails (
  id text primary key,
  "from" text not null,
  "to" text not null,
  subject text not null,
  html text not null,
  timestamp text not null
);

-- 13. Tabla de sincronización fallback alternativa (por si se prefiere sincronización monolítica)
create table if not exists sgth_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar semilla de superadmin inicial si no existe
insert into profiles (id, email, full_name, role, is_active, created_at, updated_at)
values ('p-super3', 'jefaturasostenibilidad@gmail.com', 'Jefatura Sostenibilidad', 'superadmin', true, to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
on conflict (email) do update set role = 'superadmin', is_active = true;
