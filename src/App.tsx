/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Database, 
  Mail, 
  Plus, 
  Search, 
  LogOut, 
  Bell, 
  Settings, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  UserCheck, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Briefcase, 
  Calendar,
  Lock,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import { Employee, Department, Position, Profile, AuditLog, AccessRequest, SimulatedEmail, Notification } from './types';
import { SecurityBadge } from './components/ui/SecurityBadge';
import { RealtimeIndicator } from './components/ui/RealtimeIndicator';
import { KPICard } from './components/dashboard/KPICard';
import { MetricCard } from './components/dashboard/MetricCard';
import { BarChartDept, AgeGroupChart, SupervisorChart, ScatterPlotSueldoEdad } from './components/dashboard/Charts';
import { DeptIndicatorsTable } from './components/dashboard/DeptIndicatorsTable';
import { EmployeeForm } from './components/forms/EmployeeForm';
import { AccessRequests } from './components/admin/AccessRequests';
import { AuditLogView } from './components/admin/AuditLogView';
import { UserRoleManager } from './components/admin/UserRoleManager';
import { DatabasePanel } from './components/admin/DatabasePanel';
import { SimulatedInbox } from './components/email/SimulatedInbox';
import RetentionAnalytics from './components/dashboard/RetentionAnalytics';

export default function App() {
  // Navigation / Auth states
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'admin' | 'emails' | 'retention'>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'requests' | 'roles' | 'audit' | 'database'>('requests');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sgth_sidebar_collapsed') === 'true';
  });

  // Form / Modal states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Database core state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);

  // Sync / loading states
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Search & Filters for Colaboradores list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'editor' | 'viewer'>('editor');
  const [regSuccess, setRegSuccess] = useState(false);

  // 1. Core Data fetching helper
  const fetchAllData = useCallback(async (token: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Base public endpoints (always work if logged in)
      const [deptRes, posRes, summaryRes, notifRes, emailsRes] = await Promise.all([
        fetch('/api/departments', { headers }),
        fetch('/api/positions', { headers }),
        fetch('/api/dashboard/summary', { headers }),
        fetch('/api/notifications', { headers }),
        fetch('/api/email/simulated-inbox', { headers })
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (posRes.ok) setPositions(await posRes.json());
      if (summaryRes.ok) setDashboardSummary(await summaryRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (emailsRes.ok) setEmails(await emailsRes.json());

      // Role controlled endpoints
      const empRes = await fetch('/api/employees', { headers });
      if (empRes.ok) {
        setEmployees(await empRes.json());
      }

      // Superadmin restricted endpoints
      const logsRes = await fetch('/api/audit-logs', { headers });
      if (logsRes.ok) setAuditLogs(await logsRes.json());

      const reqRes = await fetch('/api/access-requests', { headers });
      if (reqRes.ok) setAccessRequests(await reqRes.json());

      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (err) {
      console.error('Error fetching data from fullstack backend', err);
      setIsConnected(false);
    }
  }, []);

  // Check login on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('sgth_token');
    if (savedToken) {
      setAuthToken(savedToken);
      fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${savedToken}` } })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          setCurrentUser(data.user);
          fetchAllData(savedToken);
        })
        .catch(() => {
          localStorage.removeItem('sgth_token');
          setAuthToken(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [fetchAllData]);

  // Handle active sessions loaded
  useEffect(() => {
    if (authToken && currentUser) {
      setLoading(false);

      // Realtime Simulation: update dashboard every 12 seconds to reflect live updates
      const interval = setInterval(() => {
        fetchAllData(authToken);
      }, 12000);

      return () => clearInterval(interval);
    }
  }, [authToken, currentUser, fetchAllData]);

  // Auth: Login action
  const handleLogin = async (email: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error('Failed to parse response JSON:', parseErr);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'Error de comunicación'}`);
      }

      localStorage.setItem('sgth_token', data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      await fetchAllData(data.token);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auth: Register/Request Access
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, full_name: regName, role: regRole })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error('Failed to parse response JSON:', parseErr);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'Error registrando solicitud'}`);
      }

      setRegSuccess(true);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    localStorage.removeItem('sgth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setEmployees([]);
    setAuditLogs([]);
    setAccessRequests([]);
  };

  // Notifications: Mark read
  const handleMarkNotifRead = async (id: string) => {
    if (!authToken) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      // local update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD: Create or Edit employee
  const handleSaveEmployee = async (payload: Partial<Employee>) => {
    if (!authToken || !currentUser) return;

    const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
    const method = editingEmployee ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    let data: any = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error('Failed to parse response JSON:', parseErr);
      }
    }

    if (!res.ok) {
      throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'No se pudo guardar el colaborador'}`);
    }

    // Refresh state
    await fetchAllData(authToken);
    setShowForm(false);
    setEditingEmployee(null);
  };

  // CRUD: Delete / Retire Employee (Soft-delete as per SGSI, or hard-delete)
  const handleDeleteEmployee = async (id: string, hardDelete: boolean) => {
    if (!authToken) return;
    
    setActionLoadingId(id);
    try {
      const url = `/api/employees/${id}?hard=${hardDelete}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) {
        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (e) {
            console.error('Failed to parse error response JSON:', e);
          }
        }
        throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'Error procesando la solicitud'}`);
      }

      await fetchAllData(authToken);
      setEmployeeToDelete(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin: Review Access Request
  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected', notes: string) => {
    if (!authToken) return;
    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/access-requests/${requestId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status, notes })
      });

      if (!res.ok) {
        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (e) {
            console.error('Failed to parse error response JSON:', e);
          }
        }
        throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'Error procesando solicitud'}`);
      }

      await fetchAllData(authToken);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin: Update user profile role / is_active state
  const handleUpdateUserRole = async (userId: string, updates: any) => {
    if (!authToken) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        let data: any = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (e) {
            console.error('Failed to parse error response JSON:', e);
          }
        }
        throw new Error(data.error || `Error del servidor (${res.status}): ${res.statusText || 'Error actualizando usuario'}`);
      }

      await fetchAllData(authToken);
    } catch (err: any) {
      throw err;
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin: Reset database seeds
  const handleResetDatabase = async () => {
    if (!authToken) return;
    const res = await fetch('/api/admin/reset-database', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Error reseteando');
    await fetchAllData(authToken);
  };

  // Admin: Trigger Excel Download directly from standard browser link
  const handleExcelExport = () => {
    if (!authToken) return;
    window.open(`/api/admin/export-database?token=${encodeURIComponent(authToken)}`, '_blank');
  };

  // Search filter implementation for employees list
  const filteredEmployees = React.useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = emp.full_name.toLowerCase().includes(q) || 
                            emp.employee_code.toLowerCase().includes(q) ||
                            (emp.position_title && emp.position_title.toLowerCase().includes(q));
      const matchesDept = filterDept === 'all' || emp.department_id === filterDept;
      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, filterDept, filterStatus]);

  // Count unread alerts/notifications
  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  if (loading) {
    return (
      <div className="bg-[#0B0B1A] min-h-screen text-slate-300 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cargando Sistema de Gestión de Talento</h2>
        <p className="text-xs text-purple-400 mt-1 font-medium">Validando parámetros de seguridad e integridad del SGSI...</p>
      </div>
    );
  }

  // --- RENDERING ROUTE: AUTH (LOGIN & REGISTER) ---
  if (!authToken || !currentUser) {
    return (
      <div className="bg-[#0B0B1A] min-h-screen font-sans text-slate-300 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-purple-950/40 border border-purple-800/40 rounded-2xl shadow-lg mb-2">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
              Sistema de Gestión de Talento (SGTH)
            </h1>
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span>EVECA Corporativo</span>
              <span>·</span>
              <span className="text-emerald-400">ISO 27001</span>
            </p>
          </div>

          {/* Card Frame */}
          <div className="bg-[#13132A] border border-purple-900/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500" />

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{authError}</span>
              </div>
            )}

            {!isRegistering ? (
              /* LOGIN TAB */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white uppercase">Iniciar Sesión de Seguridad</h2>
                  <p className="text-[11px] text-slate-400">Ingrese su correo electrónico institucional para acceder.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="email"
                      id="login-email"
                      placeholder="Correo Corporativo (Ej. editor@eveca.co)"
                      className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white outline-none focus:border-purple-600 font-mono transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLogin((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  </div>

                  <button 
                    onClick={() => {
                      const el = document.getElementById('login-email') as HTMLInputElement;
                      if (el) handleLogin(el.value);
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                  >
                    Ingresar con Llave Corporativa
                  </button>
                </div>



                <div className="text-center pt-2">
                  <button 
                    onClick={() => { setIsRegistering(true); setRegSuccess(false); }}
                    className="text-purple-400 hover:text-purple-300 font-bold text-[11px] underline transition-colors cursor-pointer"
                  >
                    ¿No tienes acceso? Solicita una cuenta de Editor aquí
                  </button>
                </div>
              </div>
            ) : (
              /* ONBOARDING REGISTRATION FORM */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-emerald-400 uppercase">Solicitud de Acceso Corporativo</h2>
                  <p className="text-[11px] text-slate-400">Toda solicitud de onboarding debe ser aprobada por un Superadministrador.</p>
                </div>

                {regSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      ¡Solicitud Registrada con Éxito!
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se ha enviado la solicitud al administrador del sistema, en caso de algún requerimiento o inconveniente con el inicio de sesión comunicarse al correo <strong>talentohumano@eveca.co</strong>
                    </p>
                    <button
                      onClick={() => {
                        setIsRegistering(false);
                        // Auto populate login field to easily test
                        setTimeout(() => {
                          const loginEl = document.getElementById('login-email') as HTMLInputElement;
                          if (loginEl) loginEl.value = regEmail;
                        }, 50);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Regresar a Pantalla de Ingreso
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block mb-1 text-slate-400 font-semibold">Nombre Completo <span className="text-rose-400">*</span></label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Jorge Flores"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-400 font-semibold">Correo Institucional <span className="text-rose-400">*</span></label>
                      <input 
                        type="email" 
                        required
                        placeholder="Ej. jflores@eveca.co"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white font-mono outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-400 font-semibold">Rol Solicitado <span className="text-rose-400">*</span></label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
                      >
                        <option value="editor">Editor de Personal (Editor)</option>
                        <option value="viewer">Solo Lector de Dashboard (Viewer)</option>
                      </select>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRegistering(false)}
                        className="flex-1 py-2 rounded-lg border border-indigo-950 text-slate-400 font-bold hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-white transition-colors cursor-pointer"
                      >
                        Solicitar Acceso
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
          <div className="text-center">
            <SecurityBadge />
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ROUTE: APPLICATION MAIN BOARD (LOGGED IN) ---
  const isSuper = currentUser.role === 'superadmin';
  const isEditor = currentUser.role === 'editor';

  const handleNavigation = (tab: 'dashboard' | 'employees' | 'admin' | 'emails' | 'retention') => {
    setActiveTab(tab);
    setShowForm(false);
    setEditingEmployee(null);
    setSidebarCollapsed(true);
    localStorage.setItem('sgth_sidebar_collapsed', 'true');
  };

  return (
    <div className="bg-[#0B0B1A] min-h-screen font-sans text-slate-300 flex flex-col md:flex-row relative">
      
      {/* 1. LEFT SIDEBAR NAVIGATION (Collapsible, transition supported) */}
      <aside className={`bg-[#13132A] border-r border-purple-900/10 flex flex-col justify-between shrink-0 transition-all duration-300 z-40 ${
        sidebarCollapsed 
          ? 'w-0 h-0 md:w-0 md:h-screen overflow-hidden opacity-0 pointer-events-none border-none' 
          : 'w-full md:w-60 h-auto md:h-screen sticky top-0'
      }`}>
        <div className="flex flex-col">
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-indigo-950 flex items-center justify-between bg-indigo-950/15">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-950/50 border border-purple-800/40 rounded-xl text-purple-400 shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider leading-none">SGTH</span>
                <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest mt-1">EVECA Corp.</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSidebarCollapsed(true);
                  localStorage.setItem('sgth_sidebar_collapsed', 'true');
                }}
                className="p-1 rounded-md border border-purple-900/10 text-slate-400 hover:text-white hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer"
                title="Ocultar menú lateral"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
              </button>
              {/* Connection dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
          </div>

          {/* User Section details */}
          <div className="p-4 border-b border-indigo-950/60 bg-indigo-950/5 text-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-600 font-bold text-xs flex items-center justify-center text-white border border-purple-400/20 shadow-md">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-white text-xs truncate" title={currentUser.full_name}>
                  {currentUser.full_name}
                </span>
                <span className="text-[9px] font-mono text-purple-400 uppercase font-bold tracking-wider mt-0.5" title={currentUser.role}>
                  🛡️ ROL: {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-indigo-950/30'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              Dashboards Analíticos
            </button>

            {/* Rotación y Desarrollo Tab */}
            {(isSuper || isEditor) ? (
              <button
                onClick={() => handleNavigation('retention')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                  activeTab === 'retention'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-indigo-950/30'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                Rotación y Desarrollo
              </button>
            ) : (
              <div className="px-4 py-3 text-slate-600 flex items-center gap-3 select-none text-[10px] uppercase font-bold tracking-wider" title="Requiere rol Editor o Superadmin">
                <TrendingUp className="w-4 h-4 text-slate-700 shrink-0" />
                Rotación y Desarrollo (Protegido)
              </div>
            )}

            {/* Editor-restricted Tab */}
            {(isSuper || isEditor) ? (
              <button
                onClick={() => handleNavigation('employees')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                  activeTab === 'employees'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-indigo-950/30'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                Colaboradores ({employees.length})
              </button>
            ) : (
              <div className="px-4 py-3 text-slate-600 flex items-center gap-3 select-none text-[10px]">
                <Users className="w-4 h-4 text-slate-700" />
                Colaboradores (Bloqueado)
              </div>
            )}

            {/* Superadmin Console Tab */}
            {isSuper ? (
              <button
                onClick={() => handleNavigation('admin')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-indigo-950/30'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                Consola Admin
              </button>
            ) : (
              <div className="px-4 py-3 text-slate-600 flex items-center gap-3 select-none text-[10px]" title="Requiere rol Superadmin">
                <Lock className="w-4 h-4 text-slate-700" />
                Consola Admin (Protegida)
              </div>
            )}

            {/* Simulated Email Sandbox Link */}
            <button
              onClick={() => handleNavigation('emails')}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                activeTab === 'emails'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-indigo-950/30'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              Resend Sandbox
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar info */}
        <div className="p-4 border-t border-indigo-950 flex flex-col gap-3">
          <SecurityBadge />
          
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-xl bg-rose-950/15 hover:bg-rose-900/30 text-rose-400 font-bold text-xs uppercase tracking-wider border border-rose-950 hover:border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 min-w-0 p-5 md:p-8 space-y-6 overflow-y-auto h-auto md:h-screen">
        
        {/* Top Header Row with status & alerts bell */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-950/60 pb-5">
          <div className="flex items-start gap-3.5">
            {/* Sidebar toggle button (accessible from any view) */}
            <button
              onClick={() => {
                setSidebarCollapsed(prev => {
                  const newVal = !prev;
                  localStorage.setItem('sgth_sidebar_collapsed', String(newVal));
                  return newVal;
                });
              }}
              className="p-2.5 rounded-xl border bg-[#13132A] border-purple-900/20 text-slate-400 hover:text-white hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0 mt-0.5"
              title={sidebarCollapsed ? "Mostrar Menú" : "Ocultar Menú"}
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-tight">
                {activeTab === 'dashboard' && 'Administración de Talento Humano'}
                {activeTab === 'retention' && 'Rotación y Desarrollo Organizacional'}
                {activeTab === 'employees' && 'Directorio de Colaboradores'}
                {activeTab === 'admin' && 'Consola de Control de Seguridad (SGSI)'}
                {activeTab === 'emails' && 'Servicio Corporativo de Notificación por Email'}
              </h1>
              <p className="text-xs text-purple-400 font-medium">
                {activeTab === 'dashboard' && 'Análisis corporativo en tiempo real e índices organizacionales'}
                {activeTab === 'retention' && 'Medición inteligente de rotación, retención, planes de capacitación y matriz de riesgo de fuga'}
                {activeTab === 'employees' && 'Gestión activa, contratos, salarios, ausentismos y evaluaciones'}
                {activeTab === 'admin' && 'Administre accesos directos, bitácora de auditorías y exportaciones de nómina'}
                {activeTab === 'emails' && 'Verifique el despacho inalterable de correos corporativos salientes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <RealtimeIndicator connected={isConnected} lastUpdate={lastUpdate} />

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  unreadNotificationsCount > 0 
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-400' 
                    : 'bg-[#13132A] border-purple-900/20 text-slate-400 hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold leading-none animate-bounce">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification drop-down panel */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-[#13132A] border border-purple-900/30 rounded-xl shadow-2xl p-4 space-y-3 z-50 max-h-96 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
                      <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
                        Alertas de Seguridad
                      </span>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white text-xs font-bold"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="space-y-2.5 divide-y divide-indigo-950/50 text-[11px] font-semibold">
                      {notifications.map((n) => (
                        <div key={n.id} className={`pt-2 flex flex-col gap-1 ${n.is_read ? 'opacity-55' : ''}`}>
                          <div className="flex justify-between items-start gap-1">
                            <span className={`text-[10px] font-bold uppercase ${
                              n.type === 'alert_absence' ? 'text-rose-400' : 'text-purple-400'
                            }`}>
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <button
                                onClick={() => handleMarkNotifRead(n.id)}
                                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                              >
                                Marcar leído
                              </button>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs font-sans leading-snug">{n.body}</p>
                          <span className="text-[9px] text-slate-500 font-mono text-right">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}

                      {notifications.length === 0 && (
                        <div className="p-4 text-center text-slate-500 font-sans">
                          No hay alertas críticas en la sesión actual.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* --- VIEW ROUTING: TAB 1: DASHBOARD --- */}
        {activeTab === 'dashboard' && dashboardSummary && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* KPI Cards — Fila 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard 
                label="Personal Masculino" 
                value={`${dashboardSummary.kpis.pct_male}%`} 
                subValue={dashboardSummary.kpis.total_male} 
                icon="👨" 
                color="purple" 
              />
              <KPICard 
                label="Personal Femenino" 
                value={`${dashboardSummary.kpis.pct_female}%`} 
                subValue={dashboardSummary.kpis.total_female} 
                icon="👩" 
                color="purple" 
              />
              <KPICard 
                label="Permanencia Promedio" 
                value={dashboardSummary.kpis.avg_years_in_role} 
                suffix=" años" 
                icon="⏱" 
                color="gold" 
              />
              <KPICard 
                label="Personal Insatisfecho" 
                value={`${dashboardSummary.kpis.pct_unsatisfied}%`} 
                icon="😟" 
                color={dashboardSummary.kpis.pct_unsatisfied > 40 ? 'red' : 'orange'} 
                alert={dashboardSummary.kpis.pct_unsatisfied > 40} 
              />
              <KPICard 
                label="Tasa de Ausentismo" 
                value={`${dashboardSummary.kpis.absence_rate}%`} 
                icon="🔴" 
                color={dashboardSummary.kpis.absence_rate > 8 ? 'red' : 'blue'} 
                alert={dashboardSummary.kpis.absence_rate > 8} 
              />
            </div>

            {/* Métricas secundarias — Fila 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard 
                label="Promedio Evaluación de Desempeño" 
                value={`${dashboardSummary.kpis.avg_performance} / 10`} 
              />
              <MetricCard 
                label="Edad Promedio de Personal" 
                value={`${dashboardSummary.kpis.avg_age} años`} 
              />
              <MetricCard 
                label="Costo de Planilla Consolidado" 
                value={`$ ${dashboardSummary.kpis.payroll_millions.toFixed(1)}M COP`} 
                icon="💰" 
              />
            </div>

            {/* Gráficos — Fila 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarChartDept data={dashboardSummary.byDept} />
              <AgeGroupChart data={dashboardSummary.byAge} />
              <SupervisorChart data={dashboardSummary.bySupervisor} />
              <ScatterPlotSueldoEdad employees={employees} />
            </div>

            {/* Tabla de indicadores — Fila 4 */}
            <DeptIndicatorsTable data={dashboardSummary.deptIndicators} />
          </motion.div>
        )}

        {/* --- VIEW ROUTING: TAB 2: EMPLOYEES DIRECTORY --- */}
        {activeTab === 'employees' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Show Form OR Main List Grid */}
            {showForm ? (
              <EmployeeForm
                initialData={editingEmployee}
                onSave={handleSaveEmployee}
                onCancel={() => { setShowForm(false); setEditingEmployee(null); }}
                departments={departments}
                positions={positions}
                employees={employees}
              />
            ) : (
              /* DIRECTORY VIEW LIST */
              <div className="space-y-4">
                {/* Search & Filter actions */}
                <div className="bg-[#13132A] p-4 border border-purple-900/10 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Buscar por código, nombre o cargo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white outline-none focus:border-purple-600 transition-colors placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs font-semibold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>Rol:</span>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 font-sans cursor-pointer"
                      >
                        <option value="all">Todos los Roles</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Estado:</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 font-sans cursor-pointer"
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo / Retirado</option>
                        <option value="vacaciones">Vacaciones</option>
                        <option value="licencia">Licencias</option>
                      </select>
                    </div>

                    <button
                      onClick={() => { setEditingEmployee(null); setShowForm(true); }}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md hover:shadow-purple-500/10 cursor-pointer text-xs uppercase shrink-0 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Empleado
                    </button>
                  </div>
                </div>

                {/* Grid layout cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEmployees.map((emp) => {
                    const isUnsatisfied = emp.satisfaction_score < 6;
                    const isAbsenceHigh = emp.absence_days > 15;
                    const isLoading = actionLoadingId === emp.id;

                    return (
                      <div 
                        key={emp.id}
                        className={`p-5 rounded-xl border bg-[#13132A] border-purple-900/15 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:border-purple-600/30 shadow-md ${
                          emp.status === 'inactivo' ? 'opacity-60 bg-[#0B0B1A]/80' : ''
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Top row */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-full bg-purple-900/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-800/20 shadow-inner">
                                {emp.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-1">
                                  {emp.full_name}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-400 font-semibold">{emp.employee_code}</span>
                              </div>
                            </div>
                            
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              emp.status === 'activo' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : emp.status === 'vacaciones'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : emp.status === 'licencia'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {emp.status}
                            </span>
                          </div>

                          {/* Mid info lines */}
                          <div className="border-t border-b border-indigo-950/60 py-3 text-xs space-y-2 text-slate-400 font-semibold">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Cargo:
                              </span>
                              <span className="text-white truncate max-w-[150px]" title={emp.position_title}>
                                {emp.position_title}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Área:
                              </span>
                              <span className="text-slate-200">{emp.department_name}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Ingreso:
                              </span>
                              <span className="font-mono text-slate-300">{new Date(emp.hire_date).toLocaleDateString()}</span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-indigo-950/20">
                              <span className="text-[10px] text-slate-500">Salario Mensual:</span>
                              <span className="font-mono text-emerald-400 font-extrabold text-sm">
                                $ {emp.salary.toLocaleString('es-CO')}
                              </span>
                            </div>
                          </div>

                          {/* Scores bottom bars */}
                          <div className="grid grid-cols-2 gap-3.5 text-[10px] font-bold">
                            <div className="space-y-1 p-2 rounded-lg bg-indigo-950/20 border border-indigo-950">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Satisfacción:</span>
                                <span className={isUnsatisfied ? 'text-rose-400' : 'text-emerald-400'}>
                                  {emp.satisfaction_score}/10
                                </span>
                              </div>
                              <div className="w-full bg-[#0B0B1A] h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isUnsatisfied ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${emp.satisfaction_score * 10}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1 p-2 rounded-lg bg-indigo-950/20 border border-indigo-950">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Desempeño:</span>
                                <span className={emp.performance_score >= 8 ? 'text-emerald-400' : emp.performance_score >= 5 ? 'text-amber-400' : 'text-rose-400'}>
                                  {emp.performance_score}/10
                                </span>
                              </div>
                              <div className="w-full bg-[#0B0B1A] h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    emp.performance_score >= 8 ? 'bg-emerald-500' : emp.performance_score >= 5 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} 
                                  style={{ width: `${emp.performance_score * 10}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* High absence alert indicator */}
                          {isAbsenceHigh && (
                            <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-[9px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Días Ausente: {emp.absence_days} / 15 (Umbral Crítico Excedido)
                            </div>
                          )}
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-2.5 pt-4 border-t border-indigo-950/60 mt-4">
                          <button
                            disabled={isLoading}
                            onClick={() => setViewingEmployee(emp)}
                            className="flex-1 py-2 text-[10px] uppercase font-extrabold text-slate-400 hover:text-white bg-indigo-950/30 border border-indigo-900/40 hover:bg-indigo-950/60 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Ficha
                          </button>
                          
                          <button
                            disabled={isLoading}
                            onClick={() => { setEditingEmployee(emp); setShowForm(true); }}
                            className="p-2 text-indigo-400 hover:text-white bg-indigo-950/30 border border-indigo-900/40 hover:bg-indigo-950/60 rounded-lg transition-all cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={isLoading}
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-2 text-rose-500 hover:text-rose-400 bg-rose-950/10 border border-rose-950 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                            title="Eliminar o dar de baja"
                          >
                            {actionLoadingId === emp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <div className="col-span-1 md:col-span-3 p-12 text-center border border-dashed border-indigo-950/80 rounded-xl">
                      <Users className="w-10 h-10 text-indigo-950 mx-auto mb-2.5" />
                      <p className="text-sm font-semibold">No se encontraron colaboradores con los criterios seleccionados.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- VIEW ROUTING: TAB 3: ADMIN CONSOLE --- */}
        {activeTab === 'admin' && isSuper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Admin Internal SubTabs selectors */}
            <div className="flex border-b border-indigo-950 gap-2 shrink-0 overflow-x-auto text-xs font-bold uppercase tracking-wider pb-px">
              <button
                onClick={() => setAdminSubTab('requests')}
                className={`py-2 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  adminSubTab === 'requests' 
                    ? 'border-purple-500 text-purple-400 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Solicitudes de Acceso
              </button>
              <button
                onClick={() => setAdminSubTab('roles')}
                className={`py-2 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  adminSubTab === 'roles' 
                    ? 'border-purple-500 text-purple-400 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Roles y Permisos (RBAC)
              </button>
              <button
                onClick={() => setAdminSubTab('audit')}
                className={`py-2 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  adminSubTab === 'audit' 
                    ? 'border-purple-500 text-purple-400 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Bitácora de Auditoría
              </button>
              <button
                onClick={() => setAdminSubTab('database')}
                className={`py-2 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  adminSubTab === 'database' 
                    ? 'border-purple-500 text-purple-400 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                🗄️ Centro de Datos
              </button>
            </div>

            {/* SubTab Views rendering */}
            <div className="pt-2">
              {adminSubTab === 'requests' && (
                <AccessRequests
                  requests={accessRequests}
                  onReview={handleReviewRequest}
                  loadingId={actionLoadingId}
                />
              )}

              {adminSubTab === 'roles' && (
                <UserRoleManager
                  users={auditLogs.reduce((acc: Profile[], curr) => {
                    // Assemble a unique list of profiles or fetch from state
                    return acc;
                  }, [])} // Fallback using active profiles fetched dynamically
                  onUpdateUser={handleUpdateUserRole}
                  loadingId={actionLoadingId}
                />
              )}

              {adminSubTab === 'roles' && (
                /* Fallback loading the user database dynamically */
                <UserRoleManager
                  users={departments.reduce((acc: Profile[], curr) => {
                    // Let's call /api/admin/users in full effect
                    return acc;
                  }, [])}
                  onUpdateUser={handleUpdateUserRole}
                  loadingId={actionLoadingId}
                />
              )}

              {/* Injected dynamically below */}
              {adminSubTab === 'roles' && (
                <UsersDatabaseLoader onUpdateUser={handleUpdateUserRole} loadingId={actionLoadingId} token={authToken} />
              )}

              {adminSubTab === 'audit' && (
                <AuditLogView
                  logs={auditLogs}
                  onRefresh={() => fetchAllData(authToken)}
                  loading={loading}
                />
              )}

              {adminSubTab === 'database' && (
                <DatabasePanel
                  onExport={handleExcelExport}
                  onReset={handleResetDatabase}
                  employeeCount={employees.length}
                  auditCount={auditLogs.length}
                  requestCount={accessRequests.length}
                  emailCount={emails.length}
                  authToken={authToken}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* --- VIEW ROUTING: TAB 4: EMAILS (RESEND INBOX SANDBOX) --- */}
        {activeTab === 'emails' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-400" />
                  Buzón de Despacho (Simulador de Resend Corporativo)
                </h2>
                <p className="text-xs text-purple-400">Verifique las plantillas HTML renderizadas para bienvenida, solicitudes de acceso y alertas de umbrales.</p>
              </div>
            </div>

            <SimulatedInbox
              emails={emails}
              onRefresh={() => fetchAllData(authToken)}
              loading={loading}
            />
          </motion.div>
        )}

        {/* --- VIEW ROUTING: TAB 5: RETENTION & DEVELOPMENT ANALYTICS --- */}
        {activeTab === 'retention' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <RetentionAnalytics 
              token={authToken || ''} 
              departments={departments}
              employees={employees}
              onRefreshData={() => fetchAllData(authToken)}
            />
          </motion.div>
        )}
      </main>

      {/* --- FLOATING LIGHTBOX MODAL: FICHA DE COLABORADOR (DETALLE) --- */}
      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#13132A] border border-purple-900/30 rounded-2xl p-6 shadow-2xl max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#6C3CE1]" />

              <button 
                onClick={() => setViewingEmployee(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-5">
                {/* Header detail */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-indigo-950">
                  <div className="w-12 h-12 rounded-full bg-purple-900/20 text-purple-400 font-extrabold text-sm flex items-center justify-center border border-purple-800/20 shadow-inner">
                    {viewingEmployee.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{viewingEmployee.full_name}</h3>
                    <p className="text-xs text-purple-400 font-mono font-bold">{viewingEmployee.employee_code} · {viewingEmployee.gender === 'M' ? 'Masculino' : viewingEmployee.gender === 'F' ? 'Femenino' : 'Otro'}</p>
                  </div>
                </div>

                {/* Grid details metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Rol</span>
                    <strong className="text-white font-bold text-sm block mt-0.5">{viewingEmployee.department_name}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Cargo Organizacional</span>
                    <strong className="text-purple-300 font-bold text-sm block mt-0.5 truncate" title={viewingEmployee.position_title}>{viewingEmployee.position_title}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Salario Mensual</span>
                    <strong className="text-emerald-400 font-extrabold text-sm block mt-0.5 font-mono">$ {viewingEmployee.salary.toLocaleString('es-CO')}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Estado Contrato</span>
                    <strong className="text-slate-200 font-bold text-sm block mt-0.5 capitalize">{viewingEmployee.status}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Fecha de Nacimiento</span>
                    <strong className="text-slate-300 font-bold text-sm block mt-0.5 font-mono">{viewingEmployee.birth_date} ({viewingEmployee.age} años)</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Fecha Ingreso</span>
                    <strong className="text-slate-300 font-bold text-sm block mt-0.5 font-mono">{viewingEmployee.hire_date} ({viewingEmployee.years_in_role} años cargo)</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase">Supervisor Directo</span>
                    <strong className="text-slate-200 font-bold text-xs block mt-0.5">{viewingEmployee.supervisor_name || 'Gerencia General'}</strong>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold text-rose-400">Días Ausencia Acumulados</span>
                    <strong className="text-rose-400 font-extrabold text-sm block mt-0.5 font-mono">{viewingEmployee.absence_days} inasistencias</strong>
                  </div>
                </div>

                {/* Bottom stats indicators */}
                <div className="bg-indigo-950/25 border border-indigo-950 p-4 rounded-xl space-y-3.5 text-xs font-bold">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Índice Clima y Satisfacción Laboral</span>
                      <span className={viewingEmployee.satisfaction_score >= 6 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}>
                        {viewingEmployee.satisfaction_score} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#0B0B1A] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${viewingEmployee.satisfaction_score >= 6 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${viewingEmployee.satisfaction_score * 10}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Evaluación de Desempeño Consolidada</span>
                      <span className={viewingEmployee.performance_score >= 8 ? 'text-emerald-400' : viewingEmployee.performance_score >= 5 ? 'text-amber-400' : 'text-rose-400'}>
                        {viewingEmployee.performance_score} / 10
                      </span>
                    </div>
                    <div className="w-full bg-[#0B0B1A] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          viewingEmployee.performance_score >= 8 ? 'bg-emerald-500' : viewingEmployee.performance_score >= 5 ? 'bg-amber-500' : 'bg-rose-500'
                        }`} 
                        style={{ width: `${viewingEmployee.performance_score * 10}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="text-[10px] text-slate-500 italic text-center">
                  Registro de colaborador resguardado bajo cifrado SGSI de EVECA.
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {employeeToDelete && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#13132A] border border-purple-900/30 rounded-2xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden space-y-5"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-indigo-500 to-rose-500" />

              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 bg-rose-950/40 border border-rose-900/40 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-white tracking-wider">
                    ¿Cómo desea proceder con la baja?
                  </h3>
                  <p className="text-[10px] text-slate-400">Colaborador: <strong className="text-slate-200">{employeeToDelete.full_name}</strong></p>
                </div>
              </div>

              <div className="text-xs space-y-2.5 text-slate-400 leading-relaxed">
                <p>
                  De acuerdo con las directrices de seguridad de la información (<strong>SGSI / ISO 27001</strong>), tiene dos opciones para procesar este registro:
                </p>
                <div className="space-y-1.5 bg-[#0B0B1A]/60 p-3 rounded-xl border border-indigo-950/60 font-medium">
                  <p>
                    🔵 <strong className="text-indigo-400">Baja Lógica (Recomendado)</strong>: Cambia el estado a <span className="text-rose-400">Inactivo</span>. Conserva todo el historial del colaborador, contratos, capacitaciones y bitácoras para futuras auditorías de cumplimiento.
                  </p>
                  <p className="border-t border-indigo-950/40 pt-1.5 mt-1.5">
                    🔴 <strong className="text-rose-400">Eliminar Definitivamente (Físico)</strong>: Borra permanentemente el registro de la base de datos junto con todos sus expedientes. Esta acción es irreversible y no conservará históricos de auditoría detallados.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  disabled={actionLoadingId !== null}
                  onClick={() => setEmployeeToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-950 text-slate-400 hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer flex-1"
                >
                  Cancelar
                </button>
                <button
                  disabled={actionLoadingId !== null}
                  onClick={() => handleDeleteEmployee(employeeToDelete.id, false)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 text-xs font-bold transition-all cursor-pointer flex-1 flex items-center justify-center gap-1"
                >
                  {actionLoadingId === employeeToDelete.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Baja Lógica'
                  )}
                </button>
                <button
                  disabled={actionLoadingId !== null}
                  onClick={() => handleDeleteEmployee(employeeToDelete.id, true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex-1 flex items-center justify-center gap-1"
                >
                  {actionLoadingId === employeeToDelete.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Borrar Físico'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponent helper to load profiles dynamically from the back-end via auth credentials
function UsersDatabaseLoader({ token, onUpdateUser, loadingId }: { token: string | null; onUpdateUser: any; loadingId: string | null }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        setFetching(false);
      })
      .catch(err => {
        console.error('Error fetching profiles', err);
        setFetching(false);
      });
  }, [token, loadingId]);

  if (fetching) return <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto my-6" />;

  return (
    <UserRoleManager
      users={profiles}
      onUpdateUser={onUpdateUser}
      loadingId={loadingId}
    />
  );
}
