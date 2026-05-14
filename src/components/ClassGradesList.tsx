
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useFirebase } from '../lib/FirebaseContext';
import { ListFilter, User, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

import { getGradeStyles } from './SubjectStats';

interface ClassGradesListProps {
  onSubjectClick: (id: string) => void;
}

export default function ClassGradesList({ onSubjectClick }: ClassGradesListProps) {
  const { students: STUDENTS, subjects: SUBJECTS, allStats: ALL_STATS } = useFirebase();
  const [selectedClass, setSelectedClass] = useState("2학년 1반");
  
  const classes = useMemo(() => {
    return Array.from(new Set(STUDENTS.map(s => s.class))).sort();
  }, [STUDENTS]);

  const classStudents = useMemo(() => {
    return STUDENTS.filter(s => s.class === selectedClass).sort((a, b) => a.id.localeCompare(b.id));
  }, [selectedClass, STUDENTS]);

  const orderedSubjects = useMemo(() => {
    const displayOrder = ["lit", "alg", "pst", "eng1", "bio", "earth", "whist", "soc", "chi", "jap"];
    return [...SUBJECTS].sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id));
  }, [SUBJECTS]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">학반등급일람표</h2>
          <p className="text-slate-400 text-sm mt-1">학급별 학생들의 전 과목 성적 일람</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10">
          {classes.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                selectedClass === c ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400 hover:text-white"
              )}
            >
              {c.replace("2학년 ", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card shadow-2xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="sticky left-0 bg-[#0f172a] px-2 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest z-20 border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.3)] w-[85px]">성명 (번호)</th>
                {orderedSubjects.map(sub => (
                  <th key={sub.id} className="px-0.5 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center group border-r border-white/5 last:border-r-0">
                    <button 
                      onClick={() => onSubjectClick(sub.id)}
                      className="hover:text-blue-400 transition-colors w-full"
                    >
                      <div className="truncate px-0.5">{sub.name}</div>
                      <div className="text-[7px] text-slate-700 mt-0.5 group-hover:text-blue-600">{sub.units}단</div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {classStudents.map(student => (
                <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group text-[10px]">
                  <td className="sticky left-0 bg-[#161f31] px-2 py-3 z-10 border-r border-white/5 group-hover:bg-[#1e293b] transition-colors shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200 truncate">{student.name}</span>
                      <span className="text-[8px] text-slate-500 font-mono font-bold uppercase">{student.number}번</span>
                    </div>
                  </td>
                  {orderedSubjects.map(sub => {
                    const stats = ALL_STATS[sub.id].studentStats[student.id];
                    return (
                      <td key={sub.id} className="px-0.5 py-2 text-center border-r border-white/5 last:border-r-0">
                        {stats && stats.score !== null ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-blue-400/90">{stats.score}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase mt-0.5 px-1 py-0.5 rounded-sm ring-1 ring-inset inline-block",
                              getGradeStyles(stats.grade5).replace("rounded-lg", "")
                            )}>
                              {stats.grade5}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-800">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
