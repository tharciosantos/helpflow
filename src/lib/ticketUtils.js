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