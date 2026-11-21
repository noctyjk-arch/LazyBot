// Calculadora segura: analisador recursivo próprio, sem eval nem Function.
// Operadores: + - * / % ^ e parênteses. O ^ é associativo à direita e -2^2 = -4.
const { ErroDominio } = require('../armazenamento');

const MAX_TEXTO = 200;
const MAX_PROFUNDIDADE = 100;

// Separa a expressão em números e operadores. Aceita vírgula ou ponto como decimal.
function tokenizar(texto) {
  const tokens = [];
  const padrao = /\s*(?:(\d+(?:[.,]\d+)?|[.,]\d+)|([-+*\/%^()]))/y;
  let pos = 0;

  while (pos < texto.length) {
    padrao.lastIndex = pos;
    const achou = padrao.exec(texto);
    if (!achou) {
      const resto = texto.slice(pos).trim();
      if (resto === '') break;
      throw new ErroDominio(`Caractere inválido: "${resto.charAt(0)}".`);
    }
    if (achou[1] !== undefined) {
      tokens.push({ tipo: 'numero', valor: Number(achou[1].replace(',', '.')) });
    } else {
      tokens.push({ tipo: 'operador', valor: achou[2] });
    }
    pos = padrao.lastIndex;
  }
  return tokens;
}

// Analisador descendente: expressao > termo > unario > potencia > primario.
class Analisador {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.profundidade = 0;
  }

  atual() {
    return this.tokens[this.pos];
  }

  ehOperador(simbolo) {
    const t = this.atual();
    return Boolean(t) && t.tipo === 'operador' && t.valor === simbolo;
  }

  // Soma e subtração.
  expressao() {
    let valor = this.termo();
    while (this.ehOperador('+') || this.ehOperador('-')) {
      const operador = this.tokens[this.pos++].valor;
      const direita = this.termo();
      valor = operador === '+' ? valor + direita : valor - direita;
    }
    return valor;
  }

  // Multiplicação, divisão e resto.
  termo() {
    let valor = this.unario();
    while (this.ehOperador('*') || this.ehOperador('/') || this.ehOperador('%')) {
      const operador = this.tokens[this.pos++].valor;
      const direita = this.unario();
      if (operador === '*') {
        valor *= direita;
        continue;
      }
      if (direita === 0) throw new ErroDominio('Divisão por zero.');
      valor = operador === '/' ? valor / direita : valor % direita;
    }
    return valor;
  }

  // Sinais: -x e +x. Ficam abaixo da potência, por isso -2^2 = -4.
  unario() {
    if (this.ehOperador('-')) {
      this.pos++;
      return -this.unario();
    }
    if (this.ehOperador('+')) {
      this.pos++;
      return this.unario();
    }
    return this.potencia();
  }

  // Potência: associativa à direita; o expoente aceita sinal (2^-1).
  potencia() {
    const base = this.primario();
    if (this.ehOperador('^')) {
      this.pos++;
      return Math.pow(base, this.unario());
    }
    return base;
  }

  // Número ou expressão entre parênteses.
  primario() {
    const t = this.atual();
    if (!t) throw new ErroDominio('Expressão incompleta.');
    if (t.tipo === 'numero') {
      this.pos++;
      return t.valor;
    }
    if (t.valor === '(') {
      this.pos++;
      this.profundidade++;
      if (this.profundidade > MAX_PROFUNDIDADE) throw new ErroDominio('Parênteses demais na expressão.');
      const valor = this.expressao();
      if (!this.ehOperador(')')) throw new ErroDominio('Falta fechar um parêntese ")".');
      this.pos++;
      this.profundidade--;
      return valor;
    }
    throw new ErroDominio(`Operador inesperado "${t.valor}".`);
  }
}

function calcular(texto) {
  const tokens = tokenizar(texto);
  const analisador = new Analisador(tokens);
  const valor = analisador.expressao();
  if (analisador.pos < tokens.length) {
    throw new ErroDominio('Expressão inválida (sobrou texto no final).');
  }
  if (!Number.isFinite(valor)) throw new ErroDominio('Resultado infinito ou indefinido.');
  // Arredonda para 15 algarismos significativos (evita 0.1 + 0.2 = 0.30000000000000004) e tira o sinal de -0.
  return Number(valor.toPrecision(15)) + 0;
}

module.exports = {
  nome: 'calc',
  apelidos: ['calcular'],
  categoria: 'Utilidades',
  descricao: 'Calculadora segura: + - * / % ^ e parênteses.',
  uso: '/calc <expressão>  (ex.: /calc -2^2 + (3 * 4) % 5)',
  executar(args) {
    const texto = String(args).trim();
    if (!texto) throw new ErroDominio('Informe uma conta. Ex.: /calc 2 + 2 * 3');
    if (texto.length > MAX_TEXTO) {
      throw new ErroDominio(`Expressão muito longa (máximo de ${MAX_TEXTO} caracteres).`);
    }
    const resultado = calcular(texto);
    return `${texto} = ${resultado.toLocaleString('pt-BR', { maximumFractionDigits: 15 })}`;
  }
};
