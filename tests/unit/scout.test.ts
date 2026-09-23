// Phase 7 tests: the open ceiling, the Pro switch, and Scout.
//
// All of it runs against fakes, so no API key, no Stripe and no network.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockBillingAllowed, proEnabled } from '../../server/billing'
import {
  askScout,
  attachmentProblem,
  buildSystemPrompt,
  buildTurns,
  checkScoutRequest,
  MODEL,
  parseScoutReply,
  SCOUT_NAME,
  type CallChat,
} from '../../server/scout'
import { OPEN_CEILING, USES_PER_WINDOW } from '../../server/usage'
import { fullCategoryList } from '../../src/lib/validation'
import {
  MAX_ATTACHMENT_BASE64_LENGTH,
  SCOUT_HISTORY_TURNS,
  type ScoutRequest,
} from '../../src/lib/aiTypes'
import { checkAttachmentFile, toHistory } from '../../src/lib/scout'
import type { ScoutMessage } from '../../src/lib/types'

const TODAY = '2026-09-22'

function request(over: Partial<ScoutRequest> = {}): ScoutRequest {
  return {
    message: 'What should I put first?',
    goal: 'get into a good engineering school',
    achievements: [
      {
        id: 'a1',
        title: 'Won the county science fair',
        category: 'School',
        date: '2026-03-04',
        note: 'Built a water filter',
        organisation: 'Arlington High',
        role: 'lead',
        result: '1st place',
      },
    ],
    history: [],
    today: TODAY,
    ...over,
  }
}

afterEach(() => {
  delete process.env.ENABLE_PRO
  delete process.env.VERCEL_ENV
})

describe('T7.1 nothing to count', () => {
  it('gives every account the same ceiling', () => {
    expect(USES_PER_WINDOW.free).toBe(OPEN_CEILING)
    expect(USES_PER_WINDOW.pro).toBe(OPEN_CEILING)
  })

  it('sets that ceiling far above anything a person does in five hours', () => {
    // A real sitting is a dozen AI actions at the outside. This is a circuit
    // breaker against a script, not a product limit, and if anyone ever
    // lowers it to something a student would hit, this fails.
    expect(OPEN_CEILING).toBeGreaterThanOrEqual(100)
  })
})

describe('T7.2 the Pro switch', () => {
  it('is off unless the server is told otherwise', () => {
    expect(proEnabled()).toBe(false)
    expect(mockBillingAllowed()).toBe(false)
  })

  it('comes back on with ENABLE_PRO, and the pretend upgrade with it', () => {
    process.env.ENABLE_PRO = '1'
    expect(proEnabled()).toBe(true)
    expect(mockBillingAllowed()).toBe(true)
  })

  it('never allows the pretend upgrade on the live site, even switched on', () => {
    process.env.ENABLE_PRO = '1'
    process.env.VERCEL_ENV = 'production'
    expect(mockBillingAllowed()).toBe(false)
  })
})

describe('T7.3 what Scout is told', () => {
  it('uses Claude Haiku and nothing else', () => {
    expect(MODEL).toBe('claude-haiku-4-5')
  })

  it('puts the goal and every achievement in the prompt', () => {
    const prompt = buildSystemPrompt(request())
    expect(prompt).toContain('get into a good engineering school')
    expect(prompt).toContain('Won the county science fair')
    expect(prompt).toContain('1st place')
    expect(prompt).toContain('Arlington High')
    expect(prompt).toContain(TODAY)
    expect(prompt).toContain(SCOUT_NAME)
  })

  it('says to stay on subject and never to claim it saved anything', () => {
    const prompt = buildSystemPrompt(request())
    expect(prompt).toMatch(/not what you are for/i)
    expect(prompt).toMatch(/never pretend you have saved/i)
  })

  it('handles an empty timeline and a missing goal without pretending otherwise', () => {
    const prompt = buildSystemPrompt(request({ goal: '', achievements: [] }))
    expect(prompt).toMatch(/timeline is empty/i)
    expect(prompt).toMatch(/not set a goal/i)
  })

  it('sends no picture of a saved achievement, only an attached file', () => {
    const plain = buildTurns(request())
    expect(plain.flatMap((t) => t.content).every((b) => b.type === 'text')).toBe(true)

    const withImage = buildTurns(request({ attachment: { kind: 'image', name: 'cert.jpg', data: 'AAAA', mediaType: 'image/jpeg' } }))
    const blocks = withImage[withImage.length - 1].content
    expect(blocks[0]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg', data: 'AAAA' } })
  })

  it('sends a PDF as a document, and a text file as words', () => {
    const pdf = buildTurns(request({ attachment: { kind: 'pdf', name: 'transcript.pdf', data: 'JVBER' } }))
    expect(pdf[pdf.length - 1].content[0]).toMatchObject({ type: 'document', source: { media_type: 'application/pdf' } })

    const text = buildTurns(request({ attachment: { kind: 'text', name: 'notes.txt', data: 'chess club captain' } }))
    expect(text[text.length - 1].content[0].text).toContain('chess club captain')
  })

  it('carries only the recent part of a long conversation', () => {
    const history = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? ('scout' as const) : ('user' as const), text: `turn ${i}` }))
    const turns = buildTurns(request({ history }))
    // The recent turns plus the message being sent now.
    expect(turns).toHaveLength(SCOUT_HISTORY_TURNS + 1)
    expect(turns[0].content[0].text).toBe('turn 28')
  })

  it('trims the saved conversation the same way, dropping failed messages', () => {
    const saved: ScoutMessage[] = [
      { id: '1', role: 'user', text: 'kept', at: 1 },
      { id: '2', role: 'user', text: 'lost in the post', at: 2, failed: true },
      { id: '3', role: 'scout', text: 'also kept', at: 3 },
    ]
    expect(toHistory(saved)).toEqual([
      { role: 'user', text: 'kept' },
      { role: 'scout', text: 'also kept' },
    ])
  })
})

describe('T7.4 reading Scout back', () => {
  it('answers in MOCK mode with no key, and says so', async () => {
    const result = await askScout(request())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mock).toBe(true)
    expect(result.reply).toContain('MOCK')
    expect(result.reply).toContain('Won the county science fair')
  })

  it('refuses a message it cannot read', async () => {
    expect((await askScout({ message: '' })).ok).toBe(false)
    expect((await askScout({ ...request(), message: 'x'.repeat(5000) })).ok).toBe(false)
    expect((await askScout({ ...request(), history: [{ role: 'nobody', text: 'hi' }] })).ok).toBe(false)
    expect(checkScoutRequest(request())).toBe(true)
  })

  it('accepts an empty message when a file is doing the talking', () => {
    expect(checkScoutRequest(request({ message: '' }))).toBe(false)
    expect(
      checkScoutRequest(request({ message: '', attachment: { kind: 'text', name: 'a.txt', data: 'hi' } })),
    ).toBe(true)
  })

  it('splits a reply into the words shown and the achievement offered', () => {
    const answer = `Lead with the science fair.

<save>
{"title":"Debate regional final","category":"Debate","date":"2026-05-01","note":"Reached the final","organisation":"Arlington High","role":"speaker","result":"finalist"}
</save>`
    // Phase 9: Debate is one of this user's own categories.
    const parsed = parseScoutReply(answer, TODAY, fullCategoryList(['Debate']))
    expect(parsed.reply).toBe('Lead with the science fair.')
    expect(parsed.reply).not.toContain('<save>')
    expect(parsed.proposed).toMatchObject({ title: 'Debate regional final', category: 'Debate', result: 'finalist' })
  })

  it('drops a broken offer rather than showing a broken card', () => {
    const cases = [
      'Text only, no block.',
      'Hi <save>{not json}</save>',
      'Hi <save>{"title":"","category":"Debate","date":"2026-05-01"}</save>',
      'Hi <save>{"title":"X","category":"Debate","date":"not-a-date"}</save>',
      'Hi <save>{"title":"X","category":"Debate","date":"2026-05-01"}',
    ]
    for (const text of cases) {
      const parsed = parseScoutReply(text, TODAY)
      expect(parsed.proposed).toBeUndefined()
      expect(parsed.reply).not.toContain('<save>')
    }
  })

  it('turns a category not on the list into Other rather than dropping the offer (Phase 9)', () => {
    const parsed = parseScoutReply('Hi <save>{"title":"X","category":"Nonsense","date":"2026-05-01"}</save>', TODAY)
    expect(parsed.proposed?.category).toBe('Other')
  })

  it('refuses an offer dated in the future, the same rule the form uses', () => {
    const answer = `Nice.<save>{"title":"X","category":"Debate","date":"2027-01-01","note":"","organisation":"","role":"","result":""}</save>`
    expect(parseScoutReply(answer, TODAY).proposed).toBeUndefined()
  })

  it('passes the model answer straight through when there is a key', async () => {
    const callChat: CallChat = async (system, turns) => {
      expect(system).toContain('engineering school')
      expect(turns[turns.length - 1].content.at(-1)?.text).toContain('What should I put first?')
      return 'Lead with the science fair.'
    }
    const result = await askScout(request(), { apiKey: 'sk-test', callChat })
    expect(result).toMatchObject({ ok: true, reply: 'Lead with the science fair.', mock: false })
  })

  it('turns a model failure into something a 14-year-old can read', async () => {
    const callChat: CallChat = async () => {
      throw new Error('502 upstream')
    }
    const result = await askScout(request(), { apiKey: 'sk-test', callChat })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).not.toContain('502')
    expect(result.message).toMatch(/try again/i)
  })
})

describe('T7.5 which files Scout takes', () => {
  it('accepts pictures, PDFs and plain text', () => {
    expect(checkAttachmentFile({ type: 'image/jpeg', size: 9_000_000, name: 'a.jpg' }).ok).toBe(true)
    expect(checkAttachmentFile({ type: 'application/pdf', size: 900_000, name: 'transcript.pdf' }).ok).toBe(true)
    expect(checkAttachmentFile({ type: 'text/plain', size: 500, name: 'notes.txt' }).ok).toBe(true)
    // Some phones send an empty type and only the name tells you.
    expect(checkAttachmentFile({ type: '', size: 500, name: 'notes.md' }).ok).toBe(true)
  })

  it('refuses anything else, and says what it does take', () => {
    const refused = checkAttachmentFile({ type: 'application/zip', size: 500, name: 'stuff.zip' })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.message).toMatch(/pictures, PDFs and plain text/i)
  })

  it('refuses a file too big to send, but not a big picture, which gets shrunk', () => {
    expect(checkAttachmentFile({ type: 'application/pdf', size: 20_000_000, name: 'big.pdf' }).ok).toBe(false)
    expect(checkAttachmentFile({ type: 'image/jpeg', size: 20_000_000, name: 'big.jpg' }).ok).toBe(true)
  })

  it('checks again on the server, in case the app is old or bypassed', () => {
    expect(attachmentProblem(undefined)).toBeUndefined()
    expect(attachmentProblem({ kind: 'image', name: 'a.jpg', data: 'AAAA', mediaType: 'image/jpeg' })).toBeUndefined()
    expect(attachmentProblem({ kind: 'image', name: 'a.tif', data: 'AAAA', mediaType: 'image/tiff' })).toMatch(/JPG, PNG/i)
    expect(attachmentProblem({ kind: 'pdf', name: 'a.pdf', data: '' })).toMatch(/empty/i)
    expect(
      attachmentProblem({ kind: 'pdf', name: 'a.pdf', data: 'A'.repeat(MAX_ATTACHMENT_BASE64_LENGTH + 1) }),
    ).toMatch(/too big/i)
  })

  it('refuses an oversized attachment before the model is ever called', async () => {
    let called = false
    const callChat: CallChat = async () => {
      called = true
      return 'should not happen'
    }
    const result = await askScout(
      request({ attachment: { kind: 'pdf', name: 'big.pdf', data: 'A'.repeat(MAX_ATTACHMENT_BASE64_LENGTH + 1) } }),
      { apiKey: 'sk-test', callChat },
    )
    expect(result.ok).toBe(false)
    expect(called).toBe(false)
  })
})

describe('the offer survives leaving the tab', () => {
  it('finds the newest unanswered offer, and nothing once it is answered', async () => {
    const { pendingProposal } = await import('../../src/lib/scout')
    const offer = {
      title: 'Debate final',
      category: 'Debate' as const,
      date: '2026-05-01',
      note: '',
      organisation: '',
      role: '',
      result: '',
    }

    expect(pendingProposal([])).toBeUndefined()
    expect(pendingProposal([{ id: '1', role: 'scout', text: 'hi', at: 1 }])).toBeUndefined()

    const waiting: ScoutMessage[] = [
      { id: '1', role: 'user', text: 'here', at: 1 },
      { id: '2', role: 'scout', text: 'found one', at: 2, proposed: offer },
    ]
    expect(pendingProposal(waiting)?.id).toBe('2')

    const answered: ScoutMessage[] = [{ ...waiting[0] }, { ...waiting[1], proposedResolved: true }]
    expect(pendingProposal(answered)).toBeUndefined()
  })

  it('does not re-offer an older one after the conversation moved on', async () => {
    const { pendingProposal } = await import('../../src/lib/scout')
    const offer = { title: 'A', category: 'Other' as const, date: '2026-01-01', note: '', organisation: '', role: '', result: '' }
    const messages: ScoutMessage[] = [
      { id: '1', role: 'scout', text: 'old offer', at: 1, proposed: offer },
      { id: '2', role: 'scout', text: 'newer offer', at: 2, proposed: offer, proposedResolved: true },
    ]
    expect(pendingProposal(messages)).toBeUndefined()
  })
})
