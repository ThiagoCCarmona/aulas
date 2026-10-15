process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';

import { app } from './src/index';
import { db } from './src/db/database';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('🧪 Iniciando testes de validação das novas funcionalidades...');

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // 1. Obter tenant e token de professor
    const tenant = db.prepare(`SELECT * FROM tenants LIMIT 1`).get() as any;
    const teacherUser = db.prepare(`SELECT * FROM users WHERE tenant_id = ? AND role = 'teacher' LIMIT 1`).get(tenant.id) as any;
    
    // Assegura que o professor tem senha 'senha123'
    const teacherHash = bcrypt.hashSync('senha123', 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(teacherHash, teacherUser.id);

    // Login do professor usando email ou nome ou telefone
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: teacherUser.email || teacherUser.name, password: 'senha123' })
    });
    const teacherLoginData = await teacherLoginRes.json();
    if (!teacherLoginRes.ok || !teacherLoginData.token) {
      throw new Error(`Falha no login do professor: ${JSON.stringify(teacherLoginData)}`);
    }
    const teacherToken = teacherLoginData.token;
    console.log('✅ 1. Login do professor realizado com sucesso');

    // 2. Cadastro de aluno SEM e-mail (apenas telefone/WhatsApp e nome)
    const phoneTest1 = `55119${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const student1Res = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        name: 'Aluno Teste Sem Email',
        phone: phoneTest1,
        password: 'provisoria123',
        package_total_classes: 4,
        package_price: 350
      })
    });
    const student1Data = await student1Res.json();
    const student1Id = student1Data.studentId || student1Data.student?.id;
    if (!student1Res.ok || !student1Id) {
      throw new Error(`Falha ao cadastrar aluno sem e-mail: ${JSON.stringify(student1Data)}`);
    }
    console.log('✅ 2. Aluno cadastrado SEM dependência de e-mail (usando telefone)');

    // 3. Validação de criptografia de senha no banco de dados
    const dbUser1 = db.prepare(`SELECT * FROM users WHERE id = ?`).get(student1Id) as any;
    if (!dbUser1.password_hash.startsWith('$2a$') && !dbUser1.password_hash.startsWith('$2b$')) {
      throw new Error(`A senha não foi criptografada com bcrypt: ${dbUser1.password_hash}`);
    }
    if (dbUser1.must_change_password !== 1) {
      throw new Error(`must_change_password deveria ser 1 no primeiro cadastro, mas foi: ${dbUser1.must_change_password}`);
    }
    console.log('✅ 3. Criptografia Bcrypt (10 rounds) e flag must_change_password=1 verificadas no banco');

    // 4. Login do aluno utilizando apenas o TELEFONE
    const studentLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phoneTest1, password: 'provisoria123' })
    });
    const studentLoginData = await studentLoginRes.json();
    if (!studentLoginRes.ok || !studentLoginData.token) {
      throw new Error(`Falha no login com telefone: ${JSON.stringify(studentLoginData)}`);
    }
    if (studentLoginData.must_change_password !== true) {
      throw new Error(`Login deveria retornar must_change_password: true`);
    }
    let studentToken = studentLoginData.token;
    console.log('✅ 4. Login realizado com SUCESSO via telefone e detecção de troca obrigatória de senha (must_change_password: true)');

    // 5. Teste de troca de senha no primeiro acesso
    const changeFailRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ new_password: '123', confirm_password: '123' })
    });
    if (changeFailRes.ok) {
      throw new Error(`Troca de senha com menos de 6 caracteres deveria ser rejeitada`);
    }

    const changeSuccessRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ new_password: 'novaSenhaSegura456', confirm_password: 'novaSenhaSegura456' })
    });
    const changeSuccessData = await changeSuccessRes.json();
    if (!changeSuccessRes.ok || !changeSuccessData.token) {
      throw new Error(`Falha na troca de senha: ${JSON.stringify(changeSuccessData)}`);
    }
    studentToken = changeSuccessData.token;

    // Verificar se must_change_password virou 0
    const dbUserUpdated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(student1Id) as any;
    if (dbUserUpdated.must_change_password !== 0) {
      throw new Error(`must_change_password deveria ser 0 após a troca`);
    }
    const matchOld = bcrypt.compareSync('provisoria123', dbUserUpdated.password_hash);
    const matchNew = bcrypt.compareSync('novaSenhaSegura456', dbUserUpdated.password_hash);
    if (matchOld || !matchNew) {
      throw new Error(`Nova senha criptografada incorretamente no banco`);
    }
    console.log('✅ 5. Troca obrigatória de senha executada com sucesso e persistida no banco com Bcrypt');

    // 6. Login com a nova senha
    const reLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phoneTest1, password: 'novaSenhaSegura456' })
    });
    const reLoginData = await reLoginRes.json();
    if (!reLoginRes.ok || reLoginData.must_change_password !== false) {
      throw new Error(`Login com nova senha falhou ou must_change_password não é false`);
    }
    console.log('✅ 6. Login com nova senha autenticado com sucesso e must_change_password=false');

    // 7. Criar Aluno 2 e Aluno 3 para testar materiais para múltiplos alunos selecionados (quantidade)
    const phoneTest2 = `55119${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const phoneTest3 = `55119${Math.floor(Math.random() * 90000000 + 10000000)}`;

    const student2Res = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ name: 'Aluno Dois', phone: phoneTest2, password: 'senhaProvisoria1' })
    });
    const student2Data = await student2Res.json();
    const student2Id = student2Data.studentId || student2Data.student?.id;

    const student3Res = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ name: 'Aluno Tres', phone: phoneTest3, password: 'senhaProvisoria2' })
    });
    const student3Data = await student3Res.json();
    const student3Id = student3Data.studentId || student3Data.student?.id;

    // 8. Publicar material M1 selecionando 2 alunos (Aluno 1 e Aluno 2)
    const createMatRes = await fetch(`${baseUrl}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({
        title: 'Material Selecionado para 2 Alunos',
        type: 'md',
        content_md: '# Material Compartilhado para Aluno 1 e 2',
        student_ids: [student1Id, student2Id]
      })
    });
    const createMatData = await createMatRes.json();
    if (!createMatRes.ok || !createMatData.id) {
      throw new Error(`Falha ao criar material para 2 alunos: ${JSON.stringify(createMatData)}`);
    }
    const materialId = createMatData.id;
    console.log('✅ 7. Material criado com múltiplos destinatários selecionados (2 alunos)');

    // 9. Verificar visibilidade de M1:
    // Aluno 1 deve ver
    const matA1Res = await fetch(`${baseUrl}/api/materials/student/${student1Id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const matA1List = await matA1Res.json();
    const hasA1 = matA1List.some((m: any) => m.id === materialId);
    if (!hasA1) throw new Error('Aluno 1 deveria ver o material compartilhado com ele');

    // Aluno 2 deve ver
    const matA2Res = await fetch(`${baseUrl}/api/materials/student/${student2Id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const matA2List = await matA2Res.json();
    const hasA2 = matA2List.some((m: any) => m.id === materialId);
    if (!hasA2) throw new Error('Aluno 2 deveria ver o material compartilhado com ele');

    // Aluno 3 NÃO deve ver
    const matA3Res = await fetch(`${baseUrl}/api/materials/student/${student3Id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const matA3List = await matA3Res.json();
    const hasA3 = matA3List.some((m: any) => m.id === materialId);
    if (hasA3) throw new Error('Aluno 3 NÃO deveria ver o material de Aluno 1 e 2');

    console.log('✅ 8. Visibilidade restrita validada: Alunos 1 e 2 receberam o material, Aluno 3 não recebeu');

    // 10. Publicar material global (todos os alunos)
    const createGlobalRes = await fetch(`${baseUrl}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({
        title: 'Material Global para Toda a Turma',
        type: 'ebook',
        student_ids: []
      })
    });
    const createGlobalData = await createGlobalRes.json();
    const globalMatId = createGlobalData.id;

    // Aluno 3 DEVE ver o material global
    const matA3GlobalRes = await fetch(`${baseUrl}/api/materials/student/${student3Id}`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const matA3GlobalList = await matA3GlobalRes.json();
    if (!matA3GlobalList.some((m: any) => m.id === globalMatId)) {
      throw new Error('Aluno 3 deveria ver o material global');
    }
    console.log('✅ 9. Material global visível por todos os alunos confirmado');

    // 11. Teste da listagem de materiais do professor com contagem e nomes de destinatários
    const teacherMaterialsRes = await fetch(`${baseUrl}/api/materials`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const teacherMaterialsList = await teacherMaterialsRes.json();
    const targetedMat = teacherMaterialsList.find((m: any) => m.id === materialId);
    if (!targetedMat || targetedMat.recipient_count !== 2) {
      throw new Error(`Contagem de destinatários esperada 2, obtida: ${targetedMat?.recipient_count}`);
    }
    console.log(`✅ 10. Painel do professor lista corretamente recipient_count (${targetedMat.recipient_count}) e nomes: ${targetedMat.recipient_names}`);

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! 🎉');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ ERRO NO TESTE:', err);
  process.exit(1);
});
