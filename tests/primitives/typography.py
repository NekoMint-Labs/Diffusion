"""Real CSS in Chromium; authored DOM, NOT React integration verification."""
from __future__ import annotations
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

args = argparse.ArgumentParser()
args.add_argument('--report', required=True)
args.add_argument('--screenshots', required=True)
options = args.parse_args()
root = Path(__file__).resolve().parents[2]
output = Path(options.screenshots)
output.mkdir(parents=True, exist_ok=True)
css = (root / 'src/ui/field.css').read_text() + '\n' + re.sub(r'@import[^;]+;', '', (root / 'src/ui/theme.css').read_text())
# The application surfaces, primitives and content renderers moved into their own stylesheets, so the
# typography roles they own (surface header, settings rows/controls, Thread/manuscript copy) must be
# loaded or those roles are unstyled. Thought material states are deliberately left out: this harness
# asserts the plan-ink typography, not the material ladder (see materialState.spec.ts for that).
for extra in ['surfaces/surfaces.css', 'primitives/primitives.css']:
    css = css + '\n' + re.sub(r'@import[^;]+;', '', (root / 'src/ui' / extra).read_text())
rows = []
failures = []
errors = []


def document(locale, theme, font):
    chinese = locale == 'zh'
    text = '\u6ce8\u610f\u529b\u4e0d\u4e00\u5b9a\u610f\u5473\u7740\u9690\u85cf\u5176\u4ed6\u4e00\u5207\u3002' if chinese else 'Attention may not mean hiding everything else.'
    question = '\u601d\u7eea\u53ef\u4ee5\u6162\u6162\u53d8\u5f97\u6e05\u6670\u3002' if chinese else 'A thought can become clearer without moving.'
    title = '\u601d\u7eea\u573a\u8bbe\u7f6e' if chinese else 'Field settings'
    labels = ['\u8bed\u8a00', '\u5916\u89c2', '\u601d\u7eea\u5b57\u4f53', '\u601d\u8003\u670d\u52a1'] if chinese else ['Language', 'Appearance', 'Thought typography', 'Thinking service']
    choices = ['\u4e2d\u6587', '\u6d45\u8272' if theme == 'light' else '\u6df1\u8272', '\u4e66\u5377\u886c\u7ebf' if font == 'serif' else '\u7b80\u51c0\u65e0\u886c\u7ebf', '\u5173\u95ed / \u4ec5\u624b\u52a8\u601d\u7eea\u573a'] if chinese else ['English', theme.title(), 'Editorial Serif' if font == 'serif' else 'Quiet Sans', 'Off / manual Field only']
    settings = ''.join(f'<label class="setting-row">{html.escape(label)}<select><option>{html.escape(choice)}</option></select></label>' for label, choice in zip(labels, choices))
    close = '\u5173\u95ed' if chinese else 'Close'
    return f'''<!doctype html><html lang="{locale}" data-theme="{theme}" data-thought-typography="{font}">
    <head><meta charset="utf-8"><style>{css}</style></head><body>
    <main class="app"><header class="identity"><h1>Diffusion Explorer</h1></header>
    <div class="field"><div class="world">
    <article id="thought" class="thought" data-selected="true" data-emphasis="selected" style="transform:translate(155px,145px)"><p>{text}</p></article>
    <article id="ghost" class="thought ghost" style="transform:translate(495px,155px)"><p>{question}</p></article>
    <article id="recall" class="thought recall" style="transform:translate(195px,345px)"><p>{question}</p></article>
    <article id="crystal" class="thought crystal" style="transform:translate(515px,365px)"><p>{text}</p></article>
    </div></div></main>
    <div class="surface-input-shield" id="shield" aria-hidden="true"></div>
    <aside class="surface anchored" id="settings" role="dialog" aria-label="{title}">
    <header class="surface-header"><h2>{title}</h2><button>{close}</button></header>
    <div class="surface-body"><div class="settings-form">{settings}</div></div></aside>
    <section style="position:fixed;left:180px;top:610px;width:560px">
    <div class="thread-scope">{text}</div><div class="thread-passage">{question}</div>
    <div class="structured-manuscript"><p>{text}</p></div></section>
    <div class="surface" style="left:-10000px"><textarea class="draft-text">{text}</textarea></div>
    <small style="position:fixed;bottom:14px;left:24px;font:11px system-ui;color:var(--ink-secondary)">CSS fixture / not the React application - {locale} / {theme} / {font}</small>
    </body></html>'''


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1440, 'height': 960}, reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        for locale in ['en', 'zh']:
            for theme in ['light', 'dark']:
                for font in ['serif', 'sans']:
                    page.set_content(document(locale, theme, font))
                    metrics = page.evaluate('''() => {
                        const style = selector => getComputedStyle(document.querySelector(selector));
                        return {
                            content: ['#thought','#ghost','#recall','#crystal','.thread-scope','.thread-passage','.structured-manuscript','.draft-text'].map(selector => style(selector).fontFamily),
                            chrome: ['.surface-header h2','.surface-header button','.settings-form label','.settings-form select'].map(selector => style(selector).fontFamily),
                            background: style('body').backgroundColor,
                            selectedBackground: style('#thought').backgroundColor,
                            shieldBackground: style('#shield').backgroundColor,
                            shieldTarget: document.elementFromPoint(20,500).id,
                            overflow: document.querySelector('.surface-body').scrollWidth > document.querySelector('.surface-body').clientWidth + 1,
                            transform: document.querySelector('#thought').style.transform,
                        };
                    }''')
                    expected = 'Georgia' if font == 'serif' else 'ui-sans-serif'
                    assert all(expected in family for family in metrics['content']), metrics
                    assert all('ui-sans-serif' in family and 'Georgia' not in family for family in metrics['chrome']), metrics
                    assert metrics['background'] == ('rgb(245, 243, 239)' if theme == 'light' else 'rgb(23, 24, 25)')
                    assert metrics['selectedBackground'] == 'rgba(0, 0, 0, 0)'
                    assert metrics['shieldBackground'] == 'rgba(0, 0, 0, 0)'
                    assert metrics['shieldTarget'] == 'shield'
                    assert not metrics['overflow']
                    before = page.locator('#thought').bounding_box()
                    page.evaluate("document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'")
                    assert page.locator('#thought').bounding_box() == before
                    page.evaluate('(theme) => document.documentElement.dataset.theme=theme', theme)
                    page.screenshot(path=str(output / f'{locale}-{theme}-{font}.png'))
                    rows.append({'name': f'{locale}/{theme}/{font}', 'result': 'PASS', 'metrics': metrics})
        for width, height in [(768, 960), (390, 740), (1440, 600)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.set_content(document('zh', 'dark', 'sans'))
            page.evaluate('''() => {
                const form=document.querySelector('.settings-form');
                for(let n=0;n<2;n++){const label=document.createElement('label');label.textContent=n?'Gateway session token':'Gateway base URL';label.innerHTML+='<input value="https://gateway.example.test/normalized">';form.append(label);}
                const paragraph=document.createElement('p');paragraph.className='tiny muted';paragraph.textContent='The token stays in memory. Configure upstream endpoints and API keys on the server.';form.append(paragraph);
            }''')
            bounds = page.locator('#settings').bounding_box()
            assert bounds and bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width + 1 and bounds['y'] + bounds['height'] <= height + 1, bounds
            assert page.locator('.surface-body').evaluate('(element) => element.scrollWidth <= element.clientWidth + 1')
            page.locator('.settings-form input').last.scroll_into_view_if_needed()
            assert page.locator('.settings-form input').last.is_visible()
            rows.append({'name': f'Settings bounded at {width}x{height}', 'result': 'PASS', 'bounds': bounds})
        assert not errors, errors
        browser.close()
except Exception as error:
    failures.append(f'{type(error).__name__}: {error}')
finally:
    result = {'scope': 'Actual CSS and browser layout only. Authored DOM; no React focus manager, application persistence, provider, or routing executed.', 'passed': len(rows), 'failed': len(failures), 'failures': failures, 'checks': rows, 'screenshots': [path.name for path in sorted(output.glob('*.png'))]}
    Path(options.report).parent.mkdir(parents=True, exist_ok=True)
    Path(options.report).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'passed': result['passed'], 'failed': result['failed'], 'failures': failures}, indent=2))
if failures:
    raise SystemExit(1)
