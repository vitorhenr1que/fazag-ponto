
import React from 'react';
import { User } from '../types';
import { Logo, COLORS, Icons } from '../constants';

interface ProfileScreenProps {
  user: User | null;
  recordsCount: number;
  isLanConnected: boolean;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, recordsCount, isLanConnected, onLogout }) => {
  return (
    // Changed h-full to min-h-full and ensured the background covers the whole scrollable area
    <div className="flex flex-col min-h-full bg-slate-50">
      <header className="p-6 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meu Perfil</h2>
        <button 
          onClick={onLogout}
          className="text-red-500 font-black text-[10px] uppercase tracking-widest border border-red-100 px-4 py-2 rounded-xl active:bg-red-50 transition-colors bg-white shadow-sm"
        >
          Sair
        </button>
      </header>

      {/* Main content container with extra padding-bottom to avoid nav overlap */}
      <div className="p-6 space-y-6 pb-32">
        
        {/* User Avatar Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 w-full h-24 bg-slate-50 -z-10"></div>
          
          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-4 border-4 border-slate-50 shadow-md overflow-hidden ring-4 ring-white">
             {/* User Avatar Placeholder */}
             <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
             </svg>
          </div>
          
          <h3 className="text-xl font-black text-slate-800">{user?.name}</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Colaborador Institucional</p>
          
          {/* Status and Info Grid - Centered items */}
          <div className="mt-8 w-full grid grid-cols-2 gap-3">
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Total de Pontos</p>
                <p className="text-2xl font-black text-slate-800">{recordsCount}</p>
             </div>
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Status de Rede</p>
                <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-slate-200">
                   <div className={`w-2 h-2 rounded-full ${isLanConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-red-500'}`}></div>
                   <p className={`text-[10px] font-black uppercase ${isLanConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isLanConnected ? 'On-line' : 'Off-line'}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Detailed Info Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 ml-4">
            <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dados do Dispositivo</h4>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 divide-y divide-slate-50">
            <InfoRow label="Nome Completo" value={user?.name || "N/A"} first />
            <InfoRow label="CPF" value={user?.cpf || "N/A"} />
            <InfoRow label="Modelo Identificado" value={user?.deviceId.split('-')[1] ? `Smartphone ${user.deviceId.split('-')[1]}` : "Dispositivo Mobile"} />
            <InfoRow label="Registro Único (ID)" value={user?.deviceId || "N/A"} isMono last />
          </div>
        </div>

        {/* Brand Footer */}
        <div className="flex flex-col items-center pt-8 pb-4 opacity-30 grayscale transition-opacity hover:opacity-50">
          <Logo className="w-32" />
          <p className="text-[8px] font-black text-slate-500 mt-4 uppercase tracking-[0.3em]">Sistemas Internos Fazag</p>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ 
    label: string, 
    value: string, 
    isMono?: boolean,
    first?: boolean,
    last?: boolean
}> = ({ label, value, isMono, first, last }) => (
  <div className={`flex flex-col space-y-1 ${!first ? 'pt-4' : ''} ${!last ? 'pb-4' : ''}`}>
    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{label}</span>
    <span className={`text-slate-800 font-bold ${isMono ? 'font-mono text-[11px] break-all bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100' : 'text-sm'}`}>
        {value}
    </span>
  </div>
);

export default ProfileScreen;
