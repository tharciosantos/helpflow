'use client';

import { useEffect, useRef } from 'react';
import { activateFocusTrap } from '@/lib/focusTrap';

// Hook dos painéis modais (sino, drawer mobile e ConfirmDialog).
//
// `active` liga o trap; `containerRef` é o painel; `returnFocusTo` é o botão que
// abriu o painel — o foco volta para ele ao fechar. O trap roda depois da
// montagem (useEffect), quando os filhos já estão no DOM e o primeiro focável
// pode ser calculado.
export default function useFocusTrap({ active, containerRef, returnFocusTo }) {
  const returnRef = useRef(returnFocusTo);
  returnRef.current = returnFocusTo;

  useEffect(() => {
    if (!active || !containerRef?.current) return undefined;
    return activateFocusTrap({ container: containerRef.current, returnFocusTo: returnRef });
  }, [active, containerRef]);
}
