/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, Department, Position } from '../../types';
import { Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSave: (data: Partial<Employee>) => Promise<void>;
  onCancel: () => void;
  departments: Department[];
  positions: Position[];
  employees: Employee[];
}

export function EmployeeForm({ initialData, onSave, onCancel, departments, positions, employees }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [gender, setGender] = useState<'M' | 'F' | 'Otro'>(initialData?.gender || 'M');
  const [birthDate, setBirthDate] = useState(initialData?.birth_date || '1990-01-01');
  const [hireDate, setHireDate] = useState(initialData?.hire_date || new Date().toISOString().substring(0, 10));
  const [selectedDept, setSelectedDept] = useState(initialData?.department_id || departments[0]?.id || '');
  const [selectedPosition, setSelectedPosition] = useState(initialData?.position_id || '');
  const [selectedSupervisor, setSelectedSupervisor] = useState(initialData?.supervisor_id || '');
  const [salary, setSalary] = useState(initialData?.salary || 3000000);
  const [status, setStatus] = useState<'activo' | 'inactivo' | 'vacaciones' | 'licencia'>(initialData?.status || 'activo');
  const [satisfactionScore, setSatisfactionScore] = useState(initialData?.satisfaction_score || 8.0);
  const [performanceScore, setPerformanceScore] = useState(initialData?.performance_score || 8.0);
  const [absenceDays, setAbsenceDays] = useState(initialData?.absence_days || 0);

  // Dynamic filter for positions based on selected department
  const filteredPositions = React.useMemo(() => {
    return positions.filter(p => p.department_id === selectedDept);
  }, [positions, selectedDept]);

  // Supervisor options (all active employees except current employee being edited)
  const availableSupervisors = React.useMemo(() => {
    return employees.filter(e => e.status === 'activo' && e.id !== initialData?.id);
  }, [employees, initialData?.id]);

  // Set initial position if department changed or on mount
  useEffect(() => {
    if (filteredPositions.length > 0) {
      const match = filteredPositions.find(p => p.id === selectedPosition);
      if (!match) {
        setSelectedPosition(filteredPositions[0].id);
      }
    } else {
      setSelectedPosition('');
    }
  }, [selectedDept, positions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validations
    if (!fullName.trim()) {
      setError('El nombre completo es requerido.');
      return;
    }

    // Age validation (Minimum 18 years old)
    const birth = new Date(birthDate);
    const refDate = new Date('2026-06-25');
    let calculatedAge = refDate.getFullYear() - birth.getFullYear();
    const m = refDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    if (calculatedAge < 18) {
      setError(`Validación SGSI: El colaborador debe ser mayor de 18 años (Edad actual calculated: ${calculatedAge} años).`);
      return;
    }

    // Salary validation
    if (Number(salary) <= 0) {
      setError('El salario de nómina debe ser un valor mayor a $0 COP.');
      return;
    }

    // Absence validation
    if (Number(absenceDays) < 0) {
      setError('Los días de ausencia no pueden ser valores negativos.');
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<Employee> = {
        full_name: fullName.trim(),
        gender,
        birth_date: birthDate,
        hire_date: hireDate,
        department_id: selectedDept,
        position_id: selectedPosition,
        supervisor_id: selectedSupervisor || undefined,
        salary: Number(salary),
        status,
        satisfaction_score: Number(satisfactionScore),
        performance_score: Number(performanceScore),
        absence_days: Number(absenceDays)
      };

      await onSave(payload);
    } catch (err: any) {
      setError(err.message || 'Error guardando colaborador en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#13132A] border border-purple-900/20 rounded-xl p-6 shadow-xl max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 border-b border-indigo-950 pb-4">
        <button 
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-900/40 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">
            {initialData ? `Editar Colaborador: ${initialData.full_name}` : 'Registrar Nuevo Colaborador'}
          </h2>
          <p className="text-xs text-purple-400">
            {initialData ? `Código de Registro: ${initialData.employee_code}` : 'El sistema asignará automáticamente el código de empleado.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-300 font-medium">
        {/* Seccion 1: Identificación y Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-slate-400">Nombre Completo <span className="text-rose-400">*</span></label>
            <input 
              type="text" 
              required
              placeholder="Ej. Juan Carlos Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Género <span className="text-rose-400">*</span></label>
            <select 
              value={gender} 
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            >
              <option value="M">Masculino (M)</option>
              <option value="F">Femenino (F)</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Fecha de Nacimiento <span className="text-rose-400">*</span></label>
            <input 
              type="date" 
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white font-mono outline-none focus:border-purple-600 transition-colors"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Fecha de Ingreso <span className="text-rose-400">*</span></label>
            <input 
              type="date" 
              required
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white font-mono outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        </div>

        {/* Seccion 2: Relación Organizacional */}
        <div className="bg-[#0B0B1A]/40 p-4 rounded-xl border border-indigo-950/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1.5 text-slate-400 font-semibold text-purple-300">Rol <span className="text-rose-400">*</span></label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400 font-semibold text-purple-300">Cargo / Posición <span className="text-rose-400">*</span></label>
            <select 
              value={selectedPosition} 
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            >
              {filteredPositions.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
              {filteredPositions.length === 0 && (
                <option value="">No hay cargos en esta área</option>
              )}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400 font-semibold text-purple-300">Supervisor Directo</label>
            <select 
              value={selectedSupervisor} 
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            >
              <option value="">[ Ninguno — Reporta a Gerencia ]</option>
              {availableSupervisors.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.department_name || 'Directivo'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Seccion 3: Compensación e Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1.5 text-slate-400">Salario Mensual (COP) <span className="text-rose-400">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-indigo-400 font-bold">$</span>
              <input 
                type="number" 
                required
                min="1000"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg py-2.5 pl-8 pr-3 text-white font-mono outline-none focus:border-purple-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Estado de Contrato <span className="text-rose-400">*</span></label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white outline-none focus:border-purple-600 transition-colors"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo / Retirado</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="licencia">Licencia Médica/Personal</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400">Días de Ausencia Acumulados</label>
            <input 
              type="number" 
              min="0"
              required
              value={absenceDays}
              onChange={(e) => setAbsenceDays(Number(e.target.value))}
              className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-white font-mono outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        </div>

        {/* Seccion 4: Sliders de Desempeño y Clima */}
        <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-900/20 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-400 font-semibold">Índice de Satisfacción (0 a 10)</label>
              <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                satisfactionScore >= 6 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'
              }`}>
                {satisfactionScore.toFixed(1)} / 10
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.5"
              value={satisfactionScore}
              onChange={(e) => setSatisfactionScore(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-[#0B0B1A] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 (Crítico)</span>
              <span>6 (Aceptable)</span>
              <span>10 (Óptimo)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-400 font-semibold">Evaluación de Desempeño (0 a 10)</label>
              <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                performanceScore >= 8 ? 'bg-emerald-500/10 text-emerald-400' : performanceScore >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'
              }`}>
                {performanceScore.toFixed(1)} / 10
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={performanceScore}
              onChange={(e) => setPerformanceScore(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-[#0B0B1A] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 (Deficiente)</span>
              <span>5 (Mínimo)</span>
              <span>10 (Excepcional)</span>
            </div>
          </div>
        </div>

        {/* Boton de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t border-indigo-950">
          <button 
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border border-indigo-900/40 text-slate-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-900/30 font-bold transition-all duration-200"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Registro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
