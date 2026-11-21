// Lista todos os comandos ou mostra o uso detalhado de um deles.
module.exports = {
  nome: 'ajuda',
  apelidos: ['help'],
  categoria: 'Geral',
  descricao: 'Mostra a lista de comandos ou o detalhe de um comando.',
  uso: '/ajuda [comando]',
  executar(args, ctx) {
    const { primeiro } = ctx.dividir(args);

    if (primeiro) {
      const alvo = primeiro.replace(/^\//, '').toLowerCase();
      const comando = ctx.lista.find((c) => c.nome === alvo || (c.apelidos || []).includes(alvo));
      if (!comando) return `Não encontrei o comando "${primeiro}". Digite /ajuda para ver a lista.`;
      const apelidos = (comando.apelidos || []).length
        ? comando.apelidos.map((a) => `/${a}`).join(', ')
        : 'nenhum';
      return [
        `/${comando.nome}`,
        `Descrição: ${comando.descricao}`,
        `Uso: ${comando.uso}`,
        `Apelidos: ${apelidos}`,
        `Categoria: ${comando.categoria}`
      ].join('\n');
    }

    // Agrupa por categoria, mantendo a ordem da lista.
    const grupos = new Map();
    for (const c of ctx.lista) {
      if (!grupos.has(c.categoria)) grupos.set(c.categoria, []);
      grupos.get(c.categoria).push(c);
    }

    const linhas = ['Comandos disponíveis (digite com ou sem a barra /):'];
    for (const [categoria, itens] of grupos) {
      linhas.push('', categoria);
      for (const c of itens) linhas.push(`  /${c.nome} - ${c.descricao}`);
    }
    linhas.push('', 'Dica: /ajuda <comando> mostra o uso detalhado.');
    return linhas.join('\n');
  }
};
