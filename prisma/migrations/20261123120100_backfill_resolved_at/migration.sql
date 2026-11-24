-- Item 6 do backlog (fix/legacy-sla-backfill): corrige o chamado órfão de SLA.
--
-- Medição de 23/11/2026 no banco de desenvolvimento: 2.784 chamados, nenhum sem
-- dueAt e um único CLOSED sem resolvedAt — o "Implementar Sistema de
-- Autenticação", carregado pelo seed inicial e fechado antes de a rota passar a
-- gravar resolvedAt (AUD-39). Não era preciso um UPDATE em massa: as colunas
-- passaram a ser preenchidas na origem desde then.
--
-- Sem histórico de fechamento, a hora do fechamento é desconhecida. Usamos
-- updatedAt (primeira escrita após o fechamento) e, na falta dele, dueAt: é o
-- limite do prazo da prioridade, e resolvedAt é apenas um marcador — nenhuma
-- regra de domínio o usa para decidir algo, só as médias de resolução.

-- Backfill do caso órfão
UPDATE "Ticket"
SET "resolvedAt" = COALESCE("updatedAt", "dueAt", "createdAt")
WHERE "status" = 'CLOSED'
  AND "resolvedAt" IS NULL;
