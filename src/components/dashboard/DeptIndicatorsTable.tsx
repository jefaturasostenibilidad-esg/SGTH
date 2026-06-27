/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface DeptIndicator {
  department: string;
  avg_years: number;
  pct_unsatisfied: number;
  absence_rate: number;
  avg_performance: number;
  avg_salary: number;
  total_payroll: number;
}

interface DeptIndicatorsTableProps {
  data: DeptIndicator[];
}

type SortKey = 'department' | 'avg_years' | 'pct_unsatisfied' | 'absence_rate' | 'avg_performance' | 'avg_salary' | 'total_payroll';

export function DeptIndicatorsTable({ data }: DeptIndicatorsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('department');
  const [ascending, setAscending] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(true);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (typeof aVal === 'string') {
      return ascending 
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    } else {
      return ascending
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return ascending 
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-purple-400 inline" /> 
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-purple-400 inline" />;
  };

  return (
    <div id="dept-indicators-table" className="p-5 bg-[#13132A] border border-purple-900/20 rounded-xl shadow-lg flex flex-col space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Tabla de Análisis de Indicadores por Rol</h3>
        <p className="text-xs text-purple-400 mt-0.5">Reportes consolidados con alertas de umbrales críticos de seguridad corporativa</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-indigo-950/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-950/60 text-slate-300 font-semibold uppercase tracking-wider border-b border-indigo-900/50">
              <th className="p-3.5 cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('department')}>
                Rol {renderSortIcon('department')}
              </th>
              <th className="p-3.5 text-center cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('avg_years')}>
                Tiempo Prom. Cargo {renderSortIcon('avg_years')}
              </th>
              <th className="p-3.5 text-center cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('pct_unsatisfied')}>
                % Insatisfecho {renderSortIcon('pct_unsatisfied')}
              </th>
              <th className="p-3.5 text-center cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('absence_rate')}>
                Tasa Ausentismo {renderSortIcon('absence_rate')}
              </th>
              <th className="p-3.5 text-center cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('avg_performance')}>
                Prom. Evaluación {renderSortIcon('avg_performance')}
              </th>
              <th className="p-3.5 text-right cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('avg_salary')}>
                Salario Promedio {renderSortIcon('avg_salary')}
              </th>
              <th className="p-3.5 text-right cursor-pointer select-none hover:bg-indigo-900/30" onClick={() => handleSort('total_payroll')}>
                Costo Planilla Total {renderSortIcon('total_payroll')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/55 text-slate-300 font-medium">
            {sortedData.map((row, idx) => {
              const isUnsatisfiedHigh = row.pct_unsatisfied > 40;
              const isAbsenceHigh = row.absence_rate > 8;

              return (
                <tr 
                  key={idx} 
                  className="hover:bg-indigo-950/20 transition-colors duration-200 border-b border-indigo-950/40"
                >
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {row.department}
                  </td>
                  <td className="p-3.5 text-center font-mono">{row.avg_years} años</td>
                  
                  {/* Unsatisfied Column with Warning badge */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isUnsatisfiedHigh 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                          : 'bg-indigo-950/30 text-indigo-300 border border-indigo-900/30'
                      }`}>
                        {row.pct_unsatisfied}%
                      </span>
                      {isUnsatisfiedHigh && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" title="Alerta: Descontento mayor al 40%" />
                      )}
                    </div>
                  </td>

                  {/* Absence Rate Column with Warning badge */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isAbsenceHigh 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                          : 'bg-sky-950/30 text-sky-300 border border-sky-900/30'
                      }`}>
                        {row.absence_rate}%
                      </span>
                      {isAbsenceHigh && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" title="Alerta: Ausentismo mayor al 8%" />
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 text-center font-mono">
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                      row.avg_performance >= 8 
                        ? 'text-emerald-400' 
                        : row.avg_performance >= 6 
                          ? 'text-amber-400' 
                          : 'text-rose-400'
                    }`}>
                      {row.avg_performance} / 10
                    </span>
                  </td>
                  
                  <td className="p-3.5 text-right font-mono text-slate-100 font-semibold">
                    $ {row.avg_salary.toLocaleString('es-CO')}
                  </td>
                  
                  <td className="p-3.5 text-right font-mono text-purple-300 font-bold">
                    $ {row.total_payroll.toLocaleString('es-CO')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
