// Ferramentas de texto: contar, inverter e mudar a caixa. Aceita as ações sem acento.
const { ErroDominio } = require('../armazenamento');

const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ACOES = ['contar', 'inverter', 'maiusculas', 'minusculas'];
const USO = 'Uso: /texto contar|inverter|maiusculas|minusculas <texto>';

module.exports = {
  nome: 'texto',
  apelidos: [],
  categoria: 'Utilidades',
  descricao: 'Conta caracteres e palavras, inverte e muda a caixa do texto.',
  uso: '/texto contar|inverter|maiusculas|minusculas <texto>',
  executar(args, ctx) {
    const { primeiro, resto } = ctx.dividir(args);
    const acao = semAcento(primeiro);
    if (!ACOES.includes(acao)) throw new ErroDominio(USO);
    if (!resto) throw new ErroDominio('Informe o texto depois da ação.');

    if (acao === 'contar') {
      const caracteres = [...resto].length;
      const semEspacos = [...resto.replace(/\s/g, '')].length;
      const palavras = resto.trim().split(/\s+/).length;
      return [`Caracteres: ${caracteres}`, `Sem espaços: ${semEspacos}`, `Palavras: ${palavras}`].join('\n');
    }
    if (acao === 'inverter') return [...resto].reverse().join('');
    if (acao === 'maiusculas') return resto.toLocaleUpperCase('pt-BR');
    return resto.toLocaleLowerCase('pt-BR');
  }
};
