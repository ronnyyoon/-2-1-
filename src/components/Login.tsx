
import React from 'react';
import { motion } from 'motion/react';
import { LogIn, GraduationCap, ShieldCheck, Database, School } from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';

export default function Login() {
  const { signIn, adminLogin } = useFirebase();

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

        <div className="space-y-4">
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#0f172a] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            구글 계정으로 시작하기
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-[#0f172a] px-3 text-slate-600">또는 관리자 로그인</span>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const id = formData.get('adminId') as string;
              const pw = formData.get('adminPw') as string;
              if (adminLogin(id, pw)) {
                // Success - the context will update and App will redirect
              } else {
                alert("아이디 또는 비밀번호가 일치하지 않습니다.");
              }
            }}
            className="space-y-3"
          >
            <input 
              name="adminId"
              type="text" 
              placeholder="관리자 ID" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white text-sm"
            />
            <input 
              name="adminPw"
              type="password" 
              placeholder="비밀번호" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white text-sm"
            />
            <button 
              type="submit"
              className="w-full py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"
            >
              관리자 계정 접속
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-500 text-center font-bold tracking-tight">
          학교 웹메일(@yeosu.hs.kr) 또는 개인 구글 계정으로 로그인하세요.
        </p>
      </motion.div>
    </div>
  );
}
