// Notas rápidas: adicionar, listar e apagar. A numeração segue a ordem de listarNotas (mais recentes primeiro).
const armazenamento = require('../armazenamento');

const { ErroDominio } = armazenamento;
const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const USO = 'Use: /nota adicionar <texto> | /nota listar | /nota apagar <N>';

// Mostra só o começo da nota na lista do chat.
function resumir(texto, limite = 140) {
  const umaLinha = texto.replace(/\s+/g, ' ');
  return umaLinha.length > limite ? `${umaLinha.slice(0, limite)}…` : umaLinha;
}

module.exports = {
  nome: 'nota',
  apelidos: [],
  categoria: 'Produtividade',
  descricao: 'Adiciona, lista e apaga notas.',
  uso: '/nota adicionar <texto> | /nota listar | /nota apagar <N>',
  executar(args, ctx) {
    const { primeiro, resto } = ctx.dividir(args);
    const acao = semAcento(primeiro);

    if (acao === 'adicionar') {
      if (!resto) throw new ErroDominio('Informe o texto da nota. Ex.: /nota adicionar comprar café');
      armazenamento.criarNota(resto);
      return 'Nota adicionada. Use /nota listar para ver.';
    }

    if (acao === 'listar') {
      const notas = armazenamento.listarNotas();
      if (!notas.length) return 'Você ainda não tem notas. Use /nota adicionar <texto>.';
      const linhas = notas.map((nota, i) => `${i + 1}. ${resumir(nota.conteudo)}`);
      return [`Suas notas (${notas.length}):`, ...linhas].join('\n');
    }

    if (acao === 'apagar') {
      const notas = armazenamento.listarNotas();
      const indice = ctx.posicao(resto, notas.length);
      armazenamento.removerNota(notas[indice].id);
      return `Nota ${indice + 1} apagada.`;
    }

    throw new ErroDominio(USO);
  }
};
