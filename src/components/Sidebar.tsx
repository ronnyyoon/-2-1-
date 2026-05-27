import React from 'react';
import { Calculator, LayoutDashboard, Bell, Settings, LogOut, ChevronRight, ListFilter, GraduationCap, Trophy } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { APP_CONFIG } from '@/src/config';
import { motion } from 'motion/react';

import { useFirebase } from '@/src/lib/FirebaseContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, isLegacyAdmin, signOut } = useFirebase();
  const isAdmin = (user && !user.isAnonymous) || isLegacyAdmin;

  const menuItems = [
    { id: 'dashboard', label: '전체 일람표', icon: LayoutDashboard },
    { id: 'top-20', label: '상위20명일람표', icon: Trophy },
    { id: 'class-grades', label: '학반등급일람표', icon: ListFilter },
    { id: 'subject-stats', label: '과목별성적', icon: GraduationCap },
    { id: 'predictor', label: '개인별 성적분석', icon: Calculator },
    { id: 'admin', label: '관리자 설정', icon: Settings },
  ];

  return (
    <div className="w-64 h-full bg-white/5 backdrop-blur-xl flex flex-col border-r border-white/10 z-20">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/20">Y</div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white line-clamp-1">
              {APP_CONFIG.schoolName}
            </h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{APP_CONFIG.grade} 성적시스템</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-blue-600/20 text-white border border-blue-500/30" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className={cn(activeTab === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400 transition-colors")} />
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
            {activeTab === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
              />
            )}
            {activeTab === item.id && <ChevronRight size={14} className="text-blue-400" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        {(user || isLegacyAdmin) && (
          <button 
            id="logout-btn" 
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors w-full group"
          >
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="font-semibold text-sm">로그아웃</span>
          </button>
        )}
      </div>
    </div>
  );
}
