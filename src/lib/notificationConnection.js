// ---------------------------------------------------------------------------
// Estado de conexão do sino de notificações.
//
// O sino faz polling a cada 30s. Antes, qualquer falha de rede era engolida em
// silêncio: o contador simplesmente parava de atualizar e o usuário não tinha
// como distinguir "não há notificações novas" de "a conexão caiu" — e podia
// agir como se estivesse vendo o estado real.
//
// Aqui ficam as decisões puras: quando considerar falha, como descrever o
// estado para a UI e com que frequência tentar de novo.
// ---------------------------------------------------------------------------

/** Após esta quantidade de falhas seguidas, o aviso passa a ser explícito. */
export const FAILURE_THRESHOLD = 1;

/** Intervalo do polling normal (ms). */
export const POLL_INTERVAL_MS = 30000;

/**
 * Classifica o resultado de uma tentativa de carregamento.
 * `ok: false` só deve ser usado para falha de transporte/servidor: 401/403
 * significam sessão inválida e têm tratamento próprio na aplicação.
 */
export function classifyLoadResult({ ok, status } = {}) {
  if (ok) return 'success';
  // Servidor respondeu, mas recusou: o problema não é de conexão.
  if (status === 401 || status === 403) return 'unauthorized';
  return 'failure';
}

/**
 * Decide o aviso a exibir a partir do histórico de falhas.
 *
 * Retorna `null` quando está tudo sincronizado ou quando o problema é de
 * autorização (aí a sessão cai, não cabe ao sino avisar sobre rede).
 */
export function getConnectionNotice({ failures = 0, kind = 'success' } = {}) {
  if (kind === 'unauthorized') return null;
  if (kind === 'success' || failures < FAILURE_THRESHOLD) return null;

  return {
    tone: 'warning',
    title: 'Sem conexão com as notificações',
    description:
      failures >= 3
        ? 'Não conseguimos atualizar há várias tentativas. Os avisos podem estar desatualizados.'
        : 'Os avisos podem estar desatualizados.',
  };
}

/**
 * Intervalo da próxima tentativa. Backoff exponencial com teto: 30s, 60s,
 * 120s… até 5 min, para não martelar o servidor quando ele está fora.
 */
export function nextPollDelay(failures = 0) {
  if (failures <= 0) return POLL_INTERVAL_MS;
  const step = POLL_INTERVAL_MS * 2 ** Math.min(failures, 4);
  return Math.min(step, 5 * 60 * 1000);
}

/**
 * Rótulo do subtítulo do painel. Enquanto há falha, não afirmamos "Tudo em dia":
 * o estado real é desconhecido.
 */
export function getUnreadSummary({ unreadCount = 0, failures = 0 } = {}) {
  if (failures > 0) return 'Desatualizado';
  if (unreadCount > 0) return `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`;
  return 'Tudo em dia';
}
