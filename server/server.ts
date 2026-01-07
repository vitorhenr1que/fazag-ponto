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

const port = Number(process.env.PORT || 3333);
app.listen(port, () => console.log(`API on :${port}`));