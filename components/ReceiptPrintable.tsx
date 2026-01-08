import React, { forwardRef } from 'react';
import { PunchRecord, User } from '../types';
import { Icons } from '../constants';
import logo from '../assets/logo.png';

type Props = {
  record: PunchRecord;
  user: User | null;
  generatedAt?: Date;
};

const DetailBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">{label}</span>
    <span className="text-slate-800 font-black text-sm">{value}</span>
  </div>
);

const MiniDetail: React.FC<{ label: string; value: string; isMono?: boolean }> = ({ label, value, isMono }) => (
  <div className="flex justify-between items-center text-[10px]">
    <span className="text-slate-400 font-bold uppercase">{label}</span>
    <span className={`text-slate-600 font-bold ${isMono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

/**
 * ✅ Esse componente é o “corpo do PDF”.
 * Ele pode ser renderizado invisível na tela e capturado pelo html2canvas.
 */
export const ReceiptPrintable = forwardRef<HTMLDivElement, Props>(({ record, user, generatedAt }, ref) => {
  const timestamp = new Date(record.timestamp);
  const formattedDate = timestamp.toLocaleDateString('pt-BR');
  const formattedTime = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const gen = generatedAt ?? new Date();

  return (
    <div
      ref={ref}
      // 🔥 Fundo branco e largura controlada ajuda MUITO o PDF a ficar bonito
      className="bg-white p-8 w-[800px] max-w-[800px]"
      style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
    >
      <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden border border-slate-200">
        {/* Official Logo Header */}
        <div className="text-center mb-8 pb-8 border-b border-dashed border-slate-200">
          <img src={logo} className="w-full mb-4" />
          <div className="space-y-1">
            <h3 className="font-black text-sm text-slate-900 uppercase">Registro Eletrônico de Ponto</h3>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
              Controle Interno • Portaria 671/21
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <DetailBox label="Colaborador" value={user?.nome || 'N/A'} />
            <DetailBox label="CPF" value={user?.cpf || 'N/A'} />
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">
              Autenticação de Segurança
            </p>
            <MiniDetail label="Terminal/Dispositivo" value={record.deviceId} />
            <MiniDetail label="Protocolo" value={record.id} isMono />
            <MiniDetail label="Hash SHA-256" value={(record.hash ?? '').slice(0, 20) + '...'} isMono />
          </div>
        </div>

        {/* Validation Seal */}
        <div className="mt-10 flex flex-col items-center">
          <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-6 py-2 rounded-full border border-emerald-100 shadow-sm">
            <Icons.CheckCircle />
            <span className="font-black text-xs tracking-tighter">REGISTRO AUTENTICADO</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-6 text-center leading-relaxed font-bold uppercase">
            Gerado em {gen.toLocaleString('pt-BR')}
            <br />
            Acesso exclusivo via LAN segura FAZAG
          </p>
        </div>
      </div>
    </div>
  );
});
ReceiptPrintable.displayName = 'ReceiptPrintable';
