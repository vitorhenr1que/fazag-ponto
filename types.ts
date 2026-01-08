
export enum PunchType {
  ENTRY = 'ENTRADA',
  BREAK_START = 'SAÍDA INTERVALO',
  BREAK_END = 'RETORNO INTERVALO',
  EXIT = 'SAÍDA EXPEDIENTE'
}

export interface User {
  id: string;
  nome: string;
  cpf: string;
  deviceId: string;
}

export interface PunchRecord {
  id: string;
  userId: string;
  timestamp: string;
  type: PunchType;
  deviceId: string;
  hash: string;
  isValidated: boolean;
  lanNetwork: string;
}

export type ViewState = 'AUTH' | 'HOME' | 'HISTORY' | 'RECEIPT' | 'PROFILE';

export interface AppState {
  user: User | null;
  records: PunchRecord[];
  isLanConnected: boolean;
  selectedReceiptId: string | null;
}
