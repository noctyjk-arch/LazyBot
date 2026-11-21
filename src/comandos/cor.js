'use strict';
module.exports = {
  nome: 'cor', categoria: 'Utilidades',
  descricao: 'Converte HEX em RGB e mostra a luminosidade', uso: '/cor <#hex>',
  executar([entrada = ''] = []) {
    const m = entrada.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) throw new Error('Informe uma cor HEX válida. Ex.: /cor #8b5cf6');
    let hex = m[1];
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lum = Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) / 2.55);
    return `HEX #${hex}\nRGB ${r}, ${g}, ${b}\nLuminosidade: ${lum}% (${lum > 50 ? 'cor clara' : 'cor escura'})`;
  },
};
