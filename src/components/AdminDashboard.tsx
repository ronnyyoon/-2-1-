
import React, { useState } from 'react';
import { APP_CONFIG } from '@/src/config';
import { 
  Save, 
  RefreshCw, 
  Palette, 
  Type, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Database,
  Search,
  Edit2,
  Trash2,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../lib/FirebaseContext';
import { Student, SubjectInfo, CollegeAdmission } from '../types';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const { 
    students, 
    subjects, 
    historicalGpas, 
    admissions, 
    updateStudent, 
    updateSubject, 
    updateAdmission, 
    updateHistory 
  } = useFirebase();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [error, setError] = useState('');

  const [siteName, setSiteName] = useState(APP_CONFIG.schoolName);
  const [primaryColor, setPrimaryColor] = useState(APP_CONFIG.primaryColor);

  // Manual Edit State
  const [activeTab, setActiveTab] = useState<'students' | 'history' | 'admissions' | 'subjects'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === '여수고2학년' && adminPw === '123456789') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  const handleBulkSyncHistory = async () => {
    if (!window.confirm('기존의 1학년 성적 데이터를 모두 파일 데이터로 덮어쓰시겠습니까?')) return;
    setIsSaving(true);
    try {
      const { HISTORICAL_GPAS } = await import('../historical_data');
      for (const [id, data] of Object.entries(HISTORICAL_GPAS)) {
        await updateHistory(id, data);
      }
      alert('성공적으로 동기화되었습니다.');
    } catch (err) {
      console.error(err);
      alert('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = () => {
    switch (activeTab) {
      case 'students':
        return students.filter(s => s.name.includes(searchTerm) || s.id.includes(searchTerm));
      case 'subjects':
        return subjects.filter(s => s.name.includes(searchTerm));
      case 'admissions':
        return admissions.filter(a => a.university.includes(searchTerm) || a.department.includes(searchTerm));
      case 'history':
        return Object.keys(historicalGpas)
          .filter(id => id.includes(searchTerm) || students.find(s => s.id === id)?.name.includes(searchTerm))
          .map(id => ({ id, ...historicalGpas[id] }));
      default:
        return [];
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSaving(true);
    try {
      if (activeTab === 'students') await updateStudent(editingItem);
      else if (activeTab === 'subjects') await updateSubject(editingItem);
      else if (activeTab === 'admissions') await updateAdmission(editingItem);
      else if (activeTab === 'history') {
        const { id, ...historyData } = editingItem;
        await updateHistory(id, historyData);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditForm = () => {
    if (!editingItem) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      >
        <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit2 size={18} className="text-blue-400" />
              데이터 수기 수정
            </h3>
            <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'students' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">학번 (ID)</label>
                  <input disabled value={editingItem.id} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">이름</label>
                  <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">반</label>
                  <input value={editingItem.class} onChange={e => setEditingItem({...editingItem, class: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">과목 원점수 수정</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(editingItem.scores).map(subId => (
                      <div key={subId} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase w-16">{subId}</span>
                        <input 
                          type="number"
                          value={editingItem.scores[subId] || ''} 
                          onChange={e => setEditingItem({
                            ...editingItem, 
                            scores: { ...editingItem.scores, [subId]: e.target.value === '' ? null : Number(e.target.value) }
                          })} 
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">과목명</label>
                  <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">단위수</label>
                  <input type="number" value={editingItem.units} onChange={e => setEditingItem({...editingItem, units: Number(e.target.value)})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
              </div>
            )}

            {activeTab === 'admissions' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">대학교</label>
                  <input value={editingItem.university} onChange={e => setEditingItem({...editingItem, university: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">학과</label>
                  <input value={editingItem.department} onChange={e => setEditingItem({...editingItem, department: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">합격 등급</label>
                  <input type="number" step="0.01" value={editingItem.admissionGrade} onChange={e => setEditingItem({...editingItem, admissionGrade: Number(e.target.value)})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">전형 구분</label>
                  <input value={editingItem.admissionType} onChange={e => setEditingItem({...editingItem, admissionType: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">학번 (ID)</label>
                  <input disabled value={editingItem.id} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-500" />
                </div>
                <div className="p-3 bg-white/5 rounded-xl space-y-3 col-span-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase">1학년 성적 (표준/9등급제)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">1-1 등급</label>
                      <input type="number" step="0.1" value={editingItem["1-1-9"]} onChange={e => setEditingItem({...editingItem, "1-1-9": Number(e.target.value)})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">1-2 등급</label>
                      <input type="number" step="0.1" value={editingItem["1-2-9"]} onChange={e => setEditingItem({...editingItem, "1-2-9": Number(e.target.value)})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-xl space-y-3 col-span-2">
                  <p className="text-[10px] font-black text-emerald-400 uppercase">1학년 성적 (개정/5등급제)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">1-1 등급</label>
                      <input type="number" step="0.1" value={editingItem["1-1-5"]} onChange={e => setEditingItem({...editingItem, "1-1-5": Number(e.target.value)})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">1-2 등급</label>
                      <input type="number" step="0.1" value={editingItem["1-2-5"]} onChange={e => setEditingItem({...editingItem, "1-2-5": Number(e.target.value)})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={() => setEditingItem(null)} 
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-bold hover:bg-white/10 transition-all"
              >
                취소
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? '저장 중...' : '변경사항 적용'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-10 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-blue-600/20 text-blue-400 mb-4 ring-1 ring-blue-500/30">
               <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Authentication</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">관리자 인증이 필요합니다</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="관리자 ID"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder:text-slate-600 transition-all"
                />
              </div>
              <div className="relative">
                <Unlock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder:text-slate-600 transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs font-bold text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98]"
            >
              로그인
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">관리자 설정</h2>
          <p className="text-slate-400 text-sm mt-1">시스템 전역 설정 및 플랫폼 커스터마이징</p>
        </div>
        <button 
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-bold border border-white/5 transition-all"
        >
          관리자 로그아웃
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Data Management */}
        <div className="glass-card p-8 md:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2 bg-emerald-600/10 rounded-lg">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">데이터 수동 관리</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Manual Data Edit System</p>
              </div>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {(['students', 'history', 'admissions', 'subjects'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {tab === 'students' ? '학생' : tab === 'history' ? '1학년성적' : tab === 'admissions' ? '대입자료' : '과목'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="검색어 입력 (학번, 이름, 대학 등)..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white transition-all text-sm"
              />
            </div>
            {activeTab === 'history' && (
              <button
                onClick={handleBulkSyncHistory}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600/30 transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} className={isSaving ? "animate-spin" : ""} />
                파일데이터 강제 동기화
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredItems().map((item: any) => (
              <div 
                key={item.id} 
                onClick={() => setEditingItem(item)}
                className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 hover:bg-white/10 cursor-pointer transition-all flex flex-col group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-400 font-bold transition-colors">{item.id}</span>
                  <Edit2 size={12} className="text-slate-600 group-hover:text-blue-400" />
                </div>
                {activeTab === 'students' && (
                  <>
                    <p className="text-sm font-bold text-white mb-0.5">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.class}반 {item.number}번</p>
                  </>
                )}
                {activeTab === 'subjects' && (
                  <>
                    <p className="text-sm font-bold text-white mb-0.5">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.units}단위</p>
                  </>
                )}
                {activeTab === 'admissions' && (
                  <>
                    <p className="text-sm font-bold text-white mb-0.5 truncate">{item.university}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.department}</p>
                  </>
                )}
                {activeTab === 'history' && (
                  <>
                    <p className="text-sm font-bold text-white mb-0.5">
                      {students.find(s => s.id === item.id)?.name || '알 수 없음'}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-[9px] text-blue-400 font-bold">1-1: {item["1-1-9"] || '-'}</span>
                      <span className="text-[9px] text-emerald-400 font-bold">1-2: {item["1-2-9"] || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 text-blue-400">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <Type size={20} />
            </div>
            <h3 className="font-bold text-lg text-white">기본 정보 설정</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">학교 명칭</label>
              <input 
                type="text" 
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">대상 학년</label>
              <select 
                defaultValue="2학년"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white appearance-none transition-all"
              >
                <option className="bg-slate-900">1학년</option>
                <option className="bg-slate-900">2학년</option>
                <option className="bg-slate-900">3학년</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 text-purple-400">
            <div className="p-2 bg-purple-600/10 rounded-lg">
              <Palette size={20} />
            </div>
            <h3 className="font-bold text-lg text-white">테마 및 디자인</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">브랜드 컬러 (Primary)</label>
              <div className="flex gap-4 items-center p-1 bg-white/5 rounded-xl border border-white/10 pr-4">
                <input 
                  type="color" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-slate-300 text-sm font-bold tracking-tighter uppercase">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">폰트 스타일</label>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20">Pretendard</button>
                <button className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">Noto Sans KR</button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 border-blue-500/20">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-600/10 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">시스템 활성화 상태</h3>
              <p className="text-slate-400 text-sm">현재 모든 성적 데이터가 정상적으로 수집/예측되고 있습니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 hover:bg-white/10 transition-all">
              <RefreshCw size={18} />
              데이터 리셋
            </button>
            <button className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-95">
              <Save size={18} />
              변경사항 저장
            </button>
          </div>
        </div>
      </div>
      {renderEditForm()}
    </div>
  );
}
