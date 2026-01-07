
import React, { useState, useEffect } from 'react';
import { User, PunchType } from '../types';
import { Icons, COLORS } from '../constants';
import logo from '../assets/logo.png';

interface HomeScreenProps {
  user: User | null;
  isLanConnected: boolean;
  onPunch: (type: PunchType) => void;
  lastRecord: string | null
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, isLanConnected, onPunch, lastRecord }) => {
  const [time, setTime] = useState(new Date());
  const teste = localStorage.getItem('lastRecord')
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-6 space-y-6 flex flex-col min-h-full">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800">{getGreeting()}, {user?.name.split(' ')[0]}</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">{formatDate(time)}</p>
        </div>
        <div className="w-[130px] flex-row align-center justify-center">
            <img src={logo} />
        </div>
      </header>

      <section 
        style={{ backgroundColor: COLORS.primary }}
        className="rounded-[2.5rem] p-8 text-center text-white shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em] mb-2">Registro em Tempo Real</p>
        <div className="text-6xl font-black tracking-tighter mb-4 tabular-nums">
          {formatTime(time)}
        </div>
        
        <div className={`inline-flex items-center space-x-2 px-5 py-2 rounded-full text-[10px] font-black uppercase transition-colors duration-500 ${isLanConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          <div className={`w-2 h-2 rounded-full ${isLanConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-red-400'}`}></div>
          <span>{isLanConnected ? 'Rede FAZAG Conectada' : 'Acesso Restrito - Fora da LAN'}</span>
        </div>
      </section>

      {!isLanConnected && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-800 text-xs flex items-center space-x-3 shadow-sm animate-bounce">
          <span className="text-xl">📍</span>
          <p className="font-bold">Aproxime-se da unidade FAZAG para registrar seu ponto.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 flex-1">
        <PunchActionButton 
          label="Entrada" 
          onClick={() => onPunch(PunchType.ENTRY)}
          disabled={!isLanConnected}
          color="bg-white border-2 border-emerald-50 text-emerald-600"
          emoji="⏰"
          sub="Início Jornada"
        />
        <PunchActionButton 
          label="Intervalo" 
          onClick={() => onPunch(PunchType.BREAK_START)}
          disabled={!isLanConnected}
          color="bg-white border-2 border-amber-50 text-amber-600"
          emoji="☕"
          sub="Saída Almoço"
        />
        <PunchActionButton 
          label="Retorno" 
          onClick={() => onPunch(PunchType.BREAK_END)}
          disabled={!isLanConnected}
          color="bg-white border-2 border-sky-50 text-sky-600"
          emoji="🔁"
          sub="Volta Pausa"
        />
        <PunchActionButton 
          label="Saída" 
          onClick={() => onPunch(PunchType.EXIT)}
          disabled={!isLanConnected}
          color="bg-white border-2 border-slate-50 text-slate-700"
          emoji="🔒"
          sub="Fim Expediente"
        />
      </div>

      <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">
                <Icons.Clock />
            </div>
            <div className="text-[10px]">
                <p className="text-slate-400 font-bold uppercase">Último Registro</p>
                <p className="text-slate-800 font-black italic">Hoje às 08:02</p>
            </div>
        </div>
        <Icons.CheckCircle />
      </div>
    </div>
  );
};

const PunchActionButton: React.FC<{
  label: string, 
  onClick: () => void,
  disabled: boolean,
  color: string,
  emoji: string,
  subText?: string,
  sub?: string
}> = ({ label, onClick, disabled, color, emoji, sub }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale h-full min-h-[140px]`}
  >
    <div className="text-3xl mb-1">{emoji}</div>
    <span className="font-black text-sm uppercase tracking-tight">{label}</span>
    <span className="text-[9px] font-bold opacity-60 uppercase">{sub}</span>
  </button>
);

export default HomeScreen;
