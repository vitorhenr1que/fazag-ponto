import { PunchRecord, PunchType } from '../types';

export type PrismaHistoryItem = {
  id: string;
  userId: string;
  deviceId: string;
  dataHora: string; // ISO
  protocolo: string;
  hashSha256: string;
  status: boolean;
  type: 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT';
};

export const backendTypeToFrontType = (t: PrismaHistoryItem['type']): PunchType => {
  switch (t) {
    case 'ENTRY':
      return PunchType.ENTRY;
    case 'BREAK_START':
      return PunchType.BREAK_START;
    case 'BREAK_END':
      return PunchType.BREAK_END;
    case 'EXIT':
      return PunchType.EXIT;
  }
};

export const mapPrismaToPunchRecord = (rows: PrismaHistoryItem[]): PunchRecord[] => {
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    deviceId: r.deviceId,
    timestamp: r.dataHora,
    type: backendTypeToFrontType(r.type),
    hash: r.hashSha256,
    isValidated: r.status,
    lanNetwork: 'FAZAG-INTERNA',
  }));
};
