# 🎓 Plataforma de Aulas Particulares & Gestão Pedagógica

Sistema completo e moderno para gestão de aulas particulares com foco em transparência pedagógica, barra de progressão de pacotes pós-pagos, cobranças Pix oficiais BACEN BR Code sem taxas, suporte a Markdown, E-books e pronto para implantação em VPS com **Docker e Traefik (Multi-Tenant com Subdomínios)**.

---

## 🚀 Principais Funcionalidades

### 📱 Para o Aluno
- **Barra de Progresso do Pacote:** Visualização clara do consumo de aulas (ex: `2 de 4 aulas concluídas`). Aulas adiadas nunca expiram e acumulam naturalmente.
- **Cobrança Pix Oficial BACEN com 1 Clique:** Assim que o pacote de aulas é concluído pelo professor, o aluno recebe o card com **QR Code**, código **Pix Copia e Cola** e botão direto para **Enviar Comprovante pelo WhatsApp**.
- **Registro Pedagógico e Histórico de Aulas:** Histórico completo com data, tópicos estudados, homeworks recomendados e modalidade (presencial ou online).
- **Botão Direto para Aula Online:** Botão de acesso rápido à sala de videoconferência (Google Meet / Zoom) quando a aula for online ou híbrida.
- **Biblioteca de Materiais & E-books:** Leitor integrado de **Markdown** com suporte a blocos de código com destaque e botão de cópia de código, download de arquivos `.zip`, e-books em PDF e links para Google Drive e GitHub.
- **Histórico Financeiro:** Consulta a todos os pacotes anteriores já quitados.

### 👨‍🏫 Para o Professor
- **Painel em Tempo Real:** Métricas de alunos ativos, total de aulas ministradas, valores pendentes e valores já recebidos.
- **Lançamento Rápido de Aula (< 1 minuto):** Modal mobile-first otimizado para lançar a aula imediatamente após o término com 3 toques no celular.
- **Controle Flexível de Pacotes:**
  - Botão explícito **"Concluir Pacote & Cobrar"**: fecha o pacote do aluno, gera a cobrança Pix e imediatamente inicia o próximo ciclo `0 de X aulas`, permitindo que as aulas continuem normalmente.
  - Botão **"Dar Baixa"**: permite registrar pagamentos recebidos via **Pix** ou em **Dinheiro**.
- **Configuração Individual por Aluno:** Quantidade de aulas contratadas por pacote, valor do pacote (R$), horários semanais habituais (ex: terças e quintas) e anotações pedagógicas privadas.
- **Configuração da Chave Pix Própria:** Chave Pix (CPF, CNPJ, E-mail, Celular ou Aleatória), nome e cidade do titular integrados diretamente ao gerador local EMV.

---

## 🔑 Credenciais Padrão de Demonstração

| Perfil | E-mail | Senha | Descrição |
| :--- | :--- | :--- | :--- |
| **Professor** | `thiago@aulas.com` | `admin123` | Acesso completo ao painel, lançamento de aulas e financeiro |
| **Aluno 1** | `carlos@aluno.com` | `aluno123` | Aluno de Vibe Coding & IA (Markdown com código, terminal e pacote) |
| **Aluno 2** | `mariana@aluno.com` | `aluno123` | Aluna de Letramento Digital (Informática básica) |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, QRCode.
- **Backend:** Node.js, Express, TypeScript, SQLite (`better-sqlite3`), JWT, bcryptjs, Multer.
- **Pix Engine:** Gerador nativo EMV BACEN (BR Code) com cálculo de redundância cíclica CRC16-CCITT (local, sem taxas bancárias).
- **Infraestrutura:** Docker (multi-stage build), Docker Compose, Traefik v2/v3 ready com subdomínios dinâmicos.

---

## 💻 Como Rodar Localmente (Desenvolvimento)

### 1. Clonar e Instalar Dependências

```bash
# Na pasta raiz do projeto:
npm install

# Na pasta do servidor:
cd server
npm install
cd ..
```

### 2. Iniciar o Backend e o Frontend

Você pode rodar em dois terminais separados:

**Terminal 1 (Backend na porta 3001):**
```bash
npm run server:dev
```

**Terminal 2 (Frontend na porta 5173):**
```bash
npm run dev
```

Acesse no navegador: **`http://localhost:5173`**

---

## 🐳 Implantação na VPS com Docker e Traefik

A plataforma já possui `Dockerfile` e `docker-compose.yml` otimizados para a rede externa `proxy` do Traefik da sua VPS.

### 1. Configurar o arquivo `.env` na VPS
```bash
cp .env.example .env
```
Edite o `.env` com suas configurações de domínio e chave JWT:
```env
DOMAIN=aulas.tccodes.com.br
JWT_SECRET=sua_chave_secreta_super_segura_jwt_2026
```

### 2. Subir com Docker Compose
```bash
docker compose up -d --build
```

O Traefik automaticamente criará os certificados TLS Let's Encrypt para o domínio principal e para quaisquer subdomínios dos professores (ex: `thiago.aulas.tccodes.com.br`).
