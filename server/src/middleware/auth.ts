import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantRequest } from './tenant.js';

const JWT_SECRET = process.env.JWT_SECRET || 'plataforma-aulas-secret-jwt-key-2026';

export interface AuthenticatedUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'superadmin';
  phone?: string;
}

export interface AuthRequest extends TenantRequest {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;

    // Isolamento Estrito de Tenant
    if (req.tenant && req.user.role !== 'superadmin' && req.user.tenant_id !== req.tenant.id) {
      return res.status(403).json({ error: 'Acesso negado: token não pertence ao tenant requisitado' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function teacherOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Acesso restrito para professores' });
  }
  next();
}

export function signToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      tenant_id: user.tenant_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
