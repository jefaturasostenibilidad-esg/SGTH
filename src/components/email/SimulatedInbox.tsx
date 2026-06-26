/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { SimulatedEmail } from '../../types';
import { Mail, Calendar, Eye, AlertCircle, RefreshCw } from 'lucide-react';

interface SimulatedInboxProps {
  emails: SimulatedEmail[];
  onRefresh: () => void;
  loading: boolean;
}

export function SimulatedInbox({ emails, onRefresh, loading }: SimulatedInboxProps) {
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(emails[0] || null);

  // If selectedEmail is null but there are emails, select the first one
  if (!selectedEmail && emails.length > 0) {
    setSelectedEmail(emails[0]);
  }

  return (
    <div id="simulated-inbox" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[550px]">
      {/* List of emails (4 columns) */}
      <div className="lg:col-span-5 flex flex-col bg-[#13132A] border border-purple-900/20 rounded-xl overflow-hidden h-full shadow-lg">
        <div className="p-4 border-b border-indigo-950 flex items-center justify-between bg-indigo-950/20 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-purple-400" />
              Buzón de Correos (Resend Sandbox)
            </h3>
            <p className="text-[10px] text-purple-300">Monitoreo de notificaciones y alertas salientes</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-indigo-950/40 border border-indigo-900/40 hover:bg-indigo-900/50 transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar correos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-indigo-950/50">
          {emails.map((email) => {
            const isSelected = selectedEmail?.id === email.id;
            return (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-3.5 cursor-pointer text-xs transition-all flex flex-col gap-1 hover:bg-indigo-950/20 ${
                  isSelected ? 'bg-indigo-950/55 border-r-2 border-r-purple-500' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[10px] font-bold text-purple-300 truncate font-mono max-w-[150px]">
                    Para: {email.to.split(',')[0]}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="font-bold text-white truncate text-[11px] leading-tight">
                  {email.subject}
                </h4>
                <p className="text-[9px] text-slate-400 truncate mt-0.5">
                  De: {email.from}
                </p>
              </div>
            );
          })}

          {emails.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              <AlertCircle className="w-6 h-6 text-indigo-950 mx-auto mb-2" />
              <p className="text-xs font-semibold">Ningún correo saliente generado en esta sesión.</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Viewer (7 columns) */}
      <div className="lg:col-span-7 flex flex-col bg-[#13132A] border border-purple-900/20 rounded-xl overflow-hidden h-full shadow-lg">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Header detail */}
            <div className="p-4 border-b border-indigo-950 bg-indigo-950/25 shrink-0 space-y-1">
              <div className="flex justify-between items-start flex-wrap gap-2 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-purple-400 uppercase">DE:</span>
                  <span className="font-mono">{selectedEmail.from}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {new Date(selectedEmail.timestamp).toLocaleString('es-CO')}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <span className="font-bold text-emerald-400 uppercase">PARA:</span>
                <span className="font-mono text-emerald-300">{selectedEmail.to}</span>
              </div>

              <h2 className="text-sm font-bold text-white pt-1">
                {selectedEmail.subject}
              </h2>
            </div>

            {/* Rendered frame body */}
            <div className="flex-1 bg-slate-900 overflow-y-auto p-4 flex justify-center">
              <div 
                className="w-full bg-[#0f0f1a] rounded-lg p-4 text-slate-200 shadow-inner border border-white/5"
                dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <Eye className="w-8 h-8 text-indigo-950 mb-2.5 animate-pulse" />
            <p className="text-sm font-semibold">Seleccione un correo de la bandeja para visualizar su plantilla renderizada en HTML.</p>
          </div>
        )}
      </div>
    </div>
  );
}
