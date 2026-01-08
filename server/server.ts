import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { prisma } from '../services/prisma';

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

    if (!userId || !deviceId || !type) {
      return res.status(400).json({ error: 'userId, deviceId e type são obrigatórios' });
    }

    if (!isValidPunchType(type)) {
      return res.status(400).json({ error: 'type inválido' });
    }

    // valida usuário + device
    const user = await prisma.user.findUnique({ where: { id: userId } });
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




const port = Number(process.env.PORT || 3333);
app.listen(port, () => console.log(`API on :${port}`));