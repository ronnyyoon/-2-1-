
import React from 'react';
import { motion } from 'motion/react';
import { LogIn, GraduationCap, ShieldCheck, Database, School } from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';

export default function Login() {
  const { signIn } = useFirebase();

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-10 space-y-8 relative z-10 border border-white/10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-2">
            <School className="text-blue-400" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            여수고등학교 <span className="text-blue-500">Grade Analysis</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            2학년 학생 성적 분석 및 대입 예측 시스템
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[
            { icon: GraduationCap, text: "개별 성적 상세 분석" },
            { icon: ShieldCheck, text: "안전한 데이터 관리" },
            { icon: Database, text: "실시간 데이터 동기화" }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <item.icon size={18} className="text-blue-400/70" />
              <span className="text-xs text-slate-300 font-bold">{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#0f172a] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] group"
        >
          <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          구글 계정으로 시작하기
        </button>

        <p className="text-[10px] text-slate-500 text-center font-bold tracking-tight">
          학교 웹메일(@yeosu.hs.kr) 또는 개인 구글 계정으로 로그인하세요.
        </p>
      </motion.div>
    </div>
  );
}
