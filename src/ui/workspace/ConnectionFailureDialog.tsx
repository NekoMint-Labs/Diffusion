import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../shared/i18n.ts';
import { useUI } from '../store.ts';
import { Button } from '../primitives/Button.tsx';

/** A failed connection needs acknowledgement; closing never sends another request. */
export function ConnectionFailureDialog() {
    const failure = useUI(state => state.connectionFailure);
    const dialog = useRef<HTMLDialogElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const close = () => useUI.getState().patch({ connectionFailure: null });
    useLayoutEffect(() => {
        if (!failure) return;
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, [failure]);
    if (!failure) return null;
    return createPortal(<dialog ref={dialog} className="connection-failure-dialog" role="alertdialog" aria-modal="true" aria-labelledby="connection-failure-title" aria-describedby="connection-failure-description" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); } }}>
        <h2 id="connection-failure-title">{t(failure.timeout ? 'Request timed out' : 'Connection failed')}</h2>
        <div id="connection-failure-description"><p>{failure.text}</p><p>{t(failure.timeout ? 'Try again manually when you are ready. Closing this message will not retry.' : 'Check your connection, then start the action again when you are ready.')}</p></div>
        <Button ref={closeButton} autoFocus onClick={close}>{t('Close')}</Button>
    </dialog>, document.body);
}
