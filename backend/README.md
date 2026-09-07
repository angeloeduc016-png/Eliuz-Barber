# Backend Eliuz Barber

API HTTP independente para o site cliente e o painel profissional, usando Express, Sequelize e MySQL.

## Executar

```bash
npm start
```

Por padrão, o servidor escuta em `http://localhost:3000`. A API fica em `/api`.

O banco é criado automaticamente quando `DB_CREATE_IF_MISSING=true` e as tabelas são sincronizadas na inicialização. Em produção, prefira migrations e mantenha `DB_SYNC_ALTER=false`.

## Configuração

- `PORT`: porta HTTP, padrão `3000`.
- `HOST`: interface de rede, padrão `0.0.0.0`.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: conexão MySQL.
- `DB_CREATE_IF_MISSING`: cria o banco se ele não existir.
- `DB_SYNC_ALTER`: permite sincronização destrutiva/alteração automática das tabelas; use apenas em desenvolvimento.
- `CORS_ORIGINS`: origens do cliente separadas por vírgula.
- `ADMIN_LOGIN`: login administrativo.
- `ADMIN_PASSWORD`: senha administrativa.
- `ADMIN_BEARER_TOKEN`: token usado pelo painel.

A camada de persistência está em `src/database/store.js`, com o modelo Sequelize em `src/models/CollectionRecord.js`. Todos os registros são armazenados no MySQL na tabela `collection_records`, separados por coleção.

## Rotas usadas pelo frontend

- `GET/POST /api/customers`
- `GET/POST/PATCH /api/bookings`
- `GET/POST/PATCH /api/products`
- `GET/POST/PATCH/DELETE /api/orders`
- `GET/POST/PATCH /api/messages`
- `GET/POST/DELETE /api/cash`
- `GET /api/catalog` e `GET /api/services`
- `POST /api/auth/login`, `GET /api/auth/session` e OAuth social

O cliente e o painel devem enviar cookies com credenciais quando estiverem em domínios diferentes. O frontend já usa `credentials: include` nas sessões OAuth.
