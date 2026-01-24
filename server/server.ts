import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { prisma } from '../services/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import ExcelJS from 'exceljs';
import { buildTimecardsReport } from '../services/reports.service';

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

type ApiPunchType = 'ENTRY' | 'BREAK_START' | 'BREAK_END' | 'EXIT';

function isValidPunchType(type: any): type is ApiPunchType {
  return ['ENTRY', 'BREAK_START', 'BREAK_END', 'EXIT'].includes(type);
}

function protocoloNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex'); // 6 chars
  return `PONTO-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// util
function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function minutesToHHmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

/**
 * (SIMPLES) "login" por deviceId:
 * - se usuário existir: valida deviceId
 */

app.post('/signin', async (req: any, res: any) => {
  try {
    const { deviceId } = req.body as { deviceId?: string };
    if(!deviceId){
      return res.status(401).json({error: 'O ID do dispositivo não foi passado corretamente.'})
    }
    const user = await prisma.user.findUnique({where: {deviceId}})

    if(user?.deviceId !== deviceId){
      return res.status(403).json({error: 'Dispositivo não encontrado.'})
    }
    console.log('entrou, DEVICE ID')
    if(user.deviceId.toLocaleUpperCase() === deviceId.toLocaleUpperCase()){
      return res.status(200).json({user})
    }
  } catch(e){
    res.status(405).json({error: e})
  }
})


/**
 * (SIMPLES) "login" por cpf + deviceId:
 * - se usuário existir: valida deviceId
 * - se não existir: cria (pra facilitar testes)
 */


app.post('/auth', async (req: any, res: any) => {
  try {
    const { cpf, nome, deviceId } = req.body as { cpf?: string; nome?: string; deviceId?: string };

    if (!cpf || !deviceId) {
      return res.status(400).json({ error: 'cpf e deviceId são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { cpf } });

    if (user) {
      if (user.deviceId !== deviceId) {
        return res.status(403).json({ error: 'deviceId não autorizado para este CPF' });
      }
      return res.json({ user });
    }

    if (!nome) {
      return res.status(400).json({ error: 'nome é obrigatório para cadastrar novo usuário' });
    }

    const created = await prisma.user.create({
      data: { cpf, nome, deviceId },
    });

    return res.json({ user: created });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Criar batida
 * Body: { userId, deviceId, type }
 */
app.post('/punch', async (req: any, res: any) => {
  try {
    const { userId, deviceId, type } = req.body as {
      userId?: string;
      deviceId?: string;
      type?: ApiPunchType;
    };
    console.log(`USER ID: ${userId} \n DEVICE ID: ${deviceId} \n TYPE: ${type}`)

    if (!userId || !deviceId || !type) {
      return res.status(400).json({ error: 'userId, deviceId e type são obrigatórios' });
    }

    if (!isValidPunchType(type)) {
      return res.status(400).json({ error: 'type inválido' });
    }

    // valida usuário + device
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log(`USUÁRIO: ${user}`)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.deviceId !== deviceId) return res.status(403).json({ error: 'deviceId não autorizado' });

    // aqui entra sua regra de LAN (se quiser bloquear fora da rede)
    // ex: if (!isAuthorizedLan(req)) return res.status(403).json({ error: 'Fora da LAN' });

    const dataHora = new Date();
    const protocolo = protocoloNow();

    // hash canônico (você pode adicionar segredo depois)
    const hashSha256 = sha256Hex(`${userId}|${deviceId}|${type}|${dataHora.toISOString()}|${protocolo}`);

    const created = await prisma.historico.create({
      data: {
        userId,
        deviceId,
        type,
        dataHora,
        protocolo,
        hashSha256,
        status: true,
      },
    });

    return res.json({
      success: true,
      historico: created,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/history/recent', async (req: any, res: any) => {
  try {
    const limit = Math.max(parseInt(String(req.query.limit ?? '10'), 10) || 10, 1);

    const items = await prisma.historico.findMany({
      orderBy: { dataHora: 'desc' },
      take: limit,
      include: {
        user: true, // importante para h.user?.nome no Dashboard
      },
    });

    return res.status(200).json({ history: items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/history/pending', async (req: any, res: any) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const limit = Math.max(parseInt(String(req.query.limit ?? '10'), 10) || 10, 1);

    const where = { status: false };

    const [total, items] = await Promise.all([
      prisma.historico.count({ where }),
      prisma.historico.findMany({
        where,
        orderBy: { dataHora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: true, // <-- necessário pro Pending.tsx (h.user?.nome/cpf)
        },
      }),
    ]);

    return res.status(200).json({ history: items, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Listar histórico do usuário
 * GET /history/:userId
 */
app.get('/history/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const items = await prisma.historico.findMany({
      where: { userId },
      orderBy: { dataHora: 'asc' },
    });

    return res.json({ historicos: items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

//Obter todos os usuários
app.get('/users', async (req: any, res: any) => {
  try{
    const users = await prisma.user.findMany({
    orderBy: { nome: 'asc' }
    });
    return res.status(200).json( users );
  }catch(e){
    return res.status(500).json({ error: 'Erro interno' });
  }
})

/**
 * Buscar usuário por ID
 * GET /users/:id
 */
app.get('/users/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
    });

    return res.status(200).json({ user: user ?? null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Criar usuário (funcionário)
 * POST /users
 * Body: { nome, cpf, deviceId }
 */
app.get('/users', async (req: any, res: any) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const perPage = Math.max(parseInt(String(req.query.perPage ?? '50'), 10) || 50, 1);

    const where =
      search.length > 0
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' as const } },
              { cpf: { contains: search } },
              { deviceId: { contains: search } },
            ],
          }
        : undefined;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return res.status(200).json({ users, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Atualizar usuário
 * PATCH /users/:id
 * Body: { nome?, cpf?, deviceId? }
 */
app.patch('/users/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params as { id: string };
    const { nome, cpf, deviceId } = req.body as {
      nome?: string;
      cpf?: string;
      deviceId?: string;
    };

    const data: any = {};
    if (typeof nome === 'string') data.nome = nome;
    if (typeof cpf === 'string') data.cpf = cpf;
    if (typeof deviceId === 'string') data.deviceId = deviceId;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Envie ao menos um campo para atualizar' });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return res.status(200).json({ user });
  } catch (e: any) {
    // Record not found
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Unique constraint (cpf/deviceId)
    if (e?.code === 'P2002') {
      return res.status(409).json({
        error: 'CPF ou deviceId já cadastrado',
        meta: e?.meta,
      });
    }

    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Deletar usuário
 * DELETE /users/:id
 */
app.delete('/users/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/punch-manual', async (req: any, res: any) => {
  try {
    const { userId, deviceId, type, dataHora, status } = req.body as {
      userId?: string;
      deviceId?: string;
      type?: ApiPunchType;
      dataHora?: string;
      status?: boolean;
    };

    if (!userId || !deviceId || !type || !dataHora) {
      return res.status(400).json({ error: 'userId, deviceId, type e dataHora são obrigatórios' });
    }
    if (!isValidPunchType(type)) {
      return res.status(400).json({ error: 'type inválido' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.deviceId !== deviceId) return res.status(403).json({ error: 'deviceId não autorizado' });

    const protocolo = protocoloNow();
    const dt = new Date(dataHora);

    const hashSha256 = sha256Hex(`${userId}|${deviceId}|${type}|${dt.toISOString()}|${protocolo}`);

    const created = await prisma.historico.create({
      data: {
        userId,
        deviceId,
        type,
        dataHora: dt,
        protocolo,
        hashSha256,
        status: typeof status === 'boolean' ? status : false,
      },
    });

    return res.json({ success: true, historico: created });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/dashboard/stats', async (req: any, res: any) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [totalHoje, pendentes, funcionariosAtivos] = await Promise.all([
      prisma.historico.count({
        where: { dataHora: { gte: start } },
      }),
      prisma.historico.count({
        where: { status: false },
      }),
      prisma.user.count(),
    ]);

    return res.status(200).json({ totalHoje, pendentes, funcionariosAtivos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// ---------- INÍCIO NOTAS DE OBSERVAÇÃO ----------------

// ===============================
// OBSERVAÇÕES: FOLGA / FÉRIAS / RECESSO
// ===============================

type ApiUserNoteType = 'FOLGA' | 'FERIAS' | 'RECESSO' | 'OUTRO';

function isValidUserNoteType(type: any): type is ApiUserNoteType {
  return ['FOLGA', 'FERIAS', 'RECESSO', 'OUTRO'].includes(String(type));
}

function parseDateOr400(value: any, fieldName: string) {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`Campo ${fieldName} inválido. Use ISO date.`);
    (err as any).statusCode = 400;
    throw err;
  }
  return d;
}

// checa sobreposição de intervalos (opcional, mas recomendado)
async function hasOverlap(userId: string, startDate: Date, endDate: Date, ignoreId?: string) {
  const overlap = await prisma.userNote.findFirst({
    where: {
      userId,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      AND: [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ],
    },
    select: { id: true },
  });
  return !!overlap;
}

/**
 * Criar observação para usuário
 * POST /users/:id/notes
 * Body: { type, startDate, endDate, note }
 */
app.post('/users/:id/notes', async (req: any, res: any) => {
  try {
    const userId = String(req.params.id);

    const { type, startDate, endDate, note } = req.body as {
      type?: ApiUserNoteType;
      startDate?: string;
      endDate?: string;
      note?: string;
    };

    if (!note || String(note).trim().length === 0) {
      return res.status(400).json({ error: 'note é obrigatório' });
    }
    if (String(note).length > 500) {
      return res.status(400).json({ error: 'note deve ter no máximo 500 caracteres' });
    }

    const t: ApiUserNoteType = type && isValidUserNoteType(type) ? type : 'OUTRO';

    const start = parseDateOr400(startDate, 'startDate');
    const end = parseDateOr400(endDate, 'endDate');

    if (end.getTime() < start.getTime()) {
      return res.status(400).json({ error: 'endDate não pode ser menor que startDate' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // opcional: bloquear sobreposição
    const overlap = await hasOverlap(userId, start, end);
    if (overlap) {
      return res.status(409).json({ error: 'Já existe uma observação que se sobrepõe a este período' });
    }

    const created = await prisma.userNote.create({
      data: {
        userId,
        type: t,
        startDate: start,
        endDate: end,
        note: String(note).trim(),
      },
    });

    return res.status(201).json({ note: created });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    console.error(e);
    return res.status(status).json({ error: e?.message || 'Erro interno' });
  }
});

/**
 * Listar observações do usuário (opcionalmente filtrando por período)
 * GET /users/:id/notes?start=ISO&end=ISO
 * (se não passar start/end, lista tudo)
 */
app.get('/users/:id/notes', async (req: any, res: any) => {
  try {
    const userId = String(req.params.id);

    const startRaw = req.query.start;
    const endRaw = req.query.end;

    let where: any = { userId };

    // se start/end vierem, filtra por sobreposição no período
    if (startRaw && endRaw) {
      const start = parseDateOr400(startRaw, 'start');
      const end = parseDateOr400(endRaw, 'end');
      if (end.getTime() < start.getTime()) {
        return res.status(400).json({ error: 'end não pode ser menor que start' });
      }
      where = {
        userId,
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      };
    }

    const notes = await prisma.userNote.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return res.status(200).json({ notes });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Buscar 1 observação específica
 * GET /users/:id/notes/:noteId
 */
app.get('/users/:id/notes/:noteId', async (req: any, res: any) => {
  try {
    const userId = String(req.params.id);
    const noteId = String(req.params.noteId);

    const note = await prisma.userNote.findFirst({
      where: { id: noteId, userId },
    });

    return res.status(200).json({ note: note ?? null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Atualizar observação
 * PATCH /users/:id/notes/:noteId
 * Body: { type?, startDate?, endDate?, note? }
 */
app.patch('/users/:id/notes/:noteId', async (req: any, res: any) => {
  try {
    const userId = String(req.params.id);
    const noteId = String(req.params.noteId);

    const payload = req.body as {
      type?: ApiUserNoteType;
      startDate?: string;
      endDate?: string;
      note?: string;
    };

    const existing = await prisma.userNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) return res.status(404).json({ error: 'Observação não encontrada' });

    const data: any = {};

    if (payload.type !== undefined) {
      if (!isValidUserNoteType(payload.type)) {
        return res.status(400).json({ error: 'type inválido' });
      }
      data.type = payload.type;
    }

    let start = existing.startDate;
    let end = existing.endDate;

    if (payload.startDate !== undefined) start = parseDateOr400(payload.startDate, 'startDate');
    if (payload.endDate !== undefined) end = parseDateOr400(payload.endDate, 'endDate');

    if (end.getTime() < start.getTime()) {
      return res.status(400).json({ error: 'endDate não pode ser menor que startDate' });
    }

    data.startDate = start;
    data.endDate = end;

    if (payload.note !== undefined) {
      if (String(payload.note).trim().length === 0) {
        return res.status(400).json({ error: 'note não pode ser vazio' });
      }
      if (String(payload.note).length > 500) {
        return res.status(400).json({ error: 'note deve ter no máximo 500 caracteres' });
      }
      data.note = String(payload.note).trim();
    }

    // opcional: bloquear sobreposição (ignorando o próprio noteId)
    const overlap = await hasOverlap(userId, start, end, noteId);
    if (overlap) {
      return res.status(409).json({ error: 'Já existe uma observação que se sobrepõe a este período' });
    }

    const updated = await prisma.userNote.update({
      where: { id: noteId },
      data,
    });

    return res.status(200).json({ note: updated });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Deletar observação
 * DELETE /users/:id/notes/:noteId
 */
app.delete('/users/:id/notes/:noteId', async (req: any, res: any) => {
  try {
    const userId = String(req.params.id);
    const noteId = String(req.params.noteId);

    const existing = await prisma.userNote.findFirst({
      where: { id: noteId, userId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Observação não encontrada' });

    await prisma.userNote.delete({ where: { id: noteId } });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});


// report/timecards

app.get('/reports/timecards', async (req: any, res: any) => {
  try {
    const { userId, start, end } = req.query as {
      userId?: string;
      start?: string;
      end?: string;
    };

    if (!userId || !start || !end) {
      return res.status(400).json({ error: 'userId, start e end são obrigatórios' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'start/end inválidos (ISO)' });
    }

    const report = await buildTimecardsReport({
      userId,
      start: startDate,
      end: endDate,
    });

    return res.status(200).json(report);
  } catch (e: any) {
    console.error(e);
    return res
      .status(e?.statusCode || 500)
      .json({ error: e?.message || 'Erro interno' });
  }
});



// Transformar em Excel - reports/timecards.xlsx

app.get('/reports/timecards.xlsx', async (req: any, res: any) => {
  try {
    const { userId, start, end } = req.query as {
      userId?: string;
      start?: string;
      end?: string;
    };

    if (!userId || !start || !end) {
      return res.status(400).json({ error: 'userId, start e end são obrigatórios' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'start/end inválidos (ISO)' });
    }

    const report = await buildTimecardsReport({
      userId,
      start: startDate,
      end: endDate,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Relatorio');

    ws.addRow([
      'Data',
      'Entrada',
      'Início Intervalo',
      'Fim Intervalo',
      'Saída',
      'Horas Trabalhadas',
      'Status',
      'Observação',
    ]);

    report.days.forEach((d: any) => {
      ws.addRow([
        d.date,
        d.punches.ENTRY,
        d.punches.BREAK_START,
        d.punches.BREAK_END,
        d.punches.EXIT,
        d.workedLabel,
        d.status,
        d.observation,
      ]);
    });

    ws.addRow([]);
    ws.addRow(['TOTAL', '', '', '', '', report.totals.workedLabel]);
    ws.addRow(['INCOMPLETOS', '', '', '', '', report.totals.incompleteDays]);
    ws.addRow(['JUSTIFICADOS', '', '', '', '', report.totals.justifiedDays]);

    const filename = `relatorio-ponto_${report.user.nome}_${startDate
      .toISOString()
      .slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.xlsx`
      .replaceAll(' ', '_');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e: any) {
    console.error(e);
    return res
      .status(e?.statusCode || 500)
      .json({ error: e?.message || 'Erro ao gerar Excel' });
  }
});

// Rota MÉDIA DE HORAS MENSAIS - reports/users/:id/monthly-averages

app.get('/reports/users/:id/monthly-averages', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const year = Number(req.query.year);
    const month = Number(req.query.month); // 1-12

    if (!year || !month) {
      return res.status(400).json({ error: 'year e month são obrigatórios' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const historicos = await prisma.historico.findMany({
      where: {
        userId: id,
        dataHora: { gte: start, lte: end },
      },
    });

    const buckets: Record<string, number[]> = {
      ENTRY: [],
      BREAK_START: [],
      BREAK_END: [],
      EXIT: [],
    };

    historicos.forEach(h => {
      const mins = h.dataHora.getHours() * 60 + h.dataHora.getMinutes();
      buckets[h.type].push(mins);
    });

    const averages: any = {};
    const samples: any = {};

    for (const type of Object.keys(buckets)) {
      const arr = buckets[type];
      samples[type] = arr.length;
      if (!arr.length) {
        averages[type] = null;
      } else {
        const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        averages[type] = minutesToHHmm(avg);
      }
    }

    return res.json({
      userId: id,
      year,
      month,
      averages,
      samples,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

const port = Number(process.env.PORT || 3333);
app.listen(port, () => console.log(`API on :${port}`));