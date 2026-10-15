import {
  User,
  Tenant,
  StudentListItem,
  CurrentPackageResponse,
  ClassSession,
  MaterialItem,
  TeacherStats,
  PackageInfo
} from '../types';

const API_BASE = '/api';

export function getTenantSlug(): string {
  // 1. LocalStorage se configurado manualmente
  const saved = localStorage.getItem('tenantSlug');
  if (saved) return saved;

  // 2. Subdomínio
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127') {
    return parts[0];
  }

  // 3. Padrão inicial
  return 'thiago';
}

export function setTenantSlug(slug: string) {
  localStorage.setItem('tenantSlug', slug);
}

function getHeaders(isFormData = false): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'x-tenant-slug': getTenantSlug()
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const api = {
  // Tenant
  async getTenantInfo(): Promise<Tenant> {
    const res = await fetch(`${API_BASE}/tenant/info`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao carregar dados do professor');
    return res.json();
  },

  async updateTenantSettings(data: Partial<Tenant>): Promise<Tenant> {
    const res = await fetch(`${API_BASE}/tenant/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    return res.json();
  },

  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
    localStorage.setItem('token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: User; profile?: any; tenant?: Tenant }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Não autenticado');
    return res.json();
  },

  logout() {
    localStorage.removeItem('token');
  },

  // Students (Teacher)
  async getStudents(): Promise<StudentListItem[]> {
    const res = await fetch(`${API_BASE}/students`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao listar alunos');
    return res.json();
  },

  async createStudent(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar aluno');
    return result;
  },

  async updateStudent(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar aluno');
    return result;
  },

  // Classes
  async getStudentClasses(studentId: string, packageId?: string): Promise<ClassSession[]> {
    const url = packageId
      ? `${API_BASE}/classes/student/${studentId}?package_id=${encodeURIComponent(packageId)}`
      : `${API_BASE}/classes/student/${studentId}`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao listar aulas');
    return res.json();
  },

  async createClass(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/classes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao registrar aula');
    return result;
  },

  async completeClass(id: string, data?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/classes/${id}/complete`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data || {})
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao concluir aula');
    return result;
  },

  async deleteClass(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/classes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao deletar aula');
    return res.json();
  },

  // Packages & Pix
  async getCurrentPackage(studentId: string): Promise<CurrentPackageResponse> {
    const res = await fetch(`${API_BASE}/packages/current/${studentId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao consultar pacote');
    return res.json();
  },

  async closePackage(studentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/packages/close/${studentId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao concluir pacote');
    return result;
  },

  async payPackage(packageId: string, payment_method: 'pix' | 'cash'): Promise<any> {
    const res = await fetch(`${API_BASE}/packages/${packageId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ payment_method })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao dar baixa no pacote');
    return result;
  },

  async getPackageHistory(studentId: string): Promise<PackageInfo[]> {
    const res = await fetch(`${API_BASE}/packages/history/${studentId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao consultar histórico');
    return res.json();
  },

  // Materials
  async getMaterials(studentId: string): Promise<MaterialItem[]> {
    const res = await fetch(`${API_BASE}/materials/student/${studentId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao listar materiais');
    return res.json();
  },

  async createMaterial(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/materials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao salvar material');
    return result;
  },

  async deleteMaterial(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/materials/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao remover material');
    return res.json();
  },

  async uploadFile(file: File): Promise<{ url: string; originalName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro no upload');
    return result;
  },

  // Teacher Stats
  async getTeacherStats(): Promise<TeacherStats> {
    const res = await fetch(`${API_BASE}/stats/teacher`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Erro ao carregar estatísticas');
    return res.json();
  }
};
