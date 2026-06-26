/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AccessRequest } from '../../types';
import { Check, X, Shield, Calendar, Mail, User, CheckCircle2, XCircle } from 'lucide-react';

interface AccessRequestsProps {
  requests: AccessRequest[];
  onReview: (id: string, status: 'approved' | 'rejected', notes: string) => Promise<void>;
  loadingId: string | null;
}

export function AccessRequests({ requests, onReview, loadingId }: AccessRequestsProps) {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const filtered = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const handleNoteChange = (id: string, text: string) => {
    setNotes(prev => ({ ...prev, [id]: text }));
  };

  return (
    <div id="access-requests" className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Control de Acceso y Onboarding
          </h2>
          <p className="text-xs text-purple-400">Revisión de solicitudes bajo normas de confidencialidad de la ISO 27001</p>
        </div>
        <div className="flex gap-1 bg-indigo-950/40 p-1 border border-indigo-900/30 rounded-lg">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer ${
                filter === tab 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'pending' ? 'Pendientes' : tab === 'approved' ? 'Aprobadas' : tab === 'rejected' ? 'Rechazadas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 border border-dashed border-indigo-950/60 rounded-xl bg-indigo-950/5 text-center text-slate-400">
          <Shield className="w-8 h-8 text-indigo-950 mx-auto mb-2.5" />
          <p className="text-sm font-semibold">No se encontraron solicitudes {filter !== 'all' ? `con estado '${filter}'` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(req => {
            const isLoading = loadingId === req.id;
            return (
              <div 
                key={req.id} 
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                  req.status === 'pending' 
                    ? 'bg-[#13132A] border-purple-900/20 shadow-md' 
                    : req.status === 'approved'
                      ? 'bg-[#11221A]/30 border-emerald-900/30 text-slate-300'
                      : 'bg-[#221111]/30 border-rose-900/30 text-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-950/50 rounded-lg border border-indigo-900/30">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{req.requester_name}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Mail className="w-3 h-3 text-indigo-400" />
                          {req.requester_email}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      req.requested_role === 'superadmin' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : req.requested_role === 'editor'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {req.requested_role}
                    </span>
                  </div>

                  <div className="border-t border-indigo-950/40 pt-3 text-[11px] space-y-1.5 text-slate-400 font-medium">
                    <div className="flex justify-between">
                      <span>ID Solicitud:</span>
                      <span className="font-mono text-purple-300 select-all">{req.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Solicitado:</span>
                      <span className="font-mono text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(req.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="space-y-2 pt-2">
                      <label className="block text-[11px] text-slate-400">Notas de revisión / Motivo:</label>
                      <textarea
                        rows={2}
                        placeholder="Escribe comentarios de aprobación o motivo de rechazo..."
                        value={notes[req.id] || ''}
                        onChange={(e) => handleNoteChange(req.id, e.target.value)}
                        className="w-full bg-[#0B0B1A] border border-indigo-950 rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        {req.status === 'approved' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-bold uppercase text-[10px]">Aprobada</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400 font-bold uppercase text-[10px]">Declinada</span>
                          </>
                        )}
                      </div>
                      {req.review_notes && (
                        <p className="text-[11px] text-slate-400 italic">"{req.review_notes}"</p>
                      )}
                      <p className="text-[9px] text-slate-500 font-mono text-right">
                        Revisado: {new Date(req.reviewed_at!).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2.5 pt-4 border-t border-indigo-950/40 mt-4">
                    <button
                      disabled={isLoading}
                      onClick={() => onReview(req.id, 'rejected', notes[req.id] || 'No cumple con las políticas SGSI corporativas.')}
                      className="flex-1 py-2 text-xs font-bold text-rose-400 hover:text-white border border-rose-900/40 hover:bg-rose-950/30 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => onReview(req.id, 'approved', notes[req.id] || 'Aprobado para la gestión de nómina.')}
                      className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
