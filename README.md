# Lazy

Bot web multiuso, **sem IA**: comandos, notas, tarefas e um painel. Usa só Node.js e módulos nativos, sem dependências externas.

## Comandos

Digite no chat com ou sem a barra: `/ajuda`, `/hora`, `/calc`, `/converter`, `/cor`, `/base64`, `/texto`, `/senha`, `/uuid`, `/sorteio`, `/sistema`, `/nota`, `/tarefa`.

## Rodar localmente

Você precisa do Node.js 18 ou superior. Não há nada para instalar.

```bash
npm start
```

Depois abra http://localhost:3000 no navegador.

- Sem `SENHA_ACESSO`, o acesso é livre e um aviso aparece no terminal.
- Para pedir login, copie `.env.example` para `.env` e defina `SENHA_ACESSO` (e, se quiser, `USUARIO_ACESSO`).
- Os dados ficam em `data/db.json`, criado automaticamente.

## Subir no GitHub

Envie todos os arquivos mantendo a estrutura de pastas. `src/`, `src/comandos/` e `public/` precisam continuar como estão.

```bash
git init
git add .
git commit -m "Lazy: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/lazy.git
git push -u origin main
```

O `.gitignore` já deixa de fora `node_modules/`, `data/`, `.env` e logs. Nunca envie o seu `.env` real.

## Hospedar na Enzonic

1. Crie a aplicação na Enzonic apontando para o repositório do GitHub (ou envie o projeto).
2. Em **Main File**, use `index.js`.
3. Configure as variáveis de ambiente:
   - `SENHA_ACESSO`: senha do login (recomendada).
   - `USUARIO_ACESSO`: usuário do login (padrão `admin`).
4. A porta vem da própria hospedagem (variável `PORT`), então não é preciso configurar.

Observações:

- `/hora` e `/sistema` usam o fuso horário do servidor, que pode ser UTC.
- Se a hospedagem não mantiver o disco entre reinícios, os dados de `data/db.json` podem se perder.
