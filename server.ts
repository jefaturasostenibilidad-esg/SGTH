/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { db } from './src/lib/db-store';
import ExcelJS from 'exceljs';

const app = express();
const PORT = 3000;

  // Body parser
  app.use(express.json());

  // Simple Session Store simulated in memory
  // In a production app, this would use secure HTTP-only cookies and JWTs.
  // Under SGSI / ISO 27001 rules, we enforce authorization headers.
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const email = authHeader.replace('Bearer ', '');
      const profile = db.profiles.find(p => p.email === email && p.is_active);
      if (profile) {
        (req as any).user = profile;
      }
    }
    next();
  });

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    const profile = db.profiles.find(p => p.email === email);
    if (!profile) {
      // Log login attempt fail (Trazabilidad)
      db.logAuditEvent(
        'LOGIN_FAILED',
        'profiles',
        undefined,
        null,
        { attempted_email: email },
        null,
        undefined,
        'WARN'
      );
      return res.status(401).json({ error: 'Usuario no registrado' });
    }

    if (!profile.is_active) {
      db.logAuditEvent(
        'LOGIN_PENDING',
        'profiles',
        profile.id,
        null,
        { email },
        profile,
        undefined,
        'INFO'
      );
      return res.status(403).json({ error: 'Usuario pendiente de aprobación' });
    }

    // Success login
    db.logAuditEvent(
      'LOGIN_SUCCESS',
      'profiles',
      profile.id,
      null,
      undefined,
      profile,
      undefined,
      'INFO'
    );

    res.json({ user: profile, token: profile.email });
  });

  // Auth: Solicitud de Registro / Acceso
  app.post('/api/auth/register', (req, res) => {
    const { email, full_name, role } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email y nombre completo son requeridos' });
    }

    // Check if request or profile already exists
    const existingReq = db.accessRequests.find(r => r.requester_email === email);
    const existingProfile = db.profiles.find(p => p.email === email);

    if (existingReq && existingReq.status === 'pending') {
      return res.status(400).json({ error: 'Ya tienes una solicitud de acceso pendiente' });
    }

    if (existingProfile && existingProfile.is_active) {
      return res.status(400).json({ error: 'Este correo ya tiene un perfil activo. Por favor inicia sesión.' });
    }

    const accessReq = db.createAccessRequest(full_name, email, role || 'editor');
    res.json({ success: true, request: accessReq });
  });

  // Auth: Get Current Profile
  app.get('/api/auth/me', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado o token expirado' });
    }
    res.json({ user });
  });

  // Employees: Read
  app.get('/api/employees', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Debe iniciar sesión para ver los colaboradores' });
    }

    // Enforce SGSI: Only superadmin and editors see employees
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      // Log unauthorized access attempt (SGSI / ISO 27001)
      db.logAuditEvent(
        'UNAUTHORIZED_READ_ATTEMPT',
        'employees',
        undefined,
        null,
        undefined,
        user,
        undefined,
        'CRITICAL'
      );
      return res.status(403).json({ error: 'No autorizado para visualizar colaboradores' });
    }

    res.json(db.getEmployees(user.role));
  });

  // Employees: Read Single
  app.get('/api/employees/:id', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const emp = db.getEmployeeById(id, user.role);
    if (!emp) return res.status(404).json({ error: 'Colaborador no encontrado' });

    res.json(emp);
  });

  // Employees: Create
  app.post('/api/employees', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    // SGSI Check: Only superadmin or editor can write
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      db.logAuditEvent(
        'UNAUTHORIZED_INSERT_ATTEMPT',
        'employees',
        undefined,
        null,
        req.body,
        user,
        undefined,
        'CRITICAL'
      );
      return res.status(403).json({ error: 'No tienes permisos de escritura' });
    }

    try {
      const newEmp = db.createEmployee(req.body, user);
      res.status(210).json(newEmp);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Employees: Update
  app.put('/api/employees/:id', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    if (user.role !== 'superadmin' && user.role !== 'editor') {
      db.logAuditEvent(
        'UNAUTHORIZED_UPDATE_ATTEMPT',
        'employees',
        id,
        null,
        req.body,
        user,
        undefined,
        'CRITICAL'
      );
      return res.status(403).json({ error: 'No tienes permisos de edición' });
    }

    const updated = db.updateEmployee(id, req.body, user);
    if (!updated) return res.status(404).json({ error: 'Colaborador no encontrado' });

    res.json(updated);
  });

  // Employees: Delete (Soft-delete via Status change as per SGSI, or hard-delete if requested)
  app.delete('/api/employees/:id', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const hard = req.query.hard === 'true';
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    // SGSI: Delete is a critical action.
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      db.logAuditEvent(
        'UNAUTHORIZED_DELETE_ATTEMPT',
        'employees',
        id,
        null,
        undefined,
        user,
        undefined,
        'CRITICAL'
      );
      return res.status(403).json({ error: 'No tienes permisos para dar de baja colaboradores' });
    }

    if (hard) {
      const idx = db.employees.findIndex(e => e.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Colaborador no encontrado' });
      const oldVal = db.employees[idx];
      db.employees.splice(idx, 1);
      
      // Also clean up any enrollments for this employee
      db.employeeTrainings = db.employeeTrainings.filter(t => t.employee_id !== id);

      db.logAuditEvent(
        'DELETE',
        'employees',
        id,
        oldVal,
        null,
        user
      );
      db.saveDatabase();
      res.json({ success: true, message: 'Colaborador eliminado permanentemente de la base de datos' });
    } else {
      const success = db.deleteEmployee(id, user);
      if (!success) return res.status(404).json({ error: 'Colaborador no encontrado' });
      res.json({ success: true, message: 'Colaborador dado de baja correctamente' });
    }
  });

  // Departments List
  app.get('/api/departments', (req, res) => {
    res.json(db.departments);
  });

  // Positions List
  app.get('/api/positions', (req, res) => {
    res.json(db.positions);
  });

  // Audit Logs - Restricted to Superadmin only
  app.get('/api/audit-logs', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    if (user.role !== 'superadmin') {
      db.logAuditEvent(
        'UNAUTHORIZED_LOGS_READ_ATTEMPT',
        'audit_log',
        undefined,
        null,
        undefined,
        user,
        undefined,
        'CRITICAL'
      );
      return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de Superadmin.' });
    }

    // Apply filters
    let logs = [...db.auditLogs];
    const { severity, action, user_email, table_name } = req.query;

    if (severity) {
      logs = logs.filter(l => l.severity === severity);
    }
    if (action) {
      logs = logs.filter(l => l.action.toLowerCase().includes((action as string).toLowerCase()));
    }
    if (user_email) {
      logs = logs.filter(l => l.user_email?.toLowerCase().includes((user_email as string).toLowerCase()));
    }
    if (table_name) {
      logs = logs.filter(l => l.table_name === table_name);
    }

    res.json(logs);
  });

  // Access Requests Management - Superadmin only
  app.get('/api/access-requests', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    res.json(db.accessRequests);
  });

  // Approve/Reject Access Request - Superadmin only
  app.post('/api/access-requests/:id/review', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!user) return res.status(401).json({ error: 'No autorizado' });

    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const reviewed = db.reviewAccessRequest(id, status, notes || '', user);
    if (!reviewed) return res.status(404).json({ error: 'Solicitud no encontrada' });

    res.json(reviewed);
  });

  // User Management Roles - Superadmin only
  app.get('/api/admin/users', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acceso denegado' });

    res.json(db.profiles);
  });

  app.put('/api/admin/users/:id/role', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { role, is_active } = req.body;

    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acceso denegado' });

    const targetUser = db.profiles.find(p => p.id === id);
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    const oldRole = targetUser.role;
    const oldActive = targetUser.is_active;

    if (role !== undefined) targetUser.role = role;
    if (is_active !== undefined) targetUser.is_active = is_active;
    targetUser.updated_at = new Date().toISOString();

    db.logAuditEvent(
      'USER_ROLE_UPDATED',
      'profiles',
      id,
      { role: oldRole, is_active: oldActive },
      { role: targetUser.role, is_active: targetUser.is_active },
      user,
      ['role', 'is_active'],
      'CRITICAL' // Critical security level as per SGSI
    );

    db.saveDatabase();
    res.json(targetUser);
  });

  // Simulated Email Inbox endpoint
  app.get('/api/email/simulated-inbox', (req, res) => {
    res.json(db.emails);
  });

  // Real-time Dashboard Aggregations
  app.get('/api/dashboard/summary', (req, res) => {
    res.json({
      kpis: db.getDashboardKPIs(),
      byDept: db.getByDepartment(),
      byAge: db.getByAgeGroup(),
      bySupervisor: db.getBySupervisor(),
      deptIndicators: db.getDeptIndicators(),
    });
  });

  // Retention & Training Analytics
  app.get('/api/analytics/retention', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    // Enforce SGSI: Only superadmin and editors see analytics
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'No autorizado para visualizar analíticas de retención' });
    }
    res.json(db.getRetentionAndTrainingStats());
  });

  // Create training program
  app.post('/api/training/programs', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { name, description, start_date, end_date, cost, department_id } = req.body;
    if (!name || !start_date || !end_date || cost === undefined || !department_id) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const newProg = {
      id: `train-${Math.random().toString(36).substring(2, 11)}`,
      name,
      description,
      start_date,
      end_date,
      cost: Number(cost),
      department_id,
      created_at: new Date().toISOString()
    };

    db.trainingPrograms.push(newProg);
    db.logAuditEvent(
      'INSERT',
      'training_programs',
      newProg.id,
      null,
      newProg,
      user
    );
    db.saveDatabase();
    res.json(newProg);
  });

  // Enroll employee in training
  app.post('/api/training/enrollments', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { employee_id, training_id, status, score, completion_date } = req.body;
    if (!employee_id || !training_id || !status) {
      return res.status(400).json({ error: 'ID de colaborador, ID de capacitación y estado son requeridos' });
    }

    const idx = db.employeeTrainings.findIndex(t => t.employee_id === employee_id && t.training_id === training_id);
    const newEnrollment = {
      employee_id,
      training_id,
      status: status as any,
      score: score !== undefined && score !== null && score !== '' ? Number(score) : undefined,
      completion_date: completion_date || (status === 'completed' ? new Date().toISOString().split('T')[0] : undefined)
    };

    if (idx !== -1) {
      const oldVal = { ...db.employeeTrainings[idx] };
      db.employeeTrainings[idx] = newEnrollment;
      db.logAuditEvent(
        'UPDATE',
        'employee_trainings',
        `${employee_id}-${training_id}`,
        oldVal,
        newEnrollment,
        user
      );
    } else {
      db.employeeTrainings.push(newEnrollment);
      db.logAuditEvent(
        'INSERT',
        'employee_trainings',
        `${employee_id}-${training_id}`,
        null,
        newEnrollment,
        user
      );
    }

    db.saveDatabase();
    res.json(newEnrollment);
  });

  // Update training program
  app.put('/api/training/programs/:id', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { name, description, start_date, end_date, cost, department_id } = req.body;
    if (!name || !start_date || !end_date || cost === undefined || !department_id) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const idx = db.trainingPrograms.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Programa no encontrado' });

    const oldVal = { ...db.trainingPrograms[idx] };
    const updatedProg = {
      ...oldVal,
      name,
      description,
      start_date,
      end_date,
      cost: Number(cost),
      department_id
    };

    db.trainingPrograms[idx] = updatedProg;
    db.logAuditEvent(
      'UPDATE',
      'training_programs',
      id,
      oldVal,
      updatedProg,
      user
    );
    db.saveDatabase();
    res.json(updatedProg);
  });

  // Delete training program
  app.delete('/api/training/programs/:id', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const idx = db.trainingPrograms.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Programa no encontrado' });

    const oldVal = db.trainingPrograms[idx];
    db.trainingPrograms.splice(idx, 1);

    // Also cascade delete enrollments for this program
    db.employeeTrainings = db.employeeTrainings.filter(t => t.training_id !== id);

    db.logAuditEvent(
      'DELETE',
      'training_programs',
      id,
      oldVal,
      null,
      user
    );
    db.saveDatabase();
    res.json({ success: true, message: 'Programa de capacitación eliminado con éxito' });
  });

  // Delete employee enrollment in training
  app.delete('/api/training/enrollments/:employee_id/:training_id', (req, res) => {
    const user = (req as any).user;
    const { employee_id, training_id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (user.role !== 'superadmin' && user.role !== 'editor') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const idx = db.employeeTrainings.findIndex(t => t.employee_id === employee_id && t.training_id === training_id);
    if (idx === -1) return res.status(404).json({ error: 'Matrícula no encontrada' });

    const oldVal = db.employeeTrainings[idx];
    db.employeeTrainings.splice(idx, 1);

    db.logAuditEvent(
      'DELETE',
      'employee_trainings',
      `${employee_id}-${training_id}`,
      oldVal,
      null,
      user
    );
    db.saveDatabase();
    res.json({ success: true, message: 'Matrícula eliminada con éxito' });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const notifications = db.notifications.filter(n => n.recipient_id === user.id || n.recipient_id === 'p-all');
    res.json(notifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      db.saveDatabase();
    }
    res.json({ success: true });
  });

  // API to fetch connection statuses of Supabase and Resend
  app.get('/api/admin/connections-status', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
    const hasResend = !!process.env.RESEND_API_KEY;
    
    res.json({
      supabase: {
        configured: hasSupabase,
        url: process.env.SUPABASE_URL || null
      },
      resend: {
        configured: hasResend
      }
    });
  });

  // Clear simulated emails or database seed trigger for testing
  app.post('/api/admin/reset-database', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    db['seedDatabase']();
    db.saveDatabase();
    res.json({ success: true, message: 'Base de datos restaurada correctamente' });
  });

  // --- MÓDULO 5.4: 🗄️ BOTÓN "BASE DE DATOS" — Descarga Gerencial con ExcelJS ---
  app.get('/api/admin/export-database', async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(401).send('No autorizado. Token requerido.');
    }

    const user = db.profiles.find(p => p.email === token && p.is_active);
    if (!user || user.role !== 'superadmin') {
      db.logAuditEvent(
        'UNAUTHORIZED_EXPORT_ATTEMPT',
        'employees',
        undefined,
        null,
        { token_attempted: token },
        null,
        undefined,
        'CRITICAL'
      );
      return res.status(403).send('No autorizado. Se requieren privilegios de Superadmin.');
    }

    try {
      console.log(`Generando exportación de Excel para ${user.email}...`);

      const employeesData = db.getEmployees(user.role);
      const kpis = db.getDashboardKPIs();
      const byDept = db.getByDepartment();
      const byAge = db.getByAgeGroup();
      const bySupervisor = db.getBySupervisor();
      const indicators = db.getDeptIndicators();
      const auditLogs = db.auditLogs.slice(0, 500); // last 500 entries

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SGTH — EVECA';
      workbook.lastModifiedBy = user.email;
      workbook.created = new Date();
      workbook.modified = new Date();

      // === HOJA 1: PORTADA EJECUTIVA ===
      const coverSheet = workbook.addWorksheet('📊 Resumen Ejecutivo');
      
      coverSheet.views = [{ showGridLines: false }];
      coverSheet.mergeCells('B2:I4');
      const titleCell = coverSheet.getCell('B2');
      titleCell.value = 'SISTEMA DE GESTIÓN DE TALENTO HUMANO (SGTH)';
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C3CE1' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      coverSheet.mergeCells('B5:I5');
      const subtitleCell = coverSheet.getCell('B5');
      subtitleCell.value = `EVECA · Reporte Gerencial de Seguridad (SGSI ISO 27001) · Generado el ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
      subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      subtitleCell.alignment = { horizontal: 'center' };

      // Add a visual block of KPIs on Cover
      coverSheet.getCell('B7').value = 'Métrica Clave';
      coverSheet.getCell('B7').font = { bold: true };
      coverSheet.getCell('C7').value = 'Valor';
      coverSheet.getCell('C7').font = { bold: true };

      const coverKPIs = [
        ['Total Colaboradores Activos', kpis.total_employees],
        ['Porcentaje de Hombres', `${kpis.pct_male}%`],
        ['Porcentaje de Mujeres', `${kpis.pct_female}%`],
        ['Promedio de Permanencia en Cargo', `${kpis.avg_years_in_role} años`],
        ['Índice de Personal Insatisfecho', `${kpis.pct_unsatisfied}%`],
        ['Tasa Consolidada de Ausentismo', `${kpis.absence_rate}%`],
        ['Promedio de Desempeño General', kpis.avg_performance],
        ['Edad Promedio de la Plantilla', `${kpis.avg_age} años`],
        ['Costo de Nómina Mensual Consolidado', `$ ${kpis.payroll_millions.toFixed(2)} Millones COP`],
        ['Oficial de Seguridad Exportador', user.full_name],
        ['Email de Seguridad', user.email],
      ];

      coverKPIs.forEach((kpi, idx) => {
        const rowNum = 8 + idx;
        coverSheet.getCell(`B${rowNum}`).value = kpi[0];
        coverSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F5FF' } };
        coverSheet.getCell(`B${rowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
        
        coverSheet.getCell(`C${rowNum}`).value = kpi[1];
        coverSheet.getCell(`C${rowNum}`).font = { bold: true, color: { argb: 'FF3C1E8F' } };
        coverSheet.getCell(`C${rowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      });

      // === HOJA 2: BASE MAESTRA DE COLABORADORES ===
      const empSheet = workbook.addWorksheet('👥 Colaboradores');
      const empHeaders = [
        'Código', 'Nombre Completo', 'Género', 'Fecha Nacimiento', 'Edad',
        'Fecha Ingreso', 'Años en Cargo', 'Departamento', 'Cargo', 'Supervisor',
        'Salario', 'Estado', 'Satisfecho', 'Evaluación Desempeño', 'Días Ausencia'
      ];
      
      const empRows = employeesData.map(emp => [
        emp.employee_code,
        emp.full_name,
        emp.gender,
        emp.birth_date,
        emp.age,
        emp.hire_date,
        emp.years_in_role,
        emp.department_name,
        emp.position_title,
        emp.supervisor_name,
        emp.salary,
        emp.status.toUpperCase(),
        emp.is_satisfied ? 'SÍ' : 'NO',
        emp.performance_score,
        emp.absence_days
      ]);
      applyProfessionalTableStyles(empSheet, empHeaders, empRows);

      // Format Salary Column to Currency
      empSheet.getColumn(11).numFmt = '"$"#,##0';

      // === HOJA 3: ANÁLISIS DE DEPARTAMENTOS ===
      const deptSheet = workbook.addWorksheet('🏢 Por Departamento');
      const deptHeaders = ['Nombre Departamento', 'Total Empleados Activos', 'Salario Promedio'];
      const deptRows = byDept.map(d => [d.department, d.total, d.avg_salary]);
      applyProfessionalTableStyles(deptSheet, deptHeaders, deptRows);
      deptSheet.getColumn(3).numFmt = '"$"#,##0';

      // === HOJA 4: ANÁLISIS DE INDICADORES (MÓDULO 4.1 Fila 4) ===
      const indicSheet = workbook.addWorksheet('📊 Tabla Indicadores');
      const indicHeaders = [
        'Departamento', 'Promedio Años Cargo', '% Personal Insatisfecho', 
        'Tasa Ausencia', 'Promedio Evaluación', 'Salario Promedio', 'Costo Nómina Total'
      ];
      const indicRows = indicators.map(i => [
        i.department,
        i.avg_years,
        i.pct_unsatisfied,
        i.absence_rate,
        i.avg_performance,
        i.avg_salary,
        i.total_payroll
      ]);
      applyProfessionalTableStyles(indicSheet, indicHeaders, indicRows);
      
      // format percentages & currencies
      indicSheet.getColumn(2).numFmt = '0.0 "años"';
      indicSheet.getColumn(3).numFmt = '0.0"%"';
      indicSheet.getColumn(4).numFmt = '0.0"%"';
      indicSheet.getColumn(5).numFmt = '0.00';
      indicSheet.getColumn(6).numFmt = '"$"#,##0';
      indicSheet.getColumn(7).numFmt = '"$"#,##0';

      // === HOJA 5: POR GRUPOS DE EDAD ===
      const ageSheet = workbook.addWorksheet('📅 Por Grupo Edad');
      const ageHeaders = ['Grupo Edad', 'Cantidad Colaboradores'];
      const ageRows = byAge.map(a => [a.age_group, a.total]);
      applyProfessionalTableStyles(ageSheet, ageHeaders, ageRows);

      // === HOJA 6: TRAZABILIDAD Y AUDITORÍA (ISO 27001) ===
      const auditSheet = workbook.addWorksheet('🔐 Auditoría SGSI');
      const auditHeaders = [
        'Timestamp', 'Acción', 'Tabla Afectada', 'ID Registro', 
        'Usuario Responsable', 'Rol', 'Severidad', 'Mensaje / Campos Cambiados'
      ];
      const auditRows = auditLogs.map(log => [
        new Date(log.timestamp).toLocaleString('es-CO'),
        log.action,
        log.table_name || 'N/A',
        log.record_id || 'N/A',
        log.user_email || 'System',
        log.user_role || 'N/A',
        log.severity,
        log.changed_fields ? `Campos: ${log.changed_fields.join(', ')}` : (log.new_values?.message || 'Operación registrada')
      ]);
      applyProfessionalTableStyles(auditSheet, auditHeaders, auditRows);

      // Format Severities Red/Orange
      auditSheet.eachRow((row, rowIdx) => {
        if (rowIdx > 1) {
          const sevCell = row.getCell(7);
          if (sevCell.value === 'CRITICAL') {
            sevCell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFF0000' } };
          } else if (sevCell.value === 'WARN') {
            sevCell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFF8C00' } };
          }
        }
      });

      // Write Log
      db.logAuditEvent(
        'DATABASE_EXPORT',
        'all_tables',
        undefined,
        null,
        {
          sheets_exported: 6,
          total_employees: employeesData.length,
          export_timestamp: new Date().toISOString()
        },
        user,
        undefined,
        'WARN' // Every export of data is a WARN level security action
      );

      // Send XLSX Buffer
      const filename = `SGTH_Export_EVECA_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      res.status(500).send(`Error generando el reporte de Excel: ${err.message}`);
    }
  });

  // Helper formatting function for sheets
  function applyProfessionalTableStyles(sheet: ExcelJS.Worksheet, headers: string[], rows: any[][]) {
    // Add Header Row
    const headerRow = sheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3C1E8F' } }; // Corporate Purple
      cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF6C3CE1' } } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add Rows
    rows.forEach((row, idx) => {
      const dataRow = sheet.addRow(row);
      const isEven = idx % 2 === 0;
      dataRow.height = 20;
      dataRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF9F5FF' : 'FFFFFFFF' } }; // Subtle tint
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2D9F5' } } };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Auto-fit Columns
    sheet.columns.forEach(col => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, cell => {
        const valueStr = cell.value ? cell.value.toString() : '';
        if (valueStr.length > maxLen) {
          maxLen = valueStr.length;
        }
      });
      col.width = Math.min(maxLen + 4, 35);
    });

    // Frozen first row and active filters
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    };
  }

  // --- VITE MIDDLEWARE SETUP ---
  const setupViteOrStatic = async () => {
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (err) {
        console.error('Failed to initialize Vite dev server:', err);
      }
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  };

  setupViteOrStatic();

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SGTH Enterprise Server running on port ${PORT}`);
    });
  }

  export default app;
