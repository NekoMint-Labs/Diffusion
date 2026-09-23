"""Network-free regression of real CSS/camera primitives. Not React application E2E.

Requires Python Playwright and Chromium. Run scripts/prepare-primitives.mjs first.
Screenshots use authored DOM fixtures with actual product CSS and demo content.
"""
from __future__ import annotations
import argparse
import html as markup
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('directory')
parser.add_argument('--report', required=True)
parser.add_argument('--screenshots')
args = parser.parse_args()
directory = Path(args.directory)
repo = Path(__file__).resolve().parents[2]
shots = Path(args.screenshots) if args.screenshots else Path(args.report).parent / 'css-previews'
shots.mkdir(parents=True, exist_ok=True)
html = (directory / 'index.html').read_text()
css = (directory / 'css' / 'field.css').read_text() + '\n' + re.sub(r'@import[^;]+;', '', (directory / 'css' / 'theme.css').read_text())
# `materials.css` is the single owner of the Thought material states and of relation visuals now, so the
# fixture must include it or those states are untested (the prepared dir only ships theme.css + field.css).
css = css + '\n' + re.sub(r'@import[^;]+;', '', (repo / 'src/ui/materials.css').read_text())
# `surfaces.css` owns the application surfaces now (the focused Thread-frame assertion below needs it).
css = css + '\n' + re.sub(r'@import[^;]+;', '', (repo / 'src/ui/surfaces/surfaces.css').read_text())
geometry = (directory / 'modules' / 'field' / 'spatial' / 'geometry.js').read_text()
camera = (directory / 'modules' / 'field' / 'camera' / 'controller.js').read_text()
module = re.sub(r'^import[^;]+;\s*', '', geometry + '\n' + camera, flags=re.MULTILINE)
module = re.sub(r'\bexport\s+', '', module)
html = html.replace('<link rel="stylesheet" href="./css/theme.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module">', '<script>')
html = html.replace("import { CameraController } from './modules/field/camera/controller.js';", module)
fixtures = json.loads((directory / 'fixtures.json').read_text())
results: list[dict] = []
errors: list[str] = []
failures: list[str] = []

def passed(name: str, details=None):
    results.append({'name': name, 'result': 'PASS', 'details': details})

def scene(project: dict, theme: str, focus: bool = False):
    thoughts = []
    for item in project['thoughts'].values():
        emphasis = ('selected' if item['id'] == 'attention' else 'direct' if item['id'] == 'structure' else 'nearby' if item['id'] == 'unfinished' else 'receded') if focus else 'normal'
        thoughts.append(f'<article class="thought {item["kind"]}" data-kind="{item["kind"]}" data-emphasis="{emphasis}" data-selected="{str(focus and item["id"] == "attention").lower()}" style="transform:translate({item["x"]}px,{item["y"]}px)"><p>{markup.escape(item["text"])}</p></article>')
    is_zh = project['title'] != fixtures['en']['title']
    speak = '\u7ee7\u7eed\u60f3\u60f3\u2026' if is_zh else 'Say something...'
    ask = '\u95ee\u4e00\u95ee' if is_zh else 'Ask'
    scope = '\u5173\u4e8e\u8fd9\u91cc' if is_zh else 'About here'
    actions = f'<div class="context-actions" style="position:absolute;left:533px;top:246px"><button>{ask}</button><button>...</button></div>' if focus else ''
    relation = '<svg class="phenomena"><g class="relation"><text x="668" y="294">&#8776;</text></g></svg>' if focus else ''
    return f'<!doctype html><html lang="{"zh-CN" if is_zh else "en"}" data-theme="{theme}"><head><meta charset="utf-8"><style>{css}</style></head><body><main class="app"><header class="identity"><h1>{markup.escape(project["title"])}</h1></header><nav class="global-actions"><button>...</button></nav><div class="field" data-level="local"><div class="world" style="--inverse-zoom:1">{"".join(thoughts)}{relation}</div>{actions}</div><form class="speak" data-composing="false">{f"<span class=speak-scope>{scope}</span>" if focus else ""}<div class="speak-shell"><span class="speak-light" aria-hidden="true"></span><div class="speak-row"><textarea rows="1" aria-label="Speak" placeholder="{speak}"></textarea></div></div></form></main><small style="position:fixed;bottom:12px;right:18px;font:10px system-ui;color:var(--ink-tertiary)">CSS fixture / not the React application</small></body></html>'

try:
    with sync_playwright() as playwright:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
        browser = playwright.chromium.launch(executable_path=executable, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1440, 'height': 960}, color_scheme='light')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html)
        page.wait_for_function('!!window.fixture')
        page.mouse.move(1350, 920)
        bounds = page.locator('#thought').bounding_box()
        assert bounds and 180 <= bounds['width'] <= 280
        passed('Thought width stays within intended range', bounds)
        page.evaluate("document.querySelector('#thought').dataset.selected='true';document.querySelector('#thought').dataset.emphasis='selected';document.querySelector('#context').dataset.emphasis='receded'")
        page.wait_for_timeout(560)
        assert page.locator('#thought').bounding_box() == bounds
        opacity = float(page.locator('#context').evaluate('(e)=>getComputedStyle(e).opacity'))
        assert .55 <= opacity <= .65, opacity
        background = page.locator('#thought').evaluate('(e)=>getComputedStyle(e).backgroundColor')
        # A selected Thought now carries the material ladder's fill rather than a bare transparent surface.
        assert background != 'rgba(0, 0, 0, 0)', background
        passed('Settled Focus gently recedes context, keeps a material selected surface, and preserves exact geometry', {'opacity': opacity, 'background': background})
        light = page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor')
        page.evaluate("document.documentElement.dataset.theme='dark'")
        dark = page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor')
        assert light == 'rgb(245, 243, 239)' and dark == 'rgb(23, 24, 25)'
        assert page.locator('#thought').bounding_box() == bounds
        passed('Paper Day / Graphite Night preserve geometry', {'light': light, 'dark': dark})
        page.evaluate("""() => { const root = document.createElementNS('http://www.w3.org/2000/svg','svg'); const mark = document.createElementNS(root.namespaceURI,'g'); mark.id='release-phenomenon'; mark.setAttribute('class','relation tentative'); root.append(mark); document.body.append(root); }""")
        page.wait_for_timeout(460)
        tentative = float(page.locator('#release-phenomenon').evaluate('(e)=>getComputedStyle(e).opacity'))
        assert .46 <= tentative <= .50, tentative
        passed('One-time emergence preserves weaker tentative phenomenon presence', {'opacity': tentative})
        page.locator('#release-phenomenon').evaluate("e=>e.classList.add('exiting')")
        page.wait_for_timeout(220)
        released = float(page.locator('#release-phenomenon').evaluate('(e)=>getComputedStyle(e).opacity'))
        assert released == 0, released
        passed('Released relation glyph fades to zero without geometry or a modal overlay', {'opacity': released})

        before = page.locator('#ghost').bounding_box()
        page.evaluate("const e=document.querySelector('#ghost');e.classList.remove('ghost');e.dataset.kind='thought';e.dataset.selected='true'")
        assert page.locator('#ghost').bounding_box() == before
        passed('Ghost-to-Thought class transition preserves the same DOM object and bounds')
        page.evaluate("document.querySelector('#ghost').classList.add('recall')")
        before = page.locator('#ghost').bounding_box()
        page.evaluate("document.querySelector('#ghost').classList.remove('recall')")
        assert page.locator('#ghost').bounding_box() == before
        passed('Recall-to-Thought presence transition preserves bounds')
        page.evaluate("document.querySelector('#thought').classList.add('editing')")
        assert page.locator('#thought').bounding_box() == bounds
        editing = page.locator('#thought').evaluate('(e)=>({outline:getComputedStyle(e).outlineWidth,shadow:getComputedStyle(e).boxShadow})')
        assert editing['outline'] == '0px' and editing['shadow'] != 'none'
        page.evaluate("document.querySelector('#thought').classList.remove('editing')")
        passed('Editing becomes the opaque writing surface without changing the outer box', editing)
        data = page.evaluate('''async()=>{const f=window.fixture;const before=f.state.frames;for(let i=0;i<120;i++)f.camera.pan(1,0);const beforePaint=f.state.commits;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return{beforePaint,commits:f.state.commits,frames:f.state.frames-before,transform:document.querySelector('#world').style.transform};}''')
        assert data['commits'] == 0 and data['beforePaint'] == 0 and data['frames'] == 1 and '120px' in data['transform']
        passed('120 camera updates coalesce into one DOM frame with no canonical commit', data)
        page.evaluate('window.fixture.camera.commit()')
        assert page.evaluate('window.fixture.state.commits') == 1
        passed('Gesture boundary commits camera exactly once')
        result = page.evaluate('''()=>{const f=window.fixture;const point={x:600,y:450};const before=f.camera.worldPoint(point);f.camera.zoom(point,180);return{before,after:f.camera.worldPoint(point)};}''')
        assert abs(result['before']['x'] - result['after']['x']) < 1e-8 and abs(result['before']['y'] - result['after']['y']) < 1e-8
        page.wait_for_timeout(180)
        assert page.evaluate('window.fixture.state.commits') == 2
        passed('Zoom preserves pointer anchor and commits after idle boundary')
        page.evaluate("window.fixture.camera.set({x:0,y:0,zoom:.5});document.querySelector('#viewport').dataset.level='neighborhood'")
        page.wait_for_timeout(60)
        font = page.locator('#thought').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')
        width = page.locator('#thought').bounding_box()['width']
        assert abs(font * .5 - 14) < .01 and abs(width - 228) < .01, (font, width)
        passed('Neighborhood representation retains 14px screen text instead of shrinking to dots', {'worldFont': font, 'screenWidth': width})
        page.evaluate("document.querySelector('#ghost').classList.add('ghost')")
        page.emulate_media(reduced_motion='reduce')
        animation = page.locator('#ghost').evaluate('(e)=>getComputedStyle(e).animationName')
        assert animation == 'none'
        passed('Reduced-motion disables Ghost emergence')
        page.emulate_media(reduced_motion='no-preference')
        # Authored DOM is deliberately labelled: these are real CSS states, not app screenshots.
        for name, project, theme, focus in [('paper-day', fixtures['en'], 'light', False), ('graphite-night', fixtures['en'], 'dark', False), ('graphite-focus', fixtures['en'], 'dark', True), ('chinese-focus', fixtures['zh'], 'dark', True)]:
            page.set_content(scene(project, theme, focus))
            page.wait_for_timeout(600)
            page.screenshot(path=str(shots / f'{name}.png'))
        speak = page.locator('.speak').bounding_box()
        assert speak and 240 <= speak['width'] <= 260 and speak['height'] <= 52
        # Idle: transparent, no depth, illumination off.
        assert page.locator('.speak-shell').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgba(0, 0, 0, 0)'
        assert page.locator('.speak-shell').evaluate('(e)=>getComputedStyle(e).boxShadow') == 'none'
        assert float(page.locator('.speak-light').evaluate('(e)=>getComputedStyle(e).opacity')) == 0
        page.evaluate("document.querySelector('.speak').dataset.composing='true'")
        page.wait_for_timeout(200)
        composing = page.locator('.speak').bounding_box()
        # Composing: the shell materializes (a 1px frame is the only geometry it adds) and its
        # illumination layer is lit. The mode is `data-composing`, so this holds without any motion.
        assert composing and speak['width'] < composing['width'] <= 560 and speak['height'] <= composing['height'] <= speak['height'] + 4
        assert page.locator('.speak-shell').evaluate('(e)=>getComputedStyle(e).backgroundColor') != 'rgba(0, 0, 0, 0)'
        assert page.locator('.speak-shell').evaluate('(e)=>getComputedStyle(e).boxShadow') != 'none'
        assert float(page.locator('.speak-light').evaluate('(e)=>getComputedStyle(e).opacity')) >= .6
        # The idle tick retracts once the material has arrived: the surface does the framing now.
        assert page.locator('.speak-shell').evaluate("(e)=>getComputedStyle(e, '::after').visibility") == 'hidden'
        passed('Speak expands from a quiet Field line into a lit, bounded writing surface', {'idle': speak, 'composing': composing})
        page.evaluate('''() => {document.querySelector('.app').dataset.activeSurface='thread-focus';document.querySelector('.speak').remove();const surface=document.createElement('aside');surface.className='surface focus';surface.innerHTML='<header class="surface-header"><div><h2>Attention, without erasure</h2><p>A reasoning fixture / not a model response</p></div><button>Return to Field</button></header><div class="surface-actions"><button>Return to Thread</button></div><div class="surface-body"><div class="thread-focus-layout"><section class="thread-focus-context"><h3>Frozen context</h3><p>Attention may not mean hiding everything else.</p><h3>Sources</h3><p>No outside evidence has been read.</p></section><article class="thread-focus-reasoning"><div class="structured-manuscript"><h2>The rest of the space still matters</h2><p>Selection can make a thought clearer without changing where anything lives. Related thoughts retain their presence; unrelated thoughts recede rather than disappear.</p><blockquote>The Field keeps its spatial memory.</blockquote><h3>What this fixture verifies</h3><div class="manuscript-table"><table><thead><tr><th>State</th><th>Representation</th></tr></thead><tbody><tr><td>Thread</td><td>Split discourse beside the Field</td></tr><tr><td>Deep Dive</td><td>Relevant context beside structured reasoning</td></tr></tbody></table></div><p>This is an authored CSS layout check. Application routing, source retrieval, and React integration are not being exercised here.</p></div></article></div></div>';document.querySelector('.app').append(surface);}''')
        context = page.locator('.thread-focus-context').bounding_box()
        manuscript = page.locator('.thread-focus-reasoning').bounding_box()
        assert context and manuscript and context['width'] >= 180 and manuscript['x'] > context['x'] + context['width']
        assert page.locator('.field').evaluate('(e)=>getComputedStyle(e).visibility') == 'hidden'
        page.screenshot(path=str(shots / 'thread-focus.png'))
        passed('The focused Thread uses distinct context/manuscript columns and hides the Field', {'context': context, 'manuscript': manuscript})
        page.set_viewport_size({'width': 768, 'height': 960})
        assert page.locator('.thread-focus-layout').evaluate('(e)=>e.scrollWidth <= e.clientWidth + 1')
        passed('The focused Thread columns stay within a 768px viewport')
        assert not errors, errors
        passed('No primitive-harness browser exceptions')
        browser.close()
except Exception as error:
    failures.append(f'{type(error).__name__}: {error}')
finally:
    report = {'scope': 'Isolated actual camera/CSS browser regression only. Not React application E2E, Dexie, providers, or desktop verification.', 'mode': 'Network-free page.set_content; transpiled camera source, actual CSS, authored fixture DOM', 'checks': results, 'passed': len(results), 'failed': len(failures), 'failures': failures, 'screenshots': [p.name for p in sorted(shots.glob('*.png'))]}
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
if failures:
    raise SystemExit(1)
