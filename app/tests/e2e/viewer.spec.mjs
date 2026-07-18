import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const PUBLIC_ASSET = process.env.KDNA_DEMO_ASSET
const PROTECTED_ASSET = process.env.KDNA_PROTECTED_DEMO_ASSET
const PROTECTED_ASSET_SHA256 = 'c4486ceacc08d29af2ecdbe6c02818f78b62722592be687f7f0da23130bbe188'
const PROTECTED_TEST_VECTOR_PASSWORD = 'KDNA-TEST-VECTOR-2026'

function requiredAsset(configuredPath, environmentName) {
  if (!configuredPath) throw new Error(`${environmentName} must point to its pinned public test asset`)
  const assetPath = path.resolve(configuredPath)
  if (!fs.existsSync(assetPath)) throw new Error(`${environmentName} does not exist`)
  return assetPath
}

function waitForRoute(page, route) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === 'POST' && url.pathname === `/api/kdna/${route}`
  })
}

function pageErrorCollector(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('a real public asset crosses inspect, LoadPlan, and load', async ({ page, request }) => {
  const assetPath = requiredAsset(PUBLIC_ASSET, 'KDNA_DEMO_ASSET')
  const pageErrors = pageErrorCollector(page)

  const health = await request.get('/api/kdna/health')
  expect(health.status()).toBe(200)

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('judgment asset')

  const inspectPromise = waitForRoute(page, 'inspect')
  const planPromise = waitForRoute(page, 'plan-load')
  const loadPromise = waitForRoute(page, 'load')
  await page.getByLabel('Choose a KDNA file').setInputFiles(assetPath)
  const [inspectResponse, planResponse, loadResponse] = await Promise.all([
    inspectPromise,
    planPromise,
    loadPromise,
  ])
  expect(inspectResponse.status()).toBe(200)
  expect(planResponse.status()).toBe(200)
  expect(loadResponse.status()).toBe(200)
  expect((await loadResponse.json()).capsule.type).toBe('kdna.runtime-capsule')

  await expect(page.getByTestId('asset-inspector')).toContainText('Laozi-Inspired Wuwei Judgment')
  await expect(page.getByTestId('load-status')).toHaveText('Runtime context loaded')

  const serialized = await page.getByTestId('runtime-context').textContent()
  const context = JSON.parse(serialized)
  expect(context.highest_question).toContain('minimum responsible intervention')
  expect(Array.isArray(context.axioms)).toBe(true)
  expect(context.axioms.length).toBeGreaterThan(0)
  expect(pageErrors).toEqual([])
})

test('the pinned Core password vector stays locked until browser unlock', async ({ page }) => {
  const assetPath = requiredAsset(PROTECTED_ASSET, 'KDNA_PROTECTED_DEMO_ASSET')
  const assetDigest = createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex')
  expect(assetDigest).toBe(PROTECTED_ASSET_SHA256)
  const pageErrors = pageErrorCollector(page)

  await page.goto('/')
  const inspectPromise = waitForRoute(page, 'inspect')
  const planPromise = waitForRoute(page, 'plan-load')
  await page.getByLabel('Choose a KDNA file').setInputFiles(assetPath)
  const [inspectResponse, planResponse] = await Promise.all([inspectPromise, planPromise])
  expect(inspectResponse.status()).toBe(200)
  expect(planResponse.status()).toBe(200)

  const inspect = await inspectResponse.json()
  const plan = await planResponse.json()
  expect(inspect.encrypted).toBe(true)
  expect(plan.plan.state).toBe('needs_password')
  expect(plan.plan.required_action).toBe('enter_password')
  await expect(page.getByTestId('asset-inspector')).toContainText('Password Envelope Interoperability Fixture')
  await expect(page.getByRole('dialog')).toContainText('Unlock asset')

  await page.getByLabel('Password').fill(PROTECTED_TEST_VECTOR_PASSWORD)
  const loadPromise = waitForRoute(page, 'load')
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  const loadResponse = await loadPromise
  expect(loadResponse.status()).toBe(200)
  const loaded = await loadResponse.json()
  expect(loaded.capsule.type).toBe('kdna.runtime-capsule')
  expect(loaded.capsule.asset.asset_id).toBe('kdna:fixture:password-envelope')
  expect(loaded.capsule.access).toBe('licensed')

  await expect(page.getByTestId('load-status')).toHaveText('Runtime context loaded')
  const context = JSON.parse(await page.getByTestId('runtime-context').textContent())
  expect(context.highest_question).toBe('Can the same protected judgment be recovered across implementations?')
  expect(pageErrors).toEqual([])
})
