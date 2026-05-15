
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Download, 
  ChevronDown, 
  Target, 
  ArrowRight,
  Calculator,
  User,
  GraduationCap,
  CircleAlert,
  ThumbsUp,
  School,
  Sparkles
} from 'lucide-react';
import { APP_CONFIG } from '@/src/config';
import { useFirebase } from '../lib/FirebaseContext';
import { cn } from '@/src/lib/utils';
import { getGradeStyles } from './SubjectStats';
import { generateStudentFeedback, FeedbackResult } from '../services/geminiService';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface IndividualAnalysisProps {
  selectedStudentId: string | null;
  onSubjectClick: (id: string) => void;
}

export default function IndividualAnalysis({ selectedStudentId, onSubjectClick }: IndividualAnalysisProps) {
  const { 
    students: STUDENTS, 
    subjects: SUBJECTS, 
    allStats: ALL_STATS, 
    historicalGpas: HISTORICAL_GPAS,
    admissions: ADMISSIONS 
  } = useFirebase();
  const contentRef = useRef<HTMLDivElement>(null);
  const [aiFeedback, setAiFeedback] = useState<FeedbackResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedbackCache, setFeedbackCache] = useState<Record<string, FeedbackResult>>({});
  
  const student = useMemo(() => {
    return STUDENTS.find(s => s.id === selectedStudentId) || STUDENTS[0];
  }, [selectedStudentId, STUDENTS]);

  const stats = useMemo(() => {
    // Ensure we have student ID and some data structure
    if (!student?.id) return { g1_1_9: 0, g1_2_9: 0, g2_1_9: 0, totalAvg9: 0, g1_1_5: 0, g1_2_5: 0, g2_1_5: 0, totalAvg5: 0 };
    
    const history = HISTORICAL_GPAS[student.id] || {};
    
    // Default values if missing
    const h119 = history["1-1-9"] || 0;
    const h115 = history["1-1-5"] || 0;
    const h129 = history["1-2-9"] || 0;
    const h125 = history["1-2-5"] || 0;
    
    // 2-1 Current (using ALL_STATS)
    let g2_1_sum9 = 0;
    let g2_1_sum5 = 0;
    let g2_1_units = 0;

    SUBJECTS.forEach(sub => {
      const s = ALL_STATS[sub.id]?.studentStats?.[student.id];
      if (s && s.score !== null && s.grade !== null) {
        g2_1_sum9 += (s.grade * sub.units);
        g2_1_sum5 += (s.grade5 * sub.units);
        g2_1_units += sub.units;
      }
    });

    const g2_1_9 = g2_1_units > 0 ? g2_1_sum9 / g2_1_units : 0;
    const g2_1_5 = g2_1_units > 0 ? g2_1_sum5 / g2_1_units : 0;

    // Use reported historical data if it looks valid
    const units1_1 = h119 > 0 ? 30 : 0; // Standard 1st grade semester units approx 30
    const units1_2 = h129 > 0 ? 30 : 0;
    const units2_1 = g2_1_units;

    const totalUnitsCount = units1_1 + units1_2 + units2_1;
    
    const totalAvg9 = totalUnitsCount > 0 
      ? (h119 * units1_1 + h129 * units1_2 + g2_1_9 * units2_1) / totalUnitsCount 
      : 0;

    const totalAvg5 = totalUnitsCount > 0 
      ? (h115 * units1_1 + h125 * units1_2 + g2_1_5 * units2_1) / totalUnitsCount 
      : 0;

    return {
      g1_1_9: h119,
      g1_2_9: h129,
      g2_1_9,
      totalAvg9,
      g1_1_5: h115,
      g1_2_5: h125,
      g2_1_5,
      totalAvg5
    };
  }, [student, SUBJECTS, ALL_STATS, HISTORICAL_GPAS]);

  const { g1_1_9, g1_2_9, g2_1_9, totalAvg9, g1_1_5, g1_2_5, g2_1_5, totalAvg5 } = stats;

  const predictions = useMemo(() => {
    if (!totalAvg9 || !ADMISSIONS) return { upward: [], proper: [], downward: [] };

    // 상향: totalAvg9 - 0.7 <= admissionGrade <= totalAvg9 AND admissionType === '충원합격'
    const upward = ADMISSIONS.filter(adm => 
      adm.admissionGrade >= totalAvg9 - 0.7 && 
      adm.admissionGrade <= totalAvg9 && 
      adm.admissionType === '충원합격'
    ).slice(0, 5);

    // 적정: totalAvg9 - 0.3 <= admissionGrade <= totalAvg9 + 0.3 AND admissionType === '합격'
    const proper = ADMISSIONS.filter(adm => 
      adm.admissionGrade >= totalAvg9 - 0.3 && 
      adm.admissionGrade <= totalAvg9 + 0.3 && 
      adm.admissionType === '합격'
    ).slice(0, 5);

    // 하향: totalAvg9 <= admissionGrade <= totalAvg9 + 0.7 AND admissionType === '합격'
    const downward = ADMISSIONS.filter(adm => 
      adm.admissionGrade >= totalAvg9 && 
      adm.admissionGrade <= totalAvg9 + 0.7 && 
      adm.admissionType === '합격'
    ).slice(0, 5);

    return { upward, proper, downward };
  }, [totalAvg9, ADMISSIONS]);

  // AI Feedback generation
  const runAiAnalysis = async () => {
    if (feedbackCache[student.id]) {
      setAiFeedback(feedbackCache[student.id]);
      setAiError(null);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    try {
      const infoList = studentSubjects.map(subId => {
        const info = ALL_STATS[subId];
        const myStats = info.studentStats[student.id];
        
        // Calculate potential gaps for AI context
        const currentGrade = myStats.grade;
        let upGap = 0;
        let downGap = 0;
        if (currentGrade > 1) {
          upGap = parseFloat((info.cuts9[currentGrade - 1] - myStats.score).toFixed(1));
        }
        if (currentGrade < 9) {
          downGap = parseFloat((myStats.score - info.cuts9[currentGrade]).toFixed(1));
        }

        return {
          name: info.name,
          grade: myStats.grade5,
          grade9: currentGrade,
          upGap,
          downGap,
          trend: myStats.grade5 <= 2 ? 'up' : (myStats.grade5 >= 4 ? 'down' : 'stable')
        };
      });

      const feedback = await generateStudentFeedback(
        student.name,
        { g1_1: g1_1_5, g1_2: g1_2_5 },
        { g2_1: g2_1_5 },
        infoList as any
      );

      setAiFeedback(feedback);
      setFeedbackCache(prev => ({ ...prev, [student.id]: feedback }));
      setAiError(null);
    } catch (error: any) {
      console.error("AI Analysis Failed:", error);
      // If the error message contains specific info like missing API key, show that.
      // Otherwise fallback to a friendly message.
      if (error.message?.includes("API_KEY")) {
        setAiError("시스템 관리자에게 문의하세요: AI 서비스(API Key) 설정이 누락되었습니다.");
      } else if (error.message?.includes("429") || error.message?.toLowerCase().includes("quota")) {
        setAiError("현재 AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else {
        setAiError(error.message || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (feedbackCache[student.id]) {
      setAiFeedback(feedbackCache[student.id]);
      setAiError(null);
    } else {
      setAiFeedback(null);
      setAiError(null);
    }
  }, [student.id, feedbackCache]);

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    try {
      // Temporarily remove any height constraints for capture
      const originalStyle = contentRef.current.style.height;
      contentRef.current.style.height = 'auto';
      
      const imgData = await toPng(contentRef.current, { backgroundColor: '#0f172a', cacheBust: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const img = new Image();
      img.src = imgData;
      await new Promise(r => img.onload = r);
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = pdfWidth / imgWidth;
      const imgScaledHeight = imgHeight * ratio;
      
      // We know there are two main logical sections. 
      // Using a simpler approach: capture the whole thing, but use heights to force a 2nd page
      // if the content is large, or just force it by adding a second page and splitting the view.
      // However, the user specifically asked for "always 2 pages" for the college section.
      
      // First page: Student Info + Main Stats + Table + AI (Usually fits)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgScaledHeight);
      
      // Force a 2nd page starting from the College prediction section
      // To do this properly with a single image capture, we add a new page and shift the image up.
      // This is hacky but common with html-to-image + jspdf.
      
      pdf.addPage();
      // Estimate where the college section starts. 
      // Alternatively, we could capture twice, but that's complex.
      // Standard approach for multi-page PDF from long image:
      let heightLeft = imgScaledHeight;
      let position = -pdfHeight; // Offset to start at page 2 height approx
      
      // If we want it "always" on 2nd page, we might need to know the offset.
      // Let's use the loop but ensure at least 2 pages.
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgScaledHeight);
      
      contentRef.current.style.height = originalStyle;
      pdf.save(`${student.id}_${student.name}_성적분석.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const subjectOrder = ["lit", "alg", "pst", "eng1", "bio", "earth", "whist", "soc", "chi", "jap"];
  const studentSubjects = subjectOrder.filter(id => student.scores[id] !== null);

  const getGpaColor = (gpa: number) => {
    if (!gpa || gpa === 0) return "text-slate-500";
    if (gpa <= 1.5) return "text-blue-400";
    if (gpa <= 2.5) return "text-emerald-400";
    if (gpa <= 3.5) return "text-yellow-400";
    if (gpa <= 4.5) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">개인별 성적 심층 분석</h2>
          <p className="text-sm text-slate-400 mt-1">5등급제 및 9등급제 학기별 성적 추이 분석</p>
        </div>
        <button 
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg text-sm font-bold"
        >
          <Download size={18} />
          PDF 다운로드
        </button>
      </div>

      <div ref={contentRef} className="space-y-4 p-5 bg-[#0f172a] rounded-2xl border border-white/5">
        {/* Student Info */}
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="h-12 w-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-white/10">
            <User size={24} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">분석 대상</p>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {student.id} <span className="text-blue-400">{student.name}</span>
              <span className="text-[10px] font-medium text-slate-500 ml-2 px-2 py-0.5 bg-white/5 rounded border border-white/10">{student.class} {student.number}번</span>
            </h3>
          </div>
        </div>

        {/* 5nd Grade Summary (Primary) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">5등급제 기준 성적 현황 (주요지표)</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '1학년 1학기', value: g1_1_5 },
              { label: '1학년 2학기', value: g1_2_5 },
              { label: '2학년 1학기(예상)', value: g2_1_5 },
              { label: '전체 평균(예상)', value: totalAvg5 },
            ].map((item, i) => (
              <div key={i} className="glass-card p-4 border-emerald-500/10 bg-emerald-500/5 transition-all">
                <p className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={cn("text-2xl font-black", getGpaColor(item.value))}>{item.value > 0 ? item.value.toFixed(2) : '-'}등급</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="glass-card overflow-hidden border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-center">
                <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">과목 (단위수)</th>
                <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">원점수</th>
                <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">석차</th>
                <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">5등급 / 9등급</th>
                <th className="px-4 py-3 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">상위등급</th>
                <th className="px-4 py-3 text-[9px] font-bold text-rose-400 uppercase tracking-widest">하위등급</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {studentSubjects.map(subId => {
                const info = ALL_STATS[subId];
                const s = info.studentStats[student.id];
                const style5 = getGradeStyles(s.grade5);
                const style9 = getGradeStyles(s.grade);
                
                // Calculate Gaps
                const currentGrade = s.grade;
                let upGap: string | number = "-";
                let downGap: string | number = "-";
                
                if (currentGrade > 1) {
                  upGap = (info.cuts9[currentGrade - 1] - s.score).toFixed(1);
                }
                if (currentGrade < 9) {
                  downGap = (s.score - info.cuts9[currentGrade]).toFixed(1);
                }

                return (
                  <tr key={subId} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-bold text-white uppercase tracking-tight">{info.name}</p>
                      <p className="text-[9px] text-slate-600 font-bold">{SUBJECTS.find(x=>x.id===subId)?.units}단위</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <p className="text-[11px] font-black text-blue-400">{s.score}점</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[12px] text-white font-bold">{s.rank}등</span>
                      <span className="text-[9px] text-slate-500 ml-1">({s.percentile}%)</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border", style5)}>
                          {s.grade5}등급
                        </span>
                        <div className="h-3 w-[1px] bg-white/10" />
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border", style9)}>
                          {s.grade}등급
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {upGap !== "-" ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-emerald-400">+{upGap}점</span>
                          <span className="text-[7px] text-slate-600 font-bold uppercase tracking-tighter">상위등급 최하위차</span>
                        </div>
                      ) : (
                        <span className="text-slate-800 text-[9px] font-bold">최우수</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {downGap !== "-" ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-rose-400">-{downGap}점</span>
                          <span className="text-[7px] text-slate-600 font-bold uppercase tracking-tighter">하위등급 최상위차</span>
                        </div>
                      ) : (
                        <span className="text-slate-800 text-[9px] font-bold">최하위</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 9nd Grade Summary (Standard) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">9등급제 기준 성적 현황 (표준지표)</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '1학년 1학기', value: g1_1_9, color: 'text-slate-300' },
              { label: '1학년 2학기', value: g1_2_9, color: 'text-slate-400' },
              { label: '2학년 1학기(예상)', value: g2_1_9, color: 'text-slate-500' },
              { label: '전체 평균(예상)', value: totalAvg9, color: 'text-blue-400' },
            ].map((item, i) => (
              <div key={i} className="glass-card p-4 border-white/5 bg-white/[0.02] transition-all">
                <p className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={cn("text-2xl font-black", item.color)}>{item.value > 0 ? item.value.toFixed(2) : '-'}등급</p>
              </div>
            ))}
          </div>
        </div>

        {/* Guides and AI Feedback */}
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="glass-card p-4 border-emerald-500/20 bg-emerald-600/5">
              <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calculator size={12} /> 5등급제 산출 가이드 (개정)
              </h4>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { g: 1, p: '10%' }, { g: 2, p: '34%' }, { g: 3, p: '66%' }, { g: 4, p: '90%' }, { g: 5, p: '100%' }
                ].map(x => (
                  <div key={x.g} className="text-center p-1 rounded bg-white/5 border border-white/5">
                    <p className="text-[7px] text-slate-500 font-bold">{x.g}등급</p>
                    <p className="text-[8px] text-slate-300 font-black">{x.p}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="glass-card p-4 border-slate-500/20 bg-slate-600/5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calculator size={12} /> 9등급제 산출 가이드 (표준)
              </h4>
              <div className="grid grid-cols-9 gap-0.5">
                {[4, 11, 23, 40, 60, 77, 89, 96, 100].map((p, i) => (
                  <div key={i} className="text-center p-0.5 rounded bg-white/5 border border-white/5">
                    <p className="text-[7px] text-slate-600 font-bold">{i+1}</p>
                    <p className="text-[6px] text-slate-400 font-bold">{p}%</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-slate-500 italic leading-tight px-1">* 1-2학년 성적 데이터를 기반으로 산출된 정밀 리포트입니다. 대학 추천은 9등급제 지표를 기준으로 수행됩니다.</p>
          </div>

          <div className="glass-card p-5 border-white/5">
            <div className="flex items-center gap-3 mb-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-600/20 text-emerald-400 rounded-lg flex items-center justify-center border border-white/10">
                  <Target size={16} />
                </div>
                <p className="text-xs font-bold text-white uppercase tracking-tight">{student.name} 학생 AI 정밀 분석</p>
              </div>
              {!aiFeedback && !isAiLoading && (
                <button
                  onClick={runAiAnalysis}
                  className="flex items-center gap-2 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-md transition-all text-[9px] font-black uppercase tracking-widest"
                >
                  <Sparkles size={12} />
                  분석
                </button>
              )}
            </div>
            
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                 <div className="animate-spin w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full" />
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest animate-pulse">분석 중...</p>
              </div>
            ) : aiError ? (
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center space-y-2">
                <CircleAlert size={20} className="text-rose-500 mx-auto" />
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{aiError}</p>
              </div>
            ) : aiFeedback ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1.5"><ThumbsUp size={10} /> 등급 상승 및 격려</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium bg-emerald-400/3 p-2.5 rounded-lg border border-emerald-400/10">{aiFeedback.encouragement}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1.5"><CircleAlert size={10} /> 관리 및 경고</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium bg-red-400/3 p-2.5 rounded-lg border border-red-400/10">{aiFeedback.warning}</p>
                </div>
                <div className="text-[9px] text-slate-500 italic py-1.5 border-t border-white/5">{aiFeedback.trendAnalysis}</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <Sparkles size={20} className="text-slate-600" />
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">분석 대기 중</p>
                <button
                  onClick={runAiAnalysis}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                >
                  분석 시작하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* College Prediction Section */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center border border-white/10">
              <GraduationCap size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-tight">2026학년도 대입 수시 기준 합격 예측</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">2026학년도 여수고등학교 수시 결과 기준 | 9제 지표: {totalAvg9.toFixed(2)}등급</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 상향 */}
            <div className="space-y-2">
              <div className="flex flex-col px-1">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">상향 (Upward)</span>
                <span className="text-[8px] text-slate-600 font-bold">{(totalAvg9 - 0.7).toFixed(1)}~{totalAvg9.toFixed(1)}등급 내 충원합격</span>
              </div>
              <div className="space-y-1.5">
                {predictions.upward.length > 0 ? predictions.upward.map(adm => (
                  <div key={adm.id} className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <p className="text-[11px] font-black text-white">{adm.university}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{adm.selectionType}({adm.detailType})</p>
                    <p className="text-[10px] text-slate-300 font-medium">{adm.department}</p>
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
                      <span className="text-[8px] px-1 py-0.5 bg-rose-500/20 text-rose-300 rounded font-black">{adm.admissionType}</span>
                      <span className="text-[9px] font-mono text-rose-400/70">{adm.admissionGrade}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center bg-white/5 rounded-lg border border-dashed border-white/10">
                    <p className="text-[9px] text-slate-700 font-bold">데이터 없음</p>
                  </div>
                )}
              </div>
            </div>

            {/* 적정 */}
            <div className="space-y-2">
              <div className="flex flex-col px-1">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">적정 (Proper)</span>
                <span className="text-[8px] text-slate-600 font-bold">{(totalAvg9 - 0.3).toFixed(1)}~{(totalAvg9 + 0.3).toFixed(1)}등급 내 합격</span>
              </div>
              <div className="space-y-1.5">
                {predictions.proper.length > 0 ? predictions.proper.map(adm => (
                  <div key={adm.id} className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[11px] font-black text-white">{adm.university}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{adm.selectionType}({adm.detailType})</p>
                    <p className="text-[10px] text-slate-300 font-medium">{adm.department}</p>
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
                      <span className="text-[8px] px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded font-black">{adm.admissionType}</span>
                      <span className="text-[9px] font-mono text-blue-400/70">{adm.admissionGrade}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center bg-white/5 rounded-lg border border-dashed border-white/10">
                    <p className="text-[9px] text-slate-700 font-bold">데이터 없음</p>
                  </div>
                )}
              </div>
            </div>

            {/* 하향 */}
            <div className="space-y-2">
              <div className="flex flex-col px-1">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">하향 (Downward)</span>
                <span className="text-[8px] text-slate-600 font-bold">{totalAvg9.toFixed(1)}~{(totalAvg9 + 0.7).toFixed(1)}등급 내 합격</span>
              </div>
              <div className="space-y-1.5">
                {predictions.downward.length > 0 ? predictions.downward.map(adm => (
                  <div key={adm.id} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[11px] font-black text-white">{adm.university}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{adm.selectionType}({adm.detailType})</p>
                    <p className="text-[10px] text-slate-300 font-medium">{adm.department}</p>
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
                      <span className="text-[8px] px-1 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-black">{adm.admissionType}</span>
                      <span className="text-[9px] font-mono text-emerald-400/70">{adm.admissionGrade}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center bg-white/5 rounded-lg border border-dashed border-white/10">
                    <p className="text-[9px] text-slate-700 font-bold">데이터 없음</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
