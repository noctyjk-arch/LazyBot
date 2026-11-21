// Servidor HTTP do Lazy: login opcional, arquivos estáticos e API em /api/.
const http = require('http');
const config = require('./src/config');
const armazenamento = require('./src/armazenamento');
const { cabecalhosSeguranca, autenticar, servirArquivo, enviarErro } = require('./src/http');
const { tratarApi } = require('./src/rotas');

const servidor = http.createServer((req, res) => {
  cabecalhosSeguranca(res);
  if (!autenticar(req, res)) return;

  let caminho;
  try {
    caminho = new URL(req.url, 'http://localhost').pathname;
  } catch {
    return enviarErro(res, 400, 'Requisição inválida.');
  }

  if (caminho === '/api' || caminho.startsWith('/api/')) return tratarApi(req, res, caminho);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return enviarErro(res, 405, 'Método não permitido.');
  }
  return servirArquivo(req, res, caminho);
});

servidor.on('error', (erro) => {
  console.error(`Não foi possível iniciar o servidor: ${erro.message}`);
  process.exit(1);
});

servidor.listen(config.PORTA, config.HOST, () => {
  console.log(`Lazy no ar em http://localhost:${config.PORTA}`);
  if (!config.SENHA_ACESSO) {
    console.warn('Aviso: SENHA_ACESSO não definida. Qualquer pessoa que alcance o servidor terá acesso.');
  }
});

// Grava os dados antes de encerrar (Ctrl+C ou parada pela hospedagem).
function encerrar(sinal) {
  console.log(`\n${sinal} recebido. Salvando dados...`);
  armazenamento.salvarAgora();
  servidor.close();
  process.exit(0);
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
