'use strict';
module.exports = {
  nome: 'hora', apelidos: ['data'], categoria: 'Utilidades',
  descricao: 'Mostra data e hora atuais', uso: '/hora',
  executar: () => new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' }),
};
