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
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'superadmin')),
      phone TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS material_recipients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(material_id, student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_packages_student ON packages(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_classes_package ON classes(package_id);
    CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student_id);
    CREATE INDEX IF NOT EXISTS idx_materials_student ON materials(student_id);
    CREATE INDEX IF NOT EXISTS idx_material_recipients_student ON material_recipients(student_id);
    CREATE INDEX IF NOT EXISTS idx_material_recipients_material ON material_recipients(material_id);
  `);

  // Migração suave para instâncias existentes: classes com novos status e materials com type 'image'
  try {
    const classesTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='classes'").get() as any;
    if (classesTable && classesTable.sql && !classesTable.sql.includes("'no_show'")) {
      db.pragma('foreign_keys = OFF');
      try {
        db.transaction(() => {
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
        })();
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  } catch (err) {
    console.error('Erro na migração de classes:', err);
  }

  try {
    const matTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='materials'").get() as any;
    if (matTable && matTable.sql && !matTable.sql.includes("'image'")) {
      db.pragma('foreign_keys = OFF');
      try {
        db.transaction(() => {
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
        })();
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  } catch (err) {
    console.error('Erro na migração de materials:', err);
  }

  try {
    const usersTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    if (usersTable && usersTable.sql && (!usersTable.sql.includes('must_change_password') || usersTable.sql.includes('email TEXT NOT NULL') || usersTable.sql.includes('UNIQUE(tenant_id, email)'))) {
      db.pragma('foreign_keys = OFF');
      try {
        db.transaction(() => {
          db.exec(`
            CREATE TABLE users_new (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              name TEXT NOT NULL,
              email TEXT,
              password_hash TEXT NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'superadmin')),
              phone TEXT,
              must_change_password INTEGER NOT NULL DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            );
            INSERT INTO users_new (id, tenant_id, name, email, password_hash, role, phone, must_change_password, created_at)
            SELECT id, tenant_id, name, email, password_hash, role, phone, 1, created_at FROM users;
            DROP TABLE users;
            ALTER TABLE users_new RENAME TO users;
            CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
          `);
        })();
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  } catch (err) {
    console.error('Erro na migração de users:', err);
  }

  seedDefaultData();
}

function seedDefaultData() {
  const adminEmail = process.env.ADMIN_EMAIL || 'carmona.c.thiago@gmail.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Prof. Thiago Carmona';
  const adminPhone = process.env.ADMIN_PHONE || '5545991325244';
  const adminPixKey = process.env.ADMIN_PIX_KEY || '45991325244';
  const adminPixName = process.env.ADMIN_PIX_NAME || 'Thiago Corobinski Carmona';
  const adminPixCity = process.env.ADMIN_PIX_CITY || 'FOZ DO IGUACU';

  const tenantId = 'tenant-thiago-01';
  const existingTenant = db.prepare('SELECT id FROM tenants WHERE slug = ?').get('thiago') as any;
  if (!existingTenant) {
    db.prepare(`
      INSERT INTO tenants (id, slug, name, email, pix_key, pix_name, pix_city, phone_whatsapp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      'thiago',
      adminName,
      adminEmail,
      adminPixKey,
      adminPixName,
      adminPixCity,
      adminPhone
    );

    const salt = bcrypt.genSaltSync(10);
    const teacherPasswordHash = bcrypt.hashSync(adminPass, salt);

    // Criar Usuário Professor Administrador
    const teacherId = 'user-teacher-thiago';
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      teacherId,
      tenantId,
      adminName,
      adminEmail,
      teacherPasswordHash,
      'teacher',
      adminPhone
    );
  } else {
    // Sincroniza dados do professor principal preservando senha pessoal caso já tenha sido alterada
    const teacherUser = db.prepare("SELECT * FROM users WHERE role = 'teacher' LIMIT 1").get() as any;
    if (teacherUser) {
      if (teacherUser.must_change_password !== 0 || process.env.ADMIN_PASSWORD) {
        const salt = bcrypt.genSaltSync(10);
        const teacherPasswordHash = bcrypt.hashSync(adminPass, salt);
        db.prepare(`
          UPDATE users 
          SET email = ?, name = COALESCE(NULLIF(name, ''), ?), phone = COALESCE(NULLIF(NULLIF(phone, ''), '5511999998888'), ?), password_hash = ?
          WHERE id = ?
        `).run(adminEmail, adminName, adminPhone, teacherPasswordHash, teacherUser.id);
      } else {
        db.prepare(`
          UPDATE users 
          SET email = ?, name = COALESCE(NULLIF(name, ''), ?), phone = COALESCE(NULLIF(NULLIF(phone, ''), '5511999998888'), ?)
          WHERE id = ?
        `).run(adminEmail, adminName, adminPhone, teacherUser.id);
      }

      db.prepare(`
        UPDATE tenants
        SET email = ?,
            name = COALESCE(NULLIF(name, ''), ?),
            phone_whatsapp = COALESCE(NULLIF(NULLIF(phone_whatsapp, ''), '5511999998888'), ?),
            pix_key = COALESCE(NULLIF(NULLIF(pix_key, ''), '11999998888'), ?),
            pix_name = COALESCE(NULLIF(pix_name, ''), ?),
            pix_city = COALESCE(NULLIF(NULLIF(pix_city, ''), 'Sao Paulo'), ?)
        WHERE id = ?
      `).run(adminEmail, adminName, adminPhone, adminPixKey, adminPixName, adminPixCity, existingTenant.id);
    }
  }

  // Limpeza de quaisquer dados mockados de testes residuais
  try {
    const mockStudentIds = ['user-student-carlos', 'user-student-mariana'];
    const placeholders = mockStudentIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM classes WHERE student_id IN (${placeholders})`).run(...mockStudentIds);
    db.prepare(`DELETE FROM materials WHERE student_id IN (${placeholders})`).run(...mockStudentIds);
    db.prepare(`DELETE FROM packages WHERE student_id IN (${placeholders})`).run(...mockStudentIds);
    db.prepare(`DELETE FROM student_profiles WHERE user_id IN (${placeholders})`).run(...mockStudentIds);
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...mockStudentIds);
  } catch (err) {
    // Silencioso se tabelas ainda não tinham esses registros
  }
}
