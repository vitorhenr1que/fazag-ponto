
import React from 'react';
import { PunchRecord, User } from '../types';
import { Icons, COLORS } from '../constants';
import logo from '../assets/logo.png';

interface ReceiptScreenProps {
  record: PunchRecord;
  user: User | null;
  onBack: () => void;
}

const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ record, user, onBack }) => {
  const timestamp = new Date(record.timestamp);
  const formattedDate = timestamp.toLocaleDateString('pt-BR');
  const formattedTime = timestamp.toLocaleTimeString('pt-BR');

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <header className="p-6 bg-white border-b flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 active:scale-90 transition-transform">
          <Icons.ArrowLeft />
        </button>
        <h2 className="ml-2 text-lg font-black text-slate-800 uppercase tracking-tight">Comprovante Digital</h2>
      </header>

      <div className="flex-1 p-6 flex flex-col">
        {/* Receipt UI */}
        <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden flex-1 border border-slate-200">
          {/* Official Logo Header */}
          <div className="text-center mb-8 pb-8 border-b border-dashed border-slate-200">
            <img src={logo} className="w-full mb-4" />
            <div className="space-y-1">
              <h3 className="font-black text-sm text-slate-900 uppercase">Registro Eletrônico de Ponto</h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Controle Interno • Portaria 671/21</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5">
              <DetailBox label="Colaborador" value={user?.nome || "N/A"} />
              <DetailBox label="CPF" value={user?.cpf || "N/A"} />
            </div>
            
            <div className="py-6 px-4 bg-slate-50 rounded-[2rem] flex flex-col items-center border border-slate-100 shadow-inner">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Operação Realizada</p>
              <h4 className="text-2xl font-black text-slate-800 uppercase italic">{record.type}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailBox label="Data do Registro" value={formattedDate} />
              <DetailBox label="Hora Exata" value={formattedTime} />
            </div>

            <div className="pt-6 border-t border-dashed border-slate-200 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Autenticação de Segurança</p>
              <MiniDetail label="Terminal/Dispositivo" value={record.deviceId} />
              <MiniDetail label="Protocolo" value={record.id} isMono />
              <MiniDetail label="Hash SHA-256" value={record.hash.substr(0, 20) + '...'} isMono />
            </div>
          </div>

          {/* Validation Seal */}
          <div className="mt-10 flex flex-col items-center">
            <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-6 py-2 rounded-full border border-emerald-100 shadow-sm">
              <Icons.CheckCircle />
              <span className="font-black text-xs tracking-tighter">REGISTRO AUTENTICADO</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-6 text-center leading-relaxed font-bold uppercase">
              Gerado em {new Date().toLocaleString('pt-BR')} <br/>
              Acesso exclusivo via LAN segura FAZAG
            </p>
          </div>

          {/* Ticket Edge Decoration */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-6">
             {[...Array(10)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-slate-100 rounded-full"></div>
             ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button className="flex items-center justify-center space-x-2 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all">
            <Icons.Download />
            <span>PDF</span>
          </button>
          <button style={{ backgroundColor: COLORS.primary }} className="flex items-center justify-center space-x-2 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
            <Icons.Share />
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailBox: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">{label}</span>
    <span className="text-slate-800 font-black text-sm">{value}</span>
  </div>
);

const MiniDetail: React.FC<{ label: string, value: string, isMono?: boolean }> = ({ label, value, isMono }) => (
  <div className="flex justify-between items-center text-[10px]">
    <span className="text-slate-400 font-bold uppercase">{label}</span>
    <span className={`text-slate-600 font-bold ${isMono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

export default ReceiptScreen;
