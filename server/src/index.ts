import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db/database.js';
import { tenantMiddleware, TenantRequest } from './middleware/tenant.js';
import { authMiddleware, teacherOnly, signToken, AuthRequest } from './middleware/auth.js';
import { gerarPayloadPix, gerarQRCodeDataUrl } from './pix/pix.emv.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializa banco de dados SQLite
initDatabase();

// Configuração do diretório de uploads
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuração do Multer para uploads locais seguros
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Endpoint de verificação de integridade (Healthcheck)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Aplica middleware de tenant em todas as rotas da API
app.use('/api', tenantMiddleware);

// ==========================================
// 1. ROTAS PÚBLICAS / TENANT
// ==========================================
app.get('/api/tenant/info', (req: TenantRequest, res) => {
  if (!req.tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json({
    id: req.tenant.id,
    slug: req.tenant.slug,
    name: req.tenant.name,
    email: req.tenant.email,
    phone_whatsapp: req.tenant.phone_whatsapp,
    pix_key: req.tenant.pix_key,
    pix_name: req.tenant.pix_name,
    pix_city: req.tenant.pix_city
  });
});

app.put('/api/tenant/settings', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { name, pix_key, pix_name, pix_city, phone_whatsapp } = req.body;
  const tenantId = req.tenant!.id;

  db.prepare(`
    UPDATE tenants
    SET name = COALESCE(?, name),
        pix_key = COALESCE(?, pix_key),
        pix_name = COALESCE(?, pix_name),
        pix_city = COALESCE(?, pix_city),
        phone_whatsapp = COALESCE(?, phone_whatsapp)
    WHERE id = ?
  `).run(name, pix_key, pix_name, pix_city, phone_whatsapp, tenantId);

  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  res.json(updated);
});

// ==========================================
// 2. AUTENTICAÇÃO
// ==========================================
app.post('/api/auth/login', (req: TenantRequest, res) => {
  const { email, identifier, password } = req.body;
  const loginIdentifier = (identifier || email || '').trim();
  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'E-mail ou WhatsApp e senha são obrigatórios' });
  }

  const cleanPhone = loginIdentifier.replace(/\D/g, '');
  const user = db.prepare(`
    SELECT * FROM users
    WHERE tenant_id = ?
      AND (
        LOWER(email) = LOWER(?)
        OR phone = ?
        OR (LENGTH(?) >= 8 AND REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)
      )
  `).get(req.tenant!.id, loginIdentifier, loginIdentifier, cleanPhone, `%${cleanPhone}%`) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = signToken({
    id: user.id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, tenant_id FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  let profile = null;
  if (user.role === 'student') {
    profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);
  }

  res.json({ user, profile, tenant: req.tenant });
});

// ==========================================
// 3. GESTÃO DE ALUNOS (Professor Only)
// ==========================================
app.get('/api/students', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
           sp.package_total_classes, sp.package_price, sp.weekly_schedules, sp.notes, sp.active,
           pkg.id as current_package_id, pkg.status as package_status, pkg.price as package_price_actual,
           (SELECT COUNT(*) FROM classes c WHERE c.package_id = pkg.id AND c.status = 'completed') as completed_classes_in_package,
           (SELECT COUNT(*) FROM classes c WHERE c.package_id = pkg.id AND c.status IN ('scheduled', 'planned')) as future_classes_in_package
    FROM users u
    JOIN student_profiles sp ON sp.user_id = u.id
    LEFT JOIN packages pkg ON pkg.student_id = u.id AND pkg.status IN ('in_progress', 'pending_payment')
    WHERE u.tenant_id = ? AND u.role = 'student'
    ORDER BY u.name ASC
  `).all(req.tenant!.id);

  res.json(students);
});

app.post('/api/students', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { name, email, password, phone, package_total_classes, package_price, weekly_schedules, notes } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND email = ?').get(req.tenant!.id, email);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um aluno com este e-mail' });
  }

  const userId = `user-student-${Date.now()}`;
  const profileId = `profile-${Date.now()}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const totalClasses = Number(package_total_classes) || 4;
  const price = Number(package_price) || 350.00;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?, 'student', ?)
    `).run(userId, req.tenant!.id, name, email, passwordHash, phone || null);

    db.prepare(`
      INSERT INTO student_profiles (id, user_id, tenant_id, package_total_classes, package_price, weekly_schedules, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(profileId, userId, req.tenant!.id, totalClasses, price, weekly_schedules || null, notes || null);

    // Cria pacote inicial em andamento
    const packageId = `pkg-${Date.now()}`;
    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(packageId, req.tenant!.id, userId, totalClasses, price);
  })();

  res.status(201).json({ message: 'Aluno cadastrado com sucesso', studentId: userId });
});

app.put('/api/students/:id', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const studentId = req.params.id;
  const { name, phone, package_total_classes, package_price, weekly_schedules, notes, active, password } = req.body;

  db.transaction(() => {
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone)
      WHERE id = ? AND tenant_id = ?
    `).run(name, phone, studentId, req.tenant!.id);

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, studentId);
    }

    db.prepare(`
      UPDATE student_profiles
      SET package_total_classes = COALESCE(?, package_total_classes),
          package_price = COALESCE(?, package_price),
          weekly_schedules = COALESCE(?, weekly_schedules),
          notes = COALESCE(?, notes),
          active = COALESCE(?, active)
      WHERE user_id = ? AND tenant_id = ?
    `).run(package_total_classes, package_price, weekly_schedules, notes, active, studentId, req.tenant!.id);
  })();

  res.json({ message: 'Aluno atualizado com sucesso' });
});

// ==========================================
// 4. REGISTRO E CONSULTA DE AULAS
// ==========================================
app.get('/api/classes/student/:studentId', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.studentId;

  // Se for aluno, só pode ver suas próprias aulas
  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const classes = db.prepare(`
    SELECT c.*,
           (SELECT json_group_array(json_object(
             'id', m.id, 'title', m.title, 'type', m.type, 'file_url', m.file_url, 'external_url', m.external_url, 'content_md', m.content_md
           )) FROM materials m WHERE m.class_id = c.id) as materials_json
    FROM classes c
    WHERE c.student_id = ? AND c.tenant_id = ?
    ORDER BY c.date ASC
  `).all(studentId, req.tenant!.id) as any[];

  const formatted = classes.map(c => ({
    ...c,
    status: c.status || 'completed',
    materials: c.materials_json ? JSON.parse(c.materials_json) : []
  }));

  res.json(formatted);
});

// Lançamento Rápido ou Agendamento de Aula pelo Professor
app.post('/api/classes', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const {
    student_id,
    date,
    title,
    summary,
    modality = 'presencial',
    status = 'completed',
    online_url,
    homework,
    teacher_notes,
    material_title,
    material_type,
    material_url,
    material_content_md
  } = req.body;

  if (!student_id || !title) {
    return res.status(400).json({ error: 'Aluno e título da aula são obrigatórios' });
  }

  // 1. Busca o pacote ativo em andamento (in_progress)
  let pkg = db.prepare(`
    SELECT * FROM packages
    WHERE student_id = ? AND tenant_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC LIMIT 1
  `).get(student_id, req.tenant!.id) as any;

  // Se não houver pacote ativo, cria um novo baseado no perfil do aluno
  if (!pkg) {
    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(student_id) as any;
    const totalClasses = profile ? profile.package_total_classes : 4;
    const price = profile ? profile.package_price : 350.00;
    const newPkgId = `pkg-${Date.now()}`;

    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(newPkgId, req.tenant!.id, student_id, totalClasses, price);

    pkg = { id: newPkgId, total_classes: totalClasses };
  }

  const classId = `class-${Date.now()}`;
  const classDate = date || new Date().toISOString().replace('T', ' ').substring(0, 16);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO classes (id, tenant_id, student_id, package_id, date, title, summary, modality, status, online_url, homework, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      classId,
      req.tenant!.id,
      student_id,
      pkg.id,
      classDate,
      title,
      summary || null,
      modality,
      status || 'completed',
      online_url || null,
      homework || null,
      teacher_notes || null
    );

    // Se fornecido material vinculado à aula, cadastra automaticamente
    if (material_title && material_type) {
      db.prepare(`
        INSERT INTO materials (id, tenant_id, student_id, class_id, title, type, file_url, external_url, content_md)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `mat-${Date.now()}`,
        req.tenant!.id,
        student_id,
        classId,
        material_title,
        material_type,
        material_type === 'pdf' || material_type === 'zip' || material_type === 'file' ? material_url : null,
        material_type === 'link' || material_type === 'ebook' ? material_url : null,
        material_type === 'md' ? material_content_md : null
      );
    }
  })();

  // Retorna estatística atualizada do pacote (apenas concluídas contam para fechamento)
  const classCount = (db.prepare("SELECT COUNT(*) as count FROM classes WHERE package_id = ? AND status = 'completed'").get(pkg.id) as any).count;

  res.status(201).json({
    message: status === 'completed' ? 'Aula registrada com sucesso!' : 'Aula agendada no cronograma!',
    classId,
    packageId: pkg.id,
    classesCompleted: classCount,
    totalClasses: pkg.total_classes
  });
});

// Marcar aula agendada/planejada como concluída
app.put('/api/classes/:id/complete', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { summary, homework, online_url } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  db.prepare(`
    UPDATE classes
    SET status = 'completed',
        summary = COALESCE(?, summary),
        homework = COALESCE(?, homework),
        online_url = COALESCE(?, online_url)
    WHERE id = ? AND tenant_id = ?
  `).run(summary || null, homework || null, online_url || null, req.params.id, req.tenant!.id);

  res.json({ message: 'Aula marcada como concluída!' });
});

app.delete('/api/classes/:id', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM classes WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenant!.id);
  res.json({ message: 'Aula removida com sucesso' });
});

// ==========================================
// 5. PACOTES, BARRA DE PROGRESSO & PIX
// ==========================================
app.get('/api/packages/current/:studentId', authMiddleware, async (req: AuthRequest, res) => {
  const studentId = req.params.studentId;

  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  // Busca pacote pendente de pagamento (se houver, é prioridade na UI para cobrança) ou em andamento
  let pkg = db.prepare(`
    SELECT * FROM packages
    WHERE student_id = ? AND tenant_id = ? AND status = 'pending_payment'
    ORDER BY created_at DESC LIMIT 1
  `).get(studentId, req.tenant!.id) as any;

  let pendingPaymentPkg = pkg;

  // Busca pacote ativo em andamento
  const inProgressPkg = db.prepare(`
    SELECT * FROM packages
    WHERE student_id = ? AND tenant_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC LIMIT 1
  `).get(studentId, req.tenant!.id) as any;

  // Se não tem pacote em andamento, busca perfil do aluno
  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentId) as any;
  const studentUser = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(studentId) as any;

  let current = inProgressPkg;
  let completedClasses = 0;
  let scheduledClasses = 0;

  if (current) {
    completedClasses = (db.prepare("SELECT COUNT(*) as count FROM classes WHERE package_id = ? AND status = 'completed'").get(current.id) as any).count;
    scheduledClasses = (db.prepare("SELECT COUNT(*) as count FROM classes WHERE package_id = ? AND status IN ('scheduled', 'planned')").get(current.id) as any).count;
  }

  res.json({
    student: {
      id: studentId,
      name: studentUser?.name,
      phone: studentUser?.phone,
      weekly_schedules: profile?.weekly_schedules,
      package_total_classes: profile?.package_total_classes || 4,
      package_price: profile?.package_price || 350.00
    },
    in_progress: current ? {
      id: current.id,
      total_classes: current.total_classes,
      completed_classes: completedClasses,
      scheduled_classes: scheduledClasses,
      percentage: Math.min(100, Math.round((completedClasses / current.total_classes) * 100)),
      price: current.price,
      status: current.status
    } : null,
    pending_payment: pendingPaymentPkg ? {
      id: pendingPaymentPkg.id,
      total_classes: pendingPaymentPkg.total_classes,
      price: pendingPaymentPkg.price,
      status: pendingPaymentPkg.status,
      pix_payload: pendingPaymentPkg.pix_payload,
      pix_qrcode: pendingPaymentPkg.pix_qrcode,
      closed_at: pendingPaymentPkg.closed_at
    } : null
  });
});

// Ação do Professor: "Concluir Pacote & Gerar Cobrança"
app.post('/api/packages/close/:studentId', authMiddleware, teacherOnly, async (req: AuthRequest, res) => {
  const studentId = req.params.studentId;
  const tenant = req.tenant!;

  const currentPkg = db.prepare(`
    SELECT * FROM packages
    WHERE student_id = ? AND tenant_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC LIMIT 1
  `).get(studentId, tenant.id) as any;

  if (!currentPkg) {
    return res.status(400).json({ error: 'Nenhum pacote em andamento encontrado para este aluno' });
  }

  // Gera payload Pix oficial BACEN EMV
  const pixPayload = gerarPayloadPix({
    chave: tenant.pix_key || '11999998888',
    nomeRecebedor: tenant.pix_name || tenant.name,
    cidadeRecebedor: tenant.pix_city || 'SAO PAULO',
    valor: currentPkg.price,
    mensagem: `Aulas ${tenant.name}`.substring(0, 20),
    txid: `PKG${Date.now().toString().slice(-10)}`
  });

  const pixQRCode = await gerarQRCodeDataUrl(pixPayload);
  const now = new Date().toISOString();

  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentId) as any;
  const nextTotal = profile ? profile.package_total_classes : 4;
  const nextPrice = profile ? profile.package_price : currentPkg.price;
  const newPkgId = `pkg-${Date.now()}`;

  db.transaction(() => {
    // 1. Marca pacote atual como pendente de pagamento com Pix anexado
    db.prepare(`
      UPDATE packages
      SET status = 'pending_payment',
          pix_payload = ?,
          pix_qrcode = ?,
          closed_at = ?
      WHERE id = ?
    `).run(pixPayload, pixQRCode, now, currentPkg.id);

    // 2. Inicia novo ciclo de pacote imediatamente para permitir novas aulas
    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(newPkgId, tenant.id, studentId, nextTotal, nextPrice);
  })();

  res.json({
    message: 'Pacote concluído e cobrança Pix gerada!',
    closedPackageId: currentPkg.id,
    newPackageId: newPkgId,
    pix_payload: pixPayload,
    pix_qrcode: pixQRCode
  });
});

// Ação do Professor: "Dar Baixa Manual" (Pix ou Dinheiro)
app.post('/api/packages/:packageId/pay', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { payment_method = 'pix' } = req.body;
  const packageId = req.params.packageId;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE packages
    SET status = 'paid',
        payment_method = ?,
        paid_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(payment_method, now, packageId, req.tenant!.id);

  res.json({ message: 'Pagamento registrado com sucesso!', packageId, payment_method, paid_at: now });
});

// Histórico de Pacotes do Aluno
app.get('/api/packages/history/:studentId', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.studentId;

  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const packages = db.prepare(`
    SELECT p.*,
           (SELECT COUNT(*) FROM classes c WHERE c.package_id = p.id) as classes_count
    FROM packages p
    WHERE p.student_id = ? AND p.tenant_id = ?
    ORDER BY p.created_at DESC
  `).all(studentId, req.tenant!.id);

  res.json(packages);
});

// ==========================================
// 6. MATERIAIS & E-BOOKS
// ==========================================
app.get('/api/materials/student/:studentId', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.studentId;

  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  // Materiais dedicados ao aluno ou compartilhados com todos (student_id IS NULL)
  const materials = db.prepare(`
    SELECT m.*, c.title as class_title, c.date as class_date
    FROM materials m
    LEFT JOIN classes c ON c.id = m.class_id
    WHERE m.tenant_id = ? AND (m.student_id = ? OR m.student_id IS NULL)
    ORDER BY m.created_at DESC
  `).all(req.tenant!.id, studentId);

  res.json(materials);
});

app.post('/api/materials', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { student_id, class_id, title, type, file_url, external_url, content_md } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'Título e tipo de material são obrigatórios' });
  }

  const id = `mat-${Date.now()}`;
  db.prepare(`
    INSERT INTO materials (id, tenant_id, student_id, class_id, title, type, file_url, external_url, content_md)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.tenant!.id, student_id || null, class_id || null, title, type, file_url || null, external_url || null, content_md || null);

  res.status(201).json({ message: 'Material cadastrado com sucesso', id });
});

app.delete('/api/materials/:id', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM materials WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenant!.id);
  res.json({ message: 'Material removido' });
});

// Upload de Arquivos
app.post('/api/upload', authMiddleware, teacherOnly, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// ==========================================
// 7. MÉTRICAS E DASHBOARD DO PROFESSOR
// ==========================================
app.get('/api/stats/teacher', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const tenantId = req.tenant!.id;

  const totalStudents = (db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'student'
  `).get(tenantId) as any).count;

  const totalClassesGiven = (db.prepare(`
    SELECT COUNT(*) as count FROM classes WHERE tenant_id = ? AND status = 'completed'
  `).get(tenantId) as any).count;

  const pendingPackages = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total_amount
    FROM packages
    WHERE tenant_id = ? AND status = 'pending_payment'
  `).get(tenantId) as any;

  const paidPackages = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total_amount
    FROM packages
    WHERE tenant_id = ? AND status = 'paid'
  `).get(tenantId) as any;

  res.json({
    totalStudents,
    totalClassesGiven,
    pendingPaymentsCount: pendingPackages.count,
    pendingPaymentsAmount: pendingPackages.total_amount,
    paidCount: paidPackages.count,
    paidAmount: paidPackages.total_amount
  });
});

// Servir frontend compilado em produção (Single Page Application fallback)
const STATIC_PATH = process.env.STATIC_PATH || path.join(process.cwd(), '..', 'dist');
if (fs.existsSync(STATIC_PATH)) {
  app.use(express.static(STATIC_PATH));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Plataforma de Aulas API rodando na porta ${PORT}`);
});
