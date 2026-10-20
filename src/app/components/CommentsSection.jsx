import { LuMessageSquare, LuSend, LuTrash2, LuHistory, LuLock } from 'react-icons/lu';
import { canDeleteComment } from '@/lib/ticketAuthorization';
import { formatHistoryText } from '@/lib/ticketHistoryFormat';

export default function CommentsSection({
    ticket,
    comments,
    histories = [],
    agents = [],
    session,
    theme,
    commentText,
    setCommentText,
    isInternalNote,
    setIsInternalNote,
    isSubmittingComment,
    commentError,
    deletingCommentId,
    onAddComment,
    onDeleteComment,
}) {
    const isAgent = session?.user?.role === 'AGENT';
    const actorNameMap = Object.fromEntries(
        [...(agents ?? []), ticket?.author, ticket?.agent]
            .filter(Boolean)
            .map((person) => [person.id, person.name || person.email])
    );

    const timeline = [
        ...comments.map((comment) => ({
            kind: 'comment',
            id: `comment-${comment.id}`,
            createdAt: comment.createdAt,
            comment,
        })),
        ...histories.map((entry) => ({
            kind: 'history',
            id: `history-${entry.id}`,
            createdAt: entry.createdAt,
            entry,
        })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return (
        <div className={`rounded-2xl border shadow-sm p-4 sm:p-8 space-y-5 sm:space-y-6 min-w-0 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${
                        theme === 'light' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/50 text-emerald-400'
                    }`}>
                        <LuMessageSquare size={18} />
                    </div>
                    <div>
                        <h2 className={`text-base sm:text-lg font-bold tracking-tight ${
                            theme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}>
                            Mensagens e Histórico de Atendimento
                        </h2>
                        <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Espaço para esclarecimentos, instruções e acompanhamento da resolução.
                        </p>
                    </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    theme === 'light'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                    {timeline.length} {timeline.length === 1 ? 'evento' : 'eventos'}
                </span>
            </div>

            <div className="min-w-0 space-y-4">
                {timeline.length === 0 ? (
                    <div className={`text-center py-8 px-4 rounded-xl border border-dashed ${
                        theme === 'light'
                            ? 'bg-slate-50/60 border-slate-300 text-slate-500'
                            : 'bg-slate-950/30 border-slate-800 text-slate-400'
                    }`}>
                        <LuMessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Nenhuma mensagem registrada ainda.</p>
                        <p className="text-xs mt-1 opacity-75">Envie uma mensagem abaixo para registrar o andamento ou tirar dúvidas sobre o chamado.</p>
                    </div>
                ) : (
                    <div className="min-w-0 space-y-3 sm:space-y-3.5">
                        {timeline.map((item) => {
                            if (item.kind === 'history') {
                                const { entry } = item;
                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-xl px-3 py-3 sm:px-4 border border-dashed flex min-w-0 items-start gap-2.5 ${
                                            theme === 'light'
                                                ? 'bg-slate-50/70 border-slate-300 text-slate-600'
                                                : 'bg-slate-950/40 border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <LuHistory size={14} className="mt-0.5 shrink-0 opacity-70" />
                                        <div className="min-w-0">
                                            <p className="text-xs leading-relaxed">
                                                <span className="font-semibold">
                                                    {entry.actor?.name || entry.actor?.email || 'Sistema'}
                                                </span>
                                                {' alterou '}
                                                {formatHistoryText(entry, actorNameMap)}
                                            </p>
                                            <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }

                            const comment = item.comment;
                            const isCommentAgent = comment.author?.role === 'AGENT';
                            const isTicketCreator = comment.authorId === ticket.authorId;
                            const isInternal = comment.visibility === 'INTERNAL';
                            // Mesma regra do backend (inclui checagem de companyId),
                            // evita exibir a lixeira para AGENT de outra empresa.
                            const canDeleteThisComment = canDeleteComment(session?.user, comment, ticket);

                            return (
                                <div
                                    key={item.id}
                                    data-cy="ticket-comment-item"
                                    className={`rounded-xl p-4 border transition-all ${
                                        isInternal
                                            ? theme === 'light'
                                                ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                                                : 'bg-amber-950/20 border-amber-800/50 shadow-xs'
                                            : isCommentAgent
                                                ? theme === 'light'
                                                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                                                    : 'bg-emerald-950/20 border-emerald-800/40 shadow-xs'
                                                : theme === 'light'
                                                    ? 'bg-slate-50 border-slate-200'
                                                    : 'bg-slate-950/40 border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 border ${
                                                isCommentAgent
                                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                                    : theme === 'light'
                                                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                                                        : 'bg-slate-800 text-slate-200 border-slate-700'
                                            }`}>
                                                {comment.author?.name ? comment.author.name.slice(0, 2).toUpperCase() : 'HF'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className={`text-xs sm:text-sm font-semibold truncate ${
                                                        theme === 'light' ? 'text-slate-900' : 'text-white'
                                                    }`}>
                                                        {comment.author?.name || 'Membro da Equipe'}
                                                    </span>
                                                    {isCommentAgent ? (
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                                            theme === 'light'
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
                                                        }`}>
                                                            TI / Suporte
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                                            theme === 'light'
                                                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                                : 'bg-blue-950/60 text-blue-300 border-blue-800'
                                                        }`}>
                                                            Funcionário
                                                        </span>
                                                    )}
                                                    {isTicketCreator && !isCommentAgent && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            (Autor)
                                                        </span>
                                                    )}
                                                    {isInternal && (
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                                            theme === 'light'
                                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                                : 'bg-amber-900/60 text-amber-300 border-amber-700'
                                                        }`}>
                                                            <LuLock size={10} />
                                                            Nota interna
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {canDeleteThisComment && (
                                            <button
                                                onClick={() => onDeleteComment(comment.id)}
                                                disabled={deletingCommentId === comment.id}
                                                title="Excluir mensagem"
                                                data-cy="ticket-comment-delete"
                                                className={`p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors ${
                                                    theme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-950/40'
                                                }`}
                                            >
                                                <LuTrash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <p className={`text-sm whitespace-pre-wrap leading-relaxed break-words pl-9 sm:pl-10 [overflow-wrap:anywhere] ${
                                        theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                                    }`}>
                                        {comment.content}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <form onSubmit={onAddComment} className="pt-2">
                <div className={`p-4 rounded-xl border focus-within:ring-2 focus-within:ring-emerald-400/20 ${
                    theme === 'light'
                        ? 'bg-slate-50 border-slate-200 focus-within:border-emerald-500'
                        : 'bg-slate-950/50 border-slate-800 focus-within:border-emerald-400'
                }`}>
                    <label htmlFor="comment-input" className="sr-only">
                        Escreva uma mensagem ou atualização sobre o chamado
                    </label>
                    <textarea
                        id="comment-input"
                        data-cy="ticket-comment-input"
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                onAddComment();
                            }
                        }}
                        placeholder="Escreva uma mensagem, esclarecimento ou atualização sobre o chamado... (Pressione Ctrl+Enter para enviar)"
                        maxLength={2000}
                        disabled={isSubmittingComment}
                        className={`w-full bg-transparent border-0 resize-y text-sm focus:outline-none ${
                            theme === 'light' ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-500'
                        }`}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 mt-2">
                        <div className="flex items-center gap-3">
                            <span className={`text-[11px] ${
                                commentText.length > 1800 ? 'text-amber-500' : 'text-slate-400'
                            }`}>
                                {commentText.length} / 2000 caracteres
                            </span>

                            {isAgent && (
                                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(isInternalNote)}
                                        onChange={(e) => setIsInternalNote?.(e.target.checked)}
                                        data-cy="ticket-comment-internal"
                                        className="h-3.5 w-3.5 rounded accent-amber-500"
                                    />
                                    <LuLock size={11} />
                                    Nota interna (só TI)
                                </label>
                            )}
                        </div>

                        <button
                            type="submit"
                            data-cy="ticket-comment-submit"
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm inline-flex items-center gap-2"
                        >
                            <LuSend size={14} />
                            {isSubmittingComment ? 'Enviando...' : 'Enviar Mensagem'}
                        </button>
                    </div>
                </div>

                {commentError && (
                    <p role="alert" className={`text-xs mt-2 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}>
                        {commentError}
                    </p>
                )}
            </form>
        </div>
    );
}
