# 🚀 Guia de Deploy na VPS - Plataforma de Aulas Particulares

Este guia orienta o deploy em produção da plataforma na sua VPS com **Docker** e **Traefik** sob o domínio `tccodes.com.br`.

---

## 🏗️ 1. Arquitetura de Produção

- **Frontend & Backend Integrados:** Imagem Docker única multi-stage (`Dockerfile`) com Node 22 LTS, servindo tanto as APIs REST em Express quanto os arquivos estáticos do Vite React 19 SPA com roteamento seguro.
- **Banco de Dados:** SQLite nativo de alta performance com WAL mode (`better-sqlite3`), persistido no volume `./data/plataforma.db`.
- **Uploads e E-books:** Armazenados e servidos a partir do volume persistente `./uploads`.
- **Roteamento & SSL:** Traefik com TLS automático via Let's Encrypt (`myresolver`), escutando na porta 443 com entrypoint `websecure` e conectado à rede Docker externa `proxy`.
- **Multi-Tenant via Subdomínios:** Traefik configurado com `HostRegexp` para atender tanto `aulas.tccodes.com.br` quanto subdomínios como `thiago.aulas.tccodes.com.br` ou `nomeprofessor.aulas.tccodes.com.br`.

---

## 🌐 2. Configuração de DNS

No painel do seu gerenciador de DNS (ex: Cloudflare, Registro.br, Hostinger):

| Tipo | Nome / Host | Destino / Conteúdo | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `aulas` | `IP_DA_SUA_VPS` | Automático ou 300s |
| **CNAME** ou **A** | `*.aulas` | `aulas.tccodes.com.br` (ou `IP_DA_SUA_VPS`) | Automático ou 300s |

*(O wildcard `*.aulas` permite que você crie novos professores/subdomínios instantaneamente sem precisar criar novos registros de DNS manuais).*

---

## 💻 3. Passos de Instalação na VPS

### Passo 1: Conectar na VPS via SSH
```bash
ssh usuario@ip-da-vps
```

### Passo 2: Clonar o Repositório
```bash
# Navegue até a pasta de projetos (ex: /opt ou no seu diretório home)
cd /opt
git clone <URL_DO_SEU_REPOSITORIO_GIT> plataforma-aulas
cd plataforma-aulas
```

### Passo 3: Executar o Script de Deploy
O script cuidará de criar as pastas de dados, configurar a rede Traefik, gerar chaves seguras e iniciar o container:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## ⚙️ 4. Variáveis de Ambiente (`.env`)

O arquivo `.env` é gerado automaticamente na primeira execução do `deploy.sh`. Se desejar editar manualmente:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=sua_chave_secreta_jwt_de_alta_entropia
DOMAIN=aulas.tccodes.com.br
DATA_DIR=/app/data
DB_PATH=/app/data/plataforma.db
UPLOADS_DIR=/app/uploads
STATIC_PATH=/app/public
```

---

## 🔑 5. Credenciais de Acesso Padrão (Seed Inicial)

O banco já vem pré-configurado com os dados para teste inicial:

| Papel | Login (E-mail ou WhatsApp) | Senha | Descrição |
| :--- | :--- | :--- | :--- |
| **Professor** | `thiago@aulas.com` | `admin123` | Painel do Professor, registro de aulas e gestão |
| **Aluno 1** | `5511988887777` (ou `carlos@aluno.com`) | `aluno123` | Cronograma de 4 aulas, Pix discreto e PDF viewer |
| **Aluno 2** | `mariana@aluno.com` | `aluno123` | Curso de Letramento Digital |

---

## 🛠️ 6. Comandos Úteis do Dia a Dia

### Ver Logs em Tempo Real
```bash
docker compose logs -f app
```

### Reiniciar o Container
```bash
docker compose restart app
```

### Atualizar para uma Nova Versão (Deploy Contínuo)
```bash
git pull
./deploy.sh
```

### Backup Rápido do Banco de Dados e Uploads
```bash
# Faz backup da base SQLite e dos arquivos enviados
tar -czvf backup-plataforma-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Restaurar Backup
```bash
tar -xzvf backup-plataforma-YYYYMMDD.tar.gz
docker compose restart app
```

---

## 💳 7. Configuração da sua Chave Pix Real

1. Acesse `https://aulas.tccodes.com.br` com sua conta de professor.
2. Clique no botão **"Configurar Pix"** no Navbar superior ou no painel do professor.
3. Preencha seus dados reais:
   - **Chave Pix:** CPF, CNPJ, Celular com DDD, E-mail ou Chave EVP Aleatória.
   - **Nome do Beneficiário:** Seu nome completo (até 25 caracteres, padrão BACEN).
   - **Cidade:** Sua cidade (ex: `SAO PAULO`).
4. Clique em **Salvar Configurações**. A partir desse momento, todas as cobranças de pacotes concluídos gerarão QR Code Pix e Copia e Cola oficiais diretamente para a sua conta bancária sem intermediários ou taxas.
