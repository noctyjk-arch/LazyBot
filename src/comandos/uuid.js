// Gera um UUID v4 aleatório com crypto.randomUUID.
const crypto = require('crypto');

module.exports = {
  nome: 'uuid',
  apelidos: [],
  categoria: 'Utilidades',
  descricao: 'Gera um UUID v4 aleatório.',
  uso: '/uuid',
  executar() {
    return crypto.randomUUID();
  }
};
