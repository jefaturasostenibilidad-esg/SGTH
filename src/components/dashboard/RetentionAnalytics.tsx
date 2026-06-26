/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Award, 
  Clock, 
  Users, 
  AlertTriangle, 
  Plus, 
  Search, 
  Briefcase, 
  Building, 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  DollarSign, 
  Filter, 
  Calendar,
  Loader2,
  ChevronRight,
  Info,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Employee, Department } from '../../types';

interface RetentionAnalyticsProps {
  token: string;
  departments: Department[];
  employees: Employee[];
  onRefreshData?: () => void;
}

export default function RetentionAnalytics({ token, departments, employees, onRefreshData }: RetentionAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tab within analytics: 'retention' or 'training'
  const [subTab, setSubTab] = useState<'retention' | 'training'>('retention');

  // Search filter for flight risk list
  const [flightRiskSearch, setFlightRiskSearch] = useState('');
  
  // State for creating a new program
  const [showNewProgramModal, setShowNewProgramModal] = useState(false);
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programCost, setProgramCost] = useState('');
  const [programStartDate, setProgramStartDate] = useState('');
  const [programEndDate, setProgramEndDate] = useState('');
  const [programDeptId, setProgramDeptId] = useState('');
  const [isSubmittingProgram, setIsSubmittingProgram] = useState(false);

  // State for enrolling an employee
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'enrolled' | 'in_progress' | 'completed' | 'failed'>('enrolled');
  const [enrollScore, setEnrollScore] = useState('');
  const [enrollCompletionDate, setEnrollCompletionDate] = useState('');
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);

  // Program editing and display states
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  // Load analytics stats from server
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/analytics/retention', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Error al obtener datos de analíticas');
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudieron cargar las analíticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName || !programStartDate || !programEndDate || !programCost || !programDeptId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setIsSubmittingProgram(true);
      const url = editingProgramId ? `/api/training/programs/${editingProgramId}` : '/api/training/programs';
      const method = editingProgramId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: programName,
          description: programDescription,
          start_date: programStartDate,
          end_date: programEndDate,
          cost: parseFloat(programCost),
          department_id: programDeptId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar el programa');
      }

      setShowNewProgramModal(false);
      setEditingProgramId(null);
      // Reset form
      setProgramName('');
      setProgramDescription('');
      setProgramCost('');
      setProgramStartDate('');
      setProgramEndDate('');
      setProgramDeptId('');
      
      // Refresh stats
      await fetchStats();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingProgram(false);
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ ADVERTENCIA: ¿Está seguro de que desea eliminar permanentemente el curso "${name}"? Esto también eliminará de manera definitiva todos los registros de calificaciones y matrículas para este curso.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/training/programs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar programa');
      }

      await fetchStats();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteEnrollment = async (employeeId: string, trainingId: string, employeeName: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente la matrícula/inscripción de ${employeeName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/training/enrollments/${employeeId}/${trainingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar matrícula');
      }

      await fetchStats();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEnrollEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId || !selectedEmployeeId || !enrollStatus) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      setIsSubmittingEnroll(true);
      const res = await fetch('/api/training/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          training_id: selectedProgramId,
          status: enrollStatus,
          score: enrollScore ? parseFloat(enrollScore) : null,
          completion_date: enrollCompletionDate || null
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al registrar matrícula');
      }

      setShowEnrollModal(false);
      // Reset form
      setSelectedEmployeeId('');
      setEnrollStatus('enrolled');
      setEnrollScore('');
      setEnrollCompletionDate('');
      
      // Refresh stats
      await fetchStats();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const handleEditProgramClick = (prog: any) => {
    setEditingProgramId(prog.id);
    setProgramName(prog.name);
    setProgramDescription(prog.description || '');
    setProgramCost(String(prog.cost));
    setProgramStartDate(prog.start_date);
    setProgramEndDate(prog.end_date);
    setProgramDeptId(prog.department_id);
    setShowNewProgramModal(true);
  };

  const handleNewProgramClick = () => {
    setEditingProgramId(null);
    setProgramName('');
    setProgramDescription('');
    setProgramCost('');
    setProgramStartDate('');
    setProgramEndDate('');
    setProgramDeptId('');
    setShowNewProgramModal(true);
  };

  const handleEditEnrollmentClick = (enroll: any, progId: string) => {
    setSelectedProgramId(progId);
    setSelectedEmployeeId(enroll.employee_id);
    setEnrollStatus(enroll.status);
    setEnrollScore(enroll.score !== undefined && enroll.score !== null ? String(enroll.score) : '');
    setEnrollCompletionDate(enroll.completion_date || '');
    setShowEnrollModal(true);
  };

  const handleNewEnrollmentClick = () => {
    setSelectedProgramId('');
    setSelectedEmployeeId('');
    setEnrollStatus('enrolled');
    setEnrollScore('');
    setEnrollCompletionDate('');
    setShowEnrollModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-sm font-mono text-slate-400">Calculando indicadores avanzados de talento...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-[#13132A] border border-red-500/20 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error en el cálculo de analíticas</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {error || 'Hubo un error calculando los índices de rotación e indicadores organizacionales.'}
        </p>
        <button 
          onClick={fetchStats}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Reintentar Cálculo
        </button>
      </div>
    );
  }

  // Formatting currency
  const formatCurrency = (val: number) => {
    return `$ ${val.toLocaleString('es-CO')}`;
  };

  const chartColors = ['#6C3CE1', '#06B6D4', '#F5A623', '#10B981', '#EC4899', '#8B5CF6'];

  // Flight Risk List filtered
  const filteredFlightRisk = stats.flightRiskEmployees.filter((emp: any) => 
    emp.name.toLowerCase().includes(flightRiskSearch.toLowerCase()) ||
    emp.department.toLowerCase().includes(flightRiskSearch.toLowerCase()) ||
    emp.position.toLowerCase().includes(flightRiskSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex border-b border-indigo-950/60 pb-px">
        <button
          onClick={() => setSubTab('retention')}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            subTab === 'retention'
              ? 'border-purple-500 text-white bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Rotación y Retención del Talento
        </button>
        <button
          onClick={() => setSubTab('training')}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            subTab === 'training'
              ? 'border-purple-500 text-white bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Desarrollo y Capacitaciones
        </button>
      </div>

      {/* Subtab Content: RETENTION & TURNOVER */}
      {subTab === 'retention' && (
        <div className="space-y-6">
          {/* Key KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tasa de Retención</span>
                  <h3 className="text-3xl font-extrabold text-emerald-400 mt-1 font-sans">{stats.retentionRate}%</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">Excelente</span>
                <span>índice de estabilidad organizacional</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tasa de Rotación Anual</span>
                  <h3 className="text-3xl font-extrabold text-purple-400 mt-1 font-sans">{stats.turnoverRate}%</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span className="text-purple-400 font-bold">Fórmula Inteligente</span>
                <span>Excluye contratos temporales activos</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duración Empleabilidad</span>
                  <h3 className="text-3xl font-extrabold text-blue-400 mt-1 font-sans">{stats.avgTenureYears} Años</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Promedio: </span>
                <span className="text-blue-400 font-bold">{stats.avgTenureMonths} meses</span>
                <span>por colaborador</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tiempo Medio en Cargo</span>
                  <h3 className="text-3xl font-extrabold text-amber-400 mt-1 font-sans">{stats.avgYearsInRole} Años</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Rotación interna e interinidad saludable</span>
              </div>
            </div>
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Turnover by Department Chart */}
            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col shadow-lg">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-400" />
                  Tasa de Rotación por Departamento
                </h3>
                <p className="text-[11px] text-slate-400">Comparativa de desvinculaciones por área laboral</p>
              </div>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.turnoverByDept}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
                    <XAxis dataKey="departmentName" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#12122B', borderColor: '#4338ca', color: '#e2e8f0', borderRadius: '8px' }}
                      itemStyle={{ color: '#a855f7' }}
                    />
                    <Bar dataKey="turnoverRate" name="Tasa de Rotación" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={25}>
                      {stats.turnoverByDept.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time in positions by Department */}
            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col shadow-lg">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Tiempo Promedio en Cargo por Área
                </h3>
                <p className="text-[11px] text-slate-400">Permanencia media en una misma posición o cargo (años)</p>
              </div>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.avgRoleTimeByDept}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                    <YAxis dataKey="departmentName" type="category" stroke="#94a3b8" fontSize={9} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#12122B', borderColor: '#4338ca', color: '#e2e8f0', borderRadius: '8px' }}
                    />
                    <Bar dataKey="avgYears" name="Años en Cargo" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Talent Flight Risk Matrix (Intelligent Indicator) */}
          <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Matriz de Riesgo de Fuga de Talento (Flight Risk Index)
                </h3>
                <p className="text-[11px] text-slate-400">Algoritmo inteligente: Cruza Alto Rendimiento (Evaluación &gt;= 7.0) con Baja Satisfacción (&lt;= 5.5)</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar colaboradores..."
                    value={flightRiskSearch}
                    onChange={(e) => setFlightRiskSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#0B0B1A] border border-indigo-950/70 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-56"
                  />
                </div>
              </div>
            </div>

            {/* Risk counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1C1024] border border-purple-500/20 rounded-lg p-2.5 text-center">
                <span className="text-[9px] text-purple-400 font-bold block uppercase">Riesgo Crítico (Alto)</span>
                <span className="text-xl font-bold text-purple-400">{stats.flightRiskCount.alto}</span>
              </div>
              <div className="bg-[#1C141B]/80 border border-amber-500/15 rounded-lg p-2.5 text-center">
                <span className="text-[9px] text-amber-400 font-bold block uppercase">Riesgo Moderado (Medio)</span>
                <span className="text-xl font-bold text-amber-400">{stats.flightRiskCount.medio}</span>
              </div>
              <div className="bg-[#0E1B23]/80 border border-emerald-500/15 rounded-lg p-2.5 text-center">
                <span className="text-[9px] text-emerald-400 font-bold block uppercase">Riesgo de Fuga Bajo</span>
                <span className="text-xl font-bold text-emerald-400">{stats.flightRiskCount.bajo}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-indigo-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0B1A] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-indigo-950/60">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Área / Cargo</th>
                    <th className="p-3 text-center">Evaluación Desempeño</th>
                    <th className="p-3 text-center">Nivel Satisfacción</th>
                    <th className="p-3 text-center">Score de Riesgo</th>
                    <th className="p-3 text-center">Nivel de Riesgo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-950/40 text-slate-300">
                  {filteredFlightRisk.length > 0 ? (
                    filteredFlightRisk.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-indigo-950/10 transition-colors">
                        <td className="p-3 font-semibold text-white">{emp.name}</td>
                        <td className="p-3 text-slate-400">
                          <div className="flex flex-col">
                            <span>{emp.department}</span>
                            <span className="text-[9px] font-mono">{emp.position}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.performance >= 8.5 ? 'bg-emerald-500/10 text-emerald-400' :
                            emp.performance >= 7.0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {emp.performance} / 10
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.satisfaction >= 8.0 ? 'bg-emerald-500/10 text-emerald-400' :
                            emp.satisfaction >= 6.0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {emp.satisfaction} / 10
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-200">
                          {emp.riskScore}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${
                            emp.riskLevel === 'Alto' ? 'bg-purple-950 border border-purple-500/30 text-purple-400' :
                            emp.riskLevel === 'Medio' ? 'bg-amber-950 border border-amber-500/30 text-amber-400' :
                            'bg-emerald-950 border border-emerald-500/30 text-emerald-400'
                          }`}>
                            ⚠️ {emp.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No se encontraron colaboradores en la lista de riesgo de fuga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab Content: TRAINING & DEVELOPMENT */}
      {subTab === 'training' && (
        <div className="space-y-6">
          {/* Training Dashboard Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Programas Formativos</span>
                  <h3 className="text-3xl font-extrabold text-purple-400 mt-1 font-sans">{stats.programsCount} Cursos</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Registrados en el plan de desarrollo anual</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Matrículas Totales</span>
                  <h3 className="text-3xl font-extrabold text-cyan-400 mt-1 font-sans">{stats.enrollmentsCount}</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Conexión activa con colaboradores</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aprobación de Cursos</span>
                  <h3 className="text-3xl font-extrabold text-emerald-400 mt-1 font-sans">{stats.completionRate}%</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Promedio general calificaciones: </span>
                <span className="text-emerald-400 font-bold font-mono">{stats.avgScore} / 100</span>
              </div>
            </div>

            <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl relative overflow-hidden shadow-lg flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Presupuesto Formación</span>
                  <h3 className="text-2xl font-extrabold text-amber-500 mt-1 font-sans truncate" title={formatCurrency(stats.totalBudget)}>
                    {formatCurrency(stats.totalBudget)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>Costo deducible en capacitación corporativa</span>
              </div>
            </div>
          </div>

          {/* Development Impact Analysis (Intelligent Correlation) */}
          <div className="p-5 bg-gradient-to-r from-[#121132] to-[#131B37] border border-purple-500/20 rounded-xl shadow-lg flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-2 max-w-lg text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                💡 Análisis de Impacto
              </div>
              <h3 className="text-sm font-bold text-white">
                ¿Cómo impactan las capacitaciones en el desempeño real?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                El sistema correlaciona automáticamente el rendimiento evaluado de los colaboradores que han completado al menos un curso de capacitación frente a los que no tienen capacitaciones finalizadas.
              </p>
            </div>

            <div className="flex gap-4 items-center shrink-0">
              <div className="text-center p-3 bg-[#0B0B1A]/80 border border-indigo-950/70 rounded-xl w-28">
                <span className="text-[8px] text-slate-400 font-bold block uppercase">Con Curso</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">
                  {stats.impactAnalysis.avgPerfWithTraining} <span className="text-[10px] font-normal">/10</span>
                </span>
              </div>
              <div className="text-center p-3 bg-[#0B0B1A]/80 border border-indigo-950/70 rounded-xl w-28">
                <span className="text-[8px] text-slate-400 font-bold block uppercase">Sin Curso</span>
                <span className="text-xl font-extrabold text-rose-400 font-mono mt-1 block">
                  {stats.impactAnalysis.avgPerfWithoutTraining} <span className="text-[10px] font-normal">/10</span>
                </span>
              </div>
              <div className="text-center p-4 bg-[#6C3CE1]/15 border border-purple-500/30 rounded-xl w-32 relative overflow-hidden">
                <span className="text-[8px] text-purple-400 font-extrabold block uppercase">Impacto de Formación</span>
                <span className="text-2xl font-extrabold text-purple-300 font-sans mt-1 block">
                  +{stats.impactAnalysis.impactPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Training course list with visual data */}
          <div className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  Programas de Desarrollo Activos e Históricos
                </h3>
                <p className="text-[11px] text-slate-400">Listado integral de capacitaciones, presupuestos y tasas de aprobación</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleNewEnrollmentClick}
                  className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Matricular Colaborador
                </button>
                <button
                  onClick={handleNewProgramClick}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo Curso
                </button>
              </div>
            </div>

            {/* Program detailed breakdown table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.detailedPrograms.map((prog: any) => {
                const isExpanded = expandedProgramId === prog.id;
                return (
                  <div key={prog.id} className="p-4 bg-[#0B0B1A] border border-indigo-950 rounded-xl flex flex-col justify-between hover:border-purple-600/30 transition-all space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white uppercase truncate" title={prog.name}>{prog.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal line-clamp-2">{prog.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/5 border border-purple-500/10">
                          {prog.departmentName}
                        </span>
                        <button
                          onClick={() => handleEditProgramClick(prog)}
                          className="p-1 text-slate-400 hover:text-purple-400 hover:bg-[#12122B] rounded transition-colors"
                          title="Editar Curso"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(prog.id, prog.name)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-[#12122B] rounded transition-colors"
                          title="Eliminar Curso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center border-t border-b border-indigo-950/60 py-2.5">
                      <div>
                        <span className="text-[8px] text-slate-500 block font-bold uppercase">Matriculados</span>
                        <span className="text-xs font-bold text-white font-mono mt-0.5 block">{prog.totalEnrollments}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-emerald-400 block font-bold uppercase">Aprobados</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">{prog.completed}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-cyan-400 block font-bold uppercase">En Curso</span>
                        <span className="text-xs font-bold text-cyan-400 font-mono mt-0.5 block">{prog.inProgress}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-rose-500 block font-bold uppercase">Reprobados</span>
                        <span className="text-xs font-bold text-rose-500 font-mono mt-0.5 block">{prog.failed}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 pb-1">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{prog.start_date} a {prog.end_date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400">Score: <strong className="text-indigo-400 font-bold">{prog.avgScore}/100</strong></span>
                        <span className="font-bold text-amber-500">{formatCurrency(prog.cost)}</span>
                      </div>
                    </div>

                    {/* Expandable student list */}
                    <div className="border-t border-indigo-950/40 pt-2 mt-2">
                      <button
                        onClick={() => setExpandedProgramId(isExpanded ? null : prog.id)}
                        className="w-full flex items-center justify-between text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ocultar alumnos matriculados' : `Ver alumnos matriculados (${prog.enrollments?.length || 0})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {prog.enrollments && prog.enrollments.length > 0 ? (
                            prog.enrollments.map((enroll: any) => (
                              <div key={enroll.employee_id} className="p-2 bg-[#12122B]/50 border border-indigo-950/60 rounded-lg flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-200 truncate">{enroll.employee_name}</p>
                                  <p className="text-[9px] text-slate-400 truncate font-mono">{enroll.employee_position}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {enroll.status === 'completed' && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-950 text-purple-300 border border-purple-500/15">
                                      {enroll.score}/100
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    enroll.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                                    enroll.status === 'in_progress' ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/20' :
                                    enroll.status === 'failed' ? 'bg-rose-950 text-rose-400 border border-rose-500/20' :
                                    'bg-slate-900 text-slate-400 border border-slate-700'
                                  }`}>
                                    {enroll.status === 'completed' ? 'Aprobado' :
                                     enroll.status === 'in_progress' ? 'En Curso' :
                                     enroll.status === 'failed' ? 'Reprobado' : 'Inscrito'}
                                  </span>
                                  
                                  <button
                                    onClick={() => handleEditEnrollmentClick(enroll, prog.id)}
                                    className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-[#0B0B1A] rounded transition-colors"
                                    title="Modificar Nota/Estado"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEnrollment(enroll.employee_id, prog.id, enroll.employee_name)}
                                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-[#0B0B1A] rounded transition-colors"
                                    title="Eliminar Matrícula"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500 text-center py-2">No hay alumnos matriculados en este curso.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TRAINING PROGRAM */}
      {showNewProgramModal && (
        <div className="fixed inset-0 bg-[#070712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12122B] border border-purple-800/40 rounded-2xl w-full max-w-md p-6 shadow-[0_0_30px_rgba(108,60,225,0.15)] space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-950 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                {editingProgramId ? 'Editar Programa de Capacitación' : 'Registrar Nuevo Programa de Capacitación'}
              </h3>
              <button 
                onClick={() => {
                  setShowNewProgramModal(false);
                  setEditingProgramId(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Nombre del Curso/Capacitación *</label>
                <input
                  type="text"
                  required
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="ej. Taller Avanzado de Inteligencia Artificial en RRHH"
                  className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Descripción o Contenidos</label>
                <textarea
                  value={programDescription}
                  onChange={(e) => setProgramDescription(e.target.value)}
                  placeholder="ej. Sesiones prácticas sobre prompt engineering y optimización de flujos..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Costo / Presupuesto *</label>
                  <input
                    type="number"
                    required
                    value={programCost}
                    onChange={(e) => setProgramCost(e.target.value)}
                    placeholder="ej. 1200000"
                    className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Departamento Propietario *</label>
                  <select
                    required
                    value={programDeptId}
                    onChange={(e) => setProgramDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">Seleccione...</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={programStartDate}
                    onChange={(e) => setProgramStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Fecha de Cierre *</label>
                  <input
                    type="date"
                    required
                    value={programEndDate}
                    onChange={(e) => setProgramEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProgramModal(false);
                    setEditingProgramId(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-900 border border-indigo-950 hover:bg-slate-800 text-slate-400 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProgram}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingProgram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (editingProgramId ? 'Guardar Cambios' : 'Crear Programa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL / GRADE EMPLOYEE IN TRAINING */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-[#070712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12122B] border border-purple-800/40 rounded-2xl w-full max-w-md p-6 shadow-[0_0_30px_rgba(108,60,225,0.15)] space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-950 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                Matricular / Calificar Colaborador
              </h3>
              <button 
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollEmployee} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Capacitación / Curso *</label>
                <select
                  required
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Seleccione un curso...</option>
                  {stats.detailedPrograms.map((prog: any) => (
                    <option key={prog.id} value={prog.id}>
                      [{prog.departmentName}] {prog.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Colaborador *</label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Seleccione un colaborador...</option>
                  {employees
                    .filter(e => e.status !== 'inactivo')
                    .sort((a,b) => a.full_name.localeCompare(b.full_name))
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Estado de la Matrícula *</label>
                <select
                  required
                  value={enrollStatus}
                  onChange={(e) => setEnrollStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="enrolled">Inscrito (Sin Iniciar)</option>
                  <option value="in_progress">En Curso</option>
                  <option value="completed">Aprobado / Completado</option>
                  <option value="failed">Reprobado</option>
                </select>
              </div>

              {(enrollStatus === 'completed' || enrollStatus === 'failed') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Calificación Obtenida (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={enrollScore}
                      onChange={(e) => setEnrollScore(e.target.value)}
                      placeholder="ej. 85"
                      className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold block">Fecha de Finalización</label>
                    <input
                      type="date"
                      value={enrollCompletionDate}
                      onChange={(e) => setEnrollCompletionDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0B1A] border border-indigo-950 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 border border-indigo-950 hover:bg-slate-800 text-slate-400 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingEnroll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Registrando...
                    </>
                  ) : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
