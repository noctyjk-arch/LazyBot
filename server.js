'use strict';
// Ponto de entrada: servidor HTTP feito só com módulos nativos do Node (zero dependências).
const http = require('http');
const { PORTA, HOST, SENHA, VERSAO } = require('./src/config');
const { salvarAgora } = require('./src/armazenamento');
const { ErroHttp, cabecalhosSeguranca, responderJSON, servirEstatico, exigirAcesso } = require('./src/http');
const roteador = require('./src/rotas');

const servidor = http.createServer(async (req, res) => {
  try {
    cabecalhosSeguranca(res);
    if (!exigirAcesso(req, res)) return;                       // pede login se houver SENHA_ACESSO
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) await roteador(req, res, url);
    else servirEstatico(req, res, url.pathname);
  } catch (erro) {
    const status = erro instanceof ErroHttp ? erro.status : 500;
    if (status === 500) console.error('[erro]', erro);
    if (res.headersSent) return res.end();
    responderJSON(res, status, { erro: status === 500 ? 'Erro interno do servidor.' : erro.message });
  }
});

servidor.on('error', (erro) => {
  console.error(erro.code === 'EADDRINUSE' ? `A porta ${PORTA} já está em uso. Tente: PORT=3001 npm start` : erro);
  process.exit(1);
});

servidor.listen(PORTA, HOST, () => {
  console.log(`Nexus v${VERSAO} rodando em http://localhost:${PORTA}`);
  if (!SENHA) console.log('Aviso: sem SENHA_ACESSO definida. Veja o README para proteger o painel.');
});

process.on('unhandledRejection', (erro) => console.error('[rejeição não tratada]', erro));
// Grava os dados antes de encerrar (Ctrl+C ou parada pelo painel da hospedagem).
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => { salvarAgora(); process.exit(0); });
