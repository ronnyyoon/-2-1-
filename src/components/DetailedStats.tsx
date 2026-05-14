
import React from 'react';
import { motion } from 'motion/react';
import { useFirebase } from '../lib/FirebaseContext';
import { GraduationCap, Users, Hash } from 'lucide-react';

interface DetailedStatsProps {
  onSubjectClick: (id: string) => void;
}

export default function DetailedStats({ onSubjectClick }: DetailedStatsProps) {
  const { subjects: SUBJECTS, allStats: ALL_STATS } = useFirebase();
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">전체 일람표</h2>
        <p className="text-slate-400 text-sm mt-1">과목별 전체 성적 통계 및 등급 인원 현황</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">과목명</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">응시자수</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">과목평균</th>
                {[1, 2, 3, 4, 5].map((grade) => (
                  <th key={grade} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    {grade}등급 (인원 / 컷)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(() => {
                const subjectOrder = ["lit", "alg", "pst", "eng1", "bio", "earth", "whist", "soc", "chi", "jap"];
                return [...SUBJECTS].sort((a, b) => subjectOrder.indexOf(a.id) - subjectOrder.indexOf(b.id)).map((subject) => {
                  const info = ALL_STATS[subject.id];
                  if (!info) return null;
                  return (
                    <motion.tr 
                      key={subject.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => onSubjectClick(subject.id)}
                          className="flex items-center gap-3 text-left hover:text-blue-400 group transition-all"
                        >
                          <div className="w-1.5 h-6 bg-blue-500 rounded-full group-hover:scale-y-125 transition-transform" />
                          <span className="font-bold text-white uppercase group-hover:text-blue-400">{subject.name}</span>
                          <span className="text-[10px] text-slate-600 font-bold group-hover:text-slate-400">({subject.units}단위)</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-slate-300">
                          <Users size={14} className="text-slate-500" />
                          <span className="font-semibold">{info.totalStudents}명</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-blue-400">{info.average}</td>
                      {[1, 2, 3, 4, 5].map((g) => {
                        const count = Object.values(info.studentStats).filter((s: any) => s.grade5 === g).length;
                        return (
                          <td key={g} className="px-6 py-4">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-white">{count}명</span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{info.cuts5[g]}점~</span>
                            </div>
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
