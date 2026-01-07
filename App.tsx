
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, User, PunchRecord, PunchType } from './types';
import AuthScreen from './views/AuthScreen';
import HomeScreen from './views/HomeScreen';
import HistoryScreen from './views/HistoryScreen';
import ReceiptScreen from './views/ReceiptScreen';
import ProfileScreen from './views/ProfileScreen';
import BottomNav from './components/BottomNav';
import { useLanConnection } from './utils/useLanConnection';
import axios from 'axios';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('AUTH');
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined) 

  // Initialize data from localStorage
  useEffect(() => {
    // handleLogout()
    const savedUser = localStorage.getItem('fazag_user');
    const savedRecords = localStorage.getItem('fazag_records');
  
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('HOME');
    }
    
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
    
   
  }, []);

  const { isLanConnected, isOnline } = useLanConnection({
  // se você quiser fixar IP do servidor:
  // pingUrl: "http://192.168.0.10:5173/__ping",
  intervalMs: 5000,
  timeoutMs: 1500,
  failThreshold: 2,
});
  // Mock LAN check - in real world would try hitting a local endpoint



  const handleLogin = async ( newUser: User ) => { // Função de Login
    try {

     const response = await axios.post('http://192.168.0.3:3333/signin', { deviceId: newUser.deviceId })
     console.log(response.data)
    setUser(response.data.user);
    localStorage.setItem('fazag_user', JSON.stringify(response.data.user));
    setView('HOME');
    
    return response.data
    }catch(e: any){
      
      if(e.status === 401){
        setErrorMessage("O ID do dispositivo não foi passado corretamente.")
        console.log({error: e})
        return;
      }
      if(e.status === 403){
        setErrorMessage("Dispositivo não cadastrado.")
        console.log({error: e})
        return;
      }
      setErrorMessage("Erro de conexão com o servidor.")
      return console.log({error: e.status})
    }
    
  };

  const handleLogout = () => { // Função de Logout
    localStorage.removeItem('fazag_user');
    setUser(null);
    setView('AUTH');
  };

  const handlePunch = (type: PunchType) => {
    if (!isLanConnected) return;

    const newRecord: PunchRecord = { // Novo Registro de Batida de Ponto
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.cpf || 'guest',
      timestamp: new Date().toISOString(),
      type,
      deviceId: user?.deviceId || 'unknown',
      hash: Math.random().toString(36).substr(2, 16).toUpperCase(),
      isValidated: true,
      lanNetwork: 'FAZAG-INTERNA'
    };

    

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    localStorage.setItem('fazag_records', JSON.stringify(updatedRecords));
    
    // Auto show receipt after punch
    setSelectedReceiptId(newRecord.id);
    setView('RECEIPT');
   
    setLastRecord(newRecord.timestamp)
    localStorage.setItem('lastRecord', newRecord.timestamp)
  };

  const viewReceipt = (id: string) => {
    setSelectedReceiptId(id);
    setView('RECEIPT');
  };

  const selectedRecord = records.find(r => r.id === selectedReceiptId);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {view === 'AUTH' && <AuthScreen onLogin={handleLogin} errorMessage={errorMessage} user={user} />}
        {view === 'HOME' && (
          <HomeScreen 
            user={user} 
            isLanConnected={isLanConnected} 
            onPunch={handlePunch} 
            lastRecord={localStorage.getItem('lastRecord')}
          />
        )}
        {view === 'HISTORY' && (
          <HistoryScreen 
            records={records} 
            onViewReceipt={viewReceipt} 
          />
        )}
        {view === 'PROFILE' && (
          <ProfileScreen 
            user={user} 
            recordsCount={records.length} 
            isLanConnected={isLanConnected}
            onLogout={handleLogout}
          />
        )}
        {view === 'RECEIPT' && selectedRecord && (
          <ReceiptScreen 
            record={selectedRecord} 
            user={user} 
            onBack={() => setView('HISTORY')} 
          />
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
