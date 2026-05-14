
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../lib/FirebaseContext';
import { GraduationCap, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const getGradeStyles = (grade: number) => {
  switch (grade) {
    case 1: return "bg-blue-500/20 text-blue-400 ring-blue-500/30";
    case 2: return "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30";
    case 3: return "bg-yellow-500/20 text-yellow-500/70 ring-yellow-500/30 font-black";
    case 4: return "bg-orange-500/20 text-orange-400 ring-orange-500/30";
    case 5: return "bg-red-500/20 text-red-400 ring-red-500/30";
    case 6: return "bg-rose-500/10 text-rose-300 ring-rose-500/20";
    case 7: return "bg-slate-500/20 text-slate-400 ring-slate-500/30";
    case 8: return "bg-slate-600/20 text-slate-500 ring-slate-600/30";
    case 9: return "bg-slate-700/20 text-slate-600 ring-slate-700/30";
    default: return "bg-slate-500/20 text-slate-400 ring-slate-500/30";
  }
};

export const getGradeBarColor = (grade: number) => {
  switch (grade) {
    case 1: return "bg-blue-500";
    case 2: return "bg-emerald-500";
    case 3: return "bg-yellow-500";
    case 4: return "bg-orange-500";
    case 5: return "bg-red-500";
    default: return "bg-slate-500";
  }
};

type SortKey = 'id' | 'name' | 'score' | 'rank' | 'percentile' | 'grade' | 'grade5';

interface SubjectStatsProps {
  initialSubjectId?: string | null;
}

export default function SubjectStats({ initialSubjectId }: SubjectStatsProps) {
  const { students: STUDENTS, subjects: SUBJECTS, allStats: ALL_STATS } = useFirebase();
  const [selectedSub, setSelectedSub] = useState(initialSubjectId || SUBJECTS[0].id);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'rank', direction: 'asc' });

  const stats = useMemo(() => ALL_STATS[selectedSub], [selectedSub, ALL_STATS]);

  const sortedStudents = useMemo(() => {
    if (!stats || !stats.studentStats) return [];
    const attendees = STUDENTS.filter(s => s.scores[selectedSub] !== null).map(s => ({
      id: s.id,
      name: s.name,
      ...(stats.studentStats[s.id] as any)
    }));

    return attendees.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      const res = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }, [selectedSub, stats, sortConfig]);

  const frequency = useMemo(() => {
    const binSize = 5;
    const bins = Array(20).fill(0);
    Object.values(stats.studentStats).forEach(s => {
      if (s.score !== null) {
        const idx = Math.min(Math.floor(s.score / binSize), 19);
        bins[idx]++;
      }
    });
    return bins; // 0-5, 5-10, ..., 95-100
  }, [stats]);

  const maxFreq = Math.max(...frequency, 1);
  const yAxisMarkers = [maxFreq, Math.round(maxFreq * 0.75), Math.round(maxFreq * 0.5), Math.round(maxFreq * 0.25), 0];

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">과목별성적</h2>
          <p className="text-slate-400 text-sm mt-1">과목별 성적 분포 및 학생 세부 기록</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 max-w-2xl justify-end">
          {(() => {
            const displayOrder = ["lit", "alg", "pst", "eng1", "bio", "earth", "whist", "soc", "chi", "jap"];
            return [...SUBJECTS].sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id)).map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  selectedSub === sub.id ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                )}
              >
                {sub.name}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Frequency Table / Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg">
                <BarChart3 size={18} />
              </div>
              <h3 className="font-bold text-white">도수분포표</h3>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score Distribution (Step: 5pts)</div>
          </div>
          
          <div className="flex">
            {/* Y-Axis */}
            <div className="flex flex-col justify-between h-56 pb-8 pr-3 border-r border-white/10 text-[9px] font-bold text-slate-500 w-8">
              {yAxisMarkers.map((m, i) => <span key={i}>{m}</span>)}
            </div>

            <div className="flex-1 h-56 flex items-end gap-[1px] px-2 relative pt-4 bg-white/[0.02] rounded-r-xl">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 py-4 pl-1">
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="border-t border-white/20 w-full" />)}
              </div>
              
              {frequency.map((count, i) => {
                const height = (count / (maxFreq || 1)) * 100;
                const scoreRange = `${i * 5}~${(i + 1) * 5}`;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-2xl z-50 ring-1 ring-white/10 border border-white/10">
                      <p className="text-blue-400">{count}명</p>
                      <p className="text-[9px] text-slate-400">{scoreRange}점</p>
                    </div>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      className={cn(
                        "w-full rounded-t-[2px] transition-all border-x border-black/20",
                        i >= 16 ? "bg-blue-500" : 
                        i >= 12 ? "bg-indigo-500" : 
                        i >= 8 ? "bg-emerald-500" : 
                        i >= 4 ? "bg-amber-500" : "bg-rose-500"
                      )}
                    />
                    <div className="absolute bottom-0 w-full h-[1px] bg-white/20" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6 space-y-4">
           <h3 className="font-bold text-white mb-4">과목 요약</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">평균</span>
                <span className="text-white font-bold">{stats.average}점</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">총 응시자</span>
                <span className="text-white font-bold">{stats.totalStudents}명</span>
              </div>
              <div className="pt-4 border-t border-white/5">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">5등급제 등급 컷</p>
                 <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map(g => (
                      <div key={g} className="text-center">
                         <div className="text-[8px] text-slate-600 font-bold">{g}컷</div>
                         <div className="text-[10px] text-slate-300 font-bold">{stats.cuts5[g]}</div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {[
                { key: 'id', label: '학번' },
                { key: 'name', label: '이름' },
                { key: 'score', label: '원점수' },
                { key: 'rank', label: '등위' },
                { key: 'grade5', label: '5등급제' },
                { key: 'grade', label: '9등급제' }
              ].map(col => (
                <th 
                  key={col.key} 
                  onClick={() => requestSort(col.key as SortKey)}
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {sortedStudents.map(student => (
                <motion.tr 
                  layout
                  key={student.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{student.id}</td>
                  <td className="px-6 py-4 font-bold text-white">{student.name}</td>
                  <td className="px-6 py-4 font-bold text-blue-400">{student.score}</td>
                  <td className="px-6 py-4 text-slate-300 font-bold">{student.rank}등 <span className="text-[9px] text-slate-500">({student.percentile}%)</span></td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold ring-1",
                      getGradeStyles(student.grade5)
                    )}>
                      {student.grade5}등급
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold ring-1",
                      getGradeStyles(student.grade)
                    )}>
                      {student.grade}등급
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
