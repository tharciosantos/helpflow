-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstResponseAt" TIMESTAMP(3);

-- Backfill: menor data entre mudancas auditadas e comentarios feitos por AGENT.
UPDATE "Ticket" AS t
SET "firstResponseAt" = ev.first_at
FROM (
  SELECT "ticketId", MIN("createdAt") AS first_at
  FROM (
    SELECT h."ticketId" AS "ticketId", h."createdAt" AS "createdAt"
    FROM "TicketHistory" h
    JOIN "User" u ON u."id" = h."actorId"
    WHERE u."role" = 'AGENT'
    UNION ALL
    SELECT c."ticketId", c."createdAt"
    FROM "TicketComment" c
    JOIN "User" u ON u."id" = c."authorId"
    WHERE u."role" = 'AGENT'
  ) AS combined
  GROUP BY "ticketId"
) AS ev
WHERE t."id" = ev."ticketId";
