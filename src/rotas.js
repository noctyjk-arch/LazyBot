// API REST em /api/: roteador por expressão regular, com validação e respostas em JSON.
const comandos = require('./comandos');
const armazenamento = require('./armazenamento');
const { ErroHttp, enviarJson, enviarErro, lerCorpoJson } = require('./http');

const { ErroDominio } = armazenamento;
const OCULTO = '(oculto no histórico)';
const MAX_ENTRADA = 1000;
const ID = '([A-Za-z0-9-]+)';

// Lê o corpo JSON e garante que seja um objeto.
async function lerObjeto(req) {
  const corpo = await lerCorpoJson(req);
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    throw new ErroHttp(400, 'Envie um objeto JSON válido.');
  }
  return corpo;
}

async function executarComando(req, res) {
  const corpo = await lerObjeto(req);
  const entrada = typeof corpo.entrada === 'string' ? corpo.entrada.trim() : '';
  if (!entrada) throw new ErroHttp(400, 'Informe o campo "entrada" com o comando.');
  if (entrada.length > MAX_ENTRADA) {
    throw new ErroHttp(400, `Comando muito longo (máximo de ${MAX_ENTRADA} caracteres).`);
  }

  const resultado = comandos.executar(entrada);
  armazenamento.registrarExecucao({
    entrada,
    resposta: resultado.secreto ? OCULTO : resultado.texto,
    ok: resultado.ok,
    comando: resultado.comando
  });
  enviarJson(res, 200, { ok: resultado.ok, texto: resultado.texto, comando: resultado.comando });
}

const ROTAS = [
  { metodo: 'GET', padrao: /^\/api\/comandos$/, tratar: (req, res) => enviarJson(res, 200, comandos.lista()) },
  { metodo: 'POST', padrao: /^\/api\/executar$/, tratar: executarComando },

  {
    metodo: 'GET',
    padrao: /^\/api\/painel$/,
    tratar: (req, res) => enviarJson(res, 200, armazenamento.estatisticas(comandos.lista().length))
  },

  { metodo: 'GET', padrao: /^\/api\/historico$/, tratar: (req, res) => enviarJson(res, 200, armazenamento.listarHistorico()) },
  {
    metodo: 'DELETE',
    padrao: /^\/api\/historico$/,
    tratar: (req, res) => {
      armazenamento.limparHistorico();
      enviarJson(res, 200, { ok: true });
    }
  },

  {
    metodo: 'GET',
    padrao: /^\/api\/configuracoes$/,
    tratar: (req, res) => enviarJson(res, 200, armazenamento.obterConfiguracoes())
  },
  {
    metodo: 'PUT',
    padrao: /^\/api\/configuracoes$/,
    tratar: async (req, res) => {
      const corpo = await lerObjeto(req);
      enviarJson(res, 200, armazenamento.atualizarConfiguracoes(corpo));
    }
  },

  { metodo: 'GET', padrao: /^\/api\/perfil$/, tratar: (req, res) => enviarJson(res, 200, armazenamento.obterPerfil()) },
  {
    metodo: 'PUT',
    padrao: /^\/api\/perfil$/,
    tratar: async (req, res) => {
      const corpo = await lerObjeto(req);
      enviarJson(res, 200, armazenamento.atualizarPerfil(corpo));
    }
  },

  { metodo: 'GET', padrao: /^\/api\/notas$/, tratar: (req, res) => enviarJson(res, 200, armazenamento.listarNotas()) },
  {
    metodo: 'POST',
    padrao: /^\/api\/notas$/,
    tratar: async (req, res) => {
      const corpo = await lerObjeto(req);
      enviarJson(res, 201, armazenamento.criarNota(corpo.conteudo));
    }
  },
  {
    metodo: 'DELETE',
    padrao: new RegExp(`^/api/notas/${ID}$`),
    tratar: (req, res, [id]) => {
      armazenamento.removerNota(id);
      enviarJson(res, 200, { ok: true });
    }
  },

  { metodo: 'GET', padrao: /^\/api\/tarefas$/, tratar: (req, res) => enviarJson(res, 200, armazenamento.listarTarefas()) },
  {
    metodo: 'POST',
    padrao: /^\/api\/tarefas$/,
    tratar: async (req, res) => {
      const corpo = await lerObjeto(req);
      enviarJson(res, 201, armazenamento.criarTarefa(corpo.texto, corpo.prioridade));
    }
  },
  {
    metodo: 'PATCH',
    padrao: new RegExp(`^/api/tarefas/${ID}$`),
    tratar: async (req, res, [id]) => {
      const corpo = await lerObjeto(req);
      enviarJson(res, 200, armazenamento.definirTarefaFeita(id, corpo.feita));
    }
  },
  {
    metodo: 'DELETE',
    padrao: new RegExp(`^/api/tarefas/${ID}$`),
    tratar: (req, res, [id]) => {
      armazenamento.removerTarefa(id);
      enviarJson(res, 200, { ok: true });
    }
  }
];

// Converte erros esperados em respostas JSON; o restante vira 500 sem detalhes.
function tratarErro(res, erro) {
  if (res.headersSent) return res.end();
  if (erro instanceof ErroHttp || erro instanceof ErroDominio) {
    return enviarErro(res, erro.status, erro.message);
  }
  console.error('Erro na API:', erro);
  return enviarErro(res, 500, 'Erro interno do servidor.');
}

async function tratarApi(req, res, caminho) {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;
  const casadas = ROTAS
    .map((rota) => ({ rota, partes: rota.padrao.exec(limpo) }))
    .filter((item) => item.partes);

  if (casadas.length === 0) return enviarErro(res, 404, 'Rota não encontrada.');

  const alvo = casadas.find((item) => item.rota.metodo === req.method);
  if (!alvo) {
    const permitidos = [...new Set(casadas.map((item) => item.rota.metodo))].join(', ');
    return enviarErro(res, 405, 'Método não permitido.', { Allow: permitidos });
  }

  try {
    await alvo.rota.tratar(req, res, alvo.partes.slice(1));
  } catch (erro) {
    tratarErro(res, erro);
  }
}

module.exports = { tratarApi };
