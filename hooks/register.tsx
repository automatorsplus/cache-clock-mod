import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const lastTurnAt = atom({ plugin: 'cache-clock', key: 'lastTurnAt' } as const, null)
const warned = atom({ plugin: 'cache-clock', key: 'warned' } as const, false)
const tick = atom({ plugin: 'cache-clock', key: 'tick' } as const, 0)
const hidden = atom({ plugin: 'cache-clock', key: 'hidden' } as const, false)

// Input price per million tokens, API list prices.
const PRICES: [string, number][] = [
  ['opus', 4],
  ['sonnet', 2],
  ['haiku', 1],
  ['fable', 10],
]

const priceFor = (model: string) => {
  const name = model.toLowerCase()
  const hit = PRICES.find(([key]) => name.includes(key))
  return hit ? hit[1] : null
}

async function minutesLeft($: EngineInterface, cacheMinutes: number) {
  const at = await read($, lastTurnAt)
  if (at === null) return null
  const elapsed = ((await $.clock.now()) - at) / 60000
  return Math.max(0, cacheMinutes - elapsed)
}

const handoffPrompt = (file: string) =>
  [
    `Write a handoff note for this session and save it to ${file}, overwriting whatever is there.`,
    'A fresh session will start from this note alone, so it must stand on its own. Cover, in short bullets:',
    '- The goal: what we are working on and why',
    '- Where it got to: what is done and verified, with file paths',
    '- Decisions made, and anything ruled out',
    '- What is next, in order, and any open question for me',
    '- Files and commands the next session needs first',
    'Keep it under 40 lines. Then paste the note here and tell me the path.',
  ].join('\n')

const fmtTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const register: Register = (on, options) => {
  const cacheMinutes = Number(options.cacheMinutes ?? 60) || 60
  const handoffFile = String(options.handoffFile || '.claude/handoff.md')
  const writeMultiplier = cacheMinutes === 5 ? 1.25 : 2

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cache', description: 'Show or hide the cache clock line above the prompt' })
    $.clock.every(30000, async () => {
      const left = await minutesLeft($, cacheMinutes)
      if (left !== null && left <= 5 && left > 0 && !(await read($, warned))) {
        await update($, warned, () => true)
        $.ui.toast('Cache goes cold in 5 min. Send something, compact or hand off.')
      }
      await update($, tick, n => n + 1)
    })
    return next(e)
  })

  on('command.run', { command: 'cache' }, async $ => {
    const isHidden = !(await read($, hidden))
    await update($, hidden, () => isHidden)
    if (isHidden) return { text: 'Cache clock hidden. Type /cache to show it again.' }
    const shown = (await read($, lastTurnAt)) !== null
    return { text: shown ? 'Cache clock shown.' : 'Cache clock on. It appears after your first reply.' }
  })

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, lastTurnAt, () => now)
    await update($, warned, () => false)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await read($, tick)
    const left = await minutesLeft($, cacheMinutes)
    if (e.props.hasSurvey || left === null || (await read($, hidden))) return next(e)

    const usage = await $.session.usage()
    const model = await $.session.model()
    const price = priceFor(model)
    const tokens = usage.context.tokens ?? 0

    const mins = Math.ceil(left)
    const colour = left > 15 ? 'green' : left >= 5 ? 'yellow' : 'red'
    const recache =
      price === null ? '?' : `$${((tokens * price * writeMultiplier) / 1e6).toFixed(2)}`

    const limit = (kind: string) => {
      const r = usage.rateLimits.find(l => l.kind === kind)
      return r ? `${Math.round(r.percentUsed)}%` : '-'
    }
    const cost = usage.cost ? `$${usage.cost.usd.toFixed(2)}` : '-'
    const pct = usage.context.percent ?? Math.round((tokens / usage.context.window) * 100)

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box width="100%">
        <Box flexGrow={1}>
        <Text dimColor>Cache </Text>
        <Text color={colour} bold>
          {left <= 0 ? 'cold' : `${mins}m`}
        </Text>
        <Text dimColor>
          {' '}· re-cache {recache} · Context {fmtTokens(tokens)} ({pct}%) · 5h {limit('five_hour')} · 7d{' '}
          {limit('seven_day')} · Session {cost} (API prices){' '}
        </Text>
        </Box>
        <Box marginLeft={3} columnGap={1}>
          <Button key="compact" label="Compact" onPress={() => $.session.compact()} />
          <Button
            key="handoff"
            label="Handoff"
            onPress={() => $.prompt.submit({ text: handoffPrompt(handoffFile), asUser: true })}
          />
        </Box>
      </Box>
    )
  })
}
