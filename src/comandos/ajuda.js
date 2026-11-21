'use strict';
module.exports = {
  nome: 'ajuda', apelidos: ['help'], categoria: 'Sistema',
  descricao: 'Lista os comandos disponíveis', uso: '/ajuda',
  executar: (args, { lista }) => lista.map((c) => `${c.uso}  —  ${c.descricao}`).join('\n'),
};
