import * as React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';
import type { LogEntry } from '@/services/dashboard.service';

interface ActivityChartProps {
  log: LogEntry[];
}

export function ActivityChart({ log }: ActivityChartProps) {
  // Parse real log data to get hourly distribution
  const data = React.useMemo(() => {
    const hourlyCounts: Record<string, number> = {
      '09:00': 0, '10:00': 0, '11:00': 0, '12:00': 0, 
      '13:00': 0, '14:00': 0, '15:00': 0, '16:00': 0, '17:00': 0
    };

    if (log.length === 0) {
      return Object.keys(hourlyCounts).map(time => ({ time, patients: 0 }));
    }

    log.forEach(entry => {
      // Assuming entry.time is a string like "10:30 AM" or "14:45"
      // If we don't have time, we can't reliably chart it, but let's try to extract hour
      if (entry.time) {
        let hour = 12; // default
        const timeMatch = entry.time.match(/(\d+):(\d+)/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          if (entry.time.toLowerCase().includes('pm') && hour < 12) hour += 12;
          if (entry.time.toLowerCase().includes('am') && hour === 12) hour = 0;
        }
        
        // Map to nearest bucket
        const bucket = `${hour.toString().padStart(2, '0')}:00`;
        if (hourlyCounts[bucket] !== undefined) {
          hourlyCounts[bucket]++;
        }
      }
    });

    return Object.keys(hourlyCounts).map(time => ({
      time,
      patients: hourlyCounts[time]
    }));
  }, [log]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm w-full flex flex-col mb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-600">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Patient Influx Activity</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Today's Hourly Trend</p>
          </div>
        </div>
      </div>

      <div className="w-full mt-4 h-[250px]">
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#0F172A'
              }}
              itemStyle={{ color: '#0F766E' }}
            />
            <Area 
              type="monotone" 
              dataKey="patients" 
              stroke="#0F766E" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPatients)" 
              activeDot={{ r: 6, fill: '#0F766E', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
