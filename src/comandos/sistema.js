'use strict';
const os = require('os');
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

module.exports = {
  nome: 'sistema', apelidos: ['status'], categoria: 'Sistema',
  descricao: 'Status do bot: tempo ligado, memória e plataforma', uso: '/sistema',
  executar() {
    const s = Math.floor(process.uptime());
    return [
      `Tempo ligado: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min ${s % 60}s`,
      `Memória do bot: ${mb(process.memoryUsage().rss)} MB`,
      `Memória livre do sistema: ${mb(os.freemem())} MB de ${mb(os.totalmem())} MB`,
      `Node ${process.version} · ${os.platform()} · ${os.cpus().length} núcleo(s)`,
    ].join('\n');
  },
};
