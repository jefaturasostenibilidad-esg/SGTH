/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { 
  Profile, 
  Employee, 
  Department, 
  Position, 
  AuditLog, 
  AccessRequest, 
  Notification, 
  SimulatedEmail,
  UserRole,
  TrainingProgram,
  EmployeeTraining
} from '../types';

const IS_VERCEL = !!process.env.VERCEL;
const BUNDLED_DB_PATH = path.join(process.cwd(), 'db.json');
const DB_FILE_PATH = IS_VERCEL ? '/tmp/db.json' : BUNDLED_DB_PATH;

// Initialize Supabase Client if env vars are present
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;
export const getSupabase = () => {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_KEY) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('SGTH - Supabase Client initialized successfully.');
    } catch (err) {
      console.error('SGTH - Failed to initialize Supabase client:', err);
    }
  }
  return supabaseClient;
};

// Initialize Resend Client if API key is present
let resendClient: any = null;
export const getResend = () => {
  if (!resendClient && process.env.RESEND_API_KEY) {
    try {
      resendClient = new Resend(process.env.RESEND_API_KEY);
      console.log('SGTH - Resend Client initialized successfully.');
    } catch (err) {
      console.error('SGTH - Failed to initialize Resend client:', err);
    }
  }
  return resendClient;
};

export class DatabaseStore {
  profiles: Profile[] = [];
  employees: Employee[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  auditLogs: AuditLog[] = [];
  accessRequests: AccessRequest[] = [];
  notifications: Notification[] = [];
  emails: SimulatedEmail[] = [];
  trainingPrograms: TrainingProgram[] = [];
  employeeTrainings: EmployeeTraining[] = [];

  constructor() {
    this.loadDatabase();
  }

  private loadDatabase() {
    // 1. Initial fallback load from local db.json
    if (IS_VERCEL && !fs.existsSync(DB_FILE_PATH)) {
      try {
        if (fs.existsSync(BUNDLED_DB_PATH)) {
          fs.copyFileSync(BUNDLED_DB_PATH, DB_FILE_PATH);
        }
      } catch (err) {
        console.error('Error copying bundled db.json to /tmp/db.json', err);
      }
    }

    let loadedFromLocal = false;
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
        this.profiles = data.profiles || [];
        this.employees = data.employees || [];
        this.departments = data.departments || [];
        this.positions = data.positions || [];
        this.auditLogs = data.auditLogs || [];
        this.accessRequests = data.accessRequests || [];
        this.notifications = data.notifications || [];
        this.emails = data.emails || [];
        this.trainingPrograms = data.trainingPrograms || [];
        this.employeeTrainings = data.employeeTrainings || [];
        loadedFromLocal = true;
      } catch (err) {
        console.error('Error loading database, re-seeding...', err);
      }
    }

    if (!loadedFromLocal) {
      this.seedDatabase();
    }

    // Dynamic auto-approval/superadmin provisioning for the testing user
    if (!this.profiles.some(p => p.email === 'jefaturasostenibilidad@gmail.com')) {
      this.profiles.push({
        id: 'p-super3',
        email: 'jefaturasostenibilidad@gmail.com',
        full_name: 'Jefatura Sostenibilidad',
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // 2. Asynchronous cloud sync load from Supabase if configured
    const supabase = getSupabase();
    if (supabase) {
      console.log('SGTH - Supabase detected! Attempting async background load...');
      (async () => {
        try {
          // A. Try reading from monolithic state first
          const { data: monolith } = await supabase
            .from('sgth_store')
            .select('value')
            .eq('key', 'main_state')
            .single();

          if (monolith && monolith.value) {
            const val = monolith.value;
            this.profiles = val.profiles || this.profiles;
            this.employees = val.employees || this.employees;
            this.departments = val.departments || this.departments;
            this.positions = val.positions || this.positions;
            this.auditLogs = val.auditLogs || this.auditLogs;
            this.accessRequests = val.accessRequests || this.accessRequests;
            this.notifications = val.notifications || this.notifications;
            this.emails = val.emails || this.emails;
            this.trainingPrograms = val.trainingPrograms || this.trainingPrograms;
            this.employeeTrainings = val.employeeTrainings || this.employeeTrainings;
            console.log('SGTH - Successfully loaded active state from Supabase monolithic store (sgth_store).');
            // Write back to local cache to stay in sync
            this.saveLocalDatabase();
            return;
          }

          // B. Fallback to relational tables load
          console.log('SGTH - Loading from Supabase individual relational tables...');
          const [
            { data: profiles },
            { data: employees },
            { data: departments },
            { data: positions },
            { data: auditLogs },
            { data: accessRequests },
            { data: notifications },
            { data: emails },
            { data: trainingPrograms },
            { data: employeeTrainings }
          ] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('employees').select('*'),
            supabase.from('departments').select('*'),
            supabase.from('positions').select('*'),
            supabase.from('audit_logs').select('*'),
            supabase.from('access_requests').select('*'),
            supabase.from('notifications').select('*'),
            supabase.from('simulated_emails').select('*'),
            supabase.from('training_programs').select('*'),
            supabase.from('employee_trainings').select('*')
          ]);

          if (profiles && profiles.length > 0) {
            this.profiles = profiles;
            this.employees = employees || [];
            this.departments = departments || [];
            this.positions = positions || [];
            this.auditLogs = auditLogs || [];
            this.accessRequests = accessRequests || [];
            this.notifications = notifications || [];
            this.emails = emails || [];
            this.trainingPrograms = trainingPrograms || [];
            this.employeeTrainings = employeeTrainings || [];
            console.log('SGTH - Successfully loaded active state from Supabase relational tables!');
            this.saveLocalDatabase();
          }
        } catch (err) {
          console.warn('SGTH - Supabase loading warning (tables may not exist yet):', err);
        }
      })();
    } else {
      this.saveLocalDatabase();
    }
  }

  private saveLocalDatabase() {
    try {
      const data = {
        profiles: this.profiles,
        employees: this.employees,
        departments: this.departments,
        positions: this.positions,
        auditLogs: this.auditLogs,
        accessRequests: this.accessRequests,
        notifications: this.notifications,
        emails: this.emails,
        trainingPrograms: this.trainingPrograms,
        employeeTrainings: this.employeeTrainings,
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local database cache', err);
    }
  }

  public saveDatabase() {
    // Save to local cache first
    this.saveLocalDatabase();

    const data = {
      profiles: this.profiles,
      employees: this.employees,
      departments: this.departments,
      positions: this.positions,
      auditLogs: this.auditLogs,
      accessRequests: this.accessRequests,
      notifications: this.notifications,
      emails: this.emails,
      trainingPrograms: this.trainingPrograms,
      employeeTrainings: this.employeeTrainings,
    };

    // Save to Supabase asynchronously
    const supabase = getSupabase();
    if (supabase) {
      (async () => {
        try {
          // 1. Monolithic backup upsert
          await supabase.from('sgth_store').upsert({
            key: 'main_state',
            value: data,
            updated_at: new Date().toISOString()
          });

          // 2. Relational tables upserts (silently ignored if schema isn't created yet)
          if (this.profiles.length > 0) {
            await supabase.from('profiles').upsert(this.profiles);
          }
          if (this.departments.length > 0) {
            await supabase.from('departments').upsert(this.departments);
          }
          if (this.positions.length > 0) {
            await supabase.from('positions').upsert(this.positions);
          }
          if (this.employees.length > 0) {
            const cleanEmployees = this.employees.map(emp => {
              const { department_name, position_title, supervisor_name, ...clean } = emp as any;
              return clean;
            });
            await supabase.from('employees').upsert(cleanEmployees);
          }
          if (this.auditLogs.length > 0) {
            await supabase.from('audit_logs').upsert(this.auditLogs);
          }
          if (this.accessRequests.length > 0) {
            await supabase.from('access_requests').upsert(this.accessRequests);
          }
          if (this.notifications.length > 0) {
            await supabase.from('notifications').upsert(this.notifications);
          }
          if (this.emails.length > 0) {
            await supabase.from('simulated_emails').upsert(this.emails);
          }
          if (this.trainingPrograms.length > 0) {
            await supabase.from('training_programs').upsert(this.trainingPrograms);
          }
          if (this.employeeTrainings.length > 0) {
            await supabase.from('employee_trainings').upsert(this.employeeTrainings);
          }
          console.log('SGTH - All database states synchronized successfully to Supabase.');
        } catch (syncErr) {
          // Fail gracefully so app stays 100% functional
          console.warn('SGTH - Supabase asynchronous sync warning (tables may not exist yet, using monolithic sync):', syncErr);
        }
      })();
    }
  }

  // Helper method to send a real email via Resend and save to simulated emails
  public sendEmail(from: string, to: string, subject: string, html: string) {
    const id = `email-${Math.random().toString(36).substring(2, 11)}`;
    const emailRecord = {
      id,
      from,
      to,
      subject,
      html,
      timestamp: new Date().toISOString()
    };
    
    this.emails.push(emailRecord);
    this.saveDatabase();

    const resend = getResend();
    if (resend) {
      (async () => {
        try {
          // Resend requires verified domain for sending unless using testing email noreply@resend.dev/onboarding@resend.dev
          const finalFrom = from.includes('eveca.co') ? 'onboarding@resend.dev' : from;
          
          await resend.emails.send({
            from: finalFrom,
            to: to.split(',').map(e => e.trim()),
            subject,
            html
          });
          console.log(`SGTH - Real email sent successfully via Resend to ${to}: ${subject}`);
        } catch (resendErr) {
          console.error('SGTH - Failed to send real email via Resend:', resendErr);
        }
      })();
    }
  }

  private seedDatabase() {
    console.log('Seeding database with high-fidelity corporate talent data...');

    // 1. Seed Profiles
    this.profiles = [
      {
        id: 'p-super1',
        email: 'talentohumano@eveca.co',
        full_name: 'Superadmin EVECA',
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-super2',
        email: 'wmartinezm360@gmail.com',
        full_name: 'William Martínez',
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-editor1',
        email: 'editor@eveca.co',
        full_name: 'Camila Ríos (Editora RRHH)',
        role: 'editor',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-viewer1',
        email: 'viewer@eveca.co',
        full_name: 'Eduardo Soto (Gerente General)',
        role: 'viewer',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    // 2. Seed Departments
    this.departments = [
      { id: 'd-tech', name: 'Tecnología', code: 'TEC', budget: 520000000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'd-hr', name: 'Recursos Humanos', code: 'RRHH', budget: 180000000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'd-sales', name: 'Ventas y Marketing', code: 'VEN', budget: 350000000, created_at: '2024-01-15T08:00:00Z' },
      { id: 'd-fin', name: 'Finanzas', code: 'FIN', budget: 240000000, created_at: '2024-01-15T08:00:00Z' },
      { id: 'd-ops', name: 'Operaciones', code: 'OPE', budget: 280000000, created_at: '2024-01-20T08:00:00Z' }
    ];

    // 3. Seed Positions
    this.positions = [
      // Tech
      { id: 'pos-tech-lead', title: 'Líder de Ingeniería', department_id: 'd-tech', salary_min: 12000000, salary_max: 18000000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'pos-sr-dev', title: 'Desarrollador Senior', department_id: 'd-tech', salary_min: 8000000, salary_max: 12000000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'pos-jr-dev', title: 'Desarrollador Junior', department_id: 'd-tech', salary_min: 4000000, salary_max: 7500000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'pos-devops', title: 'Ingeniero de Plataforma (DevOps)', department_id: 'd-tech', salary_min: 8500000, salary_max: 13000000, created_at: '2024-01-12T08:00:00Z' },
      
      // HR
      { id: 'pos-hr-dir', title: 'Director de Talento Humano', department_id: 'd-hr', salary_min: 10000000, salary_max: 15000000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'pos-hr-analyst', title: 'Analista de Selección', department_id: 'd-hr', salary_min: 3500000, salary_max: 5500000, created_at: '2024-01-10T08:00:00Z' },
      { id: 'pos-hr-clima', title: 'Especialista en Clima y Cultura', department_id: 'd-hr', salary_min: 4500000, salary_max: 7000000, created_at: '2024-01-11T08:00:00Z' },
      
      // Sales
      { id: 'pos-sales-mgr', title: 'Gerente Comercial', department_id: 'd-sales', salary_min: 9000000, salary_max: 14000000, created_at: '2024-01-15T08:00:00Z' },
      { id: 'pos-sales-exec', title: 'Ejecutivo de Cuentas Enterprise', department_id: 'd-sales', salary_min: 5000000, salary_max: 9000000, created_at: '2024-01-15T08:00:00Z' },
      { id: 'pos-sales-rep', title: 'Representante de Ventas (SDR)', department_id: 'd-sales', salary_min: 3000000, salary_max: 4500000, created_at: '2024-01-15T08:00:00Z' },

      // Finance
      { id: 'pos-fin-dir', title: 'Director Financiero', department_id: 'd-fin', salary_min: 11000000, salary_max: 16500000, created_at: '2024-01-15T08:00:00Z' },
      { id: 'pos-fin-analyst', title: 'Analista Contable', department_id: 'd-fin', salary_min: 4000000, salary_max: 6500000, created_at: '2024-01-15T08:00:00Z' },

      // Ops
      { id: 'pos-ops-coord', title: 'Coordinador de Logística', department_id: 'd-ops', salary_min: 5000000, salary_max: 8000000, created_at: '2024-01-20T08:00:00Z' },
      { id: 'pos-ops-assistant', title: 'Auxiliar de Operaciones', department_id: 'd-ops', salary_min: 2500000, salary_max: 3800000, created_at: '2024-01-20T08:00:00Z' }
    ];

    // Helper functions to calculate ages and years in role based on dates in 2026
    const getAge = (birthDate: string) => {
      const birth = new Date(birthDate);
      const refDate = new Date('2026-06-25');
      let age = refDate.getFullYear() - birth.getFullYear();
      const m = refDate.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const getYears = (hireDate: string) => {
      const hire = new Date(hireDate);
      const refDate = new Date('2026-06-25');
      const diffTime = Math.abs(refDate.getTime() - hire.getTime());
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      return parseFloat(diffYears.toFixed(2));
    };

    // 4. Seed Employees (25 people: 14M, 11F)
    // Generals & Supervisor Hierarchy:
    // General Manager (William Martínez) is supervisor of Department Heads.
    // Heads are supervisors of Seniors/Coordinators.
    // Seniors are supervisors of Juniors.
    this.employees = [
      // --- CAPA 1: GENERAL MANAGER (Superadmin profile linked / simulated as Employee #1) ---
      {
        id: 'emp-ceo',
        employee_code: 'EMP-001',
        full_name: 'William Martínez',
        gender: 'M',
        birth_date: '1975-04-12',
        age: getAge('1975-04-12'),
        hire_date: '2015-01-10',
        years_in_role: getYears('2015-01-10'),
        department_id: 'd-hr', // linked for system convenience, or GM
        position_id: 'pos-hr-dir', // Will act as Director HR/GM
        salary: 18500000,
        status: 'activo',
        satisfaction_score: 9.5,
        performance_score: 9.8,
        absence_days: 1,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },

      // --- CAPA 2: JEFES DE DEPARTAMENTO ---
      {
        id: 'emp-tech-head',
        employee_code: 'EMP-002',
        full_name: 'Mauricio Altamar',
        gender: 'M',
        birth_date: '1982-11-23',
        age: getAge('1982-11-23'),
        hire_date: '2019-03-15',
        years_in_role: getYears('2019-03-15'),
        department_id: 'd-tech',
        position_id: 'pos-tech-lead',
        supervisor_id: 'emp-ceo',
        salary: 14500000,
        status: 'activo',
        satisfaction_score: 8.2,
        performance_score: 9.0,
        absence_days: 4,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-sales-head',
        employee_code: 'EMP-003',
        full_name: 'Silvia Duarte',
        gender: 'F',
        birth_date: '1985-06-08',
        age: getAge('1985-06-08'),
        hire_date: '2020-05-01',
        years_in_role: getYears('2020-05-01'),
        department_id: 'd-sales',
        position_id: 'pos-sales-mgr',
        supervisor_id: 'emp-ceo',
        salary: 11500000,
        status: 'activo',
        satisfaction_score: 8.8,
        performance_score: 8.5,
        absence_days: 5,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-fin-head',
        employee_code: 'EMP-004',
        full_name: 'Carlos Restrepo',
        gender: 'M',
        birth_date: '1979-02-14',
        age: getAge('1979-02-14'),
        hire_date: '2018-08-20',
        years_in_role: getYears('2018-08-20'),
        department_id: 'd-fin',
        position_id: 'pos-fin-dir',
        supervisor_id: 'emp-ceo',
        salary: 13800000,
        status: 'activo',
        satisfaction_score: 7.5,
        performance_score: 9.1,
        absence_days: 2,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-ops-head',
        employee_code: 'EMP-005',
        full_name: 'Diana Mendoza',
        gender: 'F',
        birth_date: '1987-09-30',
        age: getAge('1987-09-30'),
        hire_date: '2021-11-10',
        years_in_role: getYears('2021-11-10'),
        department_id: 'd-ops',
        position_id: 'pos-ops-coord',
        supervisor_id: 'emp-ceo',
        salary: 7800000,
        status: 'activo',
        satisfaction_score: 9.0,
        performance_score: 8.7,
        absence_days: 3,
        is_satisfied: true,
        created_at: '2024-01-20T08:00:00Z',
        updated_at: '2024-01-20T08:00:00Z'
      },

      // --- CAPA 3: TECNOLOGÍA ---
      {
        id: 'emp-tech-sr1',
        employee_code: 'EMP-006',
        full_name: 'Daniel Ortega',
        gender: 'M',
        birth_date: '1988-07-15',
        age: getAge('1988-07-15'),
        hire_date: '2021-02-15',
        years_in_role: getYears('2021-02-15'),
        department_id: 'd-tech',
        position_id: 'pos-sr-dev',
        supervisor_id: 'emp-tech-head',
        salary: 9800000,
        status: 'activo',
        satisfaction_score: 8.5,
        performance_score: 9.2,
        absence_days: 2,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-tech-sr2',
        employee_code: 'EMP-007',
        full_name: 'Carolina Gómez',
        gender: 'F',
        birth_date: '1991-03-24',
        age: getAge('1991-03-24'),
        hire_date: '2022-06-01',
        years_in_role: getYears('2022-06-01'),
        department_id: 'd-tech',
        position_id: 'pos-sr-dev',
        supervisor_id: 'emp-tech-head',
        salary: 9500000,
        status: 'activo',
        satisfaction_score: 7.9,
        performance_score: 8.8,
        absence_days: 4,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-tech-devops',
        employee_code: 'EMP-008',
        full_name: 'Andrés Villalobos',
        gender: 'M',
        birth_date: '1989-12-05',
        age: getAge('1989-12-05'),
        hire_date: '2020-10-18',
        years_in_role: getYears('2020-10-18'),
        department_id: 'd-tech',
        position_id: 'pos-devops',
        supervisor_id: 'emp-tech-head',
        salary: 10200000,
        status: 'activo',
        satisfaction_score: 6.8,
        performance_score: 8.3,
        absence_days: 6,
        is_satisfied: true,
        created_at: '2024-01-12T08:00:00Z',
        updated_at: '2024-01-12T08:00:00Z'
      },
      {
        id: 'emp-tech-jr1',
        employee_code: 'EMP-009',
        full_name: 'Mateo Cárdenas',
        gender: 'M',
        birth_date: '1996-05-18',
        age: getAge('1996-05-18'),
        hire_date: '2023-01-15',
        years_in_role: getYears('2023-01-15'),
        department_id: 'd-tech',
        position_id: 'pos-jr-dev',
        supervisor_id: 'emp-tech-sr1',
        salary: 5200000,
        status: 'activo',
        satisfaction_score: 9.2,
        performance_score: 8.1,
        absence_days: 3,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-tech-jr2',
        employee_code: 'EMP-010',
        full_name: 'Valeria Santos',
        gender: 'F',
        birth_date: '1998-08-09',
        age: getAge('1998-08-09'),
        hire_date: '2023-11-01',
        years_in_role: getYears('2023-11-01'),
        department_id: 'd-tech',
        position_id: 'pos-jr-dev',
        supervisor_id: 'emp-tech-sr2',
        salary: 4600000,
        status: 'activo',
        satisfaction_score: 4.5, // 😟 UNSATISFIED INDIVIDUAL TO TRIGGER ALERTS
        performance_score: 7.2,
        absence_days: 12,
        is_satisfied: false,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-tech-jr3',
        employee_code: 'EMP-011',
        full_name: 'Diego Pérez',
        gender: 'M',
        birth_date: '1994-10-31',
        age: getAge('1994-10-31'),
        hire_date: '2024-04-10',
        years_in_role: getYears('2024-04-10'),
        department_id: 'd-tech',
        position_id: 'pos-jr-dev',
        supervisor_id: 'emp-tech-sr1',
        salary: 5800000,
        status: 'activo',
        satisfaction_score: 8.0,
        performance_score: 4.8, // 📉 LOW PERFORMANCE INDIVIDUAL TO TRIGGER ALERTS
        absence_days: 7,
        is_satisfied: true,
        created_at: '2024-04-10T08:00:00Z',
        updated_at: '2024-04-10T08:00:00Z'
      },

      // --- CAPA 4: RECURSOS HUMANOS ---
      {
        id: 'emp-hr-clima',
        employee_code: 'EMP-012',
        full_name: 'Camila Ríos',
        gender: 'F',
        birth_date: '1990-01-15',
        age: getAge('1990-01-15'),
        hire_date: '2021-08-01',
        years_in_role: getYears('2021-08-01'),
        department_id: 'd-hr',
        position_id: 'pos-hr-clima',
        supervisor_id: 'emp-ceo',
        salary: 6200000,
        status: 'activo',
        satisfaction_score: 9.1,
        performance_score: 9.3,
        absence_days: 2,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-hr-analyst',
        employee_code: 'EMP-013',
        full_name: 'Esteban Muñoz',
        gender: 'M',
        birth_date: '1992-07-28',
        age: getAge('1992-07-28'),
        hire_date: '2022-10-15',
        years_in_role: getYears('2022-10-15'),
        department_id: 'd-hr',
        position_id: 'pos-hr-analyst',
        supervisor_id: 'emp-ceo',
        salary: 4300000,
        status: 'activo',
        satisfaction_score: 7.2,
        performance_score: 8.0,
        absence_days: 19, // 🔴 ABSENTEEISM TRIGGER ALERTS (>15 days)
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },

      // --- CAPA 5: VENTAS Y MARKETING ---
      {
        id: 'emp-sales-exec1',
        employee_code: 'EMP-014',
        full_name: 'Gonzalo Benítez',
        gender: 'M',
        birth_date: '1984-03-12',
        age: getAge('1984-03-12'),
        hire_date: '2021-04-10',
        years_in_role: getYears('2021-04-10'),
        department_id: 'd-sales',
        position_id: 'pos-sales-exec',
        supervisor_id: 'emp-sales-head',
        salary: 7500000,
        status: 'activo',
        satisfaction_score: 8.0,
        performance_score: 8.4,
        absence_days: 4,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-sales-exec2',
        employee_code: 'EMP-015',
        full_name: 'Verónica Castro',
        gender: 'F',
        birth_date: '1988-12-19',
        age: getAge('1988-12-19'),
        hire_date: '2022-02-15',
        years_in_role: getYears('2022-02-15'),
        department_id: 'd-sales',
        position_id: 'pos-sales-exec',
        supervisor_id: 'emp-sales-head',
        salary: 7200000,
        status: 'activo',
        satisfaction_score: 3.8, // 😟 UNSATISFIED TO MAKE KPI ALERT TRIGGER
        performance_score: 7.9,
        absence_days: 8,
        is_satisfied: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-sales-rep1',
        employee_code: 'EMP-016',
        full_name: 'Felipe Herrera',
        gender: 'M',
        birth_date: '1995-11-03',
        age: getAge('1995-11-03'),
        hire_date: '2023-05-10',
        years_in_role: getYears('2023-05-10'),
        department_id: 'd-sales',
        position_id: 'pos-sales-rep',
        supervisor_id: 'emp-sales-head',
        salary: 3500000,
        status: 'activo',
        satisfaction_score: 8.5,
        performance_score: 9.2,
        absence_days: 3,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-sales-rep2',
        employee_code: 'EMP-017',
        full_name: 'Natalia Restrepo',
        gender: 'F',
        birth_date: '1997-02-28',
        age: getAge('1997-02-28'),
        hire_date: '2023-09-01',
        years_in_role: getYears('2023-09-01'),
        department_id: 'd-sales',
        position_id: 'pos-sales-rep',
        supervisor_id: 'emp-sales-head',
        salary: 3200000,
        status: 'activo',
        satisfaction_score: 5.1, // 😟 UNSATISFIED
        performance_score: 6.8,
        absence_days: 10,
        is_satisfied: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },

      // --- CAPA 6: FINANZAS ---
      {
        id: 'emp-fin-analyst',
        employee_code: 'EMP-018',
        full_name: 'Sandra Martínez',
        gender: 'F',
        birth_date: '1983-05-07',
        age: getAge('1983-05-07'),
        hire_date: '2020-01-10',
        years_in_role: getYears('2020-01-10'),
        department_id: 'd-fin',
        position_id: 'pos-fin-analyst',
        supervisor_id: 'emp-fin-head',
        salary: 5400000,
        status: 'activo',
        satisfaction_score: 8.1,
        performance_score: 8.5,
        absence_days: 2,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-fin-assistant',
        employee_code: 'EMP-019',
        full_name: 'Ricardo Arias',
        gender: 'M',
        birth_date: '1990-10-14',
        age: getAge('1990-10-14'),
        hire_date: '2022-08-01',
        years_in_role: getYears('2022-08-01'),
        department_id: 'd-fin',
        position_id: 'pos-fin-analyst',
        supervisor_id: 'emp-fin-head',
        salary: 4200000,
        status: 'activo',
        satisfaction_score: 7.0,
        performance_score: 7.8,
        absence_days: 5,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },

      // --- CAPA 7: OPERACIONES ---
      {
        id: 'emp-ops-assistant1',
        employee_code: 'EMP-020',
        full_name: 'Liliana Rojas',
        gender: 'F',
        birth_date: '1986-08-11',
        age: getAge('1986-08-11'),
        hire_date: '2021-12-01',
        years_in_role: getYears('2021-12-01'),
        department_id: 'd-ops',
        position_id: 'pos-ops-assistant',
        supervisor_id: 'emp-ops-head',
        salary: 2800000,
        status: 'activo',
        satisfaction_score: 7.7,
        performance_score: 8.0,
        absence_days: 9,
        is_satisfied: true,
        created_at: '2024-01-20T08:00:00Z',
        updated_at: '2024-01-20T08:00:00Z'
      },
      {
        id: 'emp-ops-assistant2',
        employee_code: 'EMP-021',
        full_name: 'Roberto Varela',
        gender: 'M',
        birth_date: '1962-03-15', // Older employee (>60)
        age: getAge('1962-03-15'),
        hire_date: '2016-04-18',
        years_in_role: getYears('2016-04-18'),
        department_id: 'd-ops',
        position_id: 'pos-ops-assistant',
        supervisor_id: 'emp-ops-head',
        salary: 3600000,
        status: 'activo',
        satisfaction_score: 8.4,
        performance_score: 8.6,
        absence_days: 4,
        is_satisfied: true,
        created_at: '2024-01-20T08:00:00Z',
        updated_at: '2024-01-20T08:00:00Z'
      },
      {
        id: 'emp-ops-assistant3',
        employee_code: 'EMP-022',
        full_name: 'Ángela Torres',
        gender: 'F',
        birth_date: '1974-06-21', // 50-60 group
        age: getAge('1974-06-21'),
        hire_date: '2018-09-01',
        years_in_role: getYears('2018-09-01'),
        department_id: 'd-ops',
        position_id: 'pos-ops-assistant',
        supervisor_id: 'emp-ops-head',
        salary: 3100000,
        status: 'activo',
        satisfaction_score: 5.5, // 😟 UNSATISFIED
        performance_score: 8.2,
        absence_days: 16, // 🔴 ABSENTEEISM TRIGGER ALERTS (>15 days)
        is_satisfied: false,
        created_at: '2024-01-20T08:00:00Z',
        updated_at: '2024-01-20T08:00:00Z'
      },

      // --- OTROS COLABORADORES (Licencias, inactivos) ---
      {
        id: 'emp-inactive1',
        employee_code: 'EMP-023',
        full_name: 'Javier Castillo',
        gender: 'M',
        birth_date: '1992-04-04',
        age: getAge('1992-04-04'),
        hire_date: '2022-01-10',
        years_in_role: getYears('2022-01-10'),
        department_id: 'd-tech',
        position_id: 'pos-sr-dev',
        supervisor_id: 'emp-tech-head',
        salary: 8600000,
        status: 'inactivo',
        satisfaction_score: 6.0,
        performance_score: 5.5,
        absence_days: 45,
        is_satisfied: true,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-10T08:00:00Z'
      },
      {
        id: 'emp-vacation1',
        employee_code: 'EMP-024',
        full_name: 'Juliana Peña',
        gender: 'F',
        birth_date: '1989-11-12',
        age: getAge('1989-11-12'),
        hire_date: '2021-03-15',
        years_in_role: getYears('2021-03-15'),
        department_id: 'd-sales',
        position_id: 'pos-sales-exec',
        supervisor_id: 'emp-sales-head',
        salary: 7100000,
        status: 'vacaciones',
        satisfaction_score: 8.9,
        performance_score: 8.6,
        absence_days: 0,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      },
      {
        id: 'emp-licence1',
        employee_code: 'EMP-025',
        full_name: 'Santiago Bedoya',
        gender: 'M',
        birth_date: '1993-01-20',
        age: getAge('1993-01-20'),
        hire_date: '2023-02-10',
        years_in_role: getYears('2023-02-10'),
        department_id: 'd-fin',
        position_id: 'pos-fin-analyst',
        supervisor_id: 'emp-fin-head',
        salary: 4000000,
        status: 'licencia',
        satisfaction_score: 7.5,
        performance_score: 7.0,
        absence_days: 15,
        is_satisfied: true,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      }
    ];

    // 5. Seed Audit Logs
    this.auditLogs = [
      {
        id: 'log-1',
        action: 'SYSTEM_BOOT',
        table_name: 'system',
        record_id: 'sys',
        severity: 'INFO',
        user_email: 'system@eveca.co',
        user_role: 'superadmin',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        new_values: { message: 'SGTH Initialized and seed applied successfully.' }
      },
      {
        id: 'log-2',
        action: 'SEED_DATA_LOAD',
        table_name: 'all',
        severity: 'INFO',
        user_email: 'system@eveca.co',
        user_role: 'superadmin',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        new_values: { total_departments: 5, total_positions: 14, total_employees: 25 }
      }
    ];

    // 6. Seed Access Requests
    this.accessRequests = [
      {
        id: 'req-pending-1',
        requester_email: 'jflores@eveca.co',
        requester_name: 'Jorge Flores',
        requested_role: 'editor',
        status: 'pending',
        requested_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'req-approved-1',
        requester_email: 'editor@eveca.co',
        requester_name: 'Camila Ríos',
        requested_role: 'editor',
        status: 'approved',
        reviewed_by: 'p-super2',
        review_notes: 'Aprobado para la gestión del departamento de RRHH.',
        requested_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        reviewed_at: new Date(Date.now() - 3600000 * 46).toISOString(),
      },
      {
        id: 'req-rejected-1',
        requester_email: 'external_dev@gmail.com',
        requester_name: 'Fabián Castillo',
        requested_role: 'editor',
        status: 'rejected',
        reviewed_by: 'p-super1',
        review_notes: 'Acceso rechazado. Solo se permiten correos corporativos o auditados.',
        requested_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        reviewed_at: new Date(Date.now() - 3600000 * 70).toISOString(),
      }
    ];

    // 7. Seed Notifications
    this.notifications = [
      {
        id: 'notif-1',
        recipient_id: 'p-super2',
        type: 'access_request',
        title: 'Nueva solicitud de acceso',
        body: 'Jorge Flores (jflores@eveca.co) ha solicitado acceso como Editor en el sistema.',
        is_read: false,
        metadata: { requestId: 'req-pending-1' },
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'notif-2',
        recipient_id: 'p-super2',
        type: 'alert_absence',
        title: 'Alerta de Ausentismo Crítico',
        body: 'El colaborador Esteban Muñoz ha superado el umbral individual de inasistencias acumulando 19 días de ausencia.',
        is_read: false,
        metadata: { employeeId: 'emp-hr-analyst', absence_days: 19 },
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      }
    ];

    // 8. Seed simulated outgoing emails (Resend Sandbox)
    this.emails = [
      {
        id: 'email-welcome-camila',
        from: 'SGTH Sistema <noreply@eveca.co>',
        to: 'editor@eveca.co',
        subject: '🔐 Bienvenida al SGTH — Tu cuenta de Editor ha sido activada',
        html: `
          <div style="font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; border: 1px solid rgba(108,60,225,0.3); padding: 30px;">
              <h2 style="color: #a855f7;">¡Bienvenida, Camila Ríos!</h2>
              <p>Tu solicitud de acceso al <strong>Sistema de Gestión de Talento Humano (SGTH)</strong> de EVECA ha sido aprobada con el rol de <strong>Editor</strong>.</p>
              <hr style="border-color: rgba(108,60,225,0.2);" />
              <p>Ahora puedes ingresar al panel utilizando tus credenciales de acceso y comenzar a gestionar la información de los colaboradores.</p>
              <p style="font-size: 12px; color: #64748b;">Este email fue generado por el SGTH · SGSI Certificado ISO 27001</p>
            </div>
          </div>
        `,
        timestamp: new Date(Date.now() - 3600000 * 46).toISOString(),
      }
    ];

    // 9. Seed Training Programs and Enrollments
    this.trainingPrograms = [
      {
        id: 'train-1',
        name: 'Curso de Ciberseguridad e ISO 27001',
        description: 'Capacitación obligatoria en protección de activos de información y cumplimiento de controles SGSI.',
        start_date: '2026-02-01',
        end_date: '2026-02-28',
        cost: 1500000,
        department_id: 'd-tech',
        created_at: '2026-01-15T08:00:00Z'
      },
      {
        id: 'train-2',
        name: 'Liderazgo Situacional y Gestión del Cambio',
        description: 'Taller para directores y líderes de equipo enfocado en delegación, motivación y retención de talento.',
        start_date: '2026-03-05',
        end_date: '2026-03-25',
        cost: 2800000,
        department_id: 'd-hr',
        created_at: '2026-02-20T08:00:00Z'
      },
      {
        id: 'train-3',
        name: 'Estrategia de Ventas Enterprise e Inbound',
        description: 'Formación avanzada en prospección de cuentas enterprise y metodologías de negociación consultiva.',
        start_date: '2026-04-10',
        end_date: '2026-04-30',
        cost: 1200000,
        department_id: 'd-sales',
        created_at: '2026-03-25T08:00:00Z'
      },
      {
        id: 'train-4',
        name: 'Excel Financiero Avanzado y Modelación',
        description: 'Especialización en análisis de presupuestos, proyecciones e indicadores financieros.',
        start_date: '2026-05-02',
        end_date: '2026-05-15',
        cost: 950000,
        department_id: 'd-fin',
        created_at: '2026-04-15T08:00:00Z'
      }
    ];

    this.employeeTrainings = [
      { employee_id: 'emp-tech-head', training_id: 'train-1', status: 'completed', completion_date: '2026-02-27', score: 95 },
      { employee_id: 'emp-tech-sr1', training_id: 'train-1', status: 'completed', completion_date: '2026-02-28', score: 90 },
      { employee_id: 'emp-tech-sr2', training_id: 'train-1', status: 'completed', completion_date: '2026-02-28', score: 88 },
      { employee_id: 'emp-tech-devops', training_id: 'train-1', status: 'in_progress' },
      { employee_id: 'emp-tech-jr1', training_id: 'train-1', status: 'completed', completion_date: '2026-02-27', score: 92 },
      { employee_id: 'emp-tech-jr2', training_id: 'train-1', status: 'failed', score: 55 },
      
      { employee_id: 'emp-tech-head', training_id: 'train-2', status: 'completed', completion_date: '2026-03-24', score: 98 },
      { employee_id: 'emp-sales-head', training_id: 'train-2', status: 'completed', completion_date: '2026-03-25', score: 90 },
      { employee_id: 'emp-fin-head', training_id: 'train-2', status: 'in_progress' },
      { employee_id: 'emp-ops-head', training_id: 'train-2', status: 'enrolled' },

      { employee_id: 'emp-sales-exec1', training_id: 'train-3', status: 'completed', completion_date: '2026-04-29', score: 85 },
      { employee_id: 'emp-sales-exec2', training_id: 'train-3', status: 'completed', completion_date: '2026-04-29', score: 89 },
      { employee_id: 'emp-sales-rep1', training_id: 'train-3', status: 'in_progress' },
      
      { employee_id: 'emp-fin-analyst', training_id: 'train-4', status: 'completed', completion_date: '2026-05-14', score: 94 },
      { employee_id: 'emp-fin-assistant', training_id: 'train-4', status: 'in_progress' }
    ];
  }

  // --- CRUD METHODS WITH AUDIT TRIGGERS & BUSINESS LOGIC ---

  public getEmployees(userRole: UserRole): Employee[] {
    // Only superadmin and editors see employees list
    if (userRole !== 'superadmin' && userRole !== 'editor') {
      return [];
    }

    // Join department and position and supervisor names
    return this.employees.map(emp => {
      const dept = this.departments.find(d => d.id === emp.department_id);
      const pos = this.positions.find(p => p.id === emp.position_id);
      const sup = this.employees.find(e => e.id === emp.supervisor_id);
      return {
        ...emp,
        department_name: dept ? dept.name : 'N/A',
        position_title: pos ? pos.title : 'N/A',
        supervisor_name: sup ? sup.full_name : 'N/A'
      };
    });
  }

  public getEmployeeById(id: string, userRole: UserRole): Employee | null {
    if (userRole !== 'superadmin' && userRole !== 'editor') return null;
    const emp = this.employees.find(e => e.id === id);
    if (!emp) return null;
    const dept = this.departments.find(d => d.id === emp.department_id);
    const pos = this.positions.find(p => p.id === emp.position_id);
    const sup = this.employees.find(e => e.id === emp.supervisor_id);
    return {
      ...emp,
      department_name: dept ? dept.name : 'N/A',
      position_title: pos ? pos.title : 'N/A',
      supervisor_name: sup ? sup.full_name : 'N/A'
    };
  }

  public createEmployee(empData: Partial<Employee>, creator: Profile): Employee {
    const nextCodeNumber = this.employees.length + 1;
    const employee_code = `EMP-${nextCodeNumber.toString().padStart(3, '0')}`;

    // Compute derived properties
    const birth = empData.birth_date ? new Date(empData.birth_date) : new Date('1990-01-01');
    const hire = empData.hire_date ? new Date(empData.hire_date) : new Date();
    const refDate = new Date('2026-06-25');
    
    let age = refDate.getFullYear() - birth.getFullYear();
    if (refDate.getMonth() < birth.getMonth() || (refDate.getMonth() === birth.getMonth() && refDate.getDate() < birth.getDate())) {
      age--;
    }

    const diffTime = Math.abs(refDate.getTime() - hire.getTime());
    const years_in_role = parseFloat((diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));

    const satisfaction_score = Number(empData.satisfaction_score ?? 8.0);
    const performance_score = Number(empData.performance_score ?? 8.0);
    const is_satisfied = satisfaction_score >= 6;

    const newEmployee: Employee = {
      id: `emp-${Math.random().toString(36).substring(2, 11)}`,
      employee_code,
      full_name: empData.full_name || 'Nuevo Empleado',
      gender: empData.gender || 'M',
      birth_date: empData.birth_date || '1990-01-01',
      age,
      hire_date: empData.hire_date || new Date().toISOString().substring(0, 10),
      years_in_role,
      department_id: empData.department_id || 'd-tech',
      position_id: empData.position_id || 'pos-jr-dev',
      supervisor_id: empData.supervisor_id || undefined,
      salary: Number(empData.salary || 3000000),
      status: empData.status || 'activo',
      satisfaction_score,
      performance_score,
      absence_days: Number(empData.absence_days || 0),
      is_satisfied,
      created_by: creator.id,
      updated_by: creator.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.employees.push(newEmployee);

    // Triggers de auditoría automáticos (Audit trigger log_audit_event)
    this.logAuditEvent(
      'INSERT',
      'employees',
      newEmployee.id,
      null,
      newEmployee,
      creator
    );

    // Evaluate SGTH thresholds for alerts
    this.evaluateAlerts(newEmployee, creator);

    this.saveDatabase();
    return newEmployee;
  }

  public updateEmployee(id: string, empData: Partial<Employee>, updater: Profile): Employee | null {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return null;

    const oldEmployee = { ...this.employees[index] };
    const merged = { ...oldEmployee, ...empData };

    // Recalculate computed fields
    if (empData.birth_date) {
      const birth = new Date(empData.birth_date);
      const refDate = new Date('2026-06-25');
      let age = refDate.getFullYear() - birth.getFullYear();
      if (refDate.getMonth() < birth.getMonth() || (refDate.getMonth() === birth.getMonth() && refDate.getDate() < birth.getDate())) {
        age--;
      }
      merged.age = age;
    }

    if (empData.hire_date) {
      const hire = new Date(empData.hire_date);
      const refDate = new Date('2026-06-25');
      const diffTime = Math.abs(refDate.getTime() - hire.getTime());
      merged.years_in_role = parseFloat((diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));
    }

    if (empData.satisfaction_score !== undefined) {
      merged.satisfaction_score = Number(empData.satisfaction_score);
      merged.is_satisfied = merged.satisfaction_score >= 6;
    }

    if (empData.performance_score !== undefined) {
      merged.performance_score = Number(empData.performance_score);
    }

    merged.salary = Number(merged.salary);
    merged.absence_days = Number(merged.absence_days);
    merged.updated_by = updater.id;
    merged.updated_at = new Date().toISOString();

    this.employees[index] = merged;

    // Trigger de auditoría (Log event)
    const changedFields: string[] = [];
    Object.keys(empData).forEach(key => {
      if ((empData as any)[key] !== (oldEmployee as any)[key]) {
        changedFields.push(key);
      }
    });

    this.logAuditEvent(
      'UPDATE',
      'employees',
      id,
      oldEmployee,
      merged,
      updater,
      changedFields
    );

    // Evaluate SGTH thresholds for alerts
    this.evaluateAlerts(merged, updater);

    this.saveDatabase();
    return merged;
  }

  public deleteEmployee(id: string, deleter: Profile): boolean {
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return false;

    const oldEmployee = this.employees[index];
    
    // As per SGSI: Soft-delete/Status change is preferred over hard delete. 
    // We will set status to 'inactivo' to preserve historical data audit logs.
    const updated = {
      ...oldEmployee,
      status: 'inactivo' as const,
      updated_by: deleter.id,
      updated_at: new Date().toISOString()
    };
    
    this.employees[index] = updated;

    this.logAuditEvent(
      'UPDATE (SOFT_DELETE)',
      'employees',
      id,
      oldEmployee,
      updated,
      deleter,
      ['status']
    );

    this.saveDatabase();
    return true;
  }

  // --- ACCESS REQUESTS MANAGEMENT ---

  public createAccessRequest(requesterName: string, requesterEmail: string, requestedRole: UserRole): AccessRequest {
    const newRequest: AccessRequest = {
      id: `req-${Math.random().toString(36).substring(2, 11)}`,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requested_role: requestedRole,
      status: 'pending',
      requested_at: new Date().toISOString()
    };

    this.accessRequests.push(newRequest);

    // Create notifications for superadmins
    const superadmins = this.profiles.filter(p => p.role === 'superadmin');
    superadmins.forEach(admin => {
      this.notifications.push({
        id: `notif-${Math.random().toString(36).substring(2, 11)}`,
        recipient_id: admin.id,
        type: 'access_request',
        title: '🔐 Nueva solicitud de acceso',
        body: `El colaborador ${requesterName} (${requesterEmail}) solicita acceso con rol de ${requestedRole === 'editor' ? 'Editor' : 'Visualizador'}.`,
        is_read: false,
        metadata: { requestId: newRequest.id },
        created_at: new Date().toISOString()
      });
    });

    // Send corporate notification email (Resend API emulation)
    const approveUrl = `/admin/access-requests/${newRequest.id}/approve`;
    const rejectUrl = `/admin/access-requests/${newRequest.id}/reject`;

    const emailBody = `
      <div style="font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; border: 1px solid rgba(108,60,225,0.3); padding: 30px;">
          <h2 style="color: #6c3ce1;">🔐 Solicitud de Acceso — SGTH</h2>
          <p><strong>${requesterName}</strong> (${requesterEmail}) solicita acceso como <strong>${requestedRole.toUpperCase()}</strong>.</p>
          <hr style="border-color: rgba(108,60,225,0.2); margin: 20px 0;" />
          <p>ID de Solicitud: <code style="color: #a855f7;">${newRequest.id}</code></p>
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <a href="${approveUrl}" style="background: #6C3CE1; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 10px; display: inline-block;">Aprobar Acceso</a>
            <a href="${rejectUrl}" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Rechazar</a>
          </div>
          <p style="font-size: 11px; color: #64748b; margin-top: 30px;">Este correo fue generado automáticamente por el SGTH · SGSI Certificado ISO 27001</p>
        </div>
      </div>
    `;

    // Add to Resend Simulated Inbox & Real email delivery
    this.sendEmail(
      'SGTH Sistema <noreply@eveca.co>',
      'talentohumano@eveca.co, wmartinezm360@gmail.com',
      `[SGTH] Nueva solicitud de acceso: ${requesterName}`,
      emailBody
    );

    // Log in audit log
    this.logAuditEvent(
      'ACCESS_REQUEST_CREATED',
      'access_requests',
      newRequest.id,
      null,
      newRequest,
      { id: 'system', email: requesterEmail, full_name: requesterName, role: 'viewer', is_active: false } as any
    );

    this.saveDatabase();
    return newRequest;
  }

  public reviewAccessRequest(requestId: string, status: 'approved' | 'rejected', notes: string, reviewer: Profile): AccessRequest | null {
    const index = this.accessRequests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const req = this.accessRequests[index];
    req.status = status;
    req.reviewed_by = reviewer.id;
    req.review_notes = notes;
    req.reviewed_at = new Date().toISOString();

    if (status === 'approved') {
      // Create profile or activate existing profile
      const existingProfileIndex = this.profiles.findIndex(p => p.email === req.requester_email);
      if (existingProfileIndex !== -1) {
        this.profiles[existingProfileIndex].is_active = true;
        this.profiles[existingProfileIndex].role = req.requested_role;
        this.profiles[existingProfileIndex].approved_at = new Date().toISOString();
        this.profiles[existingProfileIndex].updated_at = new Date().toISOString();
      } else {
        const newProfile: Profile = {
          id: `p-${Math.random().toString(36).substring(2, 11)}`,
          email: req.requester_email,
          full_name: req.requester_name,
          role: req.requested_role,
          is_active: true,
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.profiles.push(newProfile);
      }

      // Send welcome email (Resend simulation)
      const welcomeBody = `
        <div style="font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; border: 1px solid rgba(108,60,225,0.3); padding: 30px;">
            <h2 style="color: #10b981;">✔️ ¡Acceso Aprobado!</h2>
            <p>Hola <strong>${req.requester_name}</strong>,</p>
            <p>Tu solicitud de acceso al SGTH ha sido aprobada con el rol de <strong>${req.requested_role.toUpperCase()}</strong>.</p>
            <p><strong>Comentarios del revisor:</strong> "${notes}"</p>
            <hr style="border-color: rgba(108,60,225,0.2); margin: 20px 0;" />
            <p>Ya puedes iniciar sesión en el portal y acceder a la información de talento humano autorizada bajo los principios de confidencialidad del SGSI.</p>
            <p style="font-size: 11px; color: #64748b; margin-top: 30px;">SGTH · EVECA · SGSI Certificado ISO 27001</p>
          </div>
        </div>
      `;

      this.sendEmail(
        'SGTH Sistema <noreply@eveca.co>',
        req.requester_email,
        `🔐 Bienvenida al SGTH — Tu cuenta ha sido activada`,
        welcomeBody
      );

      // Notification
      this.notifications.push({
        id: `notif-${Math.random().toString(36).substring(2, 11)}`,
        recipient_id: 'p-all', // broadcast or specific
        type: 'system',
        title: 'Nuevo editor activado',
        body: `${req.requester_name} ha sido aprobado como Editor por ${reviewer.full_name}.`,
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Log in audit log
      this.logAuditEvent(
        'ACCESS_REQUEST_APPROVED',
        'access_requests',
        requestId,
        { email: req.requester_email, status: 'pending' },
        { email: req.requester_email, status: 'approved', role: req.requested_role },
        reviewer,
        ['status', 'role'],
        'INFO'
      );
    } else {
      // Rejected
      const rejectBody = `
        <div style="font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; border: 1px solid rgba(239,68,68,0.3); padding: 30px;">
            <h2 style="color: #ef4444;">❌ Solicitud de Acceso Declinada</h2>
            <p>Hola <strong>${req.requester_name}</strong>,</p>
            <p>Lamentamos informarte que tu solicitud de acceso al SGTH ha sido rechazada.</p>
            <p><strong>Motivo del rechazo:</strong> "${notes}"</p>
            <hr style="border-color: rgba(239,68,68,0.2); margin: 20px 0;" />
            <p>Si consideras que esto es un error, por favor ponte en contacto con el Oficial de Seguridad de la Información (CISO) de EVECA.</p>
            <p style="font-size: 11px; color: #64748b; margin-top: 30px;">SGTH · EVECA · SGSI Certificado ISO 27001</p>
          </div>
        </div>
      `;

      this.sendEmail(
        'SGTH Sistema <noreply@eveca.co>',
        req.requester_email,
        `🔐 SGTH — Estado de solicitud de acceso`,
        rejectBody
      );

      // Log in audit log
      this.logAuditEvent(
        'ACCESS_REQUEST_REJECTED',
        'access_requests',
        requestId,
        { email: req.requester_email, status: 'pending' },
        { email: req.requester_email, status: 'rejected', reason: notes },
        reviewer,
        ['status'],
        'WARN'
      );
    }

    this.saveDatabase();
    return req;
  }

  // --- VIEW AGGREGATIONS FOR REALTIME DASHBOARD ---

  public getDashboardKPIs(): any {
    const activeEmps = this.employees.filter(e => e.status === 'activo');
    if (activeEmps.length === 0) {
      return {
        total_employees: 0,
        total_male: 0,
        pct_male: 0,
        total_female: 0,
        pct_female: 0,
        avg_years_in_role: 0,
        pct_unsatisfied: 0,
        absence_rate: 0,
        avg_performance: 0,
        avg_age: 0,
        payroll_millions: 0
      };
    }

    const total = activeEmps.length;
    const male = activeEmps.filter(e => e.gender === 'M').length;
    const female = activeEmps.filter(e => e.gender === 'F').length;

    const sumYears = activeEmps.reduce((acc, e) => acc + e.years_in_role, 0);
    const avgYears = parseFloat((sumYears / total).toFixed(2));

    const unsatisfied = activeEmps.filter(e => !e.is_satisfied).length;
    const pctUnsatisfied = parseFloat((unsatisfied * 100 / total).toFixed(1));

    const sumAbsenceDays = activeEmps.reduce((acc, e) => acc + e.absence_days, 0);
    // absence_rate as absence_days * 100 / 365 (average rate per employee)
    const absenceRate = parseFloat(((sumAbsenceDays / total) * 100 / 365).toFixed(1));

    const sumPerf = activeEmps.reduce((acc, e) => acc + Number(e.performance_score), 0);
    const avgPerf = parseFloat((sumPerf / total).toFixed(2));

    const sumAge = activeEmps.reduce((acc, e) => acc + e.age, 0);
    const avgAge = parseFloat((sumAge / total).toFixed(2));

    const sumSalary = activeEmps.reduce((acc, e) => acc + e.salary, 0);
    const payrollMillions = parseFloat((sumSalary / 1000000).toFixed(2));

    return {
      total_employees: total,
      total_male: male,
      pct_male: parseFloat((male * 100 / total).toFixed(1)),
      total_female: female,
      pct_female: parseFloat((female * 100 / total).toFixed(1)),
      avg_years_in_role: avgYears,
      pct_unsatisfied: pctUnsatisfied,
      absence_rate: absenceRate,
      avg_performance: avgPerf,
      avg_age: avgAge,
      payroll_millions: payrollMillions
    };
  }

  public getByDepartment(): any[] {
    const activeEmps = this.employees.filter(e => e.status === 'activo');
    const result: any[] = [];

    this.departments.forEach(dept => {
      const emps = activeEmps.filter(e => e.department_id === dept.id);
      if (emps.length > 0) {
        const sumSalary = emps.reduce((acc, e) => acc + e.salary, 0);
        result.push({
          department: dept.name,
          total: emps.length,
          avg_salary: Math.round(sumSalary / emps.length)
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }

  public getByAgeGroup(): any[] {
    const activeEmps = this.employees.filter(e => e.status === 'activo');
    const groups = {
      '20-30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      'Más de 60': 0
    };

    activeEmps.forEach(emp => {
      const age = emp.age;
      if (age >= 20 && age <= 30) groups['20-30']++;
      else if (age >= 31 && age <= 40) groups['30-40']++;
      else if (age >= 41 && age <= 50) groups['40-50']++;
      else if (age >= 51 && age <= 60) groups['50-60']++;
      else if (age > 60) groups['Más de 60']++;
    });

    return Object.entries(groups).map(([age_group, total]) => ({
      age_group,
      total
    }));
  }

  public getBySupervisor(): any[] {
    const activeEmps = this.employees.filter(e => e.status === 'activo');
    const supMap = new Map<string, { full_name: string; count: number; perfSum: number }>();

    activeEmps.forEach(emp => {
      if (emp.supervisor_id) {
        const supervisor = this.employees.find(e => e.id === emp.supervisor_id);
        if (supervisor) {
          const key = supervisor.id;
          const current = supMap.get(key) || { full_name: supervisor.full_name, count: 0, perfSum: 0 };
          current.count++;
          current.perfSum += Number(emp.performance_score);
          supMap.set(key, current);
        }
      }
    });

    return Array.from(supMap.values())
      .map(item => ({
        supervisor: item.full_name,
        direct_reports: item.count,
        team_performance: parseFloat((item.perfSum / item.count).toFixed(1))
      }))
      .sort((a, b) => b.direct_reports - a.direct_reports)
      .slice(0, 10);
  }

  public getDeptIndicators(): any[] {
    const activeEmps = this.employees.filter(e => e.status === 'activo');
    const result: any[] = [];

    this.departments.forEach(dept => {
      const emps = activeEmps.filter(e => e.department_id === dept.id);
      if (emps.length > 0) {
        const sumYears = emps.reduce((acc, e) => acc + e.years_in_role, 0);
        const unsatisfied = emps.filter(e => !e.is_satisfied).length;
        const sumAbsenceDays = emps.reduce((acc, e) => acc + e.absence_days, 0);
        const sumPerf = emps.reduce((acc, e) => acc + Number(e.performance_score), 0);
        const sumSalary = emps.reduce((acc, e) => acc + e.salary, 0);

        result.push({
          department: dept.name,
          avg_years: parseFloat((sumYears / emps.length).toFixed(2)),
          pct_unsatisfied: parseFloat((unsatisfied * 100 / emps.length).toFixed(1)),
          absence_rate: parseFloat(((sumAbsenceDays / emps.length) * 100 / 365).toFixed(1)),
          avg_performance: parseFloat((sumPerf / emps.length).toFixed(2)),
          avg_salary: Math.round(sumSalary / emps.length),
          total_payroll: sumSalary
        });
      }
    });

    return result;
  }

  // --- AUTOMATED EVALUATION & ALERT TRIGGER LOGIC (MÓDULO 6.2) ---

  private evaluateAlerts(employee: Employee, triggerUser: Profile) {
    const dept = this.departments.find(d => d.id === employee.department_id);
    const departmentName = dept ? dept.name : 'N/A';

    // 1. Individual Absence days threshold (> 15 days)
    if (employee.absence_days > 15) {
      const alertTitle = '🚨 Alerta de Ausentismo Crítico';
      const alertBody = `El colaborador ${employee.full_name} del departamento ${departmentName} acumula ${employee.absence_days} días de ausencia (Límite crítico: 15 días).`;

      // Create internal notifications for superadmins
      this.createAlertNotification('alert_absence', alertTitle, alertBody, { employeeId: employee.id, absence_days: employee.absence_days });
      
      // Simulate Resend Email
      this.sendSimulatedAlertEmail('absence', employee, `${employee.absence_days} días`, '15 días', departmentName);
    }

    // 2. Individual performance score below threshold (< 5)
    if (employee.performance_score < 5) {
      const alertTitle = '📉 Alerta de Bajo Desempeño';
      const alertBody = `El colaborador ${employee.full_name} de ${departmentName} tiene una evaluación de desempeño crítica de ${employee.performance_score}/10 (Mínimo aceptable: 5.0).`;

      this.createAlertNotification('alert_performance', alertTitle, alertBody, { employeeId: employee.id, performance_score: employee.performance_score });
      this.sendSimulatedAlertEmail('performance', employee, `${employee.performance_score}/10`, '5.0/10', departmentName);
    }

    // 3. Low satisfaction score (satisfaction_score < 6)
    if (employee.satisfaction_score < 6) {
      const alertTitle = '😟 Alerta de Insatisfacción Laboral';
      const alertBody = `El colaborador ${employee.full_name} de ${departmentName} reportó un índice de satisfacción preocupante de ${employee.satisfaction_score}/10.`;

      this.createAlertNotification('system', alertTitle, alertBody, { employeeId: employee.id, satisfaction_score: employee.satisfaction_score });
    }
  }

  private createAlertNotification(type: any, title: string, body: string, metadata: any) {
    const superadmins = this.profiles.filter(p => p.role === 'superadmin');
    superadmins.forEach(admin => {
      this.notifications.push({
        id: `notif-${Math.random().toString(36).substring(2, 11)}`,
        recipient_id: admin.id,
        type,
        title,
        body,
        is_read: false,
        metadata,
        created_at: new Date().toISOString()
      });
    });
  }

  private sendSimulatedAlertEmail(alertType: 'absence' | 'performance', employee: Employee, metric: string, threshold: string, departmentName: string) {
    const isAbsence = alertType === 'absence';
    const emailHtml = `
      <div style="font-family: sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; border: 1px solid ${isAbsence ? '#ef4444' : '#f59e0b'}; padding: 30px;">
          <h2 style="color: ${isAbsence ? '#ef4444' : '#f59e0b'};">${isAbsence ? '⚠️ Alerta de Ausentismo de Personal' : '📉 Alerta de Bajo Desempeño'}</h2>
          <p>Se ha detectado una anomalía métrica en los indicadores del personal bajo los lineamientos del SGSI (Trazabilidad Continua):</p>
          
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${employee.full_name} (${employee.employee_code})</p>
            <p style="margin: 5px 0;"><strong>Departamento:</strong> ${departmentName}</p>
            <p style="margin: 5px 0;"><strong>Métrica Actual:</strong> <span style="color: #ef4444; font-weight: bold;">${metric}</span></p>
            <p style="margin: 5px 0;"><strong>Umbral de Tolerancia:</strong> ${threshold}</p>
          </div>

          <hr style="border-color: rgba(108,60,225,0.2); margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b;">Notificación automática SGTH · EVECA · SGSI Certificado ISO 27001</p>
        </div>
      </div>
    `;

    this.sendEmail(
      'SGTH Alertas <alertas@eveca.co>',
      'talentohumano@eveca.co, wmartinezm360@gmail.com',
      `[ALERTA SGTH] ${isAbsence ? 'Ausentismo Crítico' : 'Desempeño Bajo'}: ${employee.full_name}`,
      emailHtml
    );
  }

  // --- INTELLECTUAL RETENTION & DEVELOPMENT METRICS ---

  public getRetentionAndTrainingStats(): any {
    const activeEmps = this.employees.filter(e => e.status !== 'inactivo');
    const inactiveEmps = this.employees.filter(e => e.status === 'inactivo');

    // 1. Tasa de Rotación (Turnover Rate)
    const exits = inactiveEmps.length;
    const avgHeadcount = activeEmps.length + (exits / 2);
    const turnoverRate = avgHeadcount > 0 ? parseFloat(((exits / avgHeadcount) * 100).toFixed(1)) : 0;

    // Turnover by Department
    const turnoverByDept: any[] = [];
    this.departments.forEach(dept => {
      const activeInDept = activeEmps.filter(e => e.department_id === dept.id).length;
      const inactiveInDept = inactiveEmps.filter(e => e.department_id === dept.id).length;
      const avgHeadcountDept = activeInDept + (inactiveInDept / 2);
      const rate = avgHeadcountDept > 0 ? parseFloat(((inactiveInDept / avgHeadcountDept) * 100).toFixed(1)) : 0;
      turnoverByDept.push({
        departmentId: dept.id,
        departmentName: dept.name,
        active: activeInDept,
        inactive: inactiveInDept,
        turnoverRate: rate
      });
    });

    // 2. Duración Media de Empleabilidad (Tenure)
    const computeMonths = (hireStr: string, endStr?: string) => {
      const start = new Date(hireStr);
      const end = endStr ? new Date(endStr) : new Date('2026-06-25T15:34:57');
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(1, months);
    };

    const activeTenures = activeEmps.map(e => computeMonths(e.hire_date));
    const inactiveTenures = inactiveEmps.map(e => computeMonths(e.hire_date, e.termination_date || e.updated_at));
    
    const allTenures = [...activeTenures, ...inactiveTenures];
    const avgTenureMonths = allTenures.length > 0 ? parseFloat((allTenures.reduce((acc, t) => acc + t, 0) / allTenures.length).toFixed(1)) : 0;
    const avgTenureYears = parseFloat((avgTenureMonths / 12).toFixed(1));

    const avgTenureActiveMonths = activeTenures.length > 0 ? parseFloat((activeTenures.reduce((acc, t) => acc + t, 0) / activeTenures.length).toFixed(1)) : 0;
    const avgTenureInactiveMonths = inactiveTenures.length > 0 ? parseFloat((inactiveTenures.reduce((acc, t) => acc + t, 0) / inactiveTenures.length).toFixed(1)) : 0;

    // 3. Tiempo Promedio en Posición (Years in Role)
    const avgYearsInRole = activeEmps.length > 0 ? parseFloat((activeEmps.reduce((acc, e) => acc + e.years_in_role, 0) / activeEmps.length).toFixed(1)) : 0;
    
    // Average time in role per department
    const avgRoleTimeByDept: any[] = [];
    this.departments.forEach(dept => {
      const emps = activeEmps.filter(e => e.department_id === dept.id);
      const avg = emps.length > 0 ? parseFloat((emps.reduce((acc, e) => acc + e.years_in_role, 0) / emps.length).toFixed(1)) : 0;
      avgRoleTimeByDept.push({
        departmentName: dept.name,
        avgYears: avg
      });
    });

    // 4. Retención del Talento (Talent Retention Rate)
    const startingHeadcount = activeEmps.length + inactiveEmps.length;
    const retentionRate = startingHeadcount > 0 ? parseFloat(((activeEmps.length / startingHeadcount) * 100).toFixed(1)) : 100;

    // Flight Risk Matrix
    const flightRiskEmployees = activeEmps.map(emp => {
      const perf = Number(emp.performance_score || 0);
      const sat = Number(emp.satisfaction_score || 0);
      const riskScore = parseFloat((perf * (10 - sat)).toFixed(1));
      let riskLevel: 'Bajo' | 'Medio' | 'Alto' = 'Bajo';
      if (riskScore >= 45) riskLevel = 'Alto';
      else if (riskScore >= 20) riskLevel = 'Medio';

      const dept = this.departments.find(d => d.id === emp.department_id);
      const pos = this.positions.find(p => p.id === emp.position_id);

      return {
        id: emp.id,
        name: emp.full_name,
        department: dept ? dept.name : 'N/A',
        position: pos ? pos.title : 'N/A',
        performance: perf,
        satisfaction: sat,
        riskScore,
        riskLevel
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    const flightRiskCount = {
      alto: flightRiskEmployees.filter(e => e.riskLevel === 'Alto').length,
      medio: flightRiskEmployees.filter(e => e.riskLevel === 'Medio').length,
      bajo: flightRiskEmployees.filter(e => e.riskLevel === 'Bajo').length
    };

    // 5. Análisis de Desarrollo y Capacitación (Training Analytics)
    const programsCount = this.trainingPrograms.length;
    const enrollmentsCount = this.employeeTrainings.length;
    const completed = this.employeeTrainings.filter(t => t.status === 'completed');
    const completionRate = enrollmentsCount > 0 ? parseFloat(((completed.length / enrollmentsCount) * 100).toFixed(1)) : 0;
    
    const scores = completed.filter(t => typeof t.score === 'number').map(t => t.score as number);
    const avgScore = scores.length > 0 ? parseFloat((scores.reduce((acc, s) => acc + s, 0) / scores.length).toFixed(1)) : 0;

    const totalBudget = this.trainingPrograms.reduce((acc, p) => acc + p.cost, 0);

    // Detailed Programs
    const detailedPrograms = this.trainingPrograms.map(prog => {
      const dept = this.departments.find(d => d.id === prog.department_id);
      const enrolls = this.employeeTrainings.filter(t => t.training_id === prog.id);
      const comps = enrolls.filter(t => t.status === 'completed');
      const inProgs = enrolls.filter(t => t.status === 'in_progress');
      const fails = enrolls.filter(t => t.status === 'failed');
      const pScores = comps.filter(t => typeof t.score === 'number').map(t => t.score as number);
      const pAvgScore = pScores.length > 0 ? parseFloat((pScores.reduce((acc, s) => acc + s, 0) / pScores.length).toFixed(1)) : 0;

      const enrollsDetails = enrolls.map(e => {
        const emp = this.employees.find(x => x.id === e.employee_id);
        const pos = emp ? this.positions.find(p => p.id === emp.position_id) : null;
        return {
          ...e,
          employee_name: emp ? emp.full_name : 'Desconocido',
          employee_position: pos ? pos.title : 'N/A'
        };
      });

      return {
        ...prog,
        departmentName: dept ? dept.name : 'N/A',
        totalEnrollments: enrolls.length,
        completed: comps.length,
        inProgress: inProgs.length,
        failed: fails.length,
        avgScore: pAvgScore,
        enrollments: enrollsDetails
      };
    });

    // Correlation
    const completedEmpIds = new Set(completed.map(t => t.employee_id));
    const empsWithTraining = activeEmps.filter(e => completedEmpIds.has(e.id));
    const empsWithoutTraining = activeEmps.filter(e => !completedEmpIds.has(e.id));

    const avgPerfWithTraining = empsWithTraining.length > 0 
      ? parseFloat((empsWithTraining.reduce((acc, e) => acc + Number(e.performance_score || 0), 0) / empsWithTraining.length).toFixed(2)) 
      : 0;

    const avgPerfWithoutTraining = empsWithoutTraining.length > 0 
      ? parseFloat((empsWithoutTraining.reduce((acc, e) => acc + Number(e.performance_score || 0), 0) / empsWithoutTraining.length).toFixed(2)) 
      : 0;

    return {
      turnoverRate,
      turnoverByDept,
      avgTenureYears,
      avgTenureMonths,
      avgTenureActiveMonths,
      avgTenureInactiveMonths,
      avgYearsInRole,
      avgRoleTimeByDept,
      retentionRate,
      flightRiskEmployees: flightRiskEmployees.slice(0, 10),
      flightRiskCount,
      programsCount,
      enrollmentsCount,
      completionRate,
      avgScore,
      totalBudget,
      detailedPrograms,
      impactAnalysis: {
        avgPerfWithTraining,
        avgPerfWithoutTraining,
        impactPercentage: avgPerfWithoutTraining > 0 
          ? parseFloat((((avgPerfWithTraining - avgPerfWithoutTraining) / avgPerfWithoutTraining) * 100).toFixed(1)) 
          : 0
      }
    };
  }

  // --- TRAZABILIDAD AUDIT EVENT LOGGING (MÓDULO 1.3 / 8.1) ---

  public logAuditEvent(
    action: string,
    table_name?: string,
    record_id?: string,
    old_values?: any,
    new_values?: any,
    user?: Profile | null,
    changed_fields?: string[],
    severity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO'
  ) {
    const newLog: AuditLog = {
      id: `log-${Math.random().toString(36).substring(2, 11)}`,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      changed_fields,
      user_id: user?.id,
      user_email: user?.email || 'unauthenticated@eveca.co',
      user_role: user?.role || 'viewer',
      severity,
      timestamp: new Date().toISOString()
    };

    this.auditLogs.unshift(newLog); // newest first
    this.saveDatabase();
    return newLog;
  }
}

// Singleton instances
export const db = new DatabaseStore();
