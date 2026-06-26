/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function SecurityBadge() {
  return (
    <div id="security-badge" className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/40 border border-purple-800/50 rounded-full shadow-inner select-none">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
      <span className="text-[10px] text-purple-300 font-semibold tracking-wider uppercase">
        SGSI Activo · ISO/IEC 27001
      </span>
    </div>
  );
}
