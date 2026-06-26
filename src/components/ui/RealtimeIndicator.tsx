/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wifi, WifiOff } from 'lucide-react';

interface RealtimeIndicatorProps {
  connected: boolean;
  lastUpdate: Date;
}

export function RealtimeIndicator({ connected, lastUpdate }: RealtimeIndicatorProps) {
  return (
    <div 
      id="realtime-indicator" 
      className={`flex items-center gap-2 px-3 py-1 border rounded-lg transition-all duration-300 ${
        connected 
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
          : 'bg-amber-950/20 border-amber-800/40 text-amber-400'
      }`}
    >
      {connected ? (
        <Wifi className="w-3.5 h-3.5 animate-pulse" />
      ) : (
        <WifiOff className="w-3.5 h-3.5" />
      )}
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold tracking-wider uppercase select-none">
          {connected ? 'Realtime Conectado' : 'Sincronizando'}
        </span>
        <span className="text-[9px] text-slate-400 font-mono">
          Act: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
