'use strict';
// Persistência em um arquivo JSON (data/db.json). Sem banco de dados externo.
const fs = require('fs');
const path = require('path');
const { ARQUIVO_DADOS } = require('./config');

const PADRAO = () => ({
  criadoEm: new Date().toISOString(),
  configuracoes: { nomeBot: 'Nexus', cor: 'roxo', animacoes: true, mostrarHora: true, limiteHistorico: 500 },
  perfil: { nome: 'Usuário', cargo: 'Administrador', email: '', bio: '' },
  historico: [],
  notas: [],
  tarefas: [],
});

function carregar() {
  const base = PADRAO();
  let texto;
  try { texto = fs.readFileSync(ARQUIVO_DADOS, 'utf8'); } catch { return base; }   // primeira execução
  try {
    const salvo = JSON.parse(texto);
    return {
      ...base, ...salvo,
      configuracoes: { ...base.configuracoes, ...salvo.configuracoes },
      perfil: { ...base.perfil, ...salvo.perfil },
    };
  } catch {
    // Arquivo corrompido: guarda uma cópia em vez de sobrescrever.
    const copia = `${ARQUIVO_DADOS}.corrompido-${Date.now()}`;
    fs.renameSync(ARQUIVO_DADOS, copia);
    console.warn(`[dados] db.json ilegível; cópia guardada em ${copia}`);
    return base;
  }
}

const db = carregar();
for (const chave of ['historico', 'notas', 'tarefas']) if (!Array.isArray(db[chave])) db[chave] = [];

let agendado = null;
function salvarAgora() {
  clearTimeout(agendado);
  try {
    fs.mkdirSync(path.dirname(ARQUIVO_DADOS), { recursive: true });
    const temporario = `${ARQUIVO_DADOS}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(db, null, 2));
    fs.renameSync(temporario, ARQUIVO_DADOS);       // troca atômica: o arquivo nunca fica pela metade
  } catch (erro) {
    console.error('[dados] não foi possível salvar:', erro.message);
  }
}

// Várias alterações seguidas viram uma única gravação em disco.
const salvar = () => { clearTimeout(agendado); agendado = setTimeout(salvarAgora, 300); };

module.exports = { db, salvar, salvarAgora };
