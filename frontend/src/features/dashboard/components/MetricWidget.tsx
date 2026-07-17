import * as React from 'react';

interface MetricWidgetProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  trendIcon: React.ComponentType<any>;
  colorScheme: 'teal' | 'amber' | 'emerald' | 'blue' | 'indigo';
  pulse?: boolean;
}

export function MetricWidget({ title, value, subtitle, icon: Icon, trendIcon: TrendIcon, colorScheme, pulse }: MetricWidgetProps) {
  const colorMap = {
    teal: { bg: 'bg-teal-500', text: 'text-teal-650', lightBg: 'bg-teal-50/60', border: 'border-teal-100/40', textMuted: 'text-teal-500' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-650', lightBg: 'bg-amber-50/60', border: 'border-amber-100/40', textMuted: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-650', lightBg: 'bg-emerald-50/60', border: 'border-emerald-100/40', textMuted: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-650', lightBg: 'bg-blue-50/60', border: 'border-blue-100/40', textMuted: 'text-blue-500' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-650', lightBg: 'bg-indigo-50/60', border: 'border-indigo-100/40', textMuted: 'text-indigo-500' },
  };

  const colors = colorMap[colorScheme];

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${colors.bg}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{title}</span>
        </div>
        <div className={`${colors.lightBg} ${colors.text} p-1.5 rounded-lg border ${colors.border}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{value}</h3>
        <p className="text-[10px] font-semibold text-slate-400 mt-2.5 flex items-center gap-1">
          <TrendIcon className={`h-3.5 w-3.5 ${colors.textMuted} ${pulse ? 'animate-pulse' : ''}`} />
          <span>{subtitle}</span>
        </p>
      </div>
    </div>
  );
}
