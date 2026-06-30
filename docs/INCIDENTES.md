## 2026-06 - Histórico de migrations inconsistente

### Sintoma

Prisma informava:

"The following migration(s) are applied to the database but missing from the local migrations directory"

### Causa

Existia um registro órfão na tabela `_prisma_migrations` referente à migration:

20260620201500_migrate_auth_provider_to_enum

A pasta da migration não existia mais no repositório.

### Solução

Removido apenas o registro órfão da tabela `_prisma_migrations`, após verificar que o schema atual não dependia dessa migration.

### Resultado

Foi possível criar normalmente a migration `add-password-reset`.