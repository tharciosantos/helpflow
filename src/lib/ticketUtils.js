/**
 * Retorna o nome de exibição do status em português.
 * @param {string} status - 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
 * @returns {string}
 */
export function getStatusDisplayNamePT(status) {
    const statusMap = {
        OPEN: 'Aberto',
        IN_PROGRESS: 'Em Progresso',
        CLOSED: 'Fechado',
    };
    return statusMap[status] ?? status;
}

/**
 * Retorna as classes CSS do badge de status.
 * @param {string} status - 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
 * @returns {string}
 */
export function getStatusBadgeClasses(status) {
    const classMap = {
        OPEN: 'bg-green-700/40 text-green-300',
        IN_PROGRESS: 'bg-yellow-600/30 text-yellow-300',
        CLOSED: 'bg-gray-600/40 text-gray-300',
    };
    return classMap[status] ?? 'bg-gray-600/40 text-gray-300';
}

/**
 * Retorna label e classes CSS do badge de prioridade.
 * @param {string} priority - 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
 * @returns {{ label: string, classes: string }}
 */
export function getPriorityBadge(priority) {
    const map = {
        LOW:    { label: 'Baixa',   classes: 'bg-green-700/30 text-green-300' },
        MEDIUM: { label: 'Média',   classes: 'bg-blue-700/30 text-blue-300' },
        HIGH:   { label: 'Alta',    classes: 'bg-orange-700/30 text-orange-300' },
        URGENT: { label: 'Urgente', classes: 'bg-red-700/40 text-red-300' },
    };
    // Se vier um valor desconhecido, retorna um badge cinza genérico
    return map[priority] ?? { label: priority, classes: 'bg-gray-600/40 text-gray-300' };
}