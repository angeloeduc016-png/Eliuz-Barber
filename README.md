# Eliuz Barber

O repositório está dividido em três partes que conversam entre si:

- [cliente](cliente) para o site público.
- [profissional](profissional) para o painel interno.
- [backend](backend) para a API HTTP e a persistência compartilhada.

## Estrutura

- [cliente/src](cliente/src) reúne a experiência do cliente: cadastro, agendamento, produtos e contato.
- [profissional/src](profissional/src) reúne o painel do barbeiro: agenda, clientes, mensagens, pedidos e caixa.
- [backend/src/controllers](backend/src/controllers) centraliza as regras de negócio.
- [backend/src/routes](backend/src/routes) conecta o Express aos controllers.
- [backend/src/models](backend/src/models) define os modelos Sequelize.
- [backend/src/db](backend/src/db) configura a conexão MySQL.

## Fluxo

1. O cliente se cadastra na plataforma e faz agendamentos com observações.
2. O cliente também pode pedir produtos e enviar mensagens persistidas.
3. O barbeiro vê tudo no painel profissional e responde na mesma base.
4. As mudanças aparecem nas duas interfaces porque ambas usam a mesma API.

## Executar localmente

Inicie o backend em um processo separado:

```bash
npm run start:backend
```

Por padrão, a API local estará em `http://localhost:3000/api`. Em produção na Vercel, o frontend usa `https://eliuz-barber.vercel.app/backend` como base pública. O endpoint de saúde fica em `https://eliuz-barber.vercel.app/backend/health`.

O arquivo [vercel.json](vercel.json) encaminha `/backend/*` para a função serverless [api/[...path].js](api/[...path].js), que carrega o Express do backend. A Vercel deve ser configurada com a raiz deste repositório e com as variáveis de ambiente do banco.

O frontend é servido diretamente a partir das pastas `cliente/src` e `profissional/src`. Não há etapa de build nem pastas de saída `dist`.

## Variáveis do backend

O [backend](backend) usa estas variáveis:

```text
ADMIN_LOGIN=seu-login-admin
ADMIN_PASSWORD=defina-uma-senha-local
ADMIN_BEARER_TOKEN=defina-um-token-local
```

Os registros ficam no MySQL na tabela `collection_records`, acessada por Sequelize através de `backend/src/database/store.js`. Consulte [backend/.env.example](backend/.env.example) para configurar host, porta, usuário, senha, banco e CORS.

## Login social

O backend implementa Authorization Code OAuth para Google, Facebook e Apple. As credenciais ficam somente no ambiente do backend; use [backend/.env.example](backend/.env.example) como referência. O fluxo usa `state`, `nonce`, callback no servidor, troca do código por tokens e sessão em cookie HttpOnly.

Configure estas URLs nos consoles dos provedores:

```text
Google:   https://SEU_BACKEND/api/auth/google/callback
Facebook: https://SEU_BACKEND/api/auth/facebook/callback
Apple:    https://SEU_BACKEND/api/auth/apple/callback
```

Para frontend e backend em domínios diferentes, defina `APP_PUBLIC_URL`, `BACKEND_PUBLIC_URL`, `COOKIE_SAMESITE=None` e sirva ambos com HTTPS. O Google exige um OAuth Client ID e secret no Google Cloud; o Facebook exige um App ID e App Secret no Meta for Developers; a Apple exige um Services ID, Team ID, Key ID e private key no Apple Developer.

Na Vercel, use pelo menos estas variáveis para a API publicada:

```text
APP_PUBLIC_URL=https://SEU_FRONTEND
BACKEND_PUBLIC_URL=https://eliuz-barber.vercel.app/backend
CORS_ORIGINS=https://SEU_FRONTEND
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=eliuz_barber
DB_CREATE_IF_MISSING=false
COOKIE_SAMESITE=None
```

Para hospedar o MySQL, uma opção simples é criar um banco MySQL gerenciado no Railway ou no Aiven. Copie a URL de conexão fornecida pelo serviço para a variável `DATABASE_URL` na Vercel e defina `DB_SSL=true` quando o provedor exigir SSL. Não use `DB_HOST=127.0.0.1` em produção, pois isso aponta para a própria máquina da função e não para o banco hospedado.

Depois de configurar o banco, faça um redeploy na Vercel e teste:

```text
https://eliuz-barber.vercel.app/backend/health
https://eliuz-barber.vercel.app/backend/auth/providers
```

Documentação oficial:

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Sign in with Apple](https://developer.apple.com/documentation/signinwithapple)
