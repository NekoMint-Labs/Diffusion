import { t } from '../shared/i18n.ts';
import { abortableDelay, UNKNOWN_CAPABILITIES, type AIProvider, type AIResponse, type ContextPacket, type ThinkingCapabilities, type UserIntent, type StructuredRequest, type StructuredResponse } from './contracts.ts';
/** Deterministic authored demonstrations, NOT a language model or web evidence. */
export class MockAIProvider implements AIProvider {
    readonly label = 'Demo / deterministic, not a live model';
    readonly mock = true;
    async structured(request: StructuredRequest, signal?: AbortSignal): Promise<StructuredResponse> {
        await abortableDelay(180, signal);
        const input = request.input as { originalText?: string };
        const originalText = typeof input?.originalText === 'string' ? input.originalText.trim() : '';
        if (request.purpose === 'thought-extraction' || request.purpose === 'thought-extraction-recheck') {
            const split = originalText.split(/\s+(?:but|while)\s+|(?:，|,)?(?:但是|但|同时|而且)(?:，|,)?/iu).map(value => value.trim()).filter(Boolean);
            const parts = split.length > 1 && split.length <= 6 ? split : [originalText];
            return { value: { units: parts.slice(0, 6).map(part => ({ text: part, sourceQuotes: [part] })) }, providerLabel: this.label, mock: true };
        }
        if (request.purpose === 'ingestion-repair') {
            return { value: { units: originalText ? [{ text: originalText, sourceQuotes: [originalText] }] : [] }, providerLabel: this.label, mock: true };
        }
        return { value: { relations: [] }, providerLabel: this.label, mock: true };
    }
    async respond(packet: ContextPacket, intent: UserIntent, signal?: AbortSignal): Promise<AIResponse> {
        await abortableDelay(280, signal);
        const first = packet.scope[0];
        const second = packet.scope[1];
        const topic = (first?.text || t('this thought')).slice(0, 130);
        const chinese = /[\u3400-\u9fff]/u.test(topic);
        let intents: AIResponse['intents'];
        if (intent.kind === 'probe' && first && second) {
            const pair = `${first.text} ${second.text}`;
            const label = /HCI/u.test(pair) && /就业|工作不好找|不好就业|不好找工作/u.test(pair) ? '喜欢，但不敢完全押上去' : /读研|探索/u.test(pair) && /三年|时间.*长|成本/u.test(pair) ? '多点探索，也多花时间' : chinese ? '两边像在互相牵制' : t('Possible missing link');
            intents = [{ type: 'surface_relation', a: first.id, b: second.id, kind: 'gap', label, explanation: chinese ? '这两条之间像有一处还没说清楚的牵连。' : t('The two thoughts may depend on a connection that has not been stated yet.') }];
        }
        else if (intent.kind === 'ask' && packet.retrieved.thoughts.some(thought => thought.id === 'earlier'))
            intents = [{ type: 'request_recall', thoughtId: 'earlier' }];
        else if (intent.kind === 'crystal')
            intents = [{ type: 'request_crystal_preview', text: first?.text || intent.text }];
        else if (intent.kind === 'thread' || intent.kind === 'deep')
            intents = [{ type: intent.kind === 'deep' ? 'request_deep_dive' : 'request_thread', text: `A place to begin

${topic}

The question you brought

${intent.text}

A possible distinction

Separate what you have directly noticed from the interpretation you are trying. Which part would remain true if the interpretation changed?

An unresolved edge

What small observation would make this possibility more useful, or less convincing?

This is a deterministic demonstration of the reasoning surface, not model reasoning or verified evidence.` }];
        else if (intent.kind === 'continue') {
            const chineseIdeas = /读研/u.test(topic) && /三年|更多时间|探索/u.test(topic)
                ? [`那接下来要看的可能是，这件事到底会不会真的给你留出探索的空间。`, `所以光有更多时间还不够，可能还得看这段时间会不会被课程和任务重新塞满。`, `再往前一步，也许要弄清楚什么样的安排才算真的在探索，而不只是把决定往后拖。`, `这样看，关键就变成进去以后你能不能主动试不同东西。`, `如果做不到这一点，多出来的时间可能也不会自动变成探索。`]
                : /读研/u.test(topic)
                    ? [`那接下来可能要先弄清楚，你犹豫的是读研本身，还是不知道读研以后要拿这几年做什么。`, `如果“要不要读”一直定不下来，可能还缺一个你真正会拿来比较的条件。`, `再往前一步，也许得把读研能得到什么和会放弃什么分别说具体一点。`, `这样至少能看出，你现在的不确定到底卡在哪一边。`, `等那个卡点具体下来，“读不读”才比较像一个能继续判断的问题。`]
                    : /HCI|就业|工作怎么样|工作不好找|不好就业/u.test(topic)
                        ? [`如果岗位确实比较少，接下来可能就得看你愿不愿意为了喜欢的方向接受更窄的选择。`, `所以“工作怎么样”可能不能只看有没有岗位，还得看那些岗位是不是你真的愿意做的。`, `再往前一点，你可能需要分清楚：你担心的是找不到工作，还是找不到自己愿意做的那种工作。`, `如果这个担心一直在，最后可能会变成你选方向时一个很实际的边界。`, `那真正影响选择的，可能是喜欢这件事能不能抵过更窄的就业面。`]
                        : /写代码|代码/u.test(topic)
                            ? [`那选方向时，可能得把“日常工作里到底有多少时间在写代码”也放进判断里。`, `所以问题可能不是会不会写代码，而是你愿不愿意让它变成每天工作的主体。`, `再往前一步，不同岗位的日常工作比例可能比岗位名字更值得看。`, `如果只是偶尔写你能接受，那你要排除的其实是代码占比特别高的工作。`, `这样找方向时，工作内容本身可能要比技术标签更优先。`]
                            : /复杂|越做越/u.test(topic)
                                ? [`如果继续往里加东西，这个项目可能会越来越难收口。`, `所以下一步也许先看哪些东西其实可以不做，而不是继续补功能。`, `再往前一点，复杂度已经开始影响你能不能把它做完了。`, `如果核心体验已经成立，后面的新增内容可能要先证明自己值得留下。`, `这样的话，收敛范围本身就成了项目的一部分。`]
                                : /探索|稳定方向|选个稳定/u.test(topic)
                                    ? [`如果两边都放不下，下一步可能要先看你现在最怕失去的是探索空间，还是尽快形成积累。`, `所以“稳定”可能得再具体一点，不然它会一直和“探索”一起拉着你。`, `再往前一步，也许可以看什么样的选择既不会立刻锁死方向，也能开始积累。`, `这样你不一定要先解决所有不确定，至少能让下一步不和两边同时冲突。`, `最后真正要推进的，可能是把“继续探索”从一种状态变成一种有边界的做法。`]
                                    : [`那下一步可能不是马上定答案，而是先找一个能把这份不确定缩小一点的事实。`, `如果现在还说不上来，也许可以继续看是什么地方让你一直停在这里。`, `再往前一点，这件事可能需要一个更具体的判断条件。`, `所以先不用把它说得很确定，看看什么变化会让你的想法跟着变。`, `这样至少能把“有点拿不准”继续往前推一点。`];
            const ideas = chinese ? chineseIdeas : [`If that is true, the next thing to work out is what would let “${topic}” actually happen.`, `Then the useful distinction may be whether “${topic}” gives real room to try things, or only more time on paper.`, `So the next step is probably to notice what would make this direction feel concrete rather than merely available.`, `That also makes the surrounding conditions matter: the same choice could create room or consume it.`, `Which means the value of this path may depend less on the label and more on how the time inside it is used.`];
            intents = ideas.slice(0, packet.maxCandidates).map(text => ({ type: 'surface_possibility' as const, text }));
        }
        else if (intent.kind === 'angle') {
            const step = Math.max(0, Math.min(4, Number(/Step (\d+)/.exec(intent.text)?.[1] ?? 1) - 1));
            const chineseIdeas = /HCI|就业|工作怎么样|工作不好找|不好就业/u.test(topic)
                ? [`也许真正要比较的不是 HCI 好不好找工作，而是你愿意用多窄的就业面换一个更想做的方向。`, `如果把 HCI 当成一组能力而不是岗位名字，你能去的工作也许不只写着 HCI。`, `也可以反过来看：先找你愿意做的工作内容，再看它是不是 HCI，而不是先决定标签。`, `如果就业面是主要顾虑，问题也许会变成哪些相邻方向还能保留你喜欢的那部分。`, `或许你真正想保住的不是 HCI 这个名字，而是它里面某种工作方式。`]
                : /写代码|代码/u.test(topic)
                    ? [`也许你排斥的不是代码本身，而是一天大部分时间都只和代码打交道。`, `如果按工作的日常内容而不是岗位名字选方向，可选范围可能会完全不一样。`, `也可以先找那些“代码是工具、不是主要产出”的工作，再看它们属于什么方向。`, `换个时间尺度看，你也许不需要永远避开代码，只是不想让它成为几年里的主线。`, `或许真正该比较的是不同工作的创作、沟通、研究和实现各占多少。`]
                    : /复杂|越做越/u.test(topic)
                        ? [`也许问题不是项目变复杂了，而是它还没有一个明确到足以拒绝新功能的核心。`, `如果把目标换成“先做出一个小但完整的版本”，很多现在重要的东西可能会自动降级。`, `也可能复杂度是在提醒你：现在塞在一个项目里的，其实已经是两个不同的问题。`, `从维护而不是功能的角度看，接下来最贵的可能不是少一个功能，而是每次修改都要碰很多地方。`, `如果把“能讲清楚它是什么”当作约束，哪些部分会显得多余？`]
                        : /探索|稳定方向|选个稳定/u.test(topic)
                            ? [`也许“稳定方向”不一定和探索相反，一个能持续积累的方向也可以留出试错空间。`, `如果把稳定理解成“不会因为一次试错就归零”，问题会和“尽快选定”很不一样。`, `也可以反过来问：真正不稳定的是暂时没选方向，还是太早押在一个不合适的方向上。`, `把单位从“选一个方向”换成“积累可迁移的能力”，探索和稳定可能不是同一条轴的两端。`, `或许你要的不是永远开放，而是到某个节点前保留几条路。`]
                            : [`也许真正稀缺的不是这个选择，而是一段“选错了也还来得及”的时间。`, `如果把为这件事放进去的时间和放弃的其他选择也算上，它看起来可能会完全不一样。`, `把时间拉到五年后看，重要的也许不是现在更稳，而是它会不会让后面的路更多。`, `也可能不用靠这条路，照样能满足你现在最在意的那部分需要。`, `或许你现在要找的不是一个确定答案，而是一种比较便宜地试出自己适不适合的办法。`];
            const ideas = chinese ? chineseIdeas : [`Maybe the choice itself is not the scarce thing; the scarce thing is a period where trying the wrong direction is still affordable.`, `If you count the time you give up rather than the credential you gain, “${topic}” may look like a different decision.`, `From a five-year view, the important part may be whether this opens more paths later, not whether it feels safer now.`, `What if the same need behind “${topic}” could be met without taking this path at all?`, `Maybe the real optimization is not certainty, but how cheaply you can learn what fits you.`];
            intents = [{ type: 'surface_possibility', text: ideas[step] }];
        }
        else if (intent.kind === 'question') {
            const chineseQuestions = /HCI|就业|工作怎么样|工作不好找|不好就业/u.test(topic)
                ? [`如果就业完全不是问题，你还会犹豫 HCI 吗？`, `你担心的是岗位少，还是担心喜欢的东西最后养不活自己？`, `你想找的工作日常里，HCI 哪一部分是你最不想放掉的？`, `什么样的就业信息会真的改变你对 HCI 的判断？`, `如果只能保留“喜欢 HCI”里的一个具体部分，会是哪一个？`]
                : /写代码|代码/u.test(topic)
                    ? [`如果一个岗位只有两三成时间写代码，你会觉得可以接受吗？`, `你不喜欢的是写代码本身，还是一直只做这件事？`, `最近哪次项目让你最明显地觉得“我不想一直这样做”？`, `如果代码只是把想法做出来的工具，你对它的感觉会不一样吗？`, `你希望每天更多时间花在什么事情上？`]
                    : /复杂|越做越/u.test(topic)
                        ? [`现在这些新增东西里，哪一块拿掉也不影响核心体验？`, `你觉得复杂是因为功能多，还是因为结构开始难改？`, `如果今天必须收尾，什么是你一定会留下的？`, `是哪一次改动之后，你开始明显觉得它变复杂了？`, `现在最拖慢你的，是功能数量还是它们之间的耦合？`]
                        : /读研/u.test(topic) && /三年|更多时间|探索/u.test(topic)
                            ? [`如果三年只算时间成本，不算学历收益，你还会觉得它值得吗？`, `你说的“更多时间探索”，具体想拿来试哪几件事？`, `如果读研以后还是主要跟着课程走，这三年对你的吸引力会少多少？`, `你更怕的是错过三年，还是太早把方向定死？`, `什么情况会让你觉得这三年真的没有被浪费？`]
                            : /读研/u.test(topic)
                                ? [`如果读研不会让就业更容易，你还会考虑它吗？`, `你现在犹豫的是想不想读，还是不知道读了以后能得到什么？`, `哪一条具体信息最可能让你从“不确定”变成更偏向一边？`, `如果今年必须决定，你最舍不得放掉的是什么？`, `你希望读研替你解决的到底是哪一个问题？`]
                                : /探索|稳定方向|选个稳定/u.test(topic)
                                    ? [`你说的“稳定”，具体是岗位多、收入稳，还是方向终于清楚？`, `如果探索有一个明确截止点，你还会觉得它和稳定冲突吗？`, `你现在最怕的是选错，还是一直没有开始积累？`, `什么证据会让你愿意把一个方向先试半年？`, `哪一种选择即使最后换方向，你也不会觉得前面的时间白花？`]
                                    : [`如果现实上的代价先拿掉，你还会对这件事犹豫吗？`, `你现在更拿不准的是自己想不想要，还是它可能要付出的代价？`, `你还缺哪条具体信息，才不会一直停在“有点担心”这里？`, `你现在更想保住以后还能换方向的余地，还是尽快定下一条路？`, `什么结果会让你觉得这次选择花的时间是值的？`];
            const questions = chinese ? chineseQuestions : [`If the practical downside disappeared, would “${topic}” still feel uncertain?`, `Which part are you actually unsure about here: whether you want it, or what it may cost you?`, `What would you need to know before this stops being a vague worry?`, `Are you trying to protect future options, or choose one direction now?`, `What outcome would make this choice feel worth its cost?`];
            intents = questions.slice(0, packet.maxCandidates).map(text => ({ type: 'surface_question' as const, text }));
        }
        else if (intent.kind === 'organize') {
            const fit = packet.scope.filter(thought => /HCI.*喜欢|喜欢.*HCI|不太喜欢.*写代码|不想.*写代码|一直写代码/u.test(thought.text)).map(thought => thought.id);
            const pressure = packet.scope.filter(thought => /就业|不好找工作|工作不好找|不好就业|三年|时间.*长|时间成本/u.test(thought.text)).map(thought => thought.id).filter(id => !fit.includes(id));
            const groups = chinese && fit.length >= 2 && pressure.length >= 2 ? [{ label: '想靠近 / 想避开的工作', thoughtIds: fit }, { label: '现实压力', thoughtIds: pressure }] : [];
            const relationA = groups.length ? fit[0] : null;
            const relationB = groups.length ? pressure[0] : null;
            const relations = relationA && relationB ? [{ a: relationA, b: relationB, kind: 'tension' as const, label: chinese ? '喜欢，但不敢完全押上去' : 'Interest meets practical risk' }] : [];
            intents = [{ type: 'surface_structure', groups, relations, note: groups.length ? '中间卡住的是：想继续探索，但又怕探索太贵。' : chinese ? '现在更像几个并行担心，还没有很稳定的分组。' : 'These look more like parallel concerns than a stable grouping so far.' }];
        }
        else if (intent.kind === 'diffuse') {
            const step = Math.max(0, Math.min(5, Number(/Step (\d+)/.exec(intent.text)?.[1] ?? 1) - 1));
            const ideas = [`Which part of "${topic}" is still an open question?`, 'What observation would make this seem less convincing?', 'Is there an assumption hiding inside the wording?', 'Where would this idea stop being useful?', 'Could a different situation reveal the same structure?', 'What could I notice next, without committing to a solution?'];
            intents = [{ type: 'surface_possibility', text: ideas[step] }];
        }
        else
            intents = [{ type: 'surface_possibility', text: t('What would count as evidence for "{topic}"?', { topic }) }, { type: 'surface_possibility', text: t('Could I keep the question open without losing the part that already matters?') }];
        return { intents: intents.slice(0, packet.maxCandidates), providerLabel: this.label, mock: true };
    }
    /** Demo output is authored, not model reasoning: no model to name and no depth control. */
    async capabilities(): Promise<ThinkingCapabilities> { return { ...UNKNOWN_CAPABILITIES, configured: true }; }
}
export class DisabledAIProvider implements AIProvider {
    readonly label = 'AI off';
    readonly mock = false;
    async structured(): Promise<StructuredResponse> { throw new Error('AI is off. Manual Field interactions still work. Choose Demo or your gateway in Settings.'); }
    async respond(): Promise<AIResponse> { throw new Error('AI is off. Manual Field interactions still work. Choose Demo or your gateway in Settings.'); }
    async capabilities(): Promise<ThinkingCapabilities> { return UNKNOWN_CAPABILITIES; }
}
