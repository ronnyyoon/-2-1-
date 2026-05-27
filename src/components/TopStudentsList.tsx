import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useFirebase } from '../lib/FirebaseContext';
import { Trophy, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getGradeStyles } from './SubjectStats';

interface TopStudentsListProps {
  onSubjectClick: (id: string) => void;
  onStudentClick?: (id: string) => void;
}

export default function TopStudentsList({ onSubjectClick, onStudentClick }: TopStudentsListProps) {
  const { students: STUDENTS, subjects: SUBJECTS, allStats: ALL_STATS, historicalGpas: HISTORICAL_GPAS } = useFirebase();

  // Sort subjects as specified: 문학, 대수, 확률과통계, 영어Ⅰ, 생명과학, 지구과학, 세계사, 사회와문화, 중국어, 일본어
  const orderedSubjects = useMemo(() => {
    const displayOrder = ["lit", "alg", "pst", "eng1", "bio", "earth", "whist", "soc", "chi", "jap"];
    return [...SUBJECTS].sort((a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id));
  }, [SUBJECTS]);

  const topStudents = useMemo(() => {
    if (!STUDENTS || STUDENTS.length === 0) return [];

    const computedList = STUDENTS.map(student => {
      const history = HISTORICAL_GPAS[student.id] || {};
      const h119 = history["1-1-9"] || 0;
      const h115 = history["1-1-5"] || 0;
      const h129 = history["1-2-9"] || 0;
      const h125 = history["1-2-5"] || 0;

      // Current 2-1
      let g2_1_sum9 = 0;
      let g2_1_sum5 = 0;
      let g2_1_units = 0;

      orderedSubjects.forEach(sub => {
        const s = ALL_STATS[sub.id]?.studentStats?.[student.id];
        if (s && s.score !== null && s.grade !== null) {
          g2_1_sum9 += (s.grade * sub.units);
          g2_1_sum5 += (s.grade5 * sub.units);
          g2_1_units += sub.units;
        }
      });

      const g2_1_9 = g2_1_units > 0 ? g2_1_sum9 / g2_1_units : 0;
      const g2_1_5 = g2_1_units > 0 ? g2_1_sum5 / g2_1_units : 0;

      // 1학년 가중치용 단위수
      const units1_1 = h119 > 0 ? 30 : 0;
      const units1_2 = h129 > 0 ? 30 : 0;
      const units2_1 = g2_1_units;

      const totalUnitsCount = units1_1 + units1_2 + units2_1;

      // 전체 평균 (예상) - 1학년 1학기 + 1학년 2학기 + 2학년 1학기 예상
      const totalAvg9 = totalUnitsCount > 0 
        ? (h119 * units1_1 + h129 * units1_2 + g2_1_9 * units2_1) / totalUnitsCount 
        : 0;

      const totalAvg5 = totalUnitsCount > 0 
        ? (h115 * units1_1 + h125 * units1_2 + g2_1_5 * units2_1) / totalUnitsCount 
        : 0;

      // 1학년 통계 계산
      let count1 = 0;
      let sum1_9 = 0;
      let sum1_5 = 0;
      if (h119 > 0) { sum1_9 += h119; sum1_5 += h115; count1++; }
      if (h129 > 0) { sum1_9 += h129; sum1_5 += h125; count1++; }
      
      const avg1_9 = count1 > 0 ? sum1_9 / count1 : 0;
      const avg1_5 = count1 > 0 ? sum1_5 / count1 : 0;

      return {
        student,
        totalAvg5,
        totalAvg9,
        avg1_5,
        avg1_9,
        g2_1_units
      };
    });

    // 5등급제 전체평균(예상)이 유효하고 우수한 순서대로 정렬 (낮을수록 우수함)
    return computedList
      .filter(x => x.totalAvg5 > 0)
      .sort((a, b) => a.totalAvg5 - b.totalAvg5)
      .slice(0, 20);
  }, [STUDENTS, ALL_STATS, HISTORICAL_GPAS, orderedSubjects]);

  const renderTrend = (avg1: number, totalAvg: number) => {
    if (avg1 === 0 || totalAvg === 0) return <span className="text-slate-600">-</span>;
    // 성적이 올랐다 = 등급 수치가 낮아졌다
    const diff = avg1 - totalAvg;
    if (diff > 0.005) {
      return (
        <span className="text-blue-400 font-bold inline-flex items-center gap-0.5 text-[9px]">
          <TrendingUp size={10} />
          ▲{diff.toFixed(2)}
        </span>
      );
    } else if (diff < -0.005) {
      return (
        <span className="text-red-400 font-bold inline-flex items-center gap-0.5 text-[9px]">
          <TrendingDown size={10} />
          ▼{Math.abs(diff).toFixed(2)}
        </span>
      );
    } else {
      return (
        <span className="text-slate-500 font-medium inline-flex items-center gap-0.5 text-[9px]">
          <Minus size={10} />
          0.00
        </span>
      );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">상위 20명 일람표</h2>
        <p className="text-slate-400 text-sm mt-1">1학년 1학기부터 2학년 1학기(예상) 전체 평균(예상) 5등급제 기준 상위 20명 일람표</p>
      </div>

      <div className="glass-card shadow-2xl shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1240px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="sticky left-0 bg-[#0f172a] px-2 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest z-20 border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.3)] w-[50px] text-center">순위</th>
                <th className="sticky left-[50px] bg-[#0f172a] px-3 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest z-20 border-r border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.3)] w-[100px]">성명 (학반)</th>
                
                <th className="px-3 py-4 text-[9px] font-bold text-yellow-500 uppercase tracking-widest border-r border-white/5 w-[150px] text-center bg-yellow-500/5">
                  1열. 전체 평균(예상)
                  <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">5등급제 / 9등급제 (변동)</span>
                </th>
                
                <th className="px-3 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-r border-white/5 w-[130px] text-center">
                  2열. 1학년 평균
                  <span className="block text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">5등급제 / 9등급제</span>
                </th>

                {orderedSubjects.map(sub => (
                  <th key={sub.id} className="px-1 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center group border-r border-white/5 last:border-r-0">
                    <button 
                      onClick={() => onSubjectClick(sub.id)}
                      className="hover:text-blue-400 transition-colors w-full animate-none"
                    >
                      <div className="truncate px-0.5">{sub.name}</div>
                      <div className="text-[7px] text-slate-700 mt-0.5 group-hover:text-blue-600 font-mono font-bold">{sub.units}단위</div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topStudents.map((item, index) => {
                const rank = index + 1;
                const { student, totalAvg5, totalAvg9, avg1_5, avg1_9 } = item;
                
                return (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group text-[10px]">
                    {/* Rank */}
                    <td className="sticky left-0 bg-[#161f31] px-2 py-3.5 z-10 border-r border-white/5 group-hover:bg-[#1e293b] transition-colors shadow-[4px_0_8px_rgba(0,0,0,0.3)] text-center font-mono font-black text-slate-400">
                      {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                    </td>

                    {/* Student Info */}
                    <td className="sticky left-[50px] bg-[#161f31] px-3 py-3.5 z-10 border-r border-white/5 group-hover:bg-[#1e293b] transition-colors shadow-[4px_0_8px_rgba(0,0,0,0.3)]">
                      <div className="flex flex-col">
                        <button
                          onClick={() => onStudentClick && onStudentClick(student.id)}
                          className="font-bold text-slate-200 hover:text-blue-400 transition-colors text-left flex items-center gap-1"
                        >
                          {student.name}
                        </button>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                          {student.class.replace("2학년 ", "")} ({student.number}번)
                        </span>
                      </div>
                    </td>

                    {/* Col 1. 전체 평균 (예상) */}
                    <td className="px-3 py-3 font-mono border-r border-white/5 text-center bg-yellow-500/[0.01]">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="font-extrabold text-white text-xs">{totalAvg5.toFixed(2)}</span>
                          <span className="text-[7.5px] text-slate-500 font-bold mb-0.5">등급(5)</span>
                          {renderTrend(avg1_5, totalAvg5)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="font-bold text-slate-400 text-[10px]">{totalAvg9.toFixed(2)}</span>
                          <span className="text-[7.5px] text-slate-600 font-bold mb-0.5">등급(9)</span>
                          {renderTrend(avg1_9, totalAvg9)}
                        </div>
                      </div>
                    </td>

                    {/* Col 2. 1학년 평균 */}
                    <td className="px-3 py-3 font-mono border-r border-white/5 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center gap-1 justify-center">
                          <span className="font-bold text-slate-300 text-[11px]">{avg1_5 > 0 ? avg1_5.toFixed(2) : '-'}</span>
                          <span className="text-[7.5px] text-slate-500 font-bold mb-0.5">등급(5)</span>
                        </div>
                        <div className="flex items-center gap-1 justify-center">
                          <span className="font-medium text-slate-500 text-[10px]">{avg1_9 > 0 ? avg1_9.toFixed(2) : '-'}</span>
                          <span className="text-[7.5px] text-slate-600 font-bold mb-0.5">등급(9)</span>
                        </div>
                      </div>
                    </td>

                    {/* Subjects 2-1 Predict Grades */}
                    {orderedSubjects.map(sub => {
                      const stats = ALL_STATS[sub.id]?.studentStats?.[student.id];
                      return (
                        <td key={sub.id} className="px-1 py-3 text-center border-r border-white/5 last:border-r-0">
                          {stats && stats.score !== null ? (
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {/* 5등급 */}
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1 py-0.5 rounded-sm ring-1 ring-inset inline-block leading-none",
                                getGradeStyles(stats.grade5).replace("rounded-lg", "")
                              )}>
                                {stats.grade5}
                              </span>
                              {/* 9등급 */}
                              <span className={cn(
                                "text-[8px] font-bold mt-0.5 inline-block scale-90",
                                getGradeStyles(stats.grade).split(' ')[1] // Get color class
                              )}>
                                {stats.grade}등급
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-800">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
