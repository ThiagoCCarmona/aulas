import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    name: string;
    email: string;
    pix_key: string;
    pix_name: string;
    pix_city: string;
    phone_whatsapp: string;
  };
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  // 1. Verificar cabeçalho explícito (útil em dev ou SPA)
  let slug = req.headers['x-tenant-slug'] as string || req.headers['x-tenant'] as string;

  // 2. Verificar query param
  if (!slug && typeof req.query.tenant === 'string') {
    slug = req.query.tenant;
  }

  // 3. Verificar subdomínio a partir do host (ex: thiago.plataforma.com -> thiago)
  if (!slug) {
    const host = req.hostname || req.headers.host || '';
    const parts = host.split('.');
    // Exemplo: thiago.localhost:3000 ou thiago.tccodes.com.br
    if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127') {
      slug = parts[0];
    }
  }

  // 4. Fallback padrão para 'thiago' caso não especificado
  if (!slug) {
    slug = 'thiago';
  }

  const tenant = db.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug) as any;

  if (!tenant) {
    // Tenta obter o primeiro tenant do sistema
    const firstTenant = db.prepare('SELECT * FROM tenants LIMIT 1').get() as any;
    if (firstTenant) {
      req.tenant = firstTenant;
      return next();
    }
    return res.status(404).json({ error: 'Tenant/Professor não encontrado' });
  }

  req.tenant = tenant;
  next();
}
