import React, { useMemo, useState } from 'react';
import { PunchRecord, PunchType } from '../types';
import { Icons } from '../constants';

interface HistoryScreenProps {
  records: PunchRecord[];
  onViewReceipt: (id: string) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ records, onViewReceipt }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const dataSource: PunchRecord[] = useMemo(() => records ?? [], [records]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const dayHasRecords = (day: number) => {
    return dataSource.some((r) => {
      const d = new Date(r.timestamp);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const selectedDayRecords = useMemo(() => {
    if (selectedDay === null) return [];
    return dataSource
      .filter((r) => {
        const d = new Date(r.timestamp);
        return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [dataSource, selectedDay, month, year]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <h2 className="text-xl font-black text-slate-800">Meu Histórico</h2>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-[2rem] shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800">
              {months[month]} <span className="text-slate-400 font-normal">{year}</span>
            </h3>
            <div className="flex space-x-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <Icons.ChevronLeft />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <Icons.ChevronRight />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-4 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasData = dayHasRecords(day);
              const isSelected = selectedDay === day;

              const now = new Date();
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-sm font-bold transition-all
                    ${isSelected ? 'bg-slate-800 text-white shadow-lg scale-110' : 'text-slate-600 hover:bg-slate-50'}
                    ${isToday && !isSelected ? 'border-2 border-slate-200' : ''}
                  `}
                >
                  {day}
                  {hasData && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 pb-24">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Registros {selectedDay ? `de ${selectedDay} de ${months[month]}` : ''}
            </h4>
            <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">
              {selectedDayRecords.length}
            </span>
          </div>

          {selectedDayRecords.length === 0 ? (
            <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-[2rem] p-10 text-center">
              <p className="text-slate-400 text-sm italic">Nenhum registro para esta data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayRecords.map((record) => (
                <HistoryItem key={record.id} record={record} onClick={() => onViewReceipt(record.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HistoryItem: React.FC<{ record: PunchRecord; onClick: () => void }> = ({ record, onClick }) => {
  const getStyle = (type: PunchType) => {
    switch (type) {
      case PunchType.ENTRY:
        return { bg: 'bg-emerald-50', emoji: '⏰' };
      case PunchType.BREAK_START:
        return { bg: 'bg-amber-50', emoji: '☕' };
      case PunchType.BREAK_END:
        return { bg: 'bg-sky-50', emoji: '🔁' };
      case PunchType.EXIT:
        return { bg: 'bg-slate-100', emoji: '🔒' };
      default:
        return { bg: 'bg-slate-100', emoji: '🕒' };
    }
  };

  const style = getStyle(record.type);
  const time = new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center text-xl`}>
          {style.emoji}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-tight">{record.type}</p>
          <p className="text-xl font-black text-slate-800 tabular-nums">{time}</p>
        </div>
      </div>
      <button className="px-4 py-2 bg-slate-50 text-[10px] font-black uppercase text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
        Ver Recibo
      </button>
    </div>
  );
};

export default HistoryScreen;
