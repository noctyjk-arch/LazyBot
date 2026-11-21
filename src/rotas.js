'use strict';
// API REST em JSON. Cada rota é uma linha: método, caminho (regex) e função que devolve os dados.
const crypto = require('crypto');
const { db, salvar } = require('./armazenamento');
const { LIMITES } = require('./config');
const { ErroHttp, responderJSON, lerCorpo } = require('./http');
const comandos = require('./comandos');

const CORES = ['roxo', 'azul', 'verde', 'rosa'];
const PRIORIDADES = ['baixa', 'media', 'alta'];
const novoId = () => crypto.randomUUID();
const texto = (v, max) => String(v ?? '').trim().slice(0, max);
const agora = () => new Date().toISOString();

const ROTAS = [];
const rota = (metodo, caminho, fn) => ROTAS.push({ metodo, padrao: new RegExp(`^${caminho}$`), fn });

function achar(lista, id) {
  const i = lista.findIndex((x) => x.id === id);
  if (i < 0) throw new ErroHttp(404, 'Item não encontrado.');
  return i;
}

// ---- Comandos e chat ----
rota('GET', '/api/comandos', () => comandos.lista());

rota('POST', '/api/executar', async (req) => {
  const corpo = await lerCorpo(req);
  const entrada = texto(corpo.entrada, LIMITES.entrada);
  const r = await comandos.executar(entrada, { db, salvar });
  db.historico.unshift({
    id: novoId(), quando: agora(), entrada, comando: r.comando, ok: r.ok,
    resposta: r.secreto && r.ok ? '(oculto no histórico)' : r.texto,
  });
  db.historico.length = Math.min(db.historico.length, db.configuracoes.limiteHistorico);
  salvar();
  return { ok: r.ok, texto: r.texto, comando: r.comando };
});

// ---- Painel ----
rota('GET', '/api/painel', () => {
  const h = db.historico;
  const hoje = new Date().toDateString();
  const cont = new Map();
  for (const r of h) if (r.comando !== '(desconhecido)') cont.set(r.comando, (cont.get(r.comando) || 0) + 1);
  return {
    total: h.length,
    hoje: h.filter((r) => new Date(r.quando).toDateString() === hoje).length,
    erros: h.filter((r) => !r.ok).length,
    comandos: comandos.lista().length,
    notas: db.notas.length,
    tarefasPendentes: db.tarefas.filter((t) => !t.feita).length,
    top: [...cont].sort((a, b) => b[1] - a[1]).slice(0, 5),
    recentes: h.slice(0, 6),
    uptime: Math.floor(process.uptime()),
  };
});

// ---- Histórico ----
rota('GET', '/api/historico', () => db.historico);
rota('DELETE', '/api/historico', () => { db.historico.length = 0; salvar(); return { ok: true }; });

// ---- Configurações e perfil ----
rota('GET', '/api/configuracoes', () => db.configuracoes);
rota('PUT', '/api/configuracoes', async (req) => {
  const c = await lerCorpo(req), cfg = db.configuracoes;
  if (c.nomeBot !== undefined) cfg.nomeBot = texto(c.nomeBot, 30) || 'Nexus';
  if (CORES.includes(c.cor)) cfg.cor = c.cor;
  if (typeof c.animacoes === 'boolean') cfg.animacoes = c.animacoes;
  if (typeof c.mostrarHora === 'boolean') cfg.mostrarHora = c.mostrarHora;
  salvar();
  return cfg;
});

rota('GET', '/api/perfil', () => db.perfil);
rota('PUT', '/api/perfil', async (req) => {
  const c = await lerCorpo(req), p = db.perfil;
  if (c.nome !== undefined) p.nome = texto(c.nome, 80) || 'Usuário';
  if (c.cargo !== undefined) p.cargo = texto(c.cargo, 80);
  if (c.email !== undefined) p.email = texto(c.email, 120);
  if (c.bio !== undefined) p.bio = texto(c.bio, 300);
  salvar();
  return p;
});

// ---- Notas ----
rota('GET', '/api/notas', () => db.notas);
rota('POST', '/api/notas', async (req) => {
  const c = await lerCorpo(req);
  const conteudo = texto(c.conteudo, 2000);
  if (!conteudo) throw new ErroHttp(400, 'Escreva o conteúdo da nota.');
  if (db.notas.length >= LIMITES.notas) throw new ErroHttp(400, 'Limite de notas atingido.');
  const nota = { id: novoId(), titulo: texto(c.titulo, 80) || conteudo.slice(0, 60), conteudo, criadaEm: agora() };
  db.notas.unshift(nota);
  salvar();
  return nota;
});
rota('DELETE', '/api/notas/([\\w-]+)', (req, url, id) => {
  db.notas.splice(achar(db.notas, id), 1);
  salvar();
  return { ok: true };
});

// ---- Tarefas ----
rota('GET', '/api/tarefas', () => db.tarefas);
rota('POST', '/api/tarefas', async (req) => {
  const c = await lerCorpo(req);
  const titulo = texto(c.titulo, 120);
  if (!titulo) throw new ErroHttp(400, 'O título é obrigatório.');
  if (db.tarefas.length >= LIMITES.tarefas) throw new ErroHttp(400, 'Limite de tarefas atingido.');
  const tarefa = { id: novoId(), titulo, prioridade: PRIORIDADES.includes(c.prioridade) ? c.prioridade : 'media', feita: false, criadaEm: agora() };
  db.tarefas.unshift(tarefa);
  salvar();
  return tarefa;
});
rota('PATCH', '/api/tarefas/([\\w-]+)', async (req, url, id) => {
  const c = await lerCorpo(req);
  const tarefa = db.tarefas[achar(db.tarefas, id)];
  if (typeof c.feita === 'boolean') tarefa.feita = c.feita;
  salvar();
  return tarefa;
});
rota('DELETE', '/api/tarefas/([\\w-]+)', (req, url, id) => {
  db.tarefas.splice(achar(db.tarefas, id), 1);
  salvar();
  return { ok: true };
});

async function roteador(req, res, url) {
  let caminhoExiste = false;
  for (const r of ROTAS) {
    const m = r.padrao.exec(url.pathname);
    if (!m) continue;
    caminhoExiste = true;
    if (r.metodo !== req.method) continue;
    return responderJSON(res, 200, await r.fn(req, url, ...m.slice(1)));
  }
  throw caminhoExiste ? new ErroHttp(405, 'Método não permitido.') : new ErroHttp(404, 'Rota não encontrada.');
}

module.exports = roteador;
