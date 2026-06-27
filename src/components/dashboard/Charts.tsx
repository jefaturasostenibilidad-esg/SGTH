/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12122B]/95 border border-purple-800/60 p-3 rounded-lg shadow-[0_0_15px_rgba(108,60,225,0.25)] text-xs text-slate-200">
        <p className="font-bold text-white mb-1">{label || payload[0].payload.name || payload[0].payload.department || payload[0].payload.supervisor || payload[0].payload.age_group}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} className="flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span>{p.name}:</span>
            <span className="font-mono font-bold text-indigo-300">
              {typeof p.value === 'number' && p.name.includes('Sueldo') 
                ? `$ ${p.value.toLocaleString('es-CO')}` 
                : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Colaboradores por Rol (gráfico de barras horizontales)
export function BarChartDept({ data }: { data: any[] }) {
  const chartData = data.map(item => ({
    name: item.department,
    colaboradores: item.total,
    salarioPromedio: item.avg_salary
  }));

  return (
    <div className="p-4 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col justify-between shadow-lg h-[320px]">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white">Colaboradores por Rol</h3>
        <p className="text-[10px] text-purple-400">Distribución de nómina activa por rol</p>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
            <XAxis type="number" stroke="#94a3b8" fontSize={9} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="colaboradores" name="Colaboradores" fill="#6C3CE1" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 2. Colaboradores por Grupo de Edad (barras horizontales)
export function AgeGroupChart({ data }: { data: any[] }) {
  const chartData = data.map(item => ({
    name: item.age_group,
    total: item.total
  }));

  return (
    <div className="p-4 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col justify-between shadow-lg h-[320px]">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white">Colaboradores por Grupo de Edad</h3>
        <p className="text-[10px] text-purple-400">Demografía de personal activo</p>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="horizontal"
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
            <YAxis stroke="#94a3b8" fontSize={9} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Total Colaboradores" fill="#F5A623" radius={[4, 4, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 3. Cantidad de Colaboradores por Supervisor (vertical bars/treemap style)
export function SupervisorChart({ data }: { data: any[] }) {
  const chartData = data.map(item => ({
    name: item.supervisor,
    reports: item.direct_reports,
    perf: item.team_performance
  }));

  return (
    <div className="p-4 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col justify-between shadow-lg h-[320px]">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white">Reportes Directos por Supervisor</h3>
        <p className="text-[10px] text-purple-400">Liderazgo y desempeño de equipos activos</p>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickFormatter={(val) => val.split(' ')[0]} />
            <YAxis stroke="#94a3b8" fontSize={9} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="reports" name="Reportes Directos" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 4. Relación Sueldo vs Edad (scatter plot)
export function ScatterPlotSueldoEdad({ employees }: { employees: any[] }) {
  // Map employees to scatter coordinates
  const activeEmps = employees.filter(e => e.status === 'activo');
  const scatterData = activeEmps.map(emp => ({
    x: emp.age,
    y: emp.salary / 1000000, // in Millions
    name: emp.full_name,
    dept: emp.department_name,
    cargo: emp.position_title
  }));

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#12122B]/95 border border-purple-800/60 p-3 rounded-lg shadow-[0_0_15px_rgba(108,60,225,0.25)] text-xs text-slate-200 max-w-[200px]">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <p className="text-purple-300 font-medium mb-1">{data.cargo}</p>
          <p className="text-[10px] text-slate-400 mb-2">{data.dept}</p>
          <div className="border-t border-purple-900/50 pt-2 font-mono">
            <p>Edad: <span className="text-white font-bold">{data.x} años</span></p>
            <p>Sueldo: <span className="text-emerald-400 font-bold">$ {(data.y * 1000000).toLocaleString('es-CO')}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 bg-[#13132A] border border-purple-900/20 rounded-xl flex flex-col justify-between shadow-lg h-[320px]">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white">Análisis de Relación Sueldo vs Edad</h3>
        <p className="text-[10px] text-purple-400">Dispersión de ingresos contra demografía</p>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1d1d42" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Edad" 
              unit=" años" 
              domain={[18, 65]} 
              stroke="#94a3b8" 
              fontSize={9} 
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Sueldo" 
              unit="M" 
              domain={[2, 20]} 
              stroke="#94a3b8" 
              fontSize={9} 
            />
            <ZAxis type="number" range={[50, 200]} />
            <Tooltip content={<ScatterTooltip />} />
            <Scatter name="Colaboradores" data={scatterData} fill="#EC4899" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
