'use strict';
// Configurações. Podem vir de variáveis de ambiente ou de um arquivo .env na raiz.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// Leitor de .env sem bibliotecas. Formato: CHAVE=valor, uma por linha.
try {
  for (const linha of fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
} catch { /* sem .env: tudo bem */ }

module.exports = {
  RAIZ,
  PUBLICO: path.join(RAIZ, 'public'),
  ARQUIVO_DADOS: path.join(process.env.DATA_DIR || path.join(RAIZ, 'data'), 'db.json'),
  PORTA: Number(process.env.PORT || process.env.SERVER_PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  SENHA: process.env.SENHA_ACESSO || '',
  USUARIO: process.env.USUARIO_ACESSO || 'admin',
  VERSAO: require('../package.json').version,
  LIMITES: { entrada: 2000, corpo: 100 * 1024, notas: 200, tarefas: 200 },
};
