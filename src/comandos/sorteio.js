'use strict';
const crypto = require('crypto');
module.exports = {
  nome: 'sorteio', categoria: 'Diversão',
  descricao: 'Sorteia cara ou coroa, ou rola um dado', uso: '/sorteio <moeda|dado> [lados]',
  executar([tipo = 'dado', lados = '6'] = []) {
    const t = String(tipo).toLowerCase();
    if (t === 'moeda') return crypto.randomInt(2) ? 'Cara' : 'Coroa';
    if (t !== 'dado') throw new Error('Use: /sorteio moeda  ou  /sorteio dado [lados]');
    const n = Math.min(Math.max(parseInt(lados, 10) || 6, 2), 1000);
    return `Dado de ${n} lados: ${crypto.randomInt(1, n + 1)}`;
  },
};
