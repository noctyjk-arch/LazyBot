// Interações do Lazy: navegação por hash, chamadas à API e renderização das telas.
(function () {
  'use strict';

  const ROTAS = ['painel', 'chat', 'notas', 'tarefas', 'historico', 'configuracoes', 'perfil'];
  const TITULOS = {
    painel: 'Painel',
    chat: 'Chat',
    notas: 'Notas',
    tarefas: 'Tarefas',
    historico: 'Histórico',
    configuracoes: 'Configurações',
    perfil: 'Perfil'
  };
  const LIMITE_NOTAS = 200;
  const SUGESTOES = [
    '/ajuda',
    '/hora',
    '/calc 2 + 2 * 3',
    '/converter 10 km mi',
    '/sistema',
    '/sorteio dado 20',
    '/texto contar olá mundo',
    '/tarefa listar'
  ];
  const ROTULO_PRIORIDADE = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  const ICONE_ATIVIDADE = { comando: '⚡', nota: '📝', tarefa: '✅', sistema: '⚙️' };

  // Estado da interface. Os dados de verdade ficam no servidor.
  const estado = {
    config: { nomeBot: 'Nexus', cor: 'roxo', animacoes: true, mostrarHora: true },
    perfil: { nome: 'Usuário', cargo: '', email: '', bio: '' },
    enviando: false
  };

  const $ = (seletor) => document.querySelector(seletor);
  const $$ = (seletor) => document.querySelectorAll(seletor);

  // Escapa qualquer texto antes de colocá-lo em innerHTML.
  function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  function formatarData(iso) {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatarTempo(segundos) {
    const total = Math.floor(segundos);
    const dias = Math.floor(total / 86400);
    const horas = Math.floor((total % 86400) / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const partes = [];
    if (dias) partes.push(`${dias}d`);
    if (dias || horas) partes.push(`${horas}h`);
    if (dias || horas || minutos) partes.push(`${minutos}min`);
    partes.push(`${total % 60}s`);
    return partes.join(' ');
  }

  // Aviso no canto da tela, de sucesso ou de erro.
  function toast(mensagem, tipo = 'sucesso') {
    const aviso = document.createElement('div');
    aviso.className = `toast ${tipo}`;
    aviso.textContent = mensagem;
    $('#toasts').appendChild(aviso);
    setTimeout(() => {
      aviso.classList.add('saindo');
      setTimeout(() => aviso.remove(), 300);
    }, 3200);
  }

  // Chamada à API: envia JSON quando há corpo e devolve os dados lidos.
  async function api(caminho, { metodo = 'GET', corpo } = {}) {
    const opcoes = { method: metodo, headers: {} };
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }

    let resposta;
    try {
      resposta = await fetch(caminho, opcoes);
    } catch {
      throw new Error('Não foi possível falar com o servidor.');
    }

    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }
    if (!resposta.ok) throw new Error((dados && dados.erro) || `Erro ${resposta.status}.`);
    return dados;
  }

  // ---------- Navegação ----------

  function rotaAtual() {
    const rota = location.hash.replace('#', '');
    return ROTAS.includes(rota) ? rota : 'painel';
  }

  function abrirMenu(aberto) {
    document.body.classList.toggle('menu-aberto', aberto);
    $('#btn-menu').setAttribute('aria-expanded', String(aberto));
  }

  // Cada tela tem uma função que busca e desenha os dados ao ser aberta.
  const carregadores = {
    painel: carregarPainel,
    chat: () => {},
    notas: carregarNotas,
    tarefas: carregarTarefas,
    historico: carregarHistorico,
    configuracoes: carregarConfiguracoes,
    perfil: carregarPerfil
  };

  // Erros de carregamento viram aviso, sem derrubar a página.
  async function carregarRota(rota) {
    try {
      await carregadores[rota]();
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  function mostrarRota() {
    const rota = rotaAtual();
    for (const pagina of $$('.pagina')) {
      pagina.hidden = pagina.id !== `pagina-${rota}`;
    }
    for (const link of $$('.item-menu')) {
      link.classList.toggle('ativo', link.dataset.rota === rota);
    }
    $('#titulo-pagina').textContent = TITULOS[rota];
    document.title = `${TITULOS[rota]} · ${estado.config.nomeBot}`;
    abrirMenu(false);
    if (rota === 'chat' && window.innerWidth > 860) $('#entrada').focus();
    carregarRota(rota);
  }

  function irPara(rota) {
    if (location.hash === `#${rota}`) mostrarRota();
    else location.hash = rota;
  }

  // ---------- Configurações e perfil ----------

  function aplicarConfiguracoes() {
    const c = estado.config;
    document.body.dataset.cor = c.cor;
    document.body.classList.toggle('sem-animacoes', !c.animacoes);
    $('#nome-bot').textContent = c.nomeBot;
    $('#marca-letra').textContent = c.nomeBot.charAt(0).toUpperCase();
    document.title = `${TITULOS[rotaAtual()]} · ${c.nomeBot}`;
  }

  async function carregarConfiguracoes() {
    estado.config = await api('/api/configuracoes');
    aplicarConfiguracoes();
    $('#cfg-nome').value = estado.config.nomeBot;
    $('#cfg-mostrar-hora').checked = estado.config.mostrarHora;
    $('#cfg-animacoes').checked = estado.config.animacoes;
    for (const radio of $$('input[name="cor"]')) {
      radio.checked = radio.value === estado.config.cor;
    }
  }

  async function carregarPerfil() {
    const p = await api('/api/perfil');
    estado.perfil = p;
    $('#avatar-inicial').textContent = (p.nome || 'U').charAt(0).toUpperCase();
    $('#perfil-nome-exibicao').textContent = p.nome;
    $('#perfil-cargo-exibicao').textContent = p.cargo || 'Sem cargo definido';
    $('#perfil-nome').value = p.nome;
    $('#perfil-cargo').value = p.cargo;
    $('#perfil-email').value = p.email;
    $('#perfil-bio').value = p.bio;
  }

  // ---------- Painel ----------

  function itemVazio(texto) {
    const li = document.createElement('li');
    li.className = 'vazio';
    li.textContent = texto;
    return li;
  }

  async function carregarPainel() {
    const p = await api('/api/painel');
    $('#uptime').textContent = `Ativo há ${formatarTempo(p.uptime)}`;
    $('#est-execucoes').textContent = p.execucoes;
    $('#est-hoje').textContent = p.hoje;
    $('#est-erros').textContent = p.erros;
    $('#est-comandos').textContent = p.comandos;
    $('#est-notas').textContent = p.notas;
    $('#est-pendentes').textContent = p.tarefasPendentes;

    // Ranking com barras. A largura entra pelo DOM, porque a CSP bloqueia style no HTML.
    const ranking = $('#top-comandos');
    ranking.replaceChildren();
    if (!p.topComandos.length) ranking.appendChild(itemVazio('Nenhum comando usado ainda.'));
    const maximo = Math.max(1, ...p.topComandos.map((c) => c.usos));
    for (const item of p.topComandos) {
      const li = document.createElement('li');
      li.className = 'item-ranking';

      const topo = document.createElement('div');
      topo.className = 'ranking-topo';
      const nome = document.createElement('span');
      nome.textContent = `/${item.nome}`;
      const usos = document.createElement('strong');
      usos.textContent = String(item.usos);
      topo.append(nome, usos);

      const fundo = document.createElement('div');
      fundo.className = 'barra-fundo';
      const barra = document.createElement('div');
      barra.className = 'barra';
      barra.style.width = `${(item.usos / maximo) * 100}%`;
      fundo.appendChild(barra);

      li.append(topo, fundo);
      ranking.appendChild(li);
    }

    const lista = $('#lista-atividades');
    lista.replaceChildren();
    if (!p.atividades.length) lista.appendChild(itemVazio('Sem atividade ainda.'));
    for (const atividade of p.atividades) {
      const li = document.createElement('li');
      li.className = 'item-atividade';
      const icone = document.createElement('span');
      icone.className = 'icone-atividade';
      icone.setAttribute('aria-hidden', 'true');
      icone.textContent = ICONE_ATIVIDADE[atividade.tipo] || '•';
      const corpo = document.createElement('div');
      const texto = document.createElement('p');
      texto.textContent = atividade.texto;
      const hora = document.createElement('time');
      hora.textContent = formatarData(atividade.em);
      corpo.append(texto, hora);
      li.append(icone, corpo);
      lista.appendChild(li);
    }
  }

  $('#pagina-painel').addEventListener('click', (e) => {
    const atalho = e.target.closest('[data-atalho]');
    if (!atalho) return;
    irPara('chat');
    enviarComando(atalho.dataset.atalho);
  });

  // ---------- Chat ----------

  function rolarChat() {
    const mensagens = $('#mensagens');
    mensagens.scrollTop = mensagens.scrollHeight;
  }

  function adicionarBolha(tipo, texto, erro = false) {
    const bolha = document.createElement('div');
    bolha.className = `bolha ${tipo}${erro ? ' erro' : ''}`;

    const conteudo = document.createElement('div');
    conteudo.className = 'bolha-texto';
    conteudo.textContent = texto; // textContent: o texto nunca vira HTML
    bolha.appendChild(conteudo);

    if (estado.config.mostrarHora) {
      const hora = document.createElement('time');
      hora.className = 'bolha-hora';
      hora.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      bolha.appendChild(hora);
    }

    $('#mensagens').appendChild(bolha);
    rolarChat();
    return bolha;
  }

  // Bolha de "digitando" enquanto o servidor responde. O conteúdo é fixo, sem texto do usuário.
  function adicionarDigitando() {
    const bolha = document.createElement('div');
    bolha.className = 'bolha bot digitando';
    bolha.setAttribute('aria-label', 'Digitando');
    bolha.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>';
    $('#mensagens').appendChild(bolha);
    rolarChat();
    return bolha;
  }

  async function enviarComando(texto) {
    const entrada = String(texto || '').trim();
    if (!entrada || estado.enviando) return;

    estado.enviando = true;
    $('#btn-enviar').disabled = true;
    adicionarBolha('usuario', entrada);
    const digitando = adicionarDigitando();

    try {
      const resposta = await api('/api/executar', { metodo: 'POST', corpo: { entrada } });
      digitando.remove();
      adicionarBolha('bot', resposta.texto, !resposta.ok);
    } catch (erro) {
      digitando.remove();
      adicionarBolha('bot', erro.message, true);
    } finally {
      estado.enviando = false;
      $('#btn-enviar').disabled = false;
    }
  }

  function montarSugestoes() {
    const area = $('#sugestoes');
    for (const comando of SUGESTOES) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = comando;
      chip.addEventListener('click', () => {
        const campo = $('#entrada');
        campo.value = comando;
        campo.focus();
      });
      area.appendChild(chip);
    }
  }

  function mensagemBoasVindas() {
    adicionarBolha('bot', `Olá! Eu sou o ${estado.config.nomeBot}. Digite /ajuda para ver os comandos.`);
  }

  $('#form-chat').addEventListener('submit', (e) => {
    e.preventDefault();
    if (estado.enviando) return;
    const campo = $('#entrada');
    const texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';
    enviarComando(texto);
  });

  // ---------- Notas ----------

  async function carregarNotas() {
    const notas = await api('/api/notas');
    $('#resumo-notas').textContent = `${notas.length} de ${LIMITE_NOTAS} notas`;
    const grade = $('#grade-notas');
    if (!notas.length) {
      grade.innerHTML = '<p class="vazio">Nenhuma nota ainda. Escreva a primeira acima.</p>';
      return;
    }
    grade.innerHTML = notas
      .map(
        (nota) => `
      <article class="card-nota">
        <p class="nota-texto">${esc(nota.conteudo)}</p>
        <footer class="nota-rodape">
          <time>${esc(formatarData(nota.criadaEm))}</time>
          <button class="btn btn-perigo btn-pequeno" type="button" data-apagar-nota="${esc(nota.id)}">Apagar</button>
        </footer>
      </article>`
      )
      .join('');
  }

  $('#form-nota').addEventListener('submit', async (e) => {
    e.preventDefault();
    const campo = $('#nota-conteudo');
    const conteudo = campo.value.trim();
    if (!conteudo) {
      toast('Escreva algo antes de salvar.', 'erro');
      return;
    }
    try {
      await api('/api/notas', { metodo: 'POST', corpo: { conteudo } });
      campo.value = '';
      toast('Nota salva.');
      carregarRota('notas');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  $('#grade-notas').addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-apagar-nota]');
    if (!botao) return;
    try {
      await api(`/api/notas/${encodeURIComponent(botao.dataset.apagarNota)}`, { metodo: 'DELETE' });
      toast('Nota apagada.');
      carregarRota('notas');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  // ---------- Tarefas ----------

  async function carregarTarefas() {
    const tarefas = await api('/api/tarefas');
    const pendentes = tarefas.filter((t) => !t.feita).length;
    $('#resumo-tarefas').textContent = `${pendentes} pendente(s) · ${tarefas.length} no total`;
    const lista = $('#lista-tarefas');
    if (!tarefas.length) {
      lista.innerHTML = '<li class="vazio">Adicione a primeira tarefa acima.</li>';
      return;
    }
    lista.innerHTML = tarefas
      .map(
        (t) => `
      <li class="item-tarefa${t.feita ? ' feita' : ''}">
        <label class="tarefa-check">
          <input type="checkbox" data-alternar-tarefa="${esc(t.id)}"${t.feita ? ' checked' : ''}>
          <span class="tarefa-texto">${esc(t.texto)}</span>
        </label>
        <span class="badge prio-${esc(t.prioridade)}">${esc(ROTULO_PRIORIDADE[t.prioridade] || t.prioridade)}</span>
        <button class="btn btn-perigo btn-pequeno" type="button" data-apagar-tarefa="${esc(t.id)}">Apagar</button>
      </li>`
      )
      .join('');
  }

  $('#form-tarefa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const campo = $('#tarefa-texto');
    const texto = campo.value.trim();
    if (!texto) {
      toast('Digite o texto da tarefa.', 'erro');
      return;
    }
    try {
      await api('/api/tarefas', {
        metodo: 'POST',
        corpo: { texto, prioridade: $('#tarefa-prioridade').value }
      });
      campo.value = '';
      toast('Tarefa adicionada.');
      carregarRota('tarefas');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  // Marcar ou desmarcar a caixa envia PATCH; a lista é redesenhada depois.
  $('#lista-tarefas').addEventListener('change', async (e) => {
    if (!e.target.matches('[data-alternar-tarefa]')) return;
    try {
      await api(`/api/tarefas/${encodeURIComponent(e.target.dataset.alternarTarefa)}`, {
        metodo: 'PATCH',
        corpo: { feita: e.target.checked }
      });
    } catch (erro) {
      toast(erro.message, 'erro');
    }
    carregarRota('tarefas');
  });

  $('#lista-tarefas').addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-apagar-tarefa]');
    if (!botao) return;
    try {
      await api(`/api/tarefas/${encodeURIComponent(botao.dataset.apagarTarefa)}`, { metodo: 'DELETE' });
      toast('Tarefa apagada.');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
    carregarRota('tarefas');
  });

  // ---------- Histórico ----------

  async function carregarHistorico() {
    const itens = await api('/api/historico');
    const corpo = $('#corpo-historico');
    if (!itens.length) {
      corpo.innerHTML = '<tr><td class="vazio" colspan="4">Nenhum registro ainda.</td></tr>';
      return;
    }
    corpo.innerHTML = itens
      .map(
        (item) => `
      <tr>
        <td class="nowrap">${esc(formatarData(item.em))}</td>
        <td><code>${esc(item.entrada)}</code></td>
        <td class="resposta">${esc(item.resposta)}</td>
        <td><span class="status ${item.status === 'OK' ? 'ok' : 'erro'}">${esc(item.status)}</span></td>
      </tr>`
      )
      .join('');
  }

  $('#btn-limpar-historico').addEventListener('click', async () => {
    if (!confirm('Apagar todo o histórico? Essa ação não pode ser desfeita.')) return;
    try {
      await api('/api/historico', { metodo: 'DELETE' });
      toast('Histórico limpo.');
      carregarRota('historico');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  // ---------- Formulários de configuração e perfil ----------

  $('#form-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const radio = document.querySelector('input[name="cor"]:checked');
    const corpo = {
      nomeBot: $('#cfg-nome').value.trim(),
      cor: radio ? radio.value : estado.config.cor,
      mostrarHora: $('#cfg-mostrar-hora').checked,
      animacoes: $('#cfg-animacoes').checked
    };
    try {
      estado.config = await api('/api/configuracoes', { metodo: 'PUT', corpo });
      aplicarConfiguracoes();
      toast('Configurações salvas.');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  $('#form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const corpo = {
      nome: $('#perfil-nome').value.trim(),
      cargo: $('#perfil-cargo').value.trim(),
      email: $('#perfil-email').value.trim(),
      bio: $('#perfil-bio').value.trim()
    };
    try {
      estado.perfil = await api('/api/perfil', { metodo: 'PUT', corpo });
      toast('Perfil salvo.');
      carregarRota('perfil');
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });

  // ---------- Menu (celular) ----------

  $('#btn-menu').addEventListener('click', () => {
    abrirMenu(!document.body.classList.contains('menu-aberto'));
  });
  $('#sombra-menu').addEventListener('click', () => abrirMenu(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrirMenu(false);
  });

  // ---------- Inicialização ----------

  async function iniciar() {
    try {
      const [config, perfil] = await Promise.all([api('/api/configuracoes'), api('/api/perfil')]);
      estado.config = config;
      estado.perfil = perfil;
    } catch (erro) {
      toast(erro.message, 'erro');
    }
    aplicarConfiguracoes();
    montarSugestoes();
    mensagemBoasVindas();
    window.addEventListener('hashchange', mostrarRota);
    mostrarRota();
  }

  iniciar();
})();
