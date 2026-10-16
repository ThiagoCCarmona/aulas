#!/bin/bash
set -e

# ==============================================================================
# Plataforma de Aulas Particulares - Script de Deploy Automático para VPS
# Domínio Principal: aulas.tccodes.com.br
# Suporte a Subdomínios: *.aulas.tccodes.com.br
# ==============================================================================

# Garantir execução a partir do diretório do projeto (mesmo via atalho ou symlink)
APP_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
cd "$APP_DIR"

DOMAIN="${DOMAIN:-aulas.tccodes.com.br}"

echo "=========================================================="
echo "🚀 Iniciando Deploy da Plataforma de Aulas Particulares"
echo "🌐 Domínio Principal: $DOMAIN"
echo "🌐 Subdomínios Multi-Tenant: *.$DOMAIN"
echo "=========================================================="

# 1. Verificar Docker e Docker Compose
if ! command -v docker &> /dev/null; then
    echo "⚠️ Docker não encontrado! Instalando Docker automaticamente..."
    curl -fsSL https://get.docker.com | sh
    sudo systemctl enable --now docker
fi

# 2. Garantir rede externa Traefik 'proxy'
if ! docker network inspect proxy >/dev/null 2>&1; then
    echo "🌐 Criando rede externa 'proxy' para o Traefik..."
    docker network create proxy
else
    echo "✅ Rede externa 'proxy' já existe."
fi

# 3. Configurar arquivo de ambiente .env se não existir
if [ ! -f .env ]; then
    echo "📝 Arquivo .env não encontrado. Criando a partir de .env.example..."
    cp .env.example .env
    # Gera uma JWT_SECRET aleatória e segura
    RANDOM_SECRET=$(openssl rand -hex 24 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sed -i "s|sua_chave_secreta_super_segura_jwt_2026|$RANDOM_SECRET|g" .env
    echo "✅ .env criado com JWT_SECRET gerada automaticamente."
fi

# 4. Garantir pastas persistentes de banco SQLite e uploads com permissões adequadas
mkdir -p data uploads
chmod 755 data uploads 2>/dev/null || true
if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo chmod -R 755 data uploads 2>/dev/null || true
else
    chmod -R 755 data uploads 2>/dev/null || true
fi

# 5. Atualizar código do repositório a partir do GitHub (main)
if [ -d .git ]; then
    echo "🔄 Buscando as alterações mais recentes no GitHub (main)..."
    git config core.filemode false
    git fetch origin main
    git reset --hard origin/main
    chmod +x deploy.sh 2>/dev/null || true
fi

# 6. Build e Inicialização dos Containers via Traefik Proxy
echo "📦 Construindo e subindo container da aplicação..."
docker compose up -d --build --remove-orphans
docker image prune -f

# 7. Aguardar inicialização e verificar integridade
echo "⏳ Aguardando serviços ficarem online..."
sleep 6

echo "📊 Status dos containers:"
docker compose ps

echo ""
echo "=========================================================="
echo "🎉 Deploy concluído com sucesso!"
echo "🌐 Acesse a plataforma: https://$DOMAIN"
echo ""
echo "🔑 Acesso do Professor (Produção):"
echo "   👨‍🏫 Professor: carmona.c.thiago@gmail.com (ou WhatsApp: 45991325244)"
echo "   🔒 Senha:      admin123 (ou senha pessoal definida no primeiro acesso)"
echo ""
echo "⚙️  Subdomínios ativos (Multi-Tenant):"
echo "   Exemplo: https://thiago.$DOMAIN"
echo "=========================================================="
