/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Profile, UserRole } from '../../types';
import { Users, Shield, CheckCircle2, XCircle, AlertCircle, RefreshCcw } from 'lucide-react';

interface UserRoleManagerProps {
  users: Profile[];
  onUpdateUser: (id: string, updates: { role?: UserRole; is_active?: boolean }) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  loadingId: string | null;
}

export function UserRoleManager({ users, onUpdateUser, onDeleteUser, loadingId }: UserRoleManagerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Safety check: Don't allow self demotion or lockouts in UI if possible, but let server check it too
    try {
      setError(null);
      await onUpdateUser(userId, { role: newRole });
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el rol.');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      setError(null);
      await onUpdateUser(userId, { is_active: !currentActive });
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el estado activo.');
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (userId: string) => {
    try {
      setError(null);
      if (onDeleteUser) {
        await onDeleteUser(userId);
      }
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el usuario.');
    }
  };

  return (
    <div id="user-role-manager" className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Gestión de Permisos y Roles (RBAC)
        </h2>
        <p className="text-xs text-purple-400">Control de acceso basado en roles bajo directrices estrictas de segregación de funciones (ISO 27001)</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-indigo-950 bg-[#13132A]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-950/40 text-slate-300 border-b border-indigo-900/50 font-bold uppercase tracking-wider">
              <th className="p-3.5">Nombre Completo</th>
              <th className="p-3.5">Correo Electrónico</th>
              <th className="p-3.5">Rol de Sistema</th>
              <th className="p-3.5 text-center">Estado de Cuenta</th>
              <th className="p-3.5">Fecha Registro</th>
              <th className="p-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/60 text-slate-300 font-semibold">
            {users.map((profile) => {
              const isSelf = profile.email === 'wmartinezm360@gmail.com' || profile.email === 'talentohumano@eveca.co';
              const isLoading = loadingId === profile.id;

              return (
                <tr 
                  key={profile.id} 
                  className={`hover:bg-indigo-950/10 transition-all ${
                    !profile.is_active ? 'opacity-60 bg-black/5' : ''
                  }`}
                >
                  <td className="p-3.5 text-white font-bold flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {profile.full_name}
                    {isSelf && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-indigo-900/60 text-indigo-300 border border-indigo-800/40">
                        ADMIN PROTEGIDO
                      </span>
                    )}
                  </td>
                  
                  <td className="p-3.5 font-mono text-slate-400">{profile.email}</td>
                  
                  <td className="p-3.5">
                    {isSelf ? (
                      <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        {profile.role}
                      </span>
                    ) : (
                      <select
                        disabled={isLoading}
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                        className="bg-[#0B0B1A] border border-indigo-950 rounded-lg p-1 text-white outline-none focus:border-purple-600 font-sans cursor-pointer text-[11px]"
                      >
                        <option value="viewer">Visualizador (Viewer)</option>
                        <option value="editor">Editor de Personal (Editor)</option>
                        <option value="superadmin">Superadministrador (Superadmin)</option>
                      </select>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-flex items-center gap-1 ${
                      profile.is_active 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    }`}>
                      {profile.is_active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-400" />
                          Inactivo / Suspendido
                        </>
                      )}
                    </span>
                  </td>

                  <td className="p-3.5 text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    {isSelf ? (
                      <span className="text-[10px] text-slate-500 italic select-none">No modificable</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={isLoading}
                          onClick={() => handleToggleActive(profile.id, profile.is_active)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-200 cursor-pointer ${
                            profile.is_active 
                              ? 'bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30' 
                              : 'bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/30'
                          }`}
                        >
                          {isLoading ? (
                            <RefreshCcw className="w-3 h-3 animate-spin mx-auto" />
                          ) : profile.is_active ? (
                            'Suspender'
                          ) : (
                            'Activar'
                          )}
                        </button>
                        {confirmDeleteId === profile.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              disabled={isLoading}
                              onClick={() => handleDelete(profile.id)}
                              className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-200 cursor-pointer bg-red-600 hover:bg-red-500 text-white shadow-md"
                            >
                              {isLoading ? <RefreshCcw className="w-3 h-3 animate-spin mx-auto" /> : 'Confirmar'}
                            </button>
                            <button
                              disabled={isLoading}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-200 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isLoading}
                            onClick={() => setConfirmDeleteId(profile.id)}
                            className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-200 cursor-pointer bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50"
                            title="Eliminar usuario permanentemente"
                          >
                            {isLoading ? <RefreshCcw className="w-3 h-3 animate-spin mx-auto" /> : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    )}
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
