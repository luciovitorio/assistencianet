# Deploy AssistenciaNet — VM Oracle (teste cliente)

Sobe **web (Next.js) + Evolution API + Postgres + Redis** via Docker Compose.  
Supabase fica na nuvem (não roda na VM).

## 1. Limpar a VM

```bash
# parar e remover containers + volumes do ambiente antigo
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm
docker volume ls -q | xargs -r docker volume rm
docker network prune -f
docker system prune -af
```

## 2. Clonar o repo

```bash
cd ~
git clone <URL-DO-REPO> assistencia_saas
cd assistencia_saas/infra/deploy
```

## 3. Preparar `.env`

```bash
cp .env.example .env
cp .env.evolution.example .env.evolution
```

Edite **os dois arquivos**:

- `.env`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (painel Supabase → Settings → API)
  - `EVOLUTION_API_KEY` — escolha uma senha forte
  - `POSTGRES_PASSWORD` — escolha uma senha forte
- `.env.evolution`
  - `SERVER_URL=http://IP_DA_VM:8080`
  - `AUTHENTICATION_API_KEY` — **mesma** do `EVOLUTION_API_KEY` em `.env`
  - `POSTGRES_PASSWORD` e `DATABASE_CONNECTION_URI` — mesma senha do `.env`

## 4. Abrir portas na Oracle Cloud

Security List da subnet + `iptables` da instância:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save
```

## 5. Subir

```bash
docker compose up -d --build
docker compose logs -f web
```

## 6. Testar

- App: `http://IP_DA_VM`
- Evolution Manager: `http://IP_DA_VM:8080/manager` (api key = `AUTHENTICATION_API_KEY`)

## Comandos úteis

```bash
docker compose ps
docker compose logs -f <serviço>
docker compose restart web
docker compose down           # mantém volumes
docker compose down -v        # apaga dados
docker compose up -d --build web   # rebuild só do app
```

## Observações

- Sem HTTPS — ok para teste, **não** use em produção real.
- App escuta na :80 da VM (container na :3000 internamente).
- Para atualizar o app: `git pull && docker compose up -d --build web`.
