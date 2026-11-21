// Lista de tarefas: adicionar, listar e concluir. A numeração segue a ordem de criação.
const armazenamento = require('../armazenamento');

const { ErroDominio } = armazenamento;
const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const USO = 'Use: /tarefa adicionar <texto> | /tarefa listar | /tarefa concluir <N>';
const ROTULO = { baixa: 'baixa', media: 'média', alta: 'alta' };

module.exports = {
  nome: 'tarefa',
  apelidos: [],
  categoria: 'Produtividade',
  descricao: 'Adiciona, lista e conclui tarefas.',
  uso: '/tarefa adicionar <texto> | /tarefa listar | /tarefa concluir <N>',
  executar(args, ctx) {
    const { primeiro, resto } = ctx.dividir(args);
    const acao = semAcento(primeiro);

    if (acao === 'adicionar') {
      if (!resto) throw new ErroDominio('Informe o texto da tarefa. Ex.: /tarefa adicionar estudar 1 hora');
      armazenamento.criarTarefa(resto);
      return 'Tarefa adicionada (prioridade média). Use /tarefa listar para ver.';
    }

    if (acao === 'listar') {
      const tarefas = armazenamento.listarTarefas();
      if (!tarefas.length) return 'Você ainda não tem tarefas. Use /tarefa adicionar <texto>.';
      const pendentes = tarefas.filter((t) => !t.feita).length;
      const linhas = tarefas.map(
        (t, i) => `${i + 1}. [${t.feita ? 'x' : ' '}] ${t.texto} (${ROTULO[t.prioridade] || t.prioridade})`
      );
      return [`Tarefas (${pendentes} pendente(s) de ${tarefas.length}):`, ...linhas].join('\n');
    }

    if (acao === 'concluir') {
      const tarefas = armazenamento.listarTarefas();
      const indice = ctx.posicao(resto, tarefas.length);
      armazenamento.definirTarefaFeita(tarefas[indice].id, true);
      return `Tarefa ${indice + 1} concluída.`;
    }

    throw new ErroDominio(USO);
  }
};
