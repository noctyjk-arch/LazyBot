// Codifica e decodifica texto em Base64 (UTF-8).
const { ErroDominio } = require('../armazenamento');

const USO = 'Uso: /base64 codificar <texto> ou /base64 decodificar <base64>';

module.exports = {
  nome: 'base64',
  apelidos: [],
  categoria: 'Utilidades',
  descricao: 'Codifica e decodifica texto em Base64.',
  uso: '/base64 codificar <texto> | /base64 decodificar <base64>',
  executar(args, ctx) {
    const { primeiro, resto } = ctx.dividir(args);
    const acao = primeiro.toLowerCase();

    if (acao === 'codificar') {
      if (!resto) throw new ErroDominio('Informe o texto a codificar.');
      return Buffer.from(resto, 'utf8').toString('base64');
    }

    if (acao === 'decodificar') {
      const codigo = resto.replace(/\s+/g, '');
      if (!codigo) throw new ErroDominio('Informe o Base64 a decodificar.');
      if (!/^[A-Za-z0-9+\/]*={0,2}$/.test(codigo) || codigo.length % 4 !== 0) {
        throw new ErroDominio('Base64 inválido.');
      }
      const bytes = Buffer.from(codigo, 'base64');
      const texto = bytes.toString('utf8');
      // Se o texto não voltar igual em UTF-8, o conteúdo era binário.
      if (!Buffer.from(texto, 'utf8').equals(bytes)) {
        throw new ErroDominio('O conteúdo decodificado não é um texto UTF-8.');
      }
      return texto;
    }

    throw new ErroDominio(USO);
  }
};
