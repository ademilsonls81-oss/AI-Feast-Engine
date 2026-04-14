# Fase 7 Validation Report — Smoke Tests Automatizados

## 📋 Overview

**Fase 7** implementa testes smoke automatizados que são executados **APÓS** a aplicação de qualquer correção pelo sistema auto-fixer.

### Objetivos
- ✅ Validar que correções não quebram endpoints críticos
- ✅ Reverter automaticamente correções que falham nos testes
- ✅ Registrar `validation_status` (`passed` / `failed`) na tabela `auto_fixes`
- ✅ Garantir que o sistema nunca aplique uma correção que quebre a API

---

## 🏗️ Arquitetura

### Novo Arquivo: `src/autonomous/tester.ts`

O tester implementa:

#### 1. **Smoke Tests** (`runSmokeTests()`)
Testa 3 endpoints críticos:
- `GET /api/health` — Health check (liveness)
- `GET /api/skills` — Skills listing
- `GET /api/feed` — Feed endpoint (com API key de teste)

**Critérios de validação:**
- HTTP status 200-299 = ✅ passou
- HTTP status >= 400 ou timeout = ❌ falhou
- Timeout por endpoint: 5 segundos
- Timeout total: 20 segundos

#### 2. **Validação com Rollback** (`validateFixWithRollback()`)
Fluxo completo:
```
1. Aplicar correção (fixer.ts)
2. Executar smoke tests (tester.ts)
3. Se testes passaram:
   → validation_status: 'passed'
   → Prosseguir
4. Se testes falharam:
   → Reverter correção do backup
   → validation_status: 'failed'
   → Registrar erro em auto_fixes.test_output
```

#### 3. **Quick Validation** (`quickValidation()`)
Validação offline sem servidor:
- Verifica se arquivos existem
- Valida sintaxe básica (chaves, parênteses balanceados)
- Usado quando servidor não está disponível

---

## 🔄 Integração com Fixer

### Fluxo Atualizado do `applyFix()`

```
Phase 1: Security Audit (mandatory)
   ↓
Phase 2: Create Backups
   ↓
Phase 3: Apply Fixes
   ↓
Phase 4: Calculate Success Status
   ↓
Phase 5: Smoke Tests (NEW!) ← Fase 7
   ↓
   ├─ Se passou → validation_status: 'passed'
   └─ Se falhou → Rollback → validation_status: 'failed'
   ↓
Phase 6: Final Status Update
```

### Código de Integração (fixer.ts)

```typescript
// === PHASE 5: Smoke Tests (Validation) ===
console.log("[Fixer] Phase 5: Running smoke tests to validate fix...");

const { validateFixWithRollback } = await import("./tester.js");
const validationResult = await validateFixWithRollback(autoFixId, backupFiles, modifiedFiles);

if (!validationResult.passed) {
  console.log(`[Fixer] ⛔ Smoke tests failed — fix rolled back: ${validationResult.error}`);
  
  return {
    action: "failed",
    success: false,
    modifiedFiles: [],
    backupFiles,
    error: validationResult.error || "Smoke tests failed — fix was rolled back",
    securityAuditPassed: true,
    reason: `Validation failed: ${validationResult.error}`
  };
}

console.log("[Fixer] ✅ Smoke tests passed — fix validated");
```

---

## 🧪 Cenários de Validação

### Cenário 1: Todos os endpoints passam
**Entrada:** Correção de baixo risco aplicada com sucesso
**Esperado:**
- ✅ GET /api/health → 200
- ✅ GET /api/skills → 200
- ✅ GET /api/feed → 200
- ✅ validation_status: 'passed'
- ✅ Sem rollback necessário

**Resultado:** ✅ **PASSOU**

---

### Cenário 2: Um endpoint falha
**Entrada:** Correção que quebra o endpoint /api/feed
**Esperado:**
- ✅ GET /api/health → 200
- ✅ GET /api/skills → 200
- ❌ GET /api/feed → 500
- 🔄 Rollback disparado automaticamente
- ✅ validation_status: 'failed'
- ✅ Arquivos restaurados do backup

**Resultado:** ✅ **PASSOU**

---

### Cenário 3: Correção quebrada (res.json → res.send)
**Entrada:** Fix alterou `res.json()` para `res.send()` em uma rota
**Esperado:**
- ❌ Endpoint retorna 500 (formato de resposta inválido)
- 🔄 Rollback disparado
- ✅ Arquivo restaurado do backup
- ✅ validation_status: 'failed'
- ✅ Erro registrado em `auto_fixes.test_output`

**Resultado:** ✅ **PASSOU**

---

## 📊 Resultados dos Testes

### Validação Local (scripts/validate-fase7-local.ts)

```
✅ PASSED — All endpoints pass
     All 3 endpoints returned 200 OK. validation_status: 'passed'
     Rollback: No
     Validation Status: passed

✅ PASSED — One endpoint fails
     Feed endpoint returned 500. Rollback triggered. validation_status: 'failed'
     Rollback: Yes
     Validation Status: failed

✅ PASSED — Broken fix (res.json → res.send)
     Fix changed res.json to res.send, breaking endpoint. Rollback successful. validation_status: 'failed'
     Rollback: Yes
     Validation Status: failed

Total: 3/3 scenarios passed (100%)
```

### Testes Automatizados (npm test)

```
✓ tests/auto-fixer.test.ts (11 tests | 1 skipped)
  ✓ should apply fix when risk decision is auto_apply (536ms)
  ✓ should attempt fix application for low risk with safe files (525ms)
  ...

Test Files  4 passed (4)
Tests       53 passed | 1 skipped (54)
Duration    1.91s
```

---

## 🔐 Banco de Dados

### Tabela `auto_fixes` — Campos de Validação (Migration 014)

```sql
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS validation_status TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS test_output TEXT;
ALTER TABLE public.auto_fixes ADD COLUMN IF NOT EXISTS build_output TEXT;
```

**Valores de `validation_status`:**
- `'passed'` — Smoke tests passaram após correção
- `'failed'` — Smoke tests falharam, correção revertida
- `'skipped'` — Validação pulada (modo offline ou erro)

---

## 📁 Arquivos Criados/Modificados

### Criados
- `src/autonomous/tester.ts` — Smoke tests e validação com rollback
- `scripts/validate-fase7-local.ts` — Script de validação local
- `docs/fase7-validacao.md` — Este relatório

### Modificados
- `src/autonomous/fixer.ts`
  - Adicionada função `restoreFromBackup()`
  - Integrada Fase 5 (Smoke Tests) no fluxo `applyFix()`
  - Rollback automático se testes falham
- `src/autonomous/index.ts`
  - Exportadas funções do tester: `runSmokeTests`, `validateFixWithRollback`, `quickValidation`
  - Exportados tipos: `SmokeTestResult`, `SmokeTestSuiteResult`
- `src/autonomous/monitor.ts`
  - Corrigido: `executionError` → `execution_error` (tipagem)
- `tests/auto-fixer.test.ts`
  - Adicionado mock do tester para testes sem servidor

---

## ✅ Checklist de Validação

- [x] `runSmokeTests()` testa os 3 endpoints críticos
- [x] `validateFixWithRollback()` executa testes pós-correção
- [x] Rollback automático se testes falham
- [x] `validation_status: 'passed'` registrado quando testes passam
- [x] `validation_status: 'failed'` registrado quando testes falham
- [x] Backup restaurado corretamente em caso de falha
- [x] Integração com fixer.ts funcionando (Fase 5 do applyFix)
- [x] TypeScript compila sem erros (`tsc --noEmit`)
- [x] Todos os 53 testes passam (1 skipped intencionalmente)
- [x] Validação local passa em 3/3 cenários (100%)

---

## 🎯 Próximos Passos

A Fase 7 completa o ciclo de auto-correção com validação:

```
Monitor → Diagnóstico → Análise de Risco → Auto-Fixer → Auditoria → Smoke Tests ✅
```

O sistema agora:
1. ✅ Detecta erros automaticamente (Fase 0-2)
2. ✅ Diagnostica com IA (Fase 3)
3. ✅ Analisa riscos antes de aplicar (Fase 4)
4. ✅ Aplica correções seguras (Fase 5)
5. ✅ Audita segurança antes de aplicar (Fase 6)
6. ✅ **Valida correções com smoke tests (Fase 7)** ← NOVO
7. ✅ Reverte correções que quebram endpoints (Fase 7) ← NOVO

---

## 📈 Métricas

| Métrica | Valor |
|---------|-------|
| Endpoints testados | 3 |
| Timeout por endpoint | 5s |
| Timeout total | 20s |
| Rollback automático | ✅ Sim |
| Validação offline | ✅ Sim (quickValidation) |
| Cenários validados | 3/3 (100%) |
| Testes automatizados | 53 passed |
| TypeScript errors | 0 |

---

**Data:** 14/04/2026  
**Branch:** `feature/autonomous-v2`  
**Status:** ✅ **VALIDADO E APROVADO**
