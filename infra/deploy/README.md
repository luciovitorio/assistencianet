# Deploy Evolution API — VM Oracle

Sobe **Evolution API + Postgres + Redis** na VM para atender o bot WhatsApp.
O app Next.js roda na **Vercel** (ver `vercel.json` na raiz).
Supabase fica na nuvem.

## 1. Limpar a VM (se houver algo antigo)

```bash
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm
docker volume ls -q | xargs -r docker volume rm
docker network prune -f
docker system prune -af
```

## 2. Clonar o repo

```bash
cd ~
git clone https://github.com/luciovitorio/assistencianet.git assistencia_saas
cd assistencia_saas/infra/deploy
```

## 3. Preparar `.env.evolution`

```bash
cp .env.example .env
cp .env.evolution.example .env.evolution
```

Edite **os dois**:

- `.env` — só precisa de `POSTGRES_*` (usado pelo container `evolution-postgres`)
- `.env.evolution` — configuração do Evolution; troque `SERVER_URL` para `http://IP_DA_VM:8080` e mantenha `POSTGRES_PASSWORD`/`AUTHENTICATION_API_KEY` coerentes.

## 4. Liberar porta 8080 na Oracle

- Console Oracle → VCN → Subnet → Security List → Add Ingress: TCP 8080 de `0.0.0.0/0`
- Na VM:
  ```bash
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
  sudo apt install -y iptables-persistent
  sudo netfilter-persistent save
  ```

## 5. Subir

```bash
docker compose up -d
docker compose logs -f evolution-api
```

## 6. Testar

- Evolution Manager: `http://IP_DA_VM:8080/manager`
- Api key = `AUTHENTICATION_API_KEY` do `.env.evolution`

## 7. Apontar o app da Vercel

Na Vercel → Project → Settings → Environment Variables:

- `EVOLUTION_BASE_URL=http://IP_DA_VM:8080`
- `EVOLUTION_API_KEY=<mesma do .env.evolution>`

## Comandos úteis

```bash
docker compose ps
docker compose logs -f evolution-api
docker compose restart evolution-api
docker compose down       # mantém volumes
docker compose down -v    # apaga dados
```
