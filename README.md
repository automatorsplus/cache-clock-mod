# Cache Clock Mod for Claude Code

> Part of the **Automators+** library -- Claude Code skills and mods shared exclusively with the Automators+ community.

One live line above the prompt that tells you how long until your prompt cache goes cold, and what it costs
if it does.

Claude Code caches your conversation so each message doesn't pay to reread it. Leave a chat idle past the cache's
lifetime and your next message pays to write the whole conversation into the cache again. Cache Clock counts that
down so you can send something, compact or hand off first.

## What You Get

- **The countdown** -- minutes left on the cache: green, yellow under 15, red under 5
- **The re-cache price** -- what your next message would cost to rebuild the cache, at API list prices
- **Context, limits and session cost** -- context used, your five-hour and weekly limits, and the session cost at API prices
- **A warning** five minutes before the cache goes cold
- **Compact** -- one press to compact the chat
- **Handoff** -- one press and Claude writes a handoff note to `.claude/handoff.md` and pastes it in the chat, so a fresh session can pick up where this one left off
- **`/cache`** -- shows or hides the line

## Requirements

- Claude Code v2.1.287 or later in the terminal, or the Code tab of the Claude Desktop app on v2.1.286 or later. Enter `/status` to check your version
- Mods draw in the terminal and the Desktop app. The VS Code extension's chat panel runs them but doesn't show them

## Install

In your terminal:

```
claude plugin marketplace add automatorsplus/cache-clock-mod
claude plugin install cache-clock@cache-clock-mod
```

Or from inside a Claude Code session, in one line:

```
/plugin install cache-clock --marketplace automatorsplus/cache-clock-mod
```

Then start a new session, or run `/reload-plugins`. To turn it off later, open `/plugin`, go to the **Installed** tab and disable it.

## Try It

Start a session and send any message. The line appears above the prompt after Claude's first reply. Press
**Handoff** when you're done with a chat and paste the note into the next one.

## Settings

Claude Code asks for these when you install from `/plugin`. Change them any time in `/config`, or with
`/plugin configure cache-clock@cache-clock-mod`.

- **Cache lifetime (minutes)** -- 60 by default. Set 5 if your cache lasts five minutes. The re-cache price uses the matching cache write price
- **Handoff file** -- where Handoff saves the note, `.claude/handoff.md` by default

## How It Works

`hooks/register.tsx` restarts the clock each time Claude finishes a reply and reads context, limits and cost from
the session. Input prices per million tokens are at the top of the file: Opus $4, Sonnet $2, Haiku $1, Fable $10.

---

*Shared with the Automators+ community*
