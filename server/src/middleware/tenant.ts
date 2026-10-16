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
  let explicitSlug = req.headers['x-tenant-slug'] as string || req.headers['x-tenant'] as string;

  // 2. Verificar query param
  if (!explicitSlug && typeof req.query.tenant === 'string') {
    explicitSlug = req.query.tenant;
  }

  const systemSlugs = new Set(['www', 'aulas', 'app', 'plataforma', 'portal', 'api', 'admin', 'localhost', '127', 'undefined', 'null']);

  let slug = explicitSlug ? explicitSlug.trim().toLowerCase() : undefined;

  // Se o slug explicitado for apenas o nome da aplicação ou de infraestrutura, desconsidera
  if (slug && systemSlugs.has(slug)) {
    slug = undefined;
    explicitSlug = undefined as any;
  }

  // 3. Verificar subdomínio a partir do host (ex: thiago.aulas.tccodes.com.br -> thiago)
  if (!slug) {
    const rawHost = req.hostname || req.headers.host || '';
    const host = rawHost.split(':')[0].toLowerCase();
    const domain = (process.env.DOMAIN || 'aulas.tccodes.com.br').toLowerCase();

    if (host.endsWith('.' + domain)) {
      const sub = host.slice(0, -(domain.length + 1));
      if (sub && !systemSlugs.has(sub)) {
        slug = sub;
      }
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      const parts = host.split('.');
      if (parts.length >= 2 && !systemSlugs.has(parts[0])) {
        slug = parts[0];
      }
    }
  }

  // 4. Fallback padrão para 'thiago'
  if (!slug) {
    slug = 'thiago';
  }

  let tenant = db.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug) as any;

  if (!tenant) {
    if (!explicitSlug || systemSlugs.has(explicitSlug.toLowerCase())) {
      // Tenta obter o primeiro tenant do sistema
      const firstTenant = db.prepare('SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1').get() as any;
      if (firstTenant) {
        req.tenant = firstTenant;
        return next();
      }
    }
    return res.status(404).json({ error: 'Tenant/Professor não encontrado' });
  }

  req.tenant = tenant;
  next();
}
