import { useState } from 'react';
import { createPlatform } from '../../platform/index.ts';
import { t } from '../../shared/i18n.ts';
export function ApiKeyLink({ url }: { url: string | null }) {
    const [failed, setFailed] = useState(false);
    if (!url) return null;
    return <span className="api-key-help"><a href={url} onClick={event => {
        event.preventDefault(); setFailed(false);
        void createPlatform().then(platform => platform.openExternal(url)).catch(() => setFailed(true));
    }}>{t('settings.ai.getApiKey')} <span aria-hidden="true">{'↗'}</span></a>{failed && <span role="alert">{t('settings.link.failed')}</span>}</span>;
}
