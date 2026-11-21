// Converte uma cor HEX (3 ou 6 dígitos) em RGB e mostra a luminosidade (0 a 255).
const { ErroDominio } = require('../armazenamento');

module.exports = {
  nome: 'cor',
  apelidos: [],
  categoria: 'Utilidades',
  descricao: 'Converte uma cor HEX em RGB e mostra a luminosidade.',
  uso: '/cor <hex>  (ex.: /cor #8b5cf6 ou /cor #abc)',
  executar(args) {
    const bruto = String(args).trim().replace(/^#/, '');
    if (!bruto) throw new ErroDominio('Informe uma cor em HEX. Ex.: /cor #8b5cf6');
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(bruto)) {
      throw new ErroDominio('Cor inválida. Use 3 ou 6 dígitos hexadecimais, ex.: #8b5cf6.');
    }

    // Expande o formato curto: #abc vira #aabbcc.
    const hex = bruto.length === 3 ? bruto.split('').map((c) => c + c).join('') : bruto;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Luminosidade percebida (0,299 R + 0,587 G + 0,114 B). Acima de 127 é considerada clara.
    const luminosidade = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const classe = luminosidade > 127 ? 'clara' : 'escura';

    return [
      `#${hex.toUpperCase()} = RGB(${r}, ${g}, ${b})`,
      `Luminosidade: ${luminosidade} de 255 (${classe})`
    ].join('\n');
  }
};
