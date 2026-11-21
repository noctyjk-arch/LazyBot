// Gera uma senha aleatória com crypto.randomInt. Marcada como secreta: o histórico não guarda a resposta.
const crypto = require('crypto');
const { ErroDominio } = require('../armazenamento');

const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const MAIUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMEROS = '0123456789';
const SIMBOLOS = '!@#$%&*-_=+?';
const TODOS = MINUSCULAS + MAIUSCULAS + NUMEROS + SIMBOLOS;

const escolher = (conjunto) => conjunto[crypto.randomInt(conjunto.length)];

// Embaralhamento de Fisher-Yates com números aleatórios seguros.
function embaralhar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function gerarSenha(tamanho) {
  // Garante ao menos um caractere de cada tipo; o restante vem do conjunto completo.
  const caracteres = [escolher(MINUSCULAS), escolher(MAIUSCULAS), escolher(NUMEROS), escolher(SIMBOLOS)];
  while (caracteres.length < tamanho) caracteres.push(escolher(TODOS));
  return embaralhar(caracteres).join('');
}

module.exports = {
  nome: 'senha',
  apelidos: [],
  categoria: 'Segurança',
  descricao: 'Gera uma senha aleatória (8 a 64 caracteres, padrão 16).',
  uso: '/senha [tamanho]  (ex.: /senha 20)',
  secreto: true,
  executar(args) {
    const bruto = String(args).trim();
    const tamanho = bruto === '' ? 16 : Number(bruto);
    if (!Number.isInteger(tamanho) || tamanho < 8 || tamanho > 64) {
      throw new ErroDominio('Informe um tamanho entre 8 e 64. Ex.: /senha 20');
    }
    return `Senha de ${tamanho} caracteres: ${gerarSenha(tamanho)}`;
  }
};
