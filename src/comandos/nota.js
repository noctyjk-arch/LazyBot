'use strict';
const crypto = require('crypto');
module.exports = {
  nome: 'nota', categoria: 'Produtividade',
  descricao: 'Cria, lista e apaga notas rápidas', uso: '/nota <adicionar texto | listar | apagar N>',
  executar([op = 'listar', ...resto] = [], { db, salvar }) {
    if (op === 'adicionar') {
      const t = resto.join(' ').trim();
      if (!t) throw new Error('Escreva a nota. Ex.: /nota adicionar comprar pão');
      db.notas.unshift({ id: crypto.randomUUID(), titulo: t.slice(0, 60), conteudo: t, criadaEm: new Date().toISOString() });
      salvar();
      return 'Nota salva.';
    }
    if (op === 'listar') return db.notas.length ? db.notas.map((n, i) => `${i + 1}. ${n.titulo}`).join('\n') : 'Você ainda não tem notas.';
    if (op === 'apagar') {
      const i = Number(resto[0]) - 1;
      if (!db.notas[i]) throw new Error('Número inválido. Veja as notas com /nota listar');
      const [removida] = db.notas.splice(i, 1);
      salvar();
      return `Nota "${removida.titulo}" apagada.`;
    }
    throw new Error('Use: /nota adicionar texto  |  /nota listar  |  /nota apagar N');
  },
};
