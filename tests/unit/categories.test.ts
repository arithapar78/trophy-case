// Phase 9 tests: the starter list, your own categories, the upgrade from the
// old fixed list, and the AI picking from your list.

import Dexie from 'dexie'
import { zipSync } from 'fflate'
import { beforeEach, describe, expect, it } from 'vitest'
import { askScout, buildSystemPrompt, parseScoutReply } from '../../server/scout'
import { buildPrompt, parseModelAnswer, readPhoto } from '../../server/photoRead'
import { createAchievement, listAchievements, ValidationError } from '../../src/lib/achievements'
import { buildBackup, deleteEverything, restoreBackup } from '../../src/lib/backup'
import {
  addCategory,
  categoriesInUse,
  CategoryError,
  countInCategory,
  deleteCategory,
  getCategories,
  getCustomCategories,
  renameCategory,
} from '../../src/lib/categories'
import { db, TrophyCaseDB } from '../../src/lib/db'
import { MAX_CUSTOM_CATEGORIES, STARTER_CATEGORIES } from '../../src/lib/types'
import {
  categoryListFromRequest,
  cleanCustomCategories,
  fullCategoryList,
  validateAchievement,
  validateCategoryName,
} from '../../src/lib/validation'

const today = '2026-09-23'
const win = { title: 'Won something', date: '2026-09-01' }

beforeEach(async () => {
  await deleteEverything()
})

describe('T9.1 the rules for a category', () => {
  it('starts everyone with a broad list, Other last', async () => {
    expect(STARTER_CATEGORIES).toEqual(['School', 'Sports', 'Arts', 'Community Service', 'Work', 'Clubs & Leadership', 'Awards', 'Other'])
    expect(await getCategories()).toEqual([...STARTER_CATEGORIES])
  })

  it('accepts starter and custom categories and refuses an unknown one', () => {
    const list = fullCategoryList(['Debate'])
    expect(validateAchievement({ ...win, category: 'Awards' }, 0, today, list).ok).toBe(true)
    expect(validateAchievement({ ...win, category: 'Debate' }, 0, today, list).ok).toBe(true)
    expect(validateAchievement({ ...win, category: 'Gaming' }, 0, today, list).ok).toBe(false)
    // Without the user's list, only the starter ones count.
    expect(validateAchievement({ ...win, category: 'Debate' }, 0, today).ok).toBe(false)
  })

  it('trims, squashes spaces, length-checks and refuses repeats ignoring capitals', () => {
    expect(validateCategoryName('  Model   UN ', [])).toEqual({ ok: true, value: 'Model UN' })
    expect(validateCategoryName('   ', []).ok).toBe(false)
    expect(validateCategoryName('x'.repeat(31), []).ok).toBe(false)
    expect(validateCategoryName('x'.repeat(30), []).ok).toBe(true)
    expect(validateCategoryName('debate', ['Debate']).ok).toBe(false)
    expect(validateCategoryName('SPORTS', [...STARTER_CATEGORIES]).ok).toBe(false)
    // "All" is the filter's own chip.
    expect(validateCategoryName('all', []).ok).toBe(false)
  })

  it('cleans a list that came from outside: bad names, repeats, starters and extras dropped', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Club ${i}`)
    expect(cleanCustomCategories(['Debate', 'debate', '', 5, 'Sports', 'x'.repeat(40), 'Chess'])).toEqual(['Debate', 'Chess'])
    expect(cleanCustomCategories(many)).toHaveLength(MAX_CUSTOM_CATEGORIES)
    expect(cleanCustomCategories('nope')).toEqual([])
  })
})

describe('your own categories', () => {
  it('adds one, and an achievement can then be saved into it', async () => {
    await addCategory(' Debate ')
    expect(await getCustomCategories()).toEqual(['Debate'])
    expect(await getCategories()).toEqual([...STARTER_CATEGORIES.slice(0, -1), 'Debate', 'Other'])
    const saved = await createAchievement({ ...win, category: 'Debate' })
    expect(saved.category).toBe('Debate')
  })

  it('refuses a category that is not on the list when saving', async () => {
    await expect(createAchievement({ ...win, category: 'Debate' })).rejects.toBeInstanceOf(ValidationError)
  })

  it('refuses a repeat and stops at the limit', async () => {
    await addCategory('Debate')
    await expect(addCategory('DEBATE')).rejects.toBeInstanceOf(CategoryError)
    for (let i = 1; i < MAX_CUSTOM_CATEGORIES; i++) await addCategory(`Club ${i}`)
    await expect(addCategory('One too many')).rejects.toThrow(`up to ${MAX_CUSTOM_CATEGORIES}`)
  })

  it('T9.3 renaming moves every achievement with it', async () => {
    await addCategory('Debate')
    await createAchievement({ ...win, title: 'A', category: 'Debate' })
    await createAchievement({ ...win, title: 'B', category: 'Debate' })
    await createAchievement({ ...win, title: 'C', category: 'Sports' })

    await renameCategory('Debate', 'Speech & Debate')
    expect(await getCustomCategories()).toEqual(['Speech & Debate'])
    expect((await listAchievements({ category: 'Speech & Debate' })).map((a) => a.title).sort()).toEqual(['A', 'B'])
    expect(await countInCategory('Debate')).toBe(0)
  })

  it('renaming can change only the capitals, but cannot copy another name', async () => {
    await addCategory('debate')
    await addCategory('Chess')
    await expect(renameCategory('debate', 'Debate')).resolves.toBe('Debate')
    await expect(renameCategory('Debate', 'chess')).rejects.toBeInstanceOf(CategoryError)
  })

  it('T9.3 deleting moves its achievements to Other and deletes nothing else', async () => {
    await addCategory('Debate')
    await createAchievement({ ...win, title: 'A', category: 'Debate' })
    await createAchievement({ ...win, title: 'B', category: 'Debate' })

    expect(await deleteCategory('Debate')).toBe(2)
    expect(await getCustomCategories()).toEqual([])
    expect((await listAchievements({ category: 'Other' })).map((a) => a.title).sort()).toEqual(['A', 'B'])
  })

  it('never renames or deletes a starter category', async () => {
    await expect(renameCategory('Sports', 'Athletics')).rejects.toBeInstanceOf(CategoryError)
    await expect(deleteCategory('Other')).rejects.toBeInstanceOf(CategoryError)
  })

  it('the filter shows only categories that have something in them, in picker order', async () => {
    await addCategory('Debate')
    await createAchievement({ ...win, category: 'Debate' })
    await createAchievement({ ...win, category: 'Other' })
    await createAchievement({ ...win, category: 'School' })
    expect(await categoriesInUse()).toEqual(['School', 'Debate', 'Other'])
  })
})

describe('T9.2 the upgrade from the old fixed list', () => {
  it('turns Debate and Cooking into your own categories and changes no achievement', async () => {
    const name = `upgrade-${Math.random().toString(36).slice(2)}`

    // A phone still on version 3, with the old categories in use.
    const old = new Dexie(name)
    old.version(3).stores({
      achievements: 'id, date, category, createdAt',
      photos: 'id, achievementId, [achievementId+order]',
      rankings: 'achievementId',
      settings: 'key',
      scoutMessages: 'id, at',
    })
    const row = { date: '2026-01-01', note: '', organisation: '', role: '', result: '', createdAt: 1, updatedAt: 1 }
    await old.table('achievements').bulkAdd([
      { ...row, id: '1', title: 'Debate final', category: 'Debate' },
      { ...row, id: '2', title: 'Bake sale', category: 'Cooking' },
      { ...row, id: '3', title: 'MVP', category: 'Sports' },
    ])
    old.close()

    // Opening it with today's app runs the upgrade.
    const upgraded = new TrophyCaseDB(name)
    const custom = await upgraded.settings.get('customCategories')
    expect(custom?.value).toEqual(['Cooking', 'Debate'])
    const categories = (await upgraded.achievements.toArray()).map((a) => [a.title, a.category])
    expect(categories).toEqual([
      ['Debate final', 'Debate'],
      ['Bake sale', 'Cooking'],
      ['MVP', 'Sports'],
    ])
    upgraded.close()
    await Dexie.delete(name)
  })
})

describe('T9.4 the AI picks from your list', () => {
  const list = fullCategoryList(['Debate'])

  it('the photo-read prompt lists your categories', () => {
    const prompt = buildPrompt(list)
    expect(prompt).toContain('Debate')
    expect(prompt).toContain('Community Service')
  })

  it('a photo-read answer naming a category not on the list falls back to Other', () => {
    expect(parseModelAnswer('{"title":"x","category":"Debate","date":null,"note":""}', today, list).category).toBe('Debate')
    expect(parseModelAnswer('{"title":"x","category":"Debate","date":null,"note":""}', today).category).toBe('Other')
    expect(parseModelAnswer('{"title":"x","category":"Gaming","date":null,"note":""}', today, list).category).toBe('Other')
  })

  it('the photo read sends the list the phone gave it to the model', async () => {
    let seen = ''
    const result = await readPhoto(
      { imageBase64: 'abc', today, categories: list },
      {
        apiKey: 'test',
        callModel: async (_image, prompt) => {
          seen = prompt
          return '{"title":"Debate final","category":"Debate","date":null,"note":""}'
        },
      },
    )
    expect(seen).toContain('Debate')
    expect(result.ok && result.draft.category).toBe('Debate')
  })

  it('a list from the phone is checked before it reaches the prompt', () => {
    expect(categoryListFromRequest(undefined)).toEqual([...STARTER_CATEGORIES])
    expect(categoryListFromRequest([...list, 'x'.repeat(200), 7])).toEqual(list)
  })

  it("Scout's prompt lists your categories and its offers use them", async () => {
    const request = { message: 'hi', goal: '', achievements: [], history: [], today, categories: list }
    expect(buildSystemPrompt(request)).toContain('Debate')
    const answer = 'Nice.<save>{"title":"Debate final","category":"Debate","date":"2026-05-01"}</save>'
    expect(parseScoutReply(answer, today, list).proposed?.category).toBe('Debate')
    expect(parseScoutReply(answer, today).proposed?.category).toBe('Other')

    const result = await askScout(request, { apiKey: 'test', callChat: async () => answer })
    expect(result.ok && result.proposed?.category).toBe('Debate')
  })
})

describe('T9.6 backups carry your categories', () => {
  it('a backup with a custom category restores it on a fresh device', async () => {
    await addCategory('Debate')
    await addCategory('Empty one')
    await createAchievement({ ...win, category: 'Debate' })
    const zip = await buildBackup()

    await deleteEverything()
    expect(await getCustomCategories()).toEqual([])

    await restoreBackup(zip)
    expect(await getCustomCategories()).toEqual(['Debate', 'Empty one'])
    expect((await db.achievements.toArray())[0].category).toBe('Debate')
  })

  it('an old backup with Debate and Cooking brings them in as your own', async () => {
    const achievement = { id: 'x1', title: 'Bake sale', date: '2026-01-01', category: 'Cooking', createdAt: 1, updatedAt: 1 }
    const manifest = { app: 'trophy-case', format: 2, exportedAt: 'x', achievements: [achievement], photos: [] }
    const zip = new Blob([zipSync({ 'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)) }) as BlobPart])
    await restoreBackup(zip)
    expect(await getCustomCategories()).toEqual(['Cooking'])
    expect((await db.achievements.get('x1'))?.category).toBe('Cooking')
  })

  it('if a category cannot be added, its achievements land in Other instead of being lost', async () => {
    for (let i = 0; i < MAX_CUSTOM_CATEGORIES; i++) await addCategory(`Club ${i}`)
    const achievement = { id: 'x2', title: 'Chess final', date: '2026-01-01', category: 'Chess', createdAt: 1, updatedAt: 1 }
    const manifest = { app: 'trophy-case', format: 3, exportedAt: 'x', achievements: [achievement], photos: [], customCategories: ['Chess'] }
    const zip = new Blob([zipSync({ 'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)) }) as BlobPart])
    await restoreBackup(zip)
    expect((await db.achievements.get('x2'))?.category).toBe('Other')
  })
})
