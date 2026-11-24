-- Item 6 do backlog (fix/legacy-sla-backfill): índices de performance do Ticket.
--
-- O EXPLAIN de 23/11/2026 mostrava Seq Scan + Sort em cinco consultas que a
-- lista, os KPIs e as métricas do dashboard executam a cada carga:
--   - ORDER BY "createdAt" DESC          (ordenação default da lista)
--   - ORDER BY "dueAt"                   (sort=dueDate)
--   - ORDER BY "resolvedAt" DESC         (amostra de resolução)
--   - ORDER BY "firstResponseAt" DESC    (amostra de 1ª resposta)
--   - WHERE "agentId" = $1               (filtro "só meus" do AGENT)
-- Já havia índice em authorId, status e companyId.
--
-- Sem CONCURRENTLY: o Prisma executa cada migration dentro de uma transação, e
-- CREATE INDEX CONCURRENTLY é recusado nela (SQLSTATE 25001). Com 1,5 MB de
-- tabela o lock é da ordem de milissegundos; se a tabela crescer de forma que o
-- lock incomode, aquele é o momento de rodar o comando à mão e registrar a
-- migration como resolvida.

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_dueAt_idx" ON "Ticket"("dueAt");

-- CreateIndex
CREATE INDEX "Ticket_resolvedAt_idx" ON "Ticket"("resolvedAt");

-- CreateIndex
CREATE INDEX "Ticket_firstResponseAt_idx" ON "Ticket"("firstResponseAt");

-- CreateIndex
CREATE INDEX "Ticket_agentId_idx" ON "Ticket"("agentId");
