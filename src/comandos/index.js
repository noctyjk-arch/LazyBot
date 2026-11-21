'use strict';
// Carrega automaticamente todo arquivo .js desta pasta.
// Para criar um comando novo, basta adicionar um arquivo aqui e reiniciar o servidor.
const fs = require('fs');
const path = require('path');

const COMANDOS = [];
const porNome = new Map();   // Map evita colisão com nomes como "constructor"

for (const arquivo of fs.readdirSync(__dirname).sort()) {
  if (!arquivo.endsWith('.js') || arquivo === 'index.js') continue;
  const cmd = require(path.join(__dirname, arquivo));
  if (!cmd.nome || typeof cmd.executar !== 'function') { console.warn(`[comandos] ${arquivo} ignorado: exporte { nome, executar }`); continue; }
  COMANDOS.push(cmd);
  for (const nome of [cmd.nome, ...(cmd.apelidos || [])]) porNome.set(nome, cmd);
}

const lista = () => COMANDOS.map(({ nome, apelidos = [], descricao, uso, categoria = 'Geral' }) => ({ nome, apelidos, descricao, uso, categoria }));

async function executar(entrada, ctx) {
  const [bruto = '', ...args] = entrada.trim().replace(/^\//, '').split(/\s+/);
  const nome = bruto.toLowerCase();
  if (!nome) return { ok: false, texto: 'Digite um comando. Experimente /ajuda.', comando: '(desconhecido)' };
  const cmd = porNome.get(nome);
  if (!cmd) return { ok: false, texto: `Comando "${nome}" não encontrado. Digite /ajuda.`, comando: '(desconhecido)' };
  try {
    const resultado = String(await cmd.executar(args, { ...ctx, lista: lista() }));
    return { ok: true, texto: resultado, comando: cmd.nome, secreto: !!cmd.secreto };
  } catch (erro) {
    return { ok: false, texto: erro.message || 'Erro ao executar o comando.', comando: cmd.nome };
  }
}

module.exports = { lista, executar };
