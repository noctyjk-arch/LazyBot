// Utilidades HTTP: cabeçalhos de segurança, JSON, login Basic e arquivos estáticos.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const MAX_FALHAS = 10;
const BLOQUEIO_MS = 15 * 60 * 1000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// Sem scripts ou estilos inline: só arquivos do próprio servidor.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function cabecalhosSeguranca(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function enviarJson(res, status, dados, cabecalhos = {}) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo),
    'Cache-Control': 'no-store',
    ...cabecalhos
  });
  res.end(corpo);
}

// Erros sempre em JSON: { "erro": "..." }.
function enviarErro(res, status, mensagem, cabecalhos = {}) {
  enviarJson(res, status, { erro: mensagem }, cabecalhos);
}

// Lê o corpo JSON com limite de tamanho e exige Content-Type application/json.
function lerCorpoJson(req) {
  return new Promise((resolve, reject) => {
    const tipo = String(req.headers['content-type'] || '').toLowerCase();
    if (!tipo.startsWith('application/json')) {
      return reject(new ErroHttp(415, 'Envie o corpo como application/json.'));
    }
    const limite = config.LIMITE_CORPO;
    if (Number(req.headers['content-length'] || 0) > limite) {
      return reject(new ErroHttp(413, 'Corpo muito grande (limite de 100 KB).'));
    }

    const partes = [];
    let tamanho = 0;
    let excedeu = false;

    req.on('data', (parte) => {
      if (excedeu) return;
      tamanho += parte.length;
      if (tamanho > limite) {
        excedeu = true;
        return reject(new ErroHttp(413, 'Corpo muito grande (limite de 100 KB).'));
      }
      partes.push(parte);
    });

    req.on('end', () => {
      if (excedeu) return;
      try {
        const texto = Buffer.concat(partes).toString('utf8');
        resolve(texto.trim() ? JSON.parse(texto) : null);
      } catch {
        reject(new ErroHttp(400, 'JSON inválido.'));
      }
    });

    req.on('error', reject);
  });
}

// Contagem de falhas de login por IP (em memória).
const tentativas = new Map();

const resumoSha = (texto) => crypto.createHash('sha256').update(String(texto), 'utf8').digest();

// Login Basic opcional. Só vale quando SENHA_ACESSO está definida.
function autenticar(req, res) {
  if (!config.SENHA_ACESSO) return true;

  const ip = req.socket.remoteAddress || 'desconhecido';
  const agora = Date.now();
  const registro = tentativas.get(ip);

  if (registro && registro.bloqueadoAte > agora) {
    const segundos = Math.ceil((registro.bloqueadoAte - agora) / 1000);
    enviarErro(res, 429, 'Muitas tentativas erradas. Tente novamente mais tarde.', {
      'Retry-After': String(segundos)
    });
    return false;
  }

  const cabecalhoLogin = { 'WWW-Authenticate': 'Basic realm="Lazy", charset="UTF-8"' };
  const cabecalho = req.headers.authorization || '';
  if (!cabecalho.startsWith('Basic ')) {
    enviarErro(res, 401, 'Autenticação necessária.', cabecalhoLogin);
    return false;
  }

  const decodificado = Buffer.from(cabecalho.slice(6), 'base64').toString('utf8');
  const sep = decodificado.indexOf(':');
  const usuario = sep === -1 ? decodificado : decodificado.slice(0, sep);
  const senha = sep === -1 ? '' : decodificado.slice(sep + 1);

  // Comparação em tempo constante: os dois lados viram hash SHA-256 (sempre 32 bytes).
  const usuarioOk = crypto.timingSafeEqual(resumoSha(usuario), resumoSha(config.USUARIO_ACESSO));
  const senhaOk = crypto.timingSafeEqual(resumoSha(senha), resumoSha(config.SENHA_ACESSO));
  if (usuarioOk && senhaOk) {
    tentativas.delete(ip);
    return true;
  }

  const falhas = (registro ? registro.falhas : 0) + 1;
  tentativas.set(
    ip,
    falhas >= MAX_FALHAS ? { falhas: 0, bloqueadoAte: agora + BLOQUEIO_MS } : { falhas, bloqueadoAte: 0 }
  );
  if (tentativas.size > 5000) {
    for (const [chave, dados] of tentativas) {
      if (dados.bloqueadoAte <= agora) tentativas.delete(chave);
    }
  }

  enviarErro(res, 401, 'Usuário ou senha incorretos.', cabecalhoLogin);
  return false;
}

// Serve arquivos de public/ com proteção contra "../".
function servirArquivo(req, res, caminhoUrl) {
  let caminho;
  try {
    caminho = decodeURIComponent(caminhoUrl);
  } catch {
    return enviarErro(res, 400, 'Caminho inválido.');
  }
  if (caminho === '/') caminho = '/index.html';

  const segmentos = caminho.split(/[\\/]/);
  if (caminho.includes('\0') || segmentos.includes('..')) {
    return enviarErro(res, 404, 'Arquivo não encontrado.');
  }

  const absoluto = path.join(config.PASTA_PUBLICA, caminho);
  if (!absoluto.startsWith(config.PASTA_PUBLICA + path.sep)) {
    return enviarErro(res, 404, 'Arquivo não encontrado.');
  }

  fs.stat(absoluto, (erro, info) => {
    if (erro || !info.isFile()) return enviarErro(res, 404, 'Arquivo não encontrado.');
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(absoluto).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(absoluto)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}

module.exports = {
  ErroHttp,
  cabecalhosSeguranca,
  enviarJson,
  enviarErro,
  lerCorpoJson,
  autenticar,
  servirArquivo
};
