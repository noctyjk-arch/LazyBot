'use strict';
// Calculadora segura: interpreta a expressão token por token (nunca usa eval).
function calcular(src) {
  const partes = src.match(/\d+(\.\d+)?|[()+\-*\/%^]|\s+/g) || [];
  if (!partes.length || partes.join('') !== src) throw new Error('Use apenas números e os operadores + - * / % ^ ( )');
  const tokens = partes.filter((t) => t.trim());
  let i = 0;
  const peek = () => tokens[i];
  const eat = () => tokens[i++];

  const expr = () => {
    let v = termo();
    while (peek() === '+' || peek() === '-') v = eat() === '+' ? v + termo() : v - termo();
    return v;
  };
  const termo = () => {
    let v = fator();
    while (['*', '/', '%'].includes(peek())) {
      const op = eat();
      const r = fator();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  };
  const fator = () => {
    if (peek() === '-') { eat(); return -fator(); }
    const base = primario();
    if (peek() === '^') { eat(); return base ** fator(); }
    return base;
  };
  const primario = () => {
    const t = eat();
    if (t === '(') {
      const v = expr();
      if (eat() !== ')') throw new Error('Falta fechar um parêntese');
      return v;
    }
    if (!t || !/^\d/.test(t)) throw new Error('Expressão incompleta');
    return Number(t);
  };

  const resultado = expr();
  if (i !== tokens.length) throw new Error('Expressão inválida');
  if (!Number.isFinite(resultado)) throw new Error('Resultado indefinido (divisão por zero?)');
  return +resultado.toFixed(10);
}

module.exports = {
  nome: 'calc', apelidos: ['calcular'], categoria: 'Matemática',
  descricao: 'Calcula expressões matemáticas', uso: '/calc <expressão>',
  executar: (args) => String(calcular(args.join(' '))),
};
