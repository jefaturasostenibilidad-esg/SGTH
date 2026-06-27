/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  DatabaseZap, 
  Loader2,
  Mail,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

interface DatabasePanelProps {
  onExport: () => void;
  onReset: () => Promise<void>;
  employeeCount: number;
  auditCount: number;
  requestCount: number;
  emailCount: number;
  authToken: string;
}

interface ConnectionStatus {
  supabase: {
    configured: boolean;
    url: string | null;
  };
  resend: {
    configured: boolean;
  };
}

export function DatabasePanel({ 
  onExport, 
  onReset, 
  employeeCount, 
  auditCount, 
  requestCount, 
  emailCount,
  authToken 
}: DatabasePanelProps) {
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [connections, setConnections] = useState<ConnectionStatus>({
    supabase: { configured: false, url: null },
    resend: { configured: false }
  });
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/admin/connections-status', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setConnections(data);
        }
      } catch (err) {
        console.error('Error fetching connection statuses:', err);
      } finally {
        setLoadingStatus(false);
      }
    }
    fetchStatus();
  }, [authToken]);

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    setSuccessMsg(null);
    try {
      await onReset();
      setSuccessMsg('Base de datos restaurada con éxito. Toda la traza ha sido archivada y los registros regresaron al estado seed inicial.');
      setConfirmReset(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      alert('Error restaurando base de datos');
    } finally {
      setResetting(false);
    }
  };

  const copySqlSchema = () => {
    const schemaSql = `-- SQL Schema for Supabase Tables
create table if not exists sgth_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

create table if not exists departments (
  id text primary key,
  name text not null,
  code text unique not null,
  head_id text,
  budget numeric not null,
  created_at text not null
);

create table if not exists positions (
  id text primary key,
  title text not null,
  department_id text references departments(id) on delete cascade,
  salary_min numeric not null,
  salary_max numeric not null,
  created_at text not null
);

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
);`;

    navigator.clipboard.writeText(schemaSql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  return (
    <div id="database-panel" className="space-y-6">
      {/* Intro */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            Centro de Respaldos e Integridad de Datos (ISO 27001)
          </h2>
          <p className="text-xs text-purple-400">Exportaciones completas auditadas y preservación histórica de información corporativa</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/40 border border-indigo-850 rounded-lg text-[10px] text-indigo-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Encriptación AES-256 Activa</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Grid of database statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/10 text-xs">
          <span className="text-slate-400 block mb-1">Registros de Colaboradores</span>
          <strong className="text-xl font-mono text-white block">{employeeCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1 block">Tabla: employees</span>
        </div>

        <div className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/10 text-xs">
          <span className="text-slate-400 block mb-1">Entradas de Auditoría</span>
          <strong className="text-xl font-mono text-white block">{auditCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1 block">Tabla: audit_logs (Logs)</span>
        </div>

        <div className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/10 text-xs">
          <span className="text-slate-400 block mb-1">Solicitudes de Acceso</span>
          <strong className="text-xl font-mono text-white block">{requestCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1 block">Tabla: access_requests</span>
        </div>

        <div className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/10 text-xs">
          <span className="text-slate-400 block mb-1">Emails Despachados</span>
          <strong className="text-xl font-mono text-white block">{emailCount}</strong>
          <span className="text-[9px] text-slate-500 mt-1 block">Canal: Resend Sandbox</span>
        </div>
      </div>

      {/* Cloud Integrations Status Section */}
      <div className="p-5 rounded-xl border border-purple-900/30 bg-purple-950/5 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-900/20 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-400" />
            Integraciones en la Nube de EVECA
          </h3>
          <span className="text-[10px] text-slate-400">Vercel Production-Ready</span>
        </div>

        {loadingStatus ? (
          <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Consultando estados de conexión...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supabase status card */}
            <div className="p-4 rounded-lg bg-[#0e0e1e]/60 border border-indigo-950/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Supabase Database (PostgreSQL)
                </span>
                {connections.supabase.configured ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    CONECTADO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    PENDIENTE CONFIG
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {connections.supabase.configured ? (
                  <>Sincronización bidireccional activa. Los cambios locales se replican automáticamente en la base de datos PostgreSQL de Supabase.</>
                ) : (
                  <>Utilizando base de datos local JSON (db.json) como respaldo. Configure las variables de entorno <code className="text-purple-300">SUPABASE_URL</code> y <code className="text-purple-300">SUPABASE_KEY</code> en su proyecto para activar la persistencia ilimitada de producción.</>
                )}
              </p>
              {connections.supabase.configured && connections.supabase.url && (
                <div className="bg-[#04040a]/40 p-2 rounded text-[10px] text-slate-400 font-mono truncate">
                  URL: {connections.supabase.url}
                </div>
              )}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={copySqlSchema}
                  className="px-2.5 py-1.5 rounded bg-indigo-950/60 border border-indigo-800/40 hover:bg-indigo-900/40 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Esquema SQL</span>
                </button>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-purple-400 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  Consola Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Resend status card */}
            <div className="p-4 rounded-lg bg-[#0e0e1e]/60 border border-indigo-950/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Resend Email Service
                </span>
                {connections.resend.configured ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    ACTIVO (REAL)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    SIMULADO (LOCAL)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {connections.resend.configured ? (
                  <>Despacho de correos corporativos reales activo a través de Resend. Las solicitudes de acceso y alertas de personal se entregan instantáneamente en las bandejas de entrada correspondientes.</>
                ) : (
                  <>Los correos corporativos se generan y guardan de forma interna en el buzón simulado del administrador. Configure la clave <code className="text-purple-300">RESEND_API_KEY</code> para habilitar el despacho de emails reales.</>
                )}
              </p>
              <div className="pt-1 flex justify-end">
                <a
                  href="https://resend.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-purple-400 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  Consola Resend <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-indigo-950/20 border border-indigo-950/40 rounded-lg text-[10px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Arquitectura Dual Integrada:</strong> Si la base de datos de Supabase aún no tiene las tablas relacionales creadas, el sistema utiliza un mecanismo monolítico alternativo persistente llamado <code className="text-purple-300">sgth_store</code> para resguardar la información de forma automática y transparente sin interrumpir las operaciones.
          </p>
        </div>
      </div>

      {/* Main Action Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-purple-900/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left max-w-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-center md:justify-start">
            <DatabaseZap className="w-4 h-4 text-purple-400" />
            Descarga de Base de Datos Gerencial
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Descargue el libro maestro con la información de los colaboradores, KPIs, departamentos, bitácora de auditoría SGSI y demás métricas gerenciales.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={onExport}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          
          <button
            onClick={() => window.open(`/api/admin/export-database-pdf?token=${encodeURIComponent(authToken)}`, '_blank')}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Technical tools */}
      <div className="bg-[#13132A]/40 p-4 border border-indigo-950/40 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wide">Utilidades del Sistema de Pruebas</h4>
        <p className="text-[11px] text-slate-400">
          Como administrador, puede resetear la base de datos de prueba para limpiar las modificaciones y ver el conjunto de datos de fábrica de EVECA.
        </p>
        <div className="pt-2 border-t border-indigo-950/50 flex justify-end">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Restaurando...
                  </>
                ) : (
                  'Confirmar Reset'
                )}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="px-3 py-2 text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={resetting}
              className="px-4 py-2 text-xs font-bold bg-rose-950/20 text-rose-400 hover:text-white border border-rose-900/40 hover:bg-rose-900/30 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar Semillas de Fábrica
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
