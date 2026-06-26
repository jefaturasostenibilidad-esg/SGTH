/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, TrendingUp } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string | number;
  icon: string;
  color: 'purple' | 'gold' | 'red' | 'orange' | 'blue';
  alert?: boolean;
  suffix?: string;
}

export function KPICard({ label, value, subValue, icon, color, alert, suffix }: KPICardProps) {
  const colorClasses = {
    purple: {
      bg: 'bg-indigo-950/20',
      border: 'border-indigo-800/30',
      text: 'text-indigo-400',
      shadow: 'shadow-[0_0_15px_rgba(108,60,225,0.05)]'
    },
    gold: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-800/30',
      text: 'text-amber-400',
      shadow: 'shadow-[0_0_15px_rgba(245,166,35,0.05)]'
    },
    red: {
      bg: 'bg-rose-950/40 animate-pulse border-rose-700/60',
      border: 'border-rose-800/60',
      text: 'text-rose-400',
      shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]'
    },
    orange: {
      bg: 'bg-orange-950/20',
      border: 'border-orange-800/30',
      text: 'text-orange-400',
      shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.05)]'
    },
    blue: {
      bg: 'bg-sky-950/20',
      border: 'border-sky-800/30',
      text: 'text-sky-400',
      shadow: 'shadow-[0_0_15px_rgba(14,165,233,0.05)]'
    }
  };

  const currentTheme = colorClasses[color];

  return (
    <div 
      id={`kpi-card-${label.replace(/\s+/g, '-').toLowerCase()}`}
      className={`relative p-5 rounded-xl border ${currentTheme.bg} ${currentTheme.border} ${currentTheme.shadow} transition-all duration-300 hover:scale-[1.02] hover:border-purple-600/30 group`}
    >
      {alert && (
        <div className="absolute top-3 right-3 flex items-center justify-center text-rose-500 animate-bounce">
          <AlertTriangle className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          {label}
        </span>
        <span className="text-xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {icon}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight text-white`}>
          {value}
        </span>
        {suffix && (
          <span className="text-xs text-slate-400 font-medium">
            {suffix}
          </span>
        )}
      </div>

      {subValue !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs text-slate-400 font-medium">
            Total absoluto: <strong className="text-indigo-300 font-semibold">{subValue}</strong>
          </span>
        </div>
      )}

      {alert && (
        <div className="mt-2.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 text-center">
          Umbral Excedido (Límite Crítico)
        </div>
      )}
    </div>
  );
}
