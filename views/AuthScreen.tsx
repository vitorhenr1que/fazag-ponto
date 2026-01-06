
import React, { useState } from 'react';
import { User } from '../types';
import { Icons, Logo, COLORS } from '../constants';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMode, setAuthMode] = useState<'INITIAL' | 'PASSWORD'>('INITIAL');

  const handleDeviceAuth = () => {
    setIsAuthenticating(true);
    // Simulação de verificação de dispositivo
    setTimeout(() => {
      setIsAuthenticating(false);
      const mockDeviceId = "FAZAG-MOBILE-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      onLogin({
        name: "João Silva",
        cpf: "123.456.789-00",
        deviceId: mockDeviceId
      });
    }, 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 space-y-12">
      <div className="text-center w-full">
        <Logo className="w-full h-32 mb-4" />
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-4">Ponto FAZAG</h1>
      </div>

      <div className="w-full space-y-6">
        <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex items-center space-x-3">
          <div className="text-slate-500">
            <Icons.Wifi />
          </div>
          <p className="text-xs text-slate-600 font-medium leading-tight">
            Status da Rede: <span className="text-slate-900 font-bold italic">FAZAG_WIFI_INTERNA</span><br/>
            <span className="text-[10px] text-emerald-600 font-bold uppercase mt-1 block">Conexão Segura Detectada</span>
          </p>
        </div>

        {authMode === 'INITIAL' ? (
          <div className="space-y-4">
            <button
              onClick={handleDeviceAuth}
              disabled={isAuthenticating}
              style={{ backgroundColor: COLORS.primary }}
              className="w-full text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-80 relative overflow-hidden h-16"
            >
              {isAuthenticating ? (
                <div className="flex items-center space-x-3">
                  <div className="relative w-8 h-8">
                     <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-white scale-50">
                        <Icons.Wifi />
                     </div>
                  </div>
                  <span className="animate-pulse">Autenticando...</span>
                </div>
              ) : (
                <>
                  <Icons.Wifi />
                  <span>Autenticar Dispositivo</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setAuthMode('PASSWORD')}
              style={{ color: COLORS.primary }}
              className="w-full font-bold py-3 active:bg-slate-100 rounded-xl transition-colors text-sm"
            >
              Autenticar com CPF/Senha
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
               <input 
                type="text" 
                placeholder="CPF"
                className="w-full p-4 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none transition-all"
              />
              <input 
                type="password" 
                placeholder="Senha de Acesso"
                className="w-full p-4 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleDeviceAuth}
              style={{ backgroundColor: COLORS.primary }}
              className="w-full text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Entrar
            </button>
            <button 
              onClick={() => setAuthMode('INITIAL')}
              className="w-full text-slate-400 font-bold py-2 text-sm"
            >
              Voltar para Autenticação Digital
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-center absolute bottom-8 uppercase tracking-widest font-bold">
        Faculdade Zacarias de Góes • 2024
      </p>
    </div>
  );
};

export default AuthScreen;
