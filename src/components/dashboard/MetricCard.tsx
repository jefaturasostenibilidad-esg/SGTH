/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Star, ShieldAlert, Coins } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  const getIcon = () => {
    if (icon === '💰') return <Coins className="w-5 h-5 text-emerald-400" />;
    if (label.includes('Evaluación')) return <Star className="w-5 h-5 text-amber-400 fill-amber-400" />;
    return <ShieldAlert className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div 
      id={`metric-card-${label.replace(/\s+/g, '-').toLowerCase()}`}
      className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/5 flex items-center justify-between shadow-md"
    >
      <div className="space-y-1">
        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">{label}</span>
        <div className="text-xl font-bold font-mono text-white">{value}</div>
      </div>
      <div className="p-2.5 rounded-lg bg-indigo-900/10 border border-indigo-800/20 shadow-inner">
        {getIcon()}
      </div>
    </div>
  );
}
