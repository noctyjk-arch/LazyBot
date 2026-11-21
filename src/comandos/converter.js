// Conversor de comprimento, massa e temperatura.
// As unidades são conferidas com Object.hasOwn, então nomes como "constructor" não passam.
const { ErroDominio } = require('../armazenamento');

const COMPRIMENTO = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 };
const MASSA = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125 };
const TEMPERATURA = { c: '°C', f: '°F', k: 'K' };
const UNIDADES = 'comprimento: m, km, cm, mm, mi, ft, in · massa: kg, g, mg, lb, oz · temperatura: c, f, k';
const USO = 'Uso: /converter <valor> <de> <para>. Ex.: /converter 10 km mi';

function categoriaDe(unidade) {
  if (Object.hasOwn(COMPRIMENTO, unidade)) return 'comprimento';
  if (Object.hasOwn(MASSA, unidade)) return 'massa';
  if (Object.hasOwn(TEMPERATURA, unidade)) return 'temperatura';
  return null;
}

// Temperaturas passam por Celsius como ponto intermediário.
function paraCelsius(valor, unidade) {
  if (unidade === 'f') return ((valor - 32) * 5) / 9;
  if (unidade === 'k') return valor - 273.15;
  return valor;
}

function deCelsius(valor, unidade) {
  if (unidade === 'f') return (valor * 9) / 5 + 32;
  if (unidade === 'k') return valor + 273.15;
  return valor;
}

// "+ 0" tira o sinal de -0 antes de formatar.
function formatar(numero) {
  return (numero + 0).toLocaleString('pt-BR', { maximumSignificantDigits: 8 });
}

module.exports = {
  nome: 'converter',
  apelidos: ['conv'],
  categoria: 'Utilidades',
  descricao: 'Converte comprimento, massa e temperatura.',
  uso: '/converter <valor> <de> <para>  (ex.: /converter 10 km mi)',
  executar(args) {
    const partes = String(args).trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (partes[2] === 'para') partes.splice(2, 1); // aceita "10 km para mi"
    if (partes.length !== 3) throw new ErroDominio(USO);

    const [valorTexto, de, para] = partes;
    if (!/^[-+]?(\d+[.,]?\d*|[.,]\d+)$/.test(valorTexto)) {
      throw new ErroDominio(`Valor inválido: "${valorTexto}".`);
    }
    const valor = Number(valorTexto.replace(',', '.'));

    const catDe = categoriaDe(de);
    const catPara = categoriaDe(para);
    if (!catDe) throw new ErroDominio(`Unidade desconhecida: "${de}". Unidades: ${UNIDADES}.`);
    if (!catPara) throw new ErroDominio(`Unidade desconhecida: "${para}". Unidades: ${UNIDADES}.`);
    if (catDe !== catPara) throw new ErroDominio(`Não dá para converter ${catDe} em ${catPara}.`);

    if (catDe === 'temperatura') {
      const celsius = paraCelsius(valor, de);
      if (celsius < -273.15) throw new ErroDominio('Temperatura abaixo do zero absoluto.');
      const resultado = deCelsius(celsius, para);
      return `${formatar(valor)} ${TEMPERATURA[de]} = ${formatar(resultado)} ${TEMPERATURA[para]}`;
    }

    const tabela = catDe === 'comprimento' ? COMPRIMENTO : MASSA;
    const resultado = (valor * tabela[de]) / tabela[para];
    return `${formatar(valor)} ${de} = ${formatar(resultado)} ${para}`;
  }
};
