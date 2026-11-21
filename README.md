# Nexus · Bot web multiuso

Painel estilo SaaS (dark mode com detalhes roxos) com chat de comandos, notas, tarefas, histórico e perfil. Não usa IA nem serviços externos: todas as respostas são código deste projeto. Zero dependências: só Node.js.

## Estrutura
```
index.js             ponto de entrada (Main File na Enzonic)
server.js            servidor HTTP nativo
src/config.js        configurações e leitura do .env
src/armazenamento.js dados em data/db.json (gravação atômica)
src/http.js          JSON, arquivos estáticos, cabeçalhos de segurança e senha
src/rotas.js         API REST (/api/*)
src/comandos/        um arquivo por comando (carregado automaticamente)
public/              site: HTML (estrutura), CSS (aparência) e JS (interações)
```

## 1. Rodar no seu computador
1. Instale o [Node.js](https://nodejs.org) 18 ou superior.
2. Entre na pasta do projeto e rode `npm start`.
3. Abra http://localhost:3000

Para mudar a porta: `PORT=8080 npm start` (ou crie um arquivo `.env`, veja `.env.example`).

## 2. Guardar no GitHub
```
git init
git add .
git commit -m "Nexus bot web"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/nexus-bot.git
git push -u origin main
```
O `.gitignore` já deixa de fora `node_modules/`, `data/` e `.env`, então senhas e dados não vão para o repositório.

## 3. Hospedar na Enzonic
1. No painel da Enzonic, crie um serviço do tipo **Node.js** e conecte o repositório do GitHub (ou envie os arquivos pelo gerenciador de arquivos).
2. Comando de inicialização: `npm start`.
3. A porta é recebida pela variável `PORT` ou `SERVER_PORT` (o projeto já lê as duas).
4. Em **Variáveis de ambiente**, defina `SENHA_ACESSO` (e opcionalmente `USUARIO_ACESSO`) para proteger o painel.
5. Confira o limite de memória do seu plano no painel. O projeto usa pouca memória.

## Adicionando um comando
Crie um arquivo em `src/comandos/`, por exemplo `oi.js`:

```js
'use strict';
module.exports = {
  nome: 'oi',                      // usado no chat: /oi
  apelidos: ['ola'],               // nomes alternativos (opcional)
  categoria: 'Diversão',
  descricao: 'Cumprimenta você',
  uso: '/oi [nome]',
  executar: ([nome = 'visitante'], ctx) => `Olá, ${nome}!`,  // pode devolver texto ou Promise
};
```
Reinicie o servidor. O comando aparece no chat e em `/ajuda` sozinho. Use `secreto: true` se a resposta não deve ir para o histórico (como em `/senha`).

## Comandos incluídos
`/ajuda`, `/hora`, `/calc`, `/converter`, `/cor`, `/base64`, `/texto`, `/senha`, `/uuid`, `/sorteio`, `/sistema`, `/nota`, `/tarefa`.
