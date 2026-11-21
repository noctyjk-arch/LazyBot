'use strict';
const crypto = require('crypto');
module.exports = {
  nome: 'tarefa', categoria: 'Produtividade',
  descricao: 'Gerencia tarefas: adicionar, listar e concluir', uso: '/tarefa <adicionar texto | listar | concluir N>',
  executar([op = 'listar', ...resto] = [], { db, salvar }) {
    if (op === 'adicionar') {
      const t = resto.join(' ').trim();
      if (!t) throw new Error('Descreva a tarefa. Ex.: /tarefa adicionar estudar JS');
      db.tarefas.unshift({ id: crypto.randomUUID(), titulo: t.slice(0, 120), prioridade: 'media', feita: false, criadaEm: new Date().toISOString() });
      salvar();
      return 'Tarefa criada.';
    }
    if (op === 'listar') {
      if (!db.tarefas.length) return 'Nenhuma tarefa cadastrada.';
      return db.tarefas.map((t, i) => `${i + 1}. [${t.feita ? 'x' : ' '}] ${t.titulo}`).join('\n');
    }
    if (op === 'concluir') {
      const t = db.tarefas[Number(resto[0]) - 1];
      if (!t) throw new Error('Número inválido. Veja as tarefas com /tarefa listar');
      t.feita = true;
      salvar();
      return `Concluída: ${t.titulo}`;
    }
    throw new Error('Use: /tarefa adicionar texto  |  /tarefa listar  |  /tarefa concluir N');
  },
};
