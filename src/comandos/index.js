// Registro de comandos: carrega automaticamente todo .js desta pasta (exceto este arquivo).
// Cada comando exporta { nome, apelidos, categoria, descricao, uso, executar(args, ctx) }.
const fs = require('fs');
const path = require('path');
const { ErroDominio } = require('../armazenamento');

// Separa a primeira palavra do restante, preservando espaços internos.
function dividir(texto) {
  const partes = /^(\S*)\s*([\s\S]*)$/.exec(String(texto).trim());
  return { primeiro: partes[1], resto: partes[2] };
}

// Converte "3" em índice 2 (base zero), validando o intervalo da lista.
function posicao(texto, total) {
  if (total === 0) throw new ErroDominio('Ainda não há itens na lista.');
  const bruto = String(texto).trim();
  const numero = Number(bruto);
  if (!bruto || !Number.isInteger(numero) || numero < 1 || numero > total) {
    throw new ErroDominio(`Informe um número de 1 a ${total}.`);
  }
  return numero - 1;
}

const LISTA = [];        // comandos, sem repetição
const MAPA = new Map();  // nome ou apelido -> comando

function registrar(comando, origem) {
  if (!comando || typeof comando.nome !== 'string' || typeof comando.executar !== 'function') {
    throw new Error(`Comando inválido em ${origem}: exporte "nome" e "executar".`);
  }
  const nomes = [comando.nome, ...(comando.apelidos || [])].map((n) => n.toLowerCase());
  for (const nome of nomes) {
    if (MAPA.has(nome)) throw new Error(`Nome de comando repetido: "${nome}" (${origem}).`);
    MAPA.set(nome, comando);
  }
  LISTA.push(comando);
}

for (const arquivo of fs.readdirSync(__dirname).sort()) {
  if (!arquivo.endsWith('.js') || arquivo === 'index.js') continue;
  registrar(require(path.join(__dirname, arquivo)), arquivo);
}
LISTA.sort((a, b) => (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR') || a.nome.localeCompare(b.nome));

// Contexto entregue a todos os comandos.
const ctx = { lista: LISTA, dividir, posicao };

// Lista pública (sem as funções), usada por GET /api/comandos.
function lista() {
  return LISTA.map((c) => ({
    nome: c.nome,
    apelidos: c.apelidos || [],
    descricao: c.descricao,
    uso: c.uso,
    categoria: c.categoria,
    secreto: c.secreto === true
  }));
}

// Executa uma entrada digitada pelo usuário, como "/hora" ou "calc 2 + 2".
function executar(entrada) {
  const { primeiro, resto } = dividir(String(entrada).replace(/^\//, ''));
  if (!primeiro) return { ok: false, texto: 'Digite um comando. Ex.: /ajuda', comando: null, secreto: false };

  const comando = MAPA.get(primeiro.toLowerCase());
  if (!comando) {
    return { ok: false, texto: `Comando "${primeiro}" não encontrado. Digite /ajuda.`, comando: null, secreto: false };
  }

  const secreto = comando.secreto === true;
  try {
    return { ok: true, texto: String(comando.executar(resto, ctx)), comando: comando.nome, secreto };
  } catch (erro) {
    if (erro instanceof ErroDominio) {
      return { ok: false, texto: erro.message, comando: comando.nome, secreto };
    }
    console.error(`Erro inesperado no comando /${comando.nome}:`, erro);
    return { ok: false, texto: 'Erro interno ao executar o comando.', comando: comando.nome, secreto };
  }
}

module.exports = { executar, lista };
