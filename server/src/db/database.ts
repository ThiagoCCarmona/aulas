import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'plataforma.db');
export const db = new Database(DB_PATH);

// Habilitar chaves estrangeiras e modo WAL para alta performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      pix_key TEXT,
      pix_name TEXT,
      pix_city TEXT,
      phone_whatsapp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'superadmin')),
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      package_total_classes INTEGER NOT NULL DEFAULT 4,
      package_price REAL NOT NULL DEFAULT 350.00,
      weekly_schedules TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      total_classes INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'pending_payment', 'paid')),
      payment_method TEXT CHECK(payment_method IN ('pix', 'cash', NULL)),
      pix_payload TEXT,
      pix_qrcode TEXT,
      closed_at DATETIME,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      package_id TEXT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      modality TEXT NOT NULL DEFAULT 'presencial' CHECK(modality IN ('presencial', 'online')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'scheduled', 'planned', 'rescheduled', 'no_show')),
      online_url TEXT,
      homework TEXT,
      teacher_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      student_id TEXT,
      class_id TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pdf', 'ebook', 'md', 'zip', 'link', 'audio', 'slides', 'image')),
      file_url TEXT,
      external_url TEXT,
      content_md TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_packages_student ON packages(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_classes_package ON classes(package_id);
    CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student_id);
    CREATE INDEX IF NOT EXISTS idx_materials_student ON materials(student_id);
  `);

  // Migração suave para instâncias existentes: classes com novos status e materials com type 'image'
  try {
    const classesTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='classes'").get() as any;
    if (classesTable && classesTable.sql && !classesTable.sql.includes("'no_show'")) {
      db.transaction(() => {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec(`
          CREATE TABLE classes_new (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            package_id TEXT,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            modality TEXT NOT NULL DEFAULT 'presencial' CHECK(modality IN ('presencial', 'online')),
            status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'scheduled', 'planned', 'rescheduled', 'no_show')),
            online_url TEXT,
            homework TEXT,
            teacher_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
          );
          INSERT INTO classes_new (id, tenant_id, student_id, package_id, date, title, summary, modality, status, online_url, homework, teacher_notes, created_at)
          SELECT id, tenant_id, student_id, package_id, date, title, summary, modality, COALESCE(status, 'completed'), online_url, homework, teacher_notes, created_at FROM classes;
          DROP TABLE classes;
          ALTER TABLE classes_new RENAME TO classes;
          CREATE INDEX IF NOT EXISTS idx_classes_package ON classes(package_id);
          CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student_id);
        `);
        db.exec("PRAGMA foreign_keys = ON");
      })();
    }
  } catch (err) {
    console.error('Erro na migração de classes:', err);
  }

  try {
    const matTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='materials'").get() as any;
    if (matTable && matTable.sql && !matTable.sql.includes("'image'")) {
      db.transaction(() => {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec(`
          CREATE TABLE materials_new (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            student_id TEXT,
            class_id TEXT,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('pdf', 'ebook', 'md', 'zip', 'link', 'audio', 'slides', 'image')),
            file_url TEXT,
            external_url TEXT,
            content_md TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
          );
          INSERT INTO materials_new (id, tenant_id, student_id, class_id, title, type, file_url, external_url, content_md, created_at)
          SELECT id, tenant_id, student_id, class_id, title, type, file_url, external_url, content_md, created_at FROM materials;
          DROP TABLE materials;
          ALTER TABLE materials_new RENAME TO materials;
          CREATE INDEX IF NOT EXISTS idx_materials_student ON materials(student_id);
        `);
        db.exec("PRAGMA foreign_keys = ON");
      })();
    }
  } catch (err) {
    console.error('Erro na migração de materials:', err);
  }

  try {
    const hasC3 = db.prepare("SELECT id FROM classes WHERE id = 'class-carlos-03'").get();
    if (!hasC3) {
      const cPkg = db.prepare("SELECT id FROM packages WHERE student_id = 'user-student-carlos' AND status = 'in_progress'").get() as any;
      const targetPkgId = cPkg ? cPkg.id : 'pkg-carlos-01';
      db.prepare(`
        INSERT OR IGNORE INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, status, online_url)
        VALUES ('class-carlos-03', 'tenant-thiago-01', 'user-student-carlos', ?, '2026-10-15 14:00', 'APIs, Endpoints e Integração de Inteligência Artificial', 'Construção de rotas backend com Node.js, chamadas a APIs de inteligência artificial e tratamento de respostas estruturadas.', 'online', 'scheduled', 'https://meet.google.com/vibe-coding-lab')
      `).run(targetPkgId);

      db.prepare(`
        INSERT OR IGNORE INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, status)
        VALUES ('class-carlos-04', 'tenant-thiago-01', 'user-student-carlos', ?, '2026-10-20 14:00', 'Deploy em VPS, Containers Docker e Publicação', 'Fechamento do pacote: empacotamento com containers Docker, proxy reverso Traefik e deploy em produção.', 'presencial', 'planned')
      `).run(targetPkgId);
    }

    db.prepare(`
      UPDATE materials SET type = 'pdf', file_url = '/uploads/ebook_vibe_coding.pdf' WHERE id = 'mat-carlos-ebook'
    `).run();
  } catch (_) {}

  seedDefaultData();
}

function seedDefaultData() {
  const existingTenant = db.prepare('SELECT id FROM tenants WHERE slug = ?').get('thiago');
  if (!existingTenant) {
    const tenantId = 'tenant-thiago-01';
    db.prepare(`
      INSERT INTO tenants (id, slug, name, email, pix_key, pix_name, pix_city, phone_whatsapp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      'thiago',
      'Prof. Thiago',
      'thiago@aulas.com',
      '11999998888',
      'Thiago Silva',
      'Sao Paulo',
      '5511999998888'
    );

    const salt = bcrypt.genSaltSync(10);
    const teacherPasswordHash = bcrypt.hashSync('admin123', salt);
    const studentPasswordHash = bcrypt.hashSync('aluno123', salt);

    // Criar Usuário Professor
    const teacherId = 'user-teacher-thiago';
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      teacherId,
      tenantId,
      'Prof. Thiago',
      'thiago@aulas.com',
      teacherPasswordHash,
      'teacher',
      '5511999998888'
    );

    // Criar Aluno 1: Carlos (Informática / Vibe Coding)
    const carlosId = 'user-student-carlos';
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      carlosId,
      tenantId,
      'Carlos Eduardo (Vibe Coding & IA)',
      'carlos@aluno.com',
      studentPasswordHash,
      'student',
      '5511988887777'
    );

    db.prepare(`
      INSERT INTO student_profiles (id, user_id, tenant_id, package_total_classes, package_price, weekly_schedules, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'profile-carlos',
      carlosId,
      tenantId,
      4,
      400.00,
      'Terças às 14h e Quintas às 14h',
      'Foco em desenvolvimento ágil com IA e automação.'
    );

    // Pacote em andamento para o Carlos (2 de 4 aulas concluídas)
    const carlosPackageId = 'pkg-carlos-01';
    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(carlosPackageId, tenantId, carlosId, 4, 400.00, 'in_progress');

    // Aula 1 do Carlos
    const class1Id = 'class-carlos-01';
    db.prepare(`
      INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, homework)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      class1Id,
      tenantId,
      carlosId,
      carlosPackageId,
      '2026-10-06 14:00',
      'Introdução ao Vibe Coding e Configuração de Ambiente',
      'Explicação dos princípios de programação orientada a IA, instalação do Node.js, Git e primeiros passos no terminal.',
      'presencial',
      'Criar um repositório no GitHub e clonar o projeto inicial.'
    );

    // Material da Aula 1 (Markdown com código)
    db.prepare(`
      INSERT INTO materials (id, tenant_id, student_id, class_id, title, type, content_md)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'mat-carlos-01',
      tenantId,
      carlosId,
      class1Id,
      'Guia Prático: Primeiros Passos no Terminal & Git',
      'md',
      `# Guia de Configuração: Terminal & Git

Seja bem-vindo ao mundo do **Vibe Coding**! Aqui estão os comandos essenciais vistos na nossa aula:

### 1. Clonando o Repositório
\`\`\`bash
git clone https://github.com/exemplo/meu-primeiro-projeto.git
cd meu-primeiro-projeto
\`\`\`

### 2. Instalando as Dependências
\`\`\`bash
npm install
npm run dev
\`\`\`

> 💡 **Dica do Professor:** Sempre verifique a versão do Node antes de começar com \`node -v\`.
`
    );

    // Aula 2 do Carlos
    const class2Id = 'class-carlos-02';
    db.prepare(`
      INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, homework, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `).run(
      class2Id,
      tenantId,
      carlosId,
      carlosPackageId,
      '2026-10-08 14:00',
      'Engenharia de Prompt para Código e Arquitetura de Componentes',
      'Construção de componentes React utilizando modelos de linguagem, modularização e testes rápidos.',
      'presencial',
      'Desenvolver o componente de cabeçalho da sua aplicação.'
    );

    // Aula 3 do Carlos (Agendada / Futura)
    const class3Id = 'class-carlos-03';
    db.prepare(`
      INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, status, online_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(
      class3Id,
      tenantId,
      carlosId,
      carlosPackageId,
      '2026-10-15 14:00',
      'APIs, Endpoints e Integração de Inteligência Artificial',
      'Construção de rotas backend com Node.js, chamadas a APIs de inteligência artificial e tratamento de respostas estruturadas.',
      'online',
      'https://meet.google.com/vibe-coding-lab'
    );

    // Aula 4 do Carlos (Planejada / Futura)
    const class4Id = 'class-carlos-04';
    db.prepare(`
      INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')
    `).run(
      class4Id,
      tenantId,
      carlosId,
      carlosPackageId,
      '2026-10-20 14:00',
      'Deploy em VPS, Containers Docker e Publicação',
      'Fechamento do pacote: empacotamento com containers Docker, proxy reverso Traefik e deploy em produção.',
      'presencial'
    );

    // E-book Oficial em PDF para o Carlos (Visualizável diretamente na plataforma)
    db.prepare(`
      INSERT INTO materials (id, tenant_id, student_id, title, type, file_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'mat-carlos-ebook',
      tenantId,
      carlosId,
      'E-book Oficial: Do Básico ao Vibe Coding & IA (PDF)',
      'pdf',
      '/uploads/ebook_vibe_coding.pdf'
    );

    // Criar Aluna 2: Mariana (Letramento Digital)
    const marianaId = 'user-student-mariana';
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      marianaId,
      tenantId,
      'Dona Mariana (Letramento Digital)',
      'mariana@aluno.com',
      studentPasswordHash,
      'student',
      '5511977776666'
    );

    db.prepare(`
      INSERT INTO student_profiles (id, user_id, tenant_id, package_total_classes, package_price, weekly_schedules, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'profile-mariana',
      marianaId,
      tenantId,
      4,
      300.00,
      'Quartas-feiras às 10h',
      'Aluna da terceira idade, aprendendo navegação segura, e-mails e gerenciamento de arquivos.'
    );

    // Mariana com 4 de 4 aulas (pronta para o professor testar o fechamento de pacote ou já fechado para teste)
    const marianaPkg = 'pkg-mariana-01';
    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(marianaPkg, tenantId, marianaId, 4, 300.00, 'in_progress');

    for (let i = 1; i <= 4; i++) {
      db.prepare(`
        INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `class-mariana-${i}`,
        tenantId,
        marianaId,
        marianaPkg,
        `2026-09-${10 + i * 5} 10:00`,
        `Módulo ${i}: Prática de Informática Básica`,
        `Aula prática cobrindo navegação segura, antivírus e organização de pastas no computador.`,
        'presencial'
      );
    }
  }

  // Garantir que tenant secundário 'maria' existe para testes multi-tenant
  const existingMaria = db.prepare('SELECT id FROM tenants WHERE slug = ?').get('maria');
  if (!existingMaria) {
    db.prepare(`
      INSERT INTO tenants (id, slug, name, email, pix_key, pix_name, pix_city, phone_whatsapp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tenant-maria-02',
      'maria',
      'Profª. Maria',
      'maria@aulas.com',
      '11988887777',
      'Maria Souza',
      'Rio de Janeiro',
      '5511988887777'
    );
  }
}
