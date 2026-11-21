// Configurações do Lazy. Lê o arquivo .env sem bibliotecas externas.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// Carrega CHAVE=valor do .env. Variáveis já definidas no ambiente têm prioridade.
function carregarEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) continue;
    const sep = texto.indexOf('=');
    if (sep === -1) continue;
    const chave = texto.slice(0, sep).trim();
    let valor = texto.slice(sep + 1).trim();
    if (/^(["']).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (chave && process.env[chave] === undefined) process.env[chave] = valor;
  }
}

carregarEnv(path.join(RAIZ, '.env'));

const porta = Number(process.env.PORT || process.env.SERVER_PORT || 3000);

module.exports = {
  RAIZ,
  PASTA_PUBLICA: path.join(RAIZ, 'public'),
  HOST: '0.0.0.0',
  PORTA: Number.isInteger(porta) && porta > 0 ? porta : 3000,
  SENHA_ACESSO: process.env.SENHA_ACESSO || '',
  USUARIO_ACESSO: process.env.USUARIO_ACESSO || 'admin',
  LIMITE_CORPO: 100 * 1024
};
