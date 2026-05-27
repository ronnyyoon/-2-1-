/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DetailedStats from './components/DetailedStats';
import TopStudentsList from './components/TopStudentsList';
import ClassGradesList from './components/ClassGradesList';
import SubjectStats from './components/SubjectStats';
import IndividualAnalysis from './components/IndividualAnalysis';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bell, Search, HelpCircle, ChevronDown, ListFilter, Users, Plus, Minus, Loader2, LogOut } from 'lucide-react';
import { useFirebase } from './lib/FirebaseContext';
import { cn } from './lib/utils';

export default function App() {
  const { students: STUDENTS, isLoading, user, isLegacyAdmin, signIn, signOut } = useFirebase();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeTab === 'login' && (user || isLegacyAdmin)) {
      setActiveTab(isLegacyAdmin ? 'admin' : 'dashboard');
    }
  }, [user, isLegacyAdmin, activeTab]);

  const toggleClass = (className: string) => {
    setExpandedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className) 
        : [...prev, className]
    );
  };

  const navigateToSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setActiveTab('subject-stats');
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery || !STUDENTS) return [];
    return STUDENTS.filter(s => 
      s.name.includes(searchQuery) || s.id.includes(searchQuery)
    );
  }, [searchQuery, STUDENTS]);

  const classes = useMemo(() => {
    if (!STUDENTS) return [];
    const classList = Array.from(new Set(STUDENTS.map(s => s.class))).sort();
    return classList.map(c => ({
      name: c,
      students: STUDENTS.filter(s => s.class === c).sort((a,b) => a.id.localeCompare(b.id))
    }));
  }, [STUDENTS]);

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    setSearchQuery('');
    setActiveTab('predictor');
    setIsDropdownOpen(false);
  };

  const currentStudent = useMemo(() => {
    if (!STUDENTS || STUDENTS.length === 0) return null;
    return STUDENTS.find(s => s.id === (selectedStudentId || STUDENTS[0].id)) || STUDENTS[0];
  }, [selectedStudentId, STUDENTS]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DetailedStats onSubjectClick={navigateToSubject} />;
      case 'top-20':
        return <TopStudentsList onSubjectClick={navigateToSubject} onStudentClick={handleStudentSelect} />;
      case 'class-grades':
        return <ClassGradesList onSubjectClick={navigateToSubject} />;
      case 'subject-stats':
        return <SubjectStats initialSubjectId={selectedSubjectId} key={selectedSubjectId} />;
      case 'predictor':
        return <IndividualAnalysis selectedStudentId={selectedStudentId} onSubjectClick={navigateToSubject} />;
      case 'admin':
        return <AdminDashboard />;
      case 'login':
        return <Login />;
      default:
        return <DetailedStats onSubjectClick={navigateToSubject} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0f172a] overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[150px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px]"></div>
      </div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-20 glass-header flex items-center justify-between px-8 shrink-0 relative z-50">
          <div className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학생 이름 또는 학번을 검색하세요..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all text-slate-100 placeholder:text-slate-500"
            />
            
            <AnimatePresence>
              {searchQuery && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 w-full mt-2 glass-card p-2 z-[100] max-h-60 overflow-y-auto"
                >
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(s => {
                      const duplicates = STUDENTS.filter(st => st.name === s.name).length > 1;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleStudentSelect(s.id)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-lg flex items-center justify-between group transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white uppercase">{s.name} <span className="text-[10px] text-slate-500 font-mono ml-2">({s.id})</span></span>
                            <span className="text-[10px] text-slate-400 font-bold">{s.class}</span>
                          </div>
                          <ChevronDown size={14} className="-rotate-90 text-slate-600 group-hover:text-blue-400 transition-colors" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">일치하는 학생이 없습니다</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
              >
                <ListFilter size={18} className="text-blue-400" />
                <span className="text-sm font-bold text-slate-300">학생 선택</span>
                <ChevronDown size={16} className={cn("text-slate-500 transition-transform", isDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-[#1e293b] border border-white/20 rounded-2xl p-4 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[500px] overflow-y-auto"
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">반별 학생 명단</p>
                    {classes.map(c => {
                      const isExpanded = expandedClasses.includes(c.name);
                      return (
                        <div key={c.name} className="mb-2 last:mb-0">
                          <button 
                            onClick={() => toggleClass(c.name)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group border border-white/5"
                          >
                            <span className="text-xs font-bold text-slate-200">{c.name}</span>
                            {isExpanded ? <Minus size={12} className="text-blue-400" /> : <Plus size={12} className="text-slate-500 group-hover:text-slate-300" />}
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-1 p-2">
                                  {c.students.map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => handleStudentSelect(s.id)}
                                      className="text-left px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-blue-600/20 hover:text-blue-400 rounded-md transition-all flex justify-between items-center"
                                    >
                                      <span>{s.name}</span>
                                      <span className="text-[8px] text-slate-600 font-mono">{s.id.substring(2)}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-10 w-[1px] bg-white/10" />
            
            <div className="flex items-center gap-3 group relative">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase">{currentStudent.name}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tight">{currentStudent.class} {currentStudent.number}번</p>
              </div>
              {!user && !isLegacyAdmin && (
                 <button 
                   onClick={() => setActiveTab('login')}
                   className="h-10 w-10 bg-white/5 text-slate-500 rounded-full flex items-center justify-center border border-white/10 shadow-sm hover:bg-white/10 hover:text-blue-400 transition-all"
                   title="관리자 로그인"
                 >
                    <User size={20} />
                 </button>
              )}
              {(user || isLegacyAdmin) && (
                <button 
                  onClick={signOut}
                  className="h-10 w-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-white/10 shadow-sm ring-1 ring-blue-500/20 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="로그아웃"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedStudentId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="h-8 px-6 bg-black/20 backdrop-blur-sm border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
          <div className="flex gap-4">
            <span>© 2026 여수고등학교 학사관리팀</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> 시스템 정상 작동 중</span>
          </div>
          <div className="flex gap-4">
            <span>이용약관</span>
            <span>개인정보처리방침</span>
            <span>관리자 문의: 061-123-4567</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

