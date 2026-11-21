// Persistência em data/db.json (gravação atômica) e regras dos dados do Lazy.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const PASTA_DADOS = path.join(config.RAIZ, 'data');
const ARQUIVO = path.join(PASTA_DADOS, 'db.json');
const ARQUIVO_TEMP = ARQUIVO + '.tmp';
const ATRASO_SALVAMENTO_MS = 300;

const LIMITE_NOTAS = 200;
const LIMITE_CARACTERES_NOTA = 2000;
const LIMITE_TAREFAS = 200;
const LIMITE_CARACTERES_TAREFA = 200;
const LIMITE_ATIVIDADES = 50;
const PRIORIDADES = ['baixa', 'media', 'alta'];
const CORES = ['roxo', 'azul', 'verde', 'rosa'];

// Erro esperado (validação ou item não encontrado). A mensagem pode ser mostrada ao usuário.
class ErroDominio extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

let estado;
let agendado = null;
let salvamentoBloqueado = false;

const agoraIso = () => new Date().toISOString();

function dataChave(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

function carimboArquivo() {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date();
  return `${dataChave(d)}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function estadoInicial() {
  return {
    versao: 1,
    criadoEm: agoraIso(),
    contadores: { execucoes: 0, erros: 0, hoje: 0, dia: '', porComando: {} },
    historico: [],
    notas: [],
    tarefas: [],
    atividades: [],
    configuracoes: {
      nomeBot: 'Nexus',
      cor: 'roxo',
      animacoes: true,
      mostrarHora: true,
      limiteHistorico: 500
    },
    perfil: { nome: 'Usuário', cargo: '', email: '', bio: '' }
  };
}

// Completa campos que faltam em um arquivo antigo ou editado à mão.
function normalizarEstado(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    throw new Error('formato inválido');
  }
  const base = estadoInicial();
  const novo = { ...base, ...bruto };
  novo.contadores = { ...base.contadores, ...(bruto.contadores || {}) };
  novo.configuracoes = { ...base.configuracoes, ...(bruto.configuracoes || {}) };
  novo.perfil = { ...base.perfil, ...(bruto.perfil || {}) };
  for (const chave of ['historico', 'notas', 'tarefas', 'atividades']) {
    if (!Array.isArray(novo[chave])) novo[chave] = [];
  }
  if (!novo.contadores.porComando || typeof novo.contadores.porComando !== 'object') {
    novo.contadores.porComando = {};
  }
  return novo;
}

// Lê o arquivo. Se estiver corrompido, renomeia para .corrompido-<data> em vez de sobrescrever.
function carregarDoDisco() {
  fs.mkdirSync(PASTA_DADOS, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) return estadoInicial();
  try {
    return normalizarEstado(JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')));
  } catch (erro) {
    const copia = `${ARQUIVO}.corrompido-${carimboArquivo()}`;
    try {
      fs.renameSync(ARQUIVO, copia);
      console.error(`Arquivo de dados inválido (${erro.message}). Cópia guardada em ${copia}.`);
    } catch (erroRenomear) {
      salvamentoBloqueado = true;
      console.error(`Arquivo de dados inválido e não renomeado (${erroRenomear.message}). Salvamento desativado.`);
    }
    return estadoInicial();
  }
}

// Grava em .tmp e renomeia: o arquivo nunca fica pela metade.
function salvarAgora() {
  if (agendado) {
    clearTimeout(agendado);
    agendado = null;
  }
  if (salvamentoBloqueado) return;
  try {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    fs.writeFileSync(ARQUIVO_TEMP, JSON.stringify(estado, null, 2), 'utf8');
    fs.renameSync(ARQUIVO_TEMP, ARQUIVO);
  } catch (erro) {
    console.error(`Falha ao salvar os dados: ${erro.message}`);
  }
}

// Agrupa alterações seguidas: grava 300 ms depois da primeira alteração.
function marcarAlteracao() {
  if (agendado) return;
  agendado = setTimeout(salvarAgora, ATRASO_SALVAMENTO_MS);
}

function registrarAtividade(tipo, texto) {
  estado.atividades.unshift({ id: crypto.randomUUID(), tipo, texto, em: agoraIso() });
  if (estado.atividades.length > LIMITE_ATIVIDADES) estado.atividades.length = LIMITE_ATIVIDADES;
}

function limitarHistorico() {
  const limite = estado.configuracoes.limiteHistorico;
  if (estado.historico.length > limite) estado.historico.length = limite;
}

function objetoOuErro(valor, mensagem) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErroDominio(mensagem);
  return valor;
}

// Valida um texto: remove espaços das pontas e confere o tamanho.
function validarTexto(valor, rotulo, { min = 0, max = 200 } = {}) {
  if (typeof valor !== 'string') throw new ErroDominio(`${rotulo} deve ser um texto.`);
  const limpo = valor.trim();
  if (limpo.length < min) throw new ErroDominio(`Informe ${rotulo.toLowerCase()}.`);
  if (limpo.length > max) throw new ErroDominio(`${rotulo} pode ter no máximo ${max} caracteres.`);
  return limpo;
}

function validarBooleano(valor, campo) {
  if (typeof valor !== 'boolean') throw new ErroDominio(`O campo "${campo}" deve ser verdadeiro ou falso.`);
  return valor;
}

// ---------- Estatísticas e histórico ----------

// Registra uma execução de comando: histórico, contadores e atividades.
function registrarExecucao({ entrada, resposta, ok, comando }) {
  const c = estado.contadores;
  const hoje = dataChave();
  if (c.dia !== hoje) {
    c.dia = hoje;
    c.hoje = 0;
  }
  c.execucoes += 1;
  c.hoje += 1;
  if (!ok) c.erros += 1;
  if (comando) c.porComando[comando] = (c.porComando[comando] || 0) + 1;

  estado.historico.unshift({
    id: crypto.randomUUID(),
    entrada,
    resposta,
    status: ok ? 'OK' : 'Erro',
    comando: comando || null,
    em: agoraIso()
  });
  limitarHistorico();
  registrarAtividade(
    'comando',
    comando ? `${ok ? 'Executou' : 'Erro ao executar'} /${comando}` : 'Tentativa com comando desconhecido'
  );
  marcarAlteracao();
}

function estatisticas(totalComandos) {
  const c = estado.contadores;
  const topComandos = Object.entries(c.porComando)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, usos]) => ({ nome, usos }));
  return {
    execucoes: c.execucoes,
    hoje: c.dia === dataChave() ? c.hoje : 0,
    erros: c.erros,
    comandos: totalComandos,
    notas: estado.notas.length,
    tarefasPendentes: estado.tarefas.filter((t) => !t.feita).length,
    topComandos,
    atividades: estado.atividades.slice(0, 6),
    uptime: Math.round(process.uptime())
  };
}

function listarHistorico() {
  return estado.historico;
}

function limparHistorico() {
  estado.historico.length = 0;
  registrarAtividade('sistema', 'Histórico limpo');
  marcarAlteracao();
}

// ---------- Configurações e perfil ----------

function obterConfiguracoes() {
  return { ...estado.configuracoes };
}

function atualizarConfiguracoes(entrada) {
  const dados = objetoOuErro(entrada, 'Envie um objeto com as configurações.');
  const novos = {};
  if (Object.hasOwn(dados, 'nomeBot')) novos.nomeBot = validarTexto(dados.nomeBot, 'O nome do bot', { min: 1, max: 30 });
  if (Object.hasOwn(dados, 'cor')) {
    if (!CORES.includes(dados.cor)) throw new ErroDominio(`Cor inválida. Use: ${CORES.join(', ')}.`);
    novos.cor = dados.cor;
  }
  if (Object.hasOwn(dados, 'animacoes')) novos.animacoes = validarBooleano(dados.animacoes, 'animacoes');
  if (Object.hasOwn(dados, 'mostrarHora')) novos.mostrarHora = validarBooleano(dados.mostrarHora, 'mostrarHora');
  if (Object.hasOwn(dados, 'limiteHistorico')) {
    const limite = Number(dados.limiteHistorico);
    if (!Number.isInteger(limite) || limite < 10 || limite > 5000) {
      throw new ErroDominio('O limite do histórico deve ser um número inteiro entre 10 e 5000.');
    }
    novos.limiteHistorico = limite;
  }
  Object.assign(estado.configuracoes, novos);
  limitarHistorico();
  registrarAtividade('sistema', 'Configurações atualizadas');
  marcarAlteracao();
  return obterConfiguracoes();
}

function obterPerfil() {
  return { ...estado.perfil };
}

function atualizarPerfil(entrada) {
  const dados = objetoOuErro(entrada, 'Envie um objeto com os dados do perfil.');
  const novos = {};
  if (Object.hasOwn(dados, 'nome')) novos.nome = validarTexto(dados.nome, 'O nome', { min: 1, max: 60 });
  if (Object.hasOwn(dados, 'cargo')) novos.cargo = validarTexto(dados.cargo, 'O cargo', { max: 60 });
  if (Object.hasOwn(dados, 'email')) {
    novos.email = validarTexto(dados.email, 'O e-mail', { max: 120 });
    if (novos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novos.email)) {
      throw new ErroDominio('Informe um e-mail válido.');
    }
  }
  if (Object.hasOwn(dados, 'bio')) novos.bio = validarTexto(dados.bio, 'A bio', { max: 300 });
  Object.assign(estado.perfil, novos);
  registrarAtividade('sistema', 'Perfil atualizado');
  marcarAlteracao();
  return obterPerfil();
}

// ---------- Notas ----------

// Mais recentes primeiro. A numeração dos comandos segue esta mesma ordem.
function listarNotas() {
  return [...estado.notas].reverse();
}

function criarNota(conteudo) {
  const texto = validarTexto(conteudo, 'A nota', { min: 1, max: LIMITE_CARACTERES_NOTA });
  if (estado.notas.length >= LIMITE_NOTAS) {
    throw new ErroDominio(`Limite de ${LIMITE_NOTAS} notas atingido. Apague alguma antes de criar outra.`);
  }
  const nota = { id: crypto.randomUUID(), conteudo: texto, criadaEm: agoraIso() };
  estado.notas.push(nota);
  registrarAtividade('nota', 'Nota criada');
  marcarAlteracao();
  return nota;
}

function removerNota(id) {
  const indice = estado.notas.findIndex((n) => n.id === id);
  if (indice === -1) throw new ErroDominio('Nota não encontrada.', 404);
  estado.notas.splice(indice, 1);
  registrarAtividade('nota', 'Nota apagada');
  marcarAlteracao();
}

// ---------- Tarefas ----------

function listarTarefas() {
  return estado.tarefas;
}

function criarTarefa(conteudo, prioridade) {
  const texto = validarTexto(conteudo, 'A tarefa', { min: 1, max: LIMITE_CARACTERES_TAREFA });
  const prio = prioridade ?? 'media';
  if (!PRIORIDADES.includes(prio)) throw new ErroDominio(`Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.`);
  if (estado.tarefas.length >= LIMITE_TAREFAS) {
    throw new ErroDominio(`Limite de ${LIMITE_TAREFAS} tarefas atingido.`);
  }
  const tarefa = { id: crypto.randomUUID(), texto, prioridade: prio, feita: false, criadaEm: agoraIso() };
  estado.tarefas.push(tarefa);
  registrarAtividade('tarefa', 'Tarefa criada');
  marcarAlteracao();
  return tarefa;
}

function definirTarefaFeita(id, feita) {
  if (typeof feita !== 'boolean') throw new ErroDominio('O campo "feita" deve ser verdadeiro ou falso.');
  const tarefa = estado.tarefas.find((t) => t.id === id);
  if (!tarefa) throw new ErroDominio('Tarefa não encontrada.', 404);
  if (tarefa.feita === feita) return tarefa;
  tarefa.feita = feita;
  registrarAtividade('tarefa', feita ? 'Tarefa concluída' : 'Tarefa reaberta');
  marcarAlteracao();
  return tarefa;
}

function removerTarefa(id) {
  const indice = estado.tarefas.findIndex((t) => t.id === id);
  if (indice === -1) throw new ErroDominio('Tarefa não encontrada.', 404);
  estado.tarefas.splice(indice, 1);
  registrarAtividade('tarefa', 'Tarefa apagada');
  marcarAlteracao();
}

// Carrega os dados ao iniciar o módulo.
estado = carregarDoDisco();

module.exports = {
  ErroDominio,
  PRIORIDADES,
  CORES,
  LIMITE_NOTAS,
  LIMITE_TAREFAS,
  LIMITE_CARACTERES_NOTA,
  salvarAgora,
  marcarAlteracao,
  registrarExecucao,
  estatisticas,
  listarHistorico,
  limparHistorico,
  obterConfiguracoes,
  atualizarConfiguracoes,
  obterPerfil,
  atualizarPerfil,
  listarNotas,
  criarNota,
  removerNota,
  listarTarefas,
  criarTarefa,
  definirTarefaFeita,
  removerTarefa,
  ARQUIVO
};
