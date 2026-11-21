// Informações do servidor: tempo ligado, memória, versão do Node, plataforma e núcleos.
const os = require('os');

function formatarBytes(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidades[i]}`;
}

function formatarTempo(segundosTotais) {
  const total = Math.floor(segundosTotais);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (dias || horas) partes.push(`${horas}h`);
  if (dias || horas || minutos) partes.push(`${minutos}min`);
  partes.push(`${total % 60}s`);
  return partes.join(' ');
}

module.exports = {
  nome: 'sistema',
  apelidos: ['status'],
  categoria: 'Sistema',
  descricao: 'Mostra tempo ligado, memória, versão do Node e plataforma.',
  uso: '/sistema',
  executar() {
    return [
      `Tempo ligado: ${formatarTempo(process.uptime())}`,
      `Memória do processo: ${formatarBytes(process.memoryUsage().rss)}`,
      `Memória livre: ${formatarBytes(os.freemem())} de ${formatarBytes(os.totalmem())}`,
      `Versão do Node: ${process.version}`,
      `Plataforma: ${os.platform()} (${os.arch()})`,
      `Núcleos: ${os.cpus().length}`
    ].join('\n');
  }
};
