'use strict';
const TABELAS = {
  comprimento: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  massa: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125 },
};
const TEMP = ['c', 'f', 'k'];

function converterTemperatura(v, de, para) {
  const c = de === 'c' ? v : de === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
  return para === 'c' ? c : para === 'f' ? c * 9 / 5 + 32 : c + 273.15;
}

module.exports = {
  nome: 'converter', apelidos: ['conv'], categoria: 'Utilidades',
  descricao: 'Converte comprimento, massa e temperatura', uso: '/converter <valor> <de> <para>',
  executar([valor = '', de = '', para = ''] = []) {
    const v = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(v) || !de || !para) throw new Error('Uso: /converter 10 km mi');
    const u1 = de.toLowerCase(), u2 = para.toLowerCase();
    if (TEMP.includes(u1) && TEMP.includes(u2)) return `${v} ${u1.toUpperCase()} = ${+converterTemperatura(v, u1, u2).toFixed(4)} ${u2.toUpperCase()}`;
    for (const tabela of Object.values(TABELAS)) {
      if (Object.hasOwn(tabela, u1) && Object.hasOwn(tabela, u2)) return `${v} ${u1} = ${+(v * tabela[u1] / tabela[u2]).toFixed(6)} ${u2}`;
    }
    throw new Error('Unidades incompatíveis ou desconhecidas.');
  },
};
