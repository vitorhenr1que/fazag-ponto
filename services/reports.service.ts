import { prisma } from './prisma';

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function minutesToHHmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export async function buildTimecardsReport(params: {
  userId: string;
  start: Date;
  end: Date;
}) {
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
    }),
  ]);

  if (!user) {
    const err: any = new Error('Usuário não encontrado');
    err.statusCode = 404;
    throw err;
  }

  const daysMap: Record<string, { punches: Record<string, Date> }> = {};

  for (const h of historicos) {
    const day = toDateKey(h.dataHora);
    daysMap[day] ??= { punches: {} };
    daysMap[day].punches[h.type] = daysMap[day].punches[h.type] ?? h.dataHora;
  }

  const days: any[] = [];
  let totalMinutes = 0;
  let incompleteDays = 0;
  let justifiedDays = 0;

  for (const day of Object.keys(daysMap).sort()) {
    const punches = daysMap[day].punches;

    const entry = punches.ENTRY;
    const exit = punches.EXIT;
    const bs = punches.BREAK_START;
    const be = punches.BREAK_END;

    let workedMinutes = 0;
    let status: 'OK' | 'INCOMPLETE' | 'JUSTIFICADO' = 'OK';

    if (entry && exit) {
      workedMinutes = bs && be
        ? diffMinutes(entry, bs) + diffMinutes(be, exit)
        : diffMinutes(entry, exit);
    } else {
      status = 'INCOMPLETE';
    }

    const justified = notes.find(
      n => day >= toDateKey(n.startDate) && day <= toDateKey(n.endDate)
    );

    if (status === 'INCOMPLETE' && justified) {
      status = 'JUSTIFICADO';
      justifiedDays++;
    }

    if (status === 'OK') totalMinutes += workedMinutes;
    if (status === 'INCOMPLETE') incompleteDays++;

    days.push({
      date: day,
      punches: {
        ENTRY: entry ? entry.toISOString().slice(11, 16) : null,
        BREAK_START: bs ? bs.toISOString().slice(11, 16) : null,
        BREAK_END: be ? be.toISOString().slice(11, 16) : null,
        EXIT: exit ? exit.toISOString().slice(11, 16) : null,
      },
      workedMinutes,
      workedLabel: minutesToHHmm(workedMinutes),
      status,
      observation: justified ? `${justified.type} - ${justified.note}` : null,
    });
  }

  return {
    user: { id: user.id, nome: user.nome, cpf: user.cpf },
    range: { start, end },
    days,
    totals: {
      workedMinutes: totalMinutes,
      workedLabel: minutesToHHmm(totalMinutes),
      incompleteDays,
      justifiedDays,
    },
  };
}
