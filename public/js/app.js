'use strict';
// Interface do painel. Conversa com a API em /api/* usando fetch (JSON).
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtData = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

async function api(url, metodo = 'GET', corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || dados.texto || `Erro ${r.status}`);
  return dados;
}

function aviso(msg, tipo = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('erro', tipo === 'erro');
  t.classList.add('mostrar');
  clearTimeout(aviso.timer);
  aviso.timer = setTimeout(() => t.classList.remove('mostrar'), 2600);
}

// ---------- Navegação por hash ----------
const VIEWS = {
  dashboard: { titulo: 'Painel', carregar: carregarPainel },
  chat: { titulo: 'Chat de comandos', carregar: async () => $('#entrada').focus() },
  notas: { titulo: 'Notas', carregar: carregarNotas },
  tarefas: { titulo: 'Tarefas', carregar: carregarTarefas },
  historico: { titulo: 'Histórico de atividades', carregar: carregarHistorico },
  config: { titulo: 'Configurações', carregar: carregarConfig },
  perfil: { titulo: 'Perfil', carregar: carregarPerfil },
};

function mostrar(view) {
  if (!Object.hasOwn(VIEWS, view)) view = 'dashboard';
  $$('.view').forEach((el) => el.classList.toggle('ativa', el.dataset.view === view));
  $$('.menu a').forEach((a) => a.classList.toggle('ativo', a.dataset.view === view));
  $('#titulo').textContent = VIEWS[view].titulo;
  $('#sidebar').classList.remove('aberta');
  VIEWS[view].carregar().catch((e) => aviso(e.message, 'erro'));
}
window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));

// ---------- Painel ----------
async function carregarPainel() {
  const d = await api('/api/painel');
  $('#stTotal').textContent = d.total;
  $('#stHoje').textContent = d.hoje;
  $('#stErros').textContent = d.erros;
  $('#stComandos').textContent = d.comandos;
  $('#stNotas').textContent = d.notas;
  $('#stPendentes').textContent = d.tarefasPendentes;
  $('#topCmds').innerHTML = d.top.length
    ? d.top.map(([nome, n]) => `<li><span>/${esc(nome)}</span><b>${n}×</b></li>`).join('')
    : '<li class="vazio">Nada executado ainda.</li>';
  $('#recentes').innerHTML = d.recentes.length
    ? d.recentes.map((r) => `<li><code>${esc(r.entrada)}</code><span class="muted">${fmtData(r.quando)}</span></li>`).join('')
    : '<li class="vazio">Sem atividades ainda.</li>';
}

// ---------- Chat ----------
const msgs = $('#msgs');
let cfg = {};

function bolha(tipo, texto) {
  const div = document.createElement('div');
  div.className = `msg ${tipo}`;
  div.textContent = texto;
  if (cfg.mostrarHora) {
    const hora = document.createElement('small');
    hora.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    div.append(hora);
  }
  msgs.append(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function enviar(texto) {
  texto = texto.trim();
  if (!texto) return;
  bolha('user', texto);
  try {
    const r = await api('/api/executar', 'POST', { entrada: texto });
    bolha(r.ok ? 'bot' : 'err', r.texto);
  } catch (e) {
    bolha('err', e.message);
  }
}

function irChat(texto) {
  location.hash = 'chat';
  enviar(texto);
}

async function carregarComandos() {
  const lista = await api('/api/comandos');
  $('#sugestoes').innerHTML = lista
    .map((c) => `<button class="chip" type="button" data-cmd="/${esc(c.nome)} " title="${esc(c.descricao)}">/${esc(c.nome)}</button>`)
    .join('');
}

$('#sugestoes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (b) { $('#entrada').value = b.dataset.cmd; $('#entrada').focus(); }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-run]');
  if (b) irChat(b.dataset.run);
});
$('#formChat').addEventListener('submit', (e) => {
  e.preventDefault();
  const campo = $('#entrada');
  const texto = campo.value;
  campo.value = '';
  enviar(texto);
});

// ---------- Notas ----------
async function carregarNotas() {
  const notas = await api('/api/notas');
  $('#listaNotas').innerHTML = notas.length
    ? notas.map((n) => `
      <article class="nota" data-id="${esc(n.id)}">
        <header><strong>${esc(n.titulo)}</strong><button class="icone" data-apagar-nota title="Apagar">✕</button></header>
        <p>${esc(n.conteudo)}</p>
        <small class="muted">${fmtData(n.criadaEm)}</small>
      </article>`).join('')
    : '<p class="vazio">Nenhuma nota ainda. Crie a primeira acima.</p>';
}

$('#formNota').addEventListener('submit', async (e) => {
  e.preventDefault();
  const conteudo = $('#notaConteudo').value.trim();
  if (!conteudo) return aviso('Escreva algo na nota.', 'erro');
  try {
    await api('/api/notas', 'POST', { conteudo });
    e.target.reset();
    aviso('Nota salva');
    carregarNotas();
  } catch (err) { aviso(err.message, 'erro'); }
});

$('#listaNotas').addEventListener('click', async (e) => {
  if (!e.target.closest('[data-apagar-nota]')) return;
  const id = e.target.closest('.nota').dataset.id;
  try { await api(`/api/notas/${id}`, 'DELETE'); aviso('Nota apagada'); carregarNotas(); }
  catch (err) { aviso(err.message, 'erro'); }
});

// ---------- Tarefas ----------
async function carregarTarefas() {
  const lista = await api('/api/tarefas');
  $('#listaTarefas').innerHTML = lista.length
    ? lista.map((t) => `
      <li class="tarefa ${t.feita ? 'feita' : ''}" data-id="${esc(t.id)}">
        <input type="checkbox" data-feita ${t.feita ? 'checked' : ''} aria-label="Concluir tarefa">
        <span class="pri p-${esc(t.prioridade)}">${esc(t.prioridade)}</span>
        <span class="titulo">${esc(t.titulo)}</span>
        <button class="icone" data-apagar-tarefa title="Apagar">✕</button>
      </li>`).join('')
    : '<li class="vazio">Nenhuma tarefa. Adicione uma acima.</li>';
}

$('#formTarefa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = $('#tarefaTitulo').value.trim();
  if (!titulo) return aviso('Descreva a tarefa.', 'erro');
  try {
    await api('/api/tarefas', 'POST', { titulo, prioridade: $('#tarefaPrioridade').value });
    e.target.reset();
    aviso('Tarefa criada');
    carregarTarefas();
  } catch (err) { aviso(err.message, 'erro'); }
});

$('#listaTarefas').addEventListener('change', async (e) => {
  if (!e.target.matches('[data-feita]')) return;
  const id = e.target.closest('.tarefa').dataset.id;
  try { await api(`/api/tarefas/${id}`, 'PATCH', { feita: e.target.checked }); carregarTarefas(); }
  catch (err) { aviso(err.message, 'erro'); }
});

$('#listaTarefas').addEventListener('click', async (e) => {
  if (!e.target.closest('[data-apagar-tarefa]')) return;
  const id = e.target.closest('.tarefa').dataset.id;
  try { await api(`/api/tarefas/${id}`, 'DELETE'); aviso('Tarefa apagada'); carregarTarefas(); }
  catch (err) { aviso(err.message, 'erro'); }
});

// ---------- Histórico ----------
async function carregarHistorico() {
  const lista = await api('/api/historico');
  $('#histBody').innerHTML = lista.length
    ? lista.map((r) => `<tr>
        <td>${fmtData(r.quando)}</td>
        <td><code>${esc(r.entrada)}</code></td>
        <td class="resp">${esc(r.resposta)}</td>
        <td><span class="badge ${r.ok ? 'ok' : 'erro'}">${r.ok ? 'OK' : 'Erro'}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="vazio">Nenhuma atividade registrada.</td></tr>';
}

$('#limparHist').addEventListener('click', async () => {
  if (!confirm('Apagar todo o histórico de atividades?')) return;
  await api('/api/historico', 'DELETE');
  aviso('Histórico limpo');
  carregarHistorico();
});

// ---------- Configurações ----------
function aplicarCfg() {
  $('#brandNome').textContent = cfg.nomeBot;
  document.body.dataset.cor = cfg.cor;
  document.body.classList.toggle('sem-anim', !cfg.animacoes);
}

async function carregarConfig() {
  cfg = await api('/api/configuracoes');
  aplicarCfg();
  $('#cfgNome').value = cfg.nomeBot;
  $('#cfgCor').value = cfg.cor;
  $('#cfgHora').checked = cfg.mostrarHora;
  $('#cfgAnim').checked = cfg.animacoes;
}

$('#formConfig').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    cfg = await api('/api/configuracoes', 'PUT', {
      nomeBot: $('#cfgNome').value,
      cor: $('#cfgCor').value,
      mostrarHora: $('#cfgHora').checked,
      animacoes: $('#cfgAnim').checked,
    });
    aplicarCfg();
    aviso('Configurações salvas');
  } catch (err) { aviso(err.message, 'erro'); }
});

// ---------- Perfil ----------
function mostrarPerfil(p) {
  const inicial = (p.nome || '?')[0].toUpperCase();
  $('#avatar').textContent = inicial;
  $('#pAvatar').textContent = inicial;
  $('#userNome').textContent = p.nome;
  $('#pTitulo').textContent = p.nome;
  $('#pSub').textContent = p.cargo || 'Sem cargo definido';
}

async function carregarPerfil() {
  const p = await api('/api/perfil');
  mostrarPerfil(p);
  $('#pNome').value = p.nome;
  $('#pCargo').value = p.cargo;
  $('#pEmail').value = p.email;
  $('#pBio').value = p.bio;
}

$('#formPerfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const p = await api('/api/perfil', 'PUT', {
      nome: $('#pNome').value,
      cargo: $('#pCargo').value,
      email: $('#pEmail').value,
      bio: $('#pBio').value,
    });
    mostrarPerfil(p);
    aviso('Perfil atualizado');
  } catch (err) { aviso(err.message, 'erro'); }
});

$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('aberta'));

// ---------- Inicialização ----------
(async function iniciar() {
  try {
    cfg = await api('/api/configuracoes');
    aplicarCfg();
    await carregarComandos();
    api('/api/perfil').then(mostrarPerfil).catch(() => {});
    bolha('bot', `Olá! Sou o ${cfg.nomeBot}. Digite /ajuda para ver tudo que sei fazer.`);
    mostrar(location.hash.slice(1));
  } catch (e) {
    aviso('Não foi possível conectar ao servidor.', 'erro');
  }
})();
