'use strict';
module.exports = {
  nome: 'base64', categoria: 'Utilidades',
  descricao: 'Codifica ou decodifica texto em Base64', uso: '/base64 <codificar|decodificar> <texto>',
  executar([op = '', ...resto] = []) {
    const t = resto.join(' ');
    if (!t) throw new Error('Informe o texto. Ex.: /base64 codificar olá');
    if (op === 'codificar') return Buffer.from(t, 'utf8').toString('base64');
    if (op === 'decodificar') return Buffer.from(t, 'base64').toString('utf8');
    throw new Error('Use codificar ou decodificar.');
  },
};
