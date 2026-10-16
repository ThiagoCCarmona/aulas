import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { db, initDatabase } from './db/database.js';
import { tenantMiddleware, TenantRequest } from './middleware/tenant.js';
import { authMiddleware, teacherOnly, signToken, AuthRequest } from './middleware/auth.js';
import { gerarPayloadPix, gerarQRCodeDataUrl } from './pix/pix.emv.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Inicializa banco de dados SQLite
initDatabase();

// Configuração do diretório de uploads
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Extensões permitidas e explicitamente bloqueadas (Hardening de Uploads)
const ALLOWED_EXTS = new Set(['.pdf', '.zip', '.png', '.jpg', '.jpeg']);
const BLOCKED_EXTS = new Set(['.html', '.htm', '.svg', '.sh', '.js', '.mjs', '.cjs', '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.php']);

// Configuração do Multer para uploads locais seguros
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTS.has(ext) || !ALLOWED_EXTS.has(ext)) {
      const err: any = new Error('Extensão de arquivo não permitida. Apenas arquivos .pdf, .zip, .png, .jpg e .jpeg são aceitos.');
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// Rate limiting: 20 tentativas de login por minuto por IP
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' }
});

// Helmet com suporte a iframes de PDFs do mesmo domínio e imagens seguras
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-src": ["'self'", "https://meet.google.com"],
      "frame-ancestors": ["'self'"],
      "img-src": ["'self'", "data:", "blob:"],
      "object-src": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir uploads com headers restritivos de segurança (bloqueando scripts mas permitindo leitor de PDF e imagens)
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; object-src 'self'; img-src 'self' data: blob:; media-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'");
  }
}));

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
app.post('/api/auth/login', loginLimiter, (req: TenantRequest, res) => {
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
        (email IS NOT NULL AND LOWER(email) = LOWER(?))
        OR (role = 'teacher' AND LOWER(?) IN ('thiago@aulas.com', 'carmona.c.thiago@gmail.com'))
        OR phone = ?
        OR (phone IS NOT NULL AND LENGTH(?) >= 8 AND REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?)
        OR LOWER(name) = LOWER(?)
      )
  `).get(req.tenant!.id, loginIdentifier, loginIdentifier, loginIdentifier, cleanPhone, `%${cleanPhone}%`, loginIdentifier) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const mustChangePassword = Boolean(user.must_change_password);

  const token = signToken({
    id: user.id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    must_change_password: mustChangePassword
  });

  res.json({
    token,
    must_change_password: mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      must_change_password: mustChangePassword
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, tenant_id, must_change_password FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  let profile = null;
  if (user.role === 'student') {
    profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      tenant_id: user.tenant_id,
      must_change_password: Boolean(user.must_change_password)
    },
    profile,
    tenant: req.tenant
  });
});

app.post('/api/auth/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { new_password, confirm_password } = req.body;
  if (!new_password || typeof new_password !== 'string' || new_password.trim().length < 6) {
    return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres' });
  }
  if (confirm_password && new_password !== confirm_password) {
    return res.status(400).json({ error: 'A confirmação de senha não confere' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(new_password.trim(), salt);

  db.prepare(`
    UPDATE users
    SET password_hash = ?,
        must_change_password = 0
    WHERE id = ? AND tenant_id = ?
  `).run(passwordHash, req.user!.id, req.tenant!.id);

  const updatedUser = db.prepare('SELECT id, name, email, role, phone, tenant_id, must_change_password FROM users WHERE id = ?').get(req.user!.id) as any;
  const token = signToken({
    id: updatedUser.id,
    tenant_id: updatedUser.tenant_id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone,
    must_change_password: false
  });

  res.json({
    message: 'Senha alterada com sucesso! Seu acesso está seguro.',
    token,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      must_change_password: false
    }
  });
});

// ==========================================
// 3. GESTÃO DE ALUNOS (Professor Only)
// ==========================================
app.get('/api/students', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
           sp.package_total_classes, sp.package_price, sp.weekly_schedules, sp.notes, sp.active,
           pkg.id as current_package_id, pkg.status as package_status, pkg.price as package_price_actual,
           (SELECT COUNT(*) FROM classes c WHERE c.package_id = pkg.id AND c.status IN ('completed', 'no_show')) as completed_classes_in_package,
           (SELECT COUNT(*) FROM classes c WHERE c.package_id = pkg.id AND c.status IN ('scheduled', 'planned', 'rescheduled')) as future_classes_in_package
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
  if (!name || !name.trim() || !password || !password.trim()) {
    return res.status(400).json({ error: 'Nome e senha de acesso são obrigatórios' });
  }

  const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;

  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({ error: 'Informe ao menos o WhatsApp (Telefone) ou E-mail para identificação do aluno' });
  }

  if (cleanEmail) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND LOWER(email) = ?').get(req.tenant!.id, cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Já existe um aluno cadastrado com este e-mail' });
    }
  }

  if (cleanPhone) {
    const existingPhone = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND phone = ?').get(req.tenant!.id, cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ error: 'Já existe um aluno cadastrado com este telefone/WhatsApp' });
    }
  }

  const userId = `user-student-${crypto.randomUUID()}`;
  const profileId = `profile-${crypto.randomUUID()}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password.trim(), salt);
  const totalClasses = Number(package_total_classes) || 4;
  const price = Number(package_price) || 350.00;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, phone, must_change_password)
      VALUES (?, ?, ?, ?, ?, 'student', ?, 1)
    `).run(userId, req.tenant!.id, name.trim(), cleanEmail, passwordHash, cleanPhone);

    db.prepare(`
      INSERT INTO student_profiles (id, user_id, tenant_id, package_total_classes, package_price, weekly_schedules, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(profileId, userId, req.tenant!.id, totalClasses, price, weekly_schedules || null, notes || null);

    // Cria pacote inicial em andamento
    const packageId = `pkg-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(packageId, req.tenant!.id, userId, totalClasses, price);
  })();

  res.status(201).json({ message: 'Aluno cadastrado com sucesso', studentId: userId });
});

app.put('/api/students/:id', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const studentId = req.params.id;
  const { name, email, phone, package_total_classes, package_price, weekly_schedules, notes, active, password } = req.body;

  db.transaction(() => {
    const cleanEmail = email !== undefined ? (email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null) : undefined;
    
    if (cleanEmail !== undefined) {
      db.prepare(`
        UPDATE users SET name = COALESCE(?, name), email = ?, phone = COALESCE(?, phone)
        WHERE id = ? AND tenant_id = ?
      `).run(name, cleanEmail, phone, studentId, req.tenant!.id);
    } else {
      db.prepare(`
        UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone)
        WHERE id = ? AND tenant_id = ?
      `).run(name, phone, studentId, req.tenant!.id);
    }

    if (password && typeof password === 'string' && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password.trim(), salt);
      db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ? AND tenant_id = ?').run(hash, studentId, req.tenant!.id);
    }

    db.prepare(`
      UPDATE student_profiles
      SET package_total_classes = COALESCE(?, package_total_classes),
          package_price = COALESCE(?, package_price),
          weekly_schedules = COALESCE(?, weekly_schedules),
          notes = COALESCE(?, notes),
          active = COALESCE(?, active)
      WHERE user_id = ? AND tenant_id = ?
    `).run(
      package_total_classes !== undefined ? Number(package_total_classes) : null,
      package_price !== undefined ? Number(package_price) : null,
      weekly_schedules,
      notes,
      active !== undefined ? Number(active) : null,
      studentId,
      req.tenant!.id
    );
  })();

  res.json({ message: 'Aluno atualizado com sucesso' });
});

// ==========================================
// 4. REGISTRO E CONSULTA DE AULAS
// ==========================================
app.get('/api/classes/student/:studentId', authMiddleware, (req: AuthRequest, res) => {
  const studentId = req.params.studentId;
  const packageId = req.query.package_id as string | undefined;

  // Se for aluno, só pode ver suas próprias aulas
  if (req.user!.role === 'student' && req.user!.id !== studentId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  // Privacidade de dados: excluir teacher_notes da query se for aluno
  const isStudent = req.user!.role === 'student';
  const selectColumns = isStudent
    ? `c.id, c.tenant_id, c.student_id, c.package_id, c.date, c.title, c.summary, c.modality, c.status, c.online_url, c.homework, c.created_at`
    : `c.*`;

  let query = `
    SELECT ${selectColumns},
           (SELECT json_group_array(json_object(
             'id', m.id, 'title', m.title, 'type', m.type, 'file_url', m.file_url, 'external_url', m.external_url, 'content_md', m.content_md
           )) FROM materials m WHERE m.class_id = c.id) as materials_json
    FROM classes c
    WHERE c.student_id = ? AND c.tenant_id = ?
  `;
  const params: any[] = [studentId, req.tenant!.id];

  if (packageId) {
    query += ` AND c.package_id = ?`;
    params.push(packageId);
  }

  query += ` ORDER BY c.date ASC`;

  const classes = db.prepare(query).all(...params) as any[];

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
    const newPkgId = `pkg-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO packages (id, tenant_id, student_id, total_classes, price, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(newPkgId, req.tenant!.id, student_id, totalClasses, price);

    pkg = { id: newPkgId, total_classes: totalClasses };
  }

  const classId = `class-${crypto.randomUUID()}`;
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
        `mat-${crypto.randomUUID()}`,
        req.tenant!.id,
        student_id,
        classId,
        material_title,
        material_type,
        material_type === 'pdf' || material_type === 'zip' || material_type === 'file' || material_type === 'image' ? material_url : null,
        material_type === 'link' || material_type === 'ebook' ? material_url : null,
        material_type === 'md' ? material_content_md : null
      );
    }
  })();

  // Apenas 'completed' ou 'no_show' consom o saldo de aulas do pacote
  const classCount = (db.prepare(`
    SELECT COUNT(*) as count FROM classes
    WHERE package_id = ? AND status IN ('completed', 'no_show')
  `).get(pkg.id) as any).count;

  res.status(201).json({
    message: (status === 'completed' || status === 'no_show') ? 'Aula registrada com sucesso!' : 'Aula agendada no cronograma!',
    classId,
    packageId: pkg.id,
    classesCompleted: classCount,
    totalClasses: pkg.total_classes
  });
});

// Marcar aula agendada/planejada como concluída
app.put('/api/classes/:id/complete', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { summary, homework, online_url, status = 'completed' } = req.body;

  db.prepare(`
    UPDATE classes
    SET status = ?,
        summary = COALESCE(?, summary),
        homework = COALESCE(?, homework),
        online_url = COALESCE(?, online_url)
    WHERE id = ? AND tenant_id = ?
  `).run(status, summary || null, homework || null, online_url || null, req.params.id, req.tenant!.id);

  res.json({ message: 'Aula atualizada com sucesso!' });
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

  // Busca pacote pendente de pagamento ou em andamento
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
    // Apenas aulas com status 'completed' ou 'no_show' consom o saldo do pacote
    completedClasses = (db.prepare(`
      SELECT COUNT(*) as count FROM classes
      WHERE package_id = ? AND status IN ('completed', 'no_show')
    `).get(current.id) as any).count;

    scheduledClasses = (db.prepare(`
      SELECT COUNT(*) as count FROM classes
      WHERE package_id = ? AND status IN ('scheduled', 'planned', 'rescheduled')
    `).get(current.id) as any).count;
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
    txid: `PKG${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`
  });

  const pixQRCode = await gerarQRCodeDataUrl(pixPayload);
  const now = new Date().toISOString();

  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentId) as any;
  const nextTotal = profile ? profile.package_total_classes : 4;
  const nextPrice = profile ? profile.package_price : currentPkg.price;
  const newPkgId = `pkg-${crypto.randomUUID()}`;

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

// Ação do Professor: "Dar Baixa Manual" (Pix ou Dinheiro) com Eliminação de IDOR
app.post('/api/packages/:packageId/pay', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { payment_method = 'pix' } = req.body;
  const packageId = req.params.packageId;
  const now = new Date().toISOString();

  // Eliminação de IDOR: garantir que o pacote pertença a um aluno do tenant autenticado
  const pkg = db.prepare(`
    SELECT p.* FROM packages p
    JOIN users u ON u.id = p.student_id
    WHERE p.id = ? AND p.tenant_id = ? AND u.tenant_id = ?
  `).get(packageId, req.tenant!.id, req.tenant!.id) as any;

  if (!pkg) {
    return res.status(404).json({ error: 'Pacote não encontrado para este aluno ou tenant' });
  }

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

  // Materiais dedicados ao aluno, compartilhados com todos (sem restrição específica) ou com destinatários múltiplos selecionados
  const materials = db.prepare(`
    SELECT m.*, c.title as class_title, c.date as class_date
    FROM materials m
    LEFT JOIN classes c ON c.id = m.class_id
    WHERE m.tenant_id = ? AND (
      (m.student_id IS NULL AND NOT EXISTS (SELECT 1 FROM material_recipients mr WHERE mr.material_id = m.id))
      OR m.student_id = ?
      OR EXISTS (SELECT 1 FROM material_recipients mr WHERE mr.material_id = m.id AND mr.student_id = ?)
    )
    ORDER BY m.created_at DESC
  `).all(req.tenant!.id, studentId, studentId);

  res.json(materials);
});

app.get('/api/materials', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const materials = db.prepare(`
    SELECT m.*, c.title as class_title,
           (SELECT COUNT(*) FROM material_recipients mr WHERE mr.material_id = m.id) as recipient_count,
           (SELECT GROUP_CONCAT(u.name, ', ') FROM material_recipients mr JOIN users u ON u.id = mr.student_id WHERE mr.material_id = m.id) as recipient_names
    FROM materials m
    LEFT JOIN classes c ON c.id = m.class_id
    WHERE m.tenant_id = ?
    ORDER BY m.created_at DESC
  `).all(req.tenant!.id);

  res.json(materials);
});

app.post('/api/materials', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const { student_ids, student_id, class_id, title, type, file_url, external_url, content_md } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'Título e tipo de material são obrigatórios' });
  }

  let targetStudentIds: string[] = [];
  if (Array.isArray(student_ids)) {
    targetStudentIds = student_ids.filter((id: any) => typeof id === 'string' && id && id !== 'all');
  } else if (student_id && student_id !== 'all') {
    targetStudentIds = [student_id];
  }

  const id = `mat-${crypto.randomUUID()}`;
  const isGlobal = targetStudentIds.length === 0;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO materials (id, tenant_id, student_id, class_id, title, type, file_url, external_url, content_md)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.tenant!.id,
      targetStudentIds.length === 1 ? targetStudentIds[0] : null,
      class_id || null,
      title,
      type,
      file_url || null,
      external_url || null,
      content_md || null
    );

    // Se houver destinatários selecionados (1, 2, 3 ou mais), vincula na tabela material_recipients
    if (!isGlobal) {
      const insertRecipient = db.prepare(`
        INSERT OR IGNORE INTO material_recipients (id, tenant_id, material_id, student_id)
        VALUES (?, ?, ?, ?)
      `);
      for (const sId of targetStudentIds) {
        insertRecipient.run(`mr-${crypto.randomUUID()}`, req.tenant!.id, id, sId);
      }
    }
  })();

  res.status(201).json({ message: 'Material cadastrado com sucesso', id, recipient_count: targetStudentIds.length });
});

app.delete('/api/materials/:id', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM material_recipients WHERE material_id = ? AND tenant_id = ?').run(req.params.id, req.tenant!.id);
    db.prepare('DELETE FROM materials WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenant!.id);
  })();
  res.json({ message: 'Material removido' });
});

// Upload de Arquivos Seguro
app.post('/api/upload', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro no upload do arquivo' });
    }
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
});

// ==========================================
// 7. MÉTRICAS E DASHBOARD DO PROFESSOR
// ==========================================
app.get('/api/stats/teacher', authMiddleware, teacherOnly, (req: AuthRequest, res) => {
  const tenantId = req.tenant!.id;

  const totalStudents = (db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'student'
  `).get(tenantId) as any).count;

  // Aulas dadas: apenas 'completed' ou 'no_show'
  const totalClassesGiven = (db.prepare(`
    SELECT COUNT(*) as count FROM classes WHERE tenant_id = ? AND status IN ('completed', 'no_show')
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Plataforma de Aulas API rodando na porta ${PORT}`);
  });
}

export { app };
