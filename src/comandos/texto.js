'use strict';
module.exports = {
  nome: 'texto', categoria: 'Utilidades',
  descricao: 'Conta, inverte ou muda caixa de um texto', uso: '/texto <contar|inverter|maiusculas|minusculas> <texto>',
  executar([op = '', ...resto] = []) {
    const o = op.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const t = resto.join(' ');
    if (!t) throw new Error('Informe o texto. Ex.: /texto contar olá mundo');
    if (o === 'contar') return `Caracteres: ${t.length} · Palavras: ${t.split(/\s+/).length}`;
    if (o === 'inverter') return [...t].reverse().join('');
    if (o === 'maiusculas') return t.toUpperCase();
    if (o === 'minusculas') return t.toLowerCase();
    throw new Error('Operação inválida. Use: contar, inverter, maiusculas ou minusculas');
  },
};
