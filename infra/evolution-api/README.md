# Evolution API local

Ambiente Docker local para testar a Evolution API com o AssistenciaNet.

## Servicos

- Evolution API `evoapicloud/evolution-api:v2.3.7`
- PostgreSQL 15 isolado para dados internos da Evolution
- Redis 7 isolado para cache e sessoes

## Comandos

```powershell
cd C:\projetos\assistencia_saas\infra\evolution-api
docker compose up -d
docker compose ps
docker logs --tail 80 assistencianet_evolution_api
docker compose down
```

A API fica disponivel apenas localmente em:

```text
http://127.0.0.1:8080
```

## Configuracao

O arquivo `.env` local contem as credenciais de desenvolvimento e nao deve ser versionado. Use `.env.example` como referencia para outro ambiente.

Para publicar em um tunel ou dominio, ajuste:

- `SERVER_URL`
- `CORS_ORIGIN`
- `WEBSOCKET_ALLOWED_HOSTS`
- `WEBHOOK_GLOBAL_URL`
- `AUTHENTICATION_API_KEY`
- `POSTGRES_PASSWORD` e `DATABASE_CONNECTION_URI`

## Observacao operacional

Esta instalacao nao substitui a WhatsApp Cloud API oficial da Meta. A Evolution API e uma ponte pratica para o piloto e para fluxos locais com QR Code, mas deve ser tratada como integracao de menor garantia: pode sofrer instabilidade por reconexao, mudancas do WhatsApp Web/Baileys e politicas da plataforma. Para producao, manter a arquitetura preparada para trocar o provedor pela API oficial.
