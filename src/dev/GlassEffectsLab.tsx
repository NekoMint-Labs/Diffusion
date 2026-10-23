/** Interactive visual fixture: no AI calls, project data, or saved preferences. */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ClickRipples } from '../ui/motion/ClickRipples.tsx';
import { ScrambleText } from '../ui/motion/ScrambleText.tsx';
import './glassEffectsLab.css';

// Single-language development fixture, matching the existing material gallery.
const TEXT = {
    brand: "Diffusion",
    edition: "外观实验 / 01",
    preview: "可交互预览",
    heading: "让想法，",
    headingEnd: "轻一点。",
    lead: "保留原来的色彩，试试半透明的卡片、沿边缘流动的高光，以及逐字浮现的回答。",
    glass: "01 / 毛玻璃",
    glassSpec: "白色 15% · 模糊 16px · 描边 1px",
    glow: "02 / 思考流光",
    glowSpec: "点击卡片下方操作 · 4 秒一圈",
    scramble: "03 / 回答解码",
    scrambleSpec: "每 50ms 锁定一字 · 点击文字立即展开",
    ripple: "04 / 点击涟漪",
    rippleSpec: "点击任意位置 · 0.6 秒消散",
    duration: "演示思考时长",
    short: "4 秒",
    long: "8 秒",
    disclaimer: "本页使用预设回答演示动效，不调用模型、不保存想法。",
    open: "在真实思绪场里试用 ↗",
    field: "思绪场 / 日常学习",
    hint: "点击下方开始体验",
    mine: "我的想法",
    input: "我想学英语也想学编程，",
    inputEnd: "但每天只有二十分钟，老是换计划。",
    continue: "继续想",
    angle: "换个角度",
    stop: "停止",
    replay: "重播回答",
    suggestion: "AI 建议 · 演示内容 · 尚未保留",
    ownership: "内容始终属于你。",
    trial: "外观试验，不改变思考。",
    arrow: "↗",
    turn: "⤴",
};

const answers = {
    continue: '如果每天只有二十分钟，可以先固定一个最小练习，再观察是什么让你想换计划：内容太难，还是看不到进展？',
    angle: '也许需要比较的不是英语和编程谁更重要，而是哪一种练习更容易在你现有的一天里自然开始。',
};
export default function GlassEffectsLab() {
    const [running, setRunning] = useState<keyof typeof answers | null>(null);
    const [result, setResult] = useState<{ text: string; id: number } | null>(null);
    const [dark, setDark] = useState(false);
    const [duration, setDuration] = useState(4);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const serial = useRef(0);
    const reduced = useReducedMotion();
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    useEffect(() => {
        const previous = document.documentElement.dataset.theme;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        return () => { if (previous) document.documentElement.dataset.theme = previous; else delete document.documentElement.dataset.theme; };
    }, [dark]);
    const run = (kind: keyof typeof answers) => {
        if (timer.current) clearTimeout(timer.current);
        setRunning(kind); setResult(null);
        timer.current = setTimeout(() => {
            setRunning(null); setResult({ text: answers[kind], id: ++serial.current });
            timer.current = null;
        }, duration * 1000);
    };
    const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; setRunning(null); };
    return <main className="glass-lab">
        <ClickRipples/>
        <header className="glass-lab-header"><a href="/">{TEXT.brand}</a><span>{TEXT.edition}</span><button type="button" onClick={() => setDark(value => !value)}>{dark ? '切换浅色' : '切换深色'}</button></header>
        <div className="glass-lab-layout">
            <aside className="glass-lab-notes">
                <span className="glass-lab-eyebrow">{TEXT.preview}</span>
                <h1>{TEXT.heading}<br/>{TEXT.headingEnd}</h1>
                <p>{TEXT.lead}</p>
                <dl><div><dt>{TEXT.glass}</dt><dd>{TEXT.glassSpec}</dd></div><div><dt>{TEXT.glow}</dt><dd>{TEXT.glowSpec}</dd></div><div><dt>{TEXT.scramble}</dt><dd>{TEXT.scrambleSpec}</dd></div><div><dt>{TEXT.ripple}</dt><dd>{TEXT.rippleSpec}</dd></div></dl>
                <label className="glass-lab-duration">{TEXT.duration} <select aria-label="演示思考时长" value={duration} onChange={event => setDuration(Number(event.target.value))}><option value={4}>{TEXT.short}</option><option value={8}>{TEXT.long}</option></select></label>
                <p className="glass-lab-disclaimer">{TEXT.disclaimer}{reduced ? '系统已开启减少动态效果，动效已收起。' : ''}</p>
                <a className="glass-lab-open" href="/?effects=glass" target="_blank" rel="noreferrer">{TEXT.open}</a>
            </aside>
            <section className="glass-lab-stage" aria-label="毛玻璃效果体验区">
                <div className="glass-lab-stage-label"><span>{TEXT.field}</span><span>{TEXT.hint}</span></div>
                <div className="glass-lab-grain" aria-hidden="true"/>
                <div className="glass-lab-card-group">
                    <article className="thought glass-lab-card" data-selected="true" data-thinking={!!running || undefined}>
                        {running && <span className="card-thinking-border" aria-hidden="true"/>}
                        <span className="glass-lab-card-label">{TEXT.mine}</span>
                        <div className="thought-preview"><p>{TEXT.input}<br/>{TEXT.inputEnd}</p></div>
                        <span className="thought-selected-dot" aria-hidden="true"/>
                    </article>
                    <div className="glass-lab-actions"><button type="button" aria-pressed={running === 'continue'} onClick={() => run('continue')}>{TEXT.continue} <span>{TEXT.arrow}</span></button><button type="button" aria-pressed={running === 'angle'} onClick={() => run('angle')}>{TEXT.angle} <span>{TEXT.turn}</span></button>{running && <button type="button" onClick={stop}>{TEXT.stop}</button>}</div>
                    <div className="glass-lab-status" role="status">{running ? '正在演示思考状态，观察卡片边缘的流光…' : result ? '演示回答已到达 · 可以再次点击操作重播' : '这是一条还没想清楚的念头。'}</div>
                    <div className="glass-lab-replay-row">{result && <button className="glass-lab-replay" type="button" onClick={() => setResult({ text: result.text, id: ++serial.current })}>{TEXT.replay}</button>}</div>
                    <div className="glass-lab-result-slot">{result && <article className="thought ghost glass-lab-card glass-lab-answer" data-proposal-action="continue" key={result.id}>
                        <span className="glass-lab-card-label">{TEXT.suggestion}</span>
                        <div className="thought-preview"><p><ScrambleText text={result.text} animationKey={'lab-' + result.id}/></p></div>
                    </article>}</div>
                </div>
                <footer className="glass-lab-stage-footer"><span>{TEXT.ownership}</span><span>{TEXT.trial}</span></footer>
            </section>
        </div>
    </main>;
}
