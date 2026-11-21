'use strict';
const crypto = require('crypto');
module.exports = {
  nome: 'uuid', categoria: 'Segurança',
  descricao: 'Gera um identificador UUID v4', uso: '/uuid',
  executar: () => crypto.randomUUID(),
};
