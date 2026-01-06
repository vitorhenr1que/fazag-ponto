
import React from 'react';
import { ViewState } from '../types';
import { Icons, COLORS } from '../constants';

interface BottomNavProps {
  activeView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around items-center h-20 safe-bottom z-50">
      <NavItem 
        active={activeView === 'HOME'} 
        icon={<Icons.Home />} 
        label="Início" 
        onClick={() => onViewChange('HOME')} 
      />
      <NavItem 
        active={activeView === 'HISTORY'} 
        icon={<Icons.History />} 
        label="Histórico" 
        onClick={() => onViewChange('HISTORY')} 
      />
      <NavItem 
        active={activeView === 'PROFILE'} 
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        } 
        label="Perfil" 
        onClick={() => onViewChange('PROFILE')} 
      />
    </nav>
  );
};

const NavItem: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-1 transition-colors w-20 ${active ? 'text-slate-800' : 'text-slate-400'}`}
  >
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold">{label}</span>
    {active && <div className="w-1 h-1 bg-slate-800 rounded-full"></div>}
  </button>
);

export default BottomNav;
