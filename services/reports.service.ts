import { prisma } from './prisma';

export type TimecardsReport = {
  user: {
    id: string;
    nome: string;
    cpf: string;
    funcao: string | null;
    departamento: string | null;
    admissao: string | null; // YYYY-MM-DD
    pisPasep: string | null;
  };
  range: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  days: Array<{
    date: string; // YYYY-MM-DD
    punches: {
      ENTRY: string | null;
      BREAK_START: string | null;
      BREAK_END: string | null;
      EXIT: string | null;
    };
    workedMinutes: number;
    workedLabel: string;
    status: 'OK' | 'INCOMPLETO' | 'JUSTIFICADO';
    observation: string | null;
  }>;
  totals: {
    workedMinutes: number;
    workedLabel: string;
    incompleteDays: number;
    justifiedDays: number;
  };
};

// ✅ YYYY-MM-DD em horário local (não UTC)
function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function minutesToHHmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

// ✅ Hora HH:mm em fuso fixo (America/Bahia) pra não dar +3h
function timeHHmmLocal(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Bahia',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

// ✅ YYYY-MM-DD em fuso fixo (America/Bahia)
function dateYmdLocal(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const y = parts.find(p => p.type === 'year')?.value ?? '0000';
  const m = parts.find(p => p.type === 'month')?.value ?? '00';
  const day = parts.find(p => p.type === 'day')?.value ?? '00';
  return `${y}-${m}-${day}`;
}

// Evita bugs de fuso: compara por faixa real do dia (00:00:00 - 23:59:59)
function dayBounds(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const startDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { startDay, endDay };
}

function buildObservation(note: { type: string; note: string }) {
  const type = String(note.type);
  const text = String(note.note ?? '').trim();

  if (type && type !== 'OUTRO') {
    return text.length ? `${type} - ${text.slice(0, 40)}` : type;
  }

  return text.length ? text.slice(0, 50) : 'OUTRO';
}

export async function buildTimecardsReport(params: {
  userId: string;
  start: Date;
  end: Date;
}): Promise<TimecardsReport> {
  const { userId, start, end } = params;

  const [user, historicos, notes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.historico.findMany({
      where: { userId, dataHora: { gte: start, lte: end } },
      orderBy: { dataHora: 'asc' },
    }),
    prisma.userNote.findMany({
      where: {
        userId,
        AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!user) {
    const err: any = new Error('Usuário não encontrado');
    err.statusCode = 404;
    throw err;
  }

  // Agrupa batidas por dia e pega a primeira ocorrência de cada tipo no dia
  const daysMap: Record<string, { punches: Record<string, Date> }> = {};

  for (const h of historicos) {
    const day = toDateKey(h.dataHora); // ✅ local
    daysMap[day] ??= { punches: {} };

    // mantém a PRIMEIRA batida daquele tipo (por estar ordenado asc)
    daysMap[day].punches[h.type] = daysMap[day].punches[h.type] ?? h.dataHora;
  }

  const days: any[] = [];
  let totalMinutes = 0;
  let incompleteDays = 0;
  let justifiedDays = 0;

  const sortedDays = Object.keys(daysMap).sort();

  for (const day of sortedDays) {
    const punches = daysMap[day].punches;

    const entry = punches.ENTRY;
    const exit = punches.EXIT;
    const bs = punches.BREAK_START;
    const be = punches.BREAK_END;

    let workedMinutes = 0;
    let status: 'OK' | 'INCOMPLETO' | 'JUSTIFICADO' = 'OK';

    if (entry && exit) {
      workedMinutes =
        bs && be
          ? diffMinutes(entry, bs) + diffMinutes(be, exit)
          : diffMinutes(entry, exit);
    } else {
      status = 'INCOMPLETO';
    }

    // Nota do dia: cobre o dia se startDate <= fimDoDia && endDate >= inicioDoDia
    const { startDay, endDay } = dayBounds(day);
    const noteOfDay = notes.find(n => n.startDate <= endDay && n.endDate >= startDay);

    if (status === 'INCOMPLETO' && noteOfDay) {
      status = 'JUSTIFICADO';
      justifiedDays++;
    }

    if (status === 'OK') totalMinutes += workedMinutes;
    if (status === 'INCOMPLETO') incompleteDays++;

    days.push({
      date: day, // YYYY-MM-DD
      punches: {
        // ✅ sem UTC (+3h). Agora é Bahia
        ENTRY: entry ? timeHHmmLocal(entry) : null,
        BREAK_START: bs ? timeHHmmLocal(bs) : null,
        BREAK_END: be ? timeHHmmLocal(be) : null,
        EXIT: exit ? timeHHmmLocal(exit) : null,
      },
      workedMinutes,
      workedLabel: minutesToHHmm(workedMinutes),
      status,
      observation: noteOfDay
        ? buildObservation({ type: String(noteOfDay.type), note: String(noteOfDay.note) })
        : null,
    });
  }

  return {
    user: {
      id: user.id,
      nome: user.nome,
      cpf: user.cpf,
      funcao: user.funcao ?? null,
      departamento: user.departamento ?? null,
      // ✅ data em YYYY-MM-DD Bahia (não UTC)
      admissao: user.admissao ? dateYmdLocal(user.admissao) : null,
      pisPasep: user.pisPasep ?? null,
    },

    // ✅ range em YYYY-MM-DD Bahia (não UTC)
    range: {
      start: dateYmdLocal(start),
      end: dateYmdLocal(end),
    },

    days,

    totals: {
      workedMinutes: totalMinutes,
      workedLabel: minutesToHHmm(totalMinutes),
      incompleteDays,
      justifiedDays,
    },
  };
}
