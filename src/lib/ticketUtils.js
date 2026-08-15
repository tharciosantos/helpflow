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
 * @param {string} theme - 'light' | 'dark'
 * @returns {string}
 */
export function getStatusBadgeClasses(status, theme = 'dark') {
    const darkClassMap = {
        OPEN: 'bg-green-700/40 text-green-300',
        IN_PROGRESS: 'bg-yellow-600/30 text-yellow-300',
        CLOSED: 'bg-gray-600/40 text-gray-300',
    };
    
    const lightClassMap = {
        OPEN: 'bg-green-100 text-green-700 border border-green-300',
        IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
        CLOSED: 'bg-gray-100 text-gray-700 border border-gray-300',
    };
    
    const classMap = theme === 'light' ? lightClassMap : darkClassMap;
    return classMap[status] ?? (theme === 'light' ? 'bg-gray-100 text-gray-700 border border-gray-300' : 'bg-gray-600/40 text-gray-300');
}

/**
 * Retorna label e classes CSS do badge de prioridade.
 * @param {string} priority - 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
 * @returns {{ label: string, classes: string }}
 */
export function getPriorityBadge(priority, theme = 'dark') {
    const darkMap = {
        LOW:    { label: 'Baixa',   classes: 'bg-green-700/30 text-green-300' },
        MEDIUM: { label: 'Média',   classes: 'bg-blue-700/30 text-blue-300' },
        HIGH:   { label: 'Alta',    classes: 'bg-orange-700/30 text-orange-300' },
        URGENT: { label: 'Urgente', classes: 'bg-red-700/40 text-red-300' },
    };
    
    const lightMap = {
        LOW:    { label: 'Baixa',   classes: 'bg-green-100 text-green-700 border border-green-300' },
        MEDIUM: { label: 'Média',   classes: 'bg-blue-100 text-blue-700 border border-blue-300' },
        HIGH:   { label: 'Alta',    classes: 'bg-orange-100 text-orange-700 border border-orange-300' },
        URGENT: { label: 'Urgente', classes: 'bg-red-100 text-red-700 border border-red-300' },
    };

    const map = theme === 'light' ? lightMap : darkMap;
    return map[priority] ?? { label: priority, classes: theme === 'light' ? 'bg-gray-100 text-gray-700 border border-gray-300' : 'bg-gray-600/40 text-gray-300' };
}