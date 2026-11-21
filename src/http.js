'use strict';
// Utilidades HTTP feitas à mão: JSON, corpo da requisição, arquivos estáticos,
// cabeçalhos de segurança e senha de acesso opcional.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PUBLICO, SENHA, USUARIO, LIMITES } = require('./config');

class ErroHttp extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function cabecalhosSeguranca(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
}

function responderJSON(res, status, dados) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(corpo), 'Cache-Control': 'no-store' });
  res.end(corpo);
}

// Exigir application/json também bloqueia formulários enviados por outros sites (CSRF).
async function lerCorpo(req) {
  if (!(req.headers['content-type'] || '').includes('application/json')) throw new ErroHttp(415, 'Envie o corpo como application/json.');
  const partes = [];
  let total = 0;
  for await (const parte of req) {
    total += parte.length;
    if (total > LIMITES.corpo) throw new ErroHttp(413, 'Requisição grande demais.');
    partes.push(parte);
  }
  let dados;
  try { dados = JSON.parse(Buffer.concat(partes).toString() || '{}'); } catch { throw new ErroHttp(400, 'JSON inválido.'); }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new ErroHttp(400, 'O corpo deve ser um objeto JSON.');
  return dados;
}

function servirEstatico(req, res, caminho) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let relativo;
  try { relativo = decodeURIComponent(caminho); } catch { throw new ErroHttp(400, 'Endereço inválido.'); }
  if (relativo.endsWith('/')) relativo += 'index.html';
  const arquivo = path.normalize(path.join(PUBLICO, relativo));
  if (relativo.includes('\0') || !arquivo.startsWith(PUBLICO + path.sep)) throw new ErroHttp(403, 'Acesso negado.');
  fs.stat(arquivo, (falha, info) => {
    if (falha || !info.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Página não encontrada.'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(arquivo).on('error', () => res.destroy()).pipe(res);
  });
}

const falhas = new Map();   // ip → { n, ate }: tentativas de senha erradas
const ipDe = (req) => (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress;
const hash = (t) => crypto.createHash('sha256').update(String(t)).digest();
const iguais = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));   // comparação em tempo constante

// Retorna true se a requisição pode seguir. Sem SENHA_ACESSO, o acesso é livre.
function exigirAcesso(req, res) {
  if (!SENHA) return true;
  const ip = ipDe(req), reg = falhas.get(ip), agora = Date.now();
  if (reg && reg.n >= 10 && agora < reg.ate) {
    res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' });
    res.end('Muitas tentativas erradas. Aguarde alguns minutos.');
    return false;
  }
  const [tipo, credencial = ''] = (req.headers.authorization || '').split(' ');
  const [usuario, ...resto] = Buffer.from(credencial, 'base64').toString().split(':');
  const userOk = iguais(usuario || '', USUARIO), senhaOk = iguais(resto.join(':'), SENHA);
  if (tipo === 'Basic' && userOk && senhaOk) { falhas.delete(ip); return true; }
  if (req.headers.authorization) falhas.set(ip, { n: (reg && agora < reg.ate ? reg.n : 0) + 1, ate: agora + 600000 });
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Nexus", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Digite o usuário e a senha para acessar.');
  return false;
}

module.exports = { ErroHttp, cabecalhosSeguranca, responderJSON, lerCorpo, servirEstatico, exigirAcesso };
