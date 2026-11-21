// Data e hora atuais por extenso, em português do Brasil (usa o fuso do servidor).
function maiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

module.exports = {
  nome: 'hora',
  apelidos: ['data'],
  categoria: 'Utilidades',
  descricao: 'Mostra a data e a hora atuais por extenso.',
  uso: '/hora',
  executar() {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${maiuscula(data)}, ${hora}.`;
  }
};
