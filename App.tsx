import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, User, PunchRecord, PunchType } from './types';
import AuthScreen from './views/AuthScreen';
import HomeScreen from './views/HomeScreen';
import HistoryScreen from './views/HistoryScreen';
import ReceiptScreen from './views/ReceiptScreen';
import ProfileScreen from './views/ProfileScreen';
import BottomNav from './components/BottomNav';
import { useLanConnection } from './utils/useLanConnection';
import api from './services/api';

import { mapPrismaToPunchRecord, PrismaHistoryItem } from './utils/historyMapper';

const STORAGE_USER = 'fazag_user';
const STORAGE_RECORDS = 'fazag_records';
const STORAGE_LAST = 'lastRecord';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('AUTH');
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const { isLanConnected } = useLanConnection({
    intervalMs: 5000,
    timeoutMs: 1500,
    failThreshold: 2,
  });

 

  // 1) Carrega user + records do localStorage (instantâneo)
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_USER);
    const savedRecords = localStorage.getItem(STORAGE_RECORDS);

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('HOME');
    }

    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch {
        localStorage.removeItem(STORAGE_RECORDS);
      }
    }
  }, []);

  // 2) Sincroniza histórico 1x com o backend quando tiver user (sem ficar chamando sempre)
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const resp = await api.get<{ historicos: PrismaHistoryItem[] }>(
          `${import.meta.env.VITE_API_URL}:3333/history/${user.id}`
        );

        if (cancelled) return;

        const mapped = mapPrismaToPunchRecord(resp.data.historicos || []);

        // opcional: ordena mais recente primeiro (combina com seu spread [new,...records])
        const sorted = [...mapped].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        setRecords(sorted);
        localStorage.setItem(STORAGE_RECORDS, JSON.stringify(sorted));
      } catch (e) {
        // Se falhar, não quebra a UX: continua com o localStorage
        console.log('Falha ao sincronizar histórico:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLogin = async (newUser: User) => {
    try {
      const response = await api.post(`${import.meta.env.VITE_API_URL}:3333/signin`, { deviceId: newUser.deviceId });

      setUser(response.data.user);
      localStorage.setItem(STORAGE_USER, JSON.stringify(response.data.user));
      setView('HOME');

      return response.data;
    } catch (e: any) {
      if (e?.status === 401) {
        setErrorMessage('O ID do dispositivo não foi passado corretamente.');
        return;
      }
      if (e?.status === 403) {
        setErrorMessage('Dispositivo não cadastrado.');
        return;
      }
      setErrorMessage(`Erro de conexão com o servidor.`);
      console.log({ error: e });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_USER);
    setUser(null);
    setView('AUTH');
  };

  // helper: salva estado + localStorage juntos
  const commitRecords = useCallback((next: PunchRecord[]) => {
    setRecords(next);
    localStorage.setItem(STORAGE_RECORDS, JSON.stringify(next));
  }, []);

   const frontTypeToBackend = (t: PunchType) => {
  switch (t) {
    case PunchType.ENTRY: return 'ENTRY';
    case PunchType.BREAK_START: return 'BREAK_START';
    case PunchType.BREAK_END: return 'BREAK_END';
    case PunchType.EXIT: return 'EXIT';
  }
};

  // 5) Bater ponto: envia ao banco e usa o retorno real
  const handlePunch = useCallback(
    async (type: PunchType) => {
      if (!isLanConnected) return;
      if (!user?.id || !user?.deviceId) return;

      try {
        const resp = await api.post<{
          success: boolean;
          historico: PrismaHistoryItem;
        }>(`${import.meta.env.VITE_API_URL}:3333/punch`, {
          userId: user.id,
          deviceId: user.deviceId,
          type: frontTypeToBackend(type),
        });

        const createdMapped = mapPrismaToPunchRecord([resp.data.historico])[0];

        // adiciona no topo (mais recente primeiro)
        const updated = [createdMapped, ...records];
        commitRecords(updated);

        // abre recibo desse registro real do banco
        setSelectedReceiptId(createdMapped.id);
        setView('RECEIPT');

        localStorage.setItem(STORAGE_LAST, createdMapped.timestamp);
      } catch (e: any) {
        console.log('Erro ao bater ponto:', e);
      }
    },
    [isLanConnected, user?.id, user?.deviceId, records, commitRecords]
  );

  const viewReceipt = (id: string) => {
    setSelectedReceiptId(id);
    setView('RECEIPT');
  };

  const selectedRecord = records.find((r) => r.id === selectedReceiptId);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {view === 'AUTH' && <AuthScreen onLogin={handleLogin} errorMessage={errorMessage} user={user} />}

        {view === 'HOME' && (
          <HomeScreen
            user={user}
            isLanConnected={isLanConnected}
            onPunch={handlePunch}
            lastRecord={localStorage.getItem(STORAGE_LAST)}
          />
        )}

        {view === 'HISTORY' && <HistoryScreen records={records} onViewReceipt={viewReceipt} />}

        {view === 'PROFILE' && (
          <ProfileScreen
            user={user}
            recordsCount={records.length}
            isLanConnected={isLanConnected}
            onLogout={handleLogout}
          />
        )}

        {view === 'RECEIPT' && selectedRecord && (
          <ReceiptScreen record={selectedRecord} user={user} onBack={() => setView('HISTORY')} />
        )}
      </main>

      {view !== 'AUTH' && (
        <BottomNav
          activeView={view === 'RECEIPT' ? 'HISTORY' : view}
          onViewChange={(v) => {
            if (v === 'RECEIPT') setView('HISTORY');
            else setView(v);
          }}
        />
      )}
    </div>
  );
};

export default App;
