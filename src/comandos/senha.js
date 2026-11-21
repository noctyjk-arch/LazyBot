'use strict';
const crypto = require('crypto');
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';

module.exports = {
  nome: 'senha', categoria: 'Segurança',
  descricao: 'Gera uma senha aleatória segura (8 a 64 caracteres)', uso: '/senha [tamanho]',
  secreto: true,   // aparece no chat, mas não é gravada no histórico
  executar([tam = ''] = []) {
    const n = Math.min(Math.max(parseInt(tam, 10) || 16, 8), 64);
    let senha = '';
    for (let i = 0; i < n; i++) senha += CARACTERES[crypto.randomInt(CARACTERES.length)];
    return senha;
  },
};
