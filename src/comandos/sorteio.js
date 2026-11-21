// Sorteios: moeda (cara ou coroa) e dado de 2 a 1000 lados. Usa crypto.randomInt.
const crypto = require('crypto');
const { ErroDominio } = require('../armazenamento');

const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

module.exports = {
  nome: 'sorteio',
  apelidos: [],
  categoria: 'Diversão',
  descricao: 'Joga uma moeda (cara ou coroa) ou rola um dado.',
  uso: '/sorteio moeda  |  /sorteio dado [lados]',
  executar(args, ctx) {
    const { primeiro, resto } = ctx.dividir(args);
    const acao = semAcento(primeiro);

    if (acao === 'moeda') {
      return `Resultado: ${crypto.randomInt(2) === 0 ? 'Cara' : 'Coroa'}`;
    }

    if (acao === 'dado') {
      const bruto = resto.trim() || '6';
      if (!/^\d+$/.test(bruto)) throw new ErroDominio('Informe um número de lados. Ex.: /sorteio dado 20');
      const lados = Number(bruto);
      if (lados < 2 || lados > 1000) throw new ErroDominio('O dado deve ter de 2 a 1000 lados.');
      return `Dado de ${lados} lados: ${crypto.randomInt(1, lados + 1)}`;
    }

    throw new ErroDominio('Use: /sorteio moeda ou /sorteio dado [lados]');
  }
};
