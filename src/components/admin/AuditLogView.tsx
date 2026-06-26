/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuditLog } from '../../types';
import { ShieldCheck, Filter, Calendar, RefreshCcw, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
  loading: boolean;
}

export function AuditLogView({ logs, onRefresh, loading }: AuditLogViewProps) {
  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchUser, setSearchUser] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('all');

  // Filter actions options
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name).filter(Boolean)));

  const filteredLogs = logs.filter(log => {
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterTable !== 'all' && log.table_name !== filterTable) return false;
    if (searchUser && !log.user_email?.toLowerCase().includes(searchUser.toLowerCase())) return false;
    return true;
  });

  return (
    <div id="audit-log-view" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Trazabilidad y Log de Auditoría (SGSI)
          </h2>
          <p className="text-xs text-purple-400">Bitácora inmutable de eventos de seguridad según lineamientos ISO/IEC 27001</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 text-xs font-bold bg-[#13132A] hover:bg-indigo-950 border border-purple-900/30 text-white rounded-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Bitácora
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-[#13132A] border border-purple-900/10 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-400">
        <div>
          <label className="block mb-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" />
            Filtrar Severidad
          </label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 transition-colors"
          >
            <option value="all">Todas las severidades</option>
            <option value="INFO">INFO (Operativo sutil)</option>
            <option value="WARN">WARN (Exportaciones/Accesos)</option>
            <option value="CRITICAL">CRITICAL (Cambios roles/Fallos)</option>
          </select>
        </div>

        <div>
          <label className="block mb-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" />
            Filtrar Acción
          </label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 transition-colors"
          >
            <option value="all">Todas las acciones</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" />
            Tabla Afectada
          </label>
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 transition-colors"
          >
            <option value="all">Todas las tablas</option>
            {uniqueTables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-purple-400" />
            Buscar por Operador
          </label>
          <input
            type="text"
            placeholder="Buscar por correo electrónico..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2 text-white outline-none focus:border-purple-600 transition-colors placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Main logs table */}
      <div className="overflow-x-auto rounded-xl border border-indigo-950 bg-[#13132A]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-950/40 text-slate-300 border-b border-indigo-900/50 font-bold uppercase tracking-wider">
              <th className="p-3.5">Fecha / Hora</th>
              <th className="p-3.5 text-center">Severidad</th>
              <th className="p-3.5">Acción / Evento</th>
              <th className="p-3.5">Tabla</th>
              <th className="p-3.5">Usuario Operador</th>
              <th className="p-3.5">IP</th>
              <th className="p-3.5">Detalles del Evento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/60 text-slate-300 font-semibold font-mono">
            {filteredLogs.map((log) => {
              const isCritical = log.severity === 'CRITICAL';
              const isWarn = log.severity === 'WARN';

              return (
                <tr 
                  key={log.id} 
                  className={`hover:bg-indigo-950/20 transition-all ${
                    isCritical 
                      ? 'bg-rose-500/5 hover:bg-rose-500/10 border-l-2 border-l-rose-500' 
                      : isWarn 
                        ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500' 
                        : ''
                  }`}
                >
                  <td className="p-3.5 text-slate-400 text-[10px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('es-CO')}
                  </td>
                  
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider inline-flex items-center gap-1 ${
                      isCritical 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                        : isWarn 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-indigo-950 text-slate-400 border border-indigo-900/30'
                    }`}>
                      {isCritical ? (
                        <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      ) : (
                        <Info className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      {log.severity}
                    </span>
                  </td>

                  <td className="p-3.5 text-white font-bold">{log.action}</td>
                  <td className="p-3.5 text-slate-400 capitalize">{log.table_name || 'System'}</td>
                  
                  <td className="p-3.5">
                    <div className="flex flex-col">
                      <span className="text-purple-300 font-bold">{log.user_email || 'anonymous'}</span>
                      <span className="text-[9px] text-slate-500 font-sans capitalize mt-0.5">Rol: {log.user_role}</span>
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                    {log.ip_address || '127.0.0.1'}
                  </td>

                  <td className="p-3.5 text-xs text-slate-300 font-sans whitespace-normal max-w-xs">
                    {log.changed_fields ? (
                      <p className="text-[10px]">
                        Campos modificados: <strong className="text-purple-300 font-mono">{log.changed_fields.join(', ')}</strong>
                      </p>
                    ) : (
                      <p className="line-clamp-2" title={JSON.stringify(log.new_values || log.old_values || {})}>
                        {log.new_values?.message || JSON.stringify(log.new_values || log.old_values || 'Registro operativo')}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400 font-sans">
                  No se encontraron logs de auditoría con los criterios de filtrado seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
