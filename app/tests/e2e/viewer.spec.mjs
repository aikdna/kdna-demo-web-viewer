import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const configuredAsset = process.env.KDNA_DEMO_ASSET

test('a real public asset crosses inspect, LoadPlan, and load', async ({ page, request }) => {
  if (!configuredAsset) throw new Error('KDNA_DEMO_ASSET must point to the public 0.1.1 reference asset')
  const assetPath = path.resolve(configuredAsset)
  if (!fs.existsSync(assetPath)) throw new Error('KDNA_DEMO_ASSET does not exist')

  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const health = await request.get('/api/kdna/health')
  expect(health.status()).toBe(200)

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('judgment asset')

  await page.getByLabel('Choose a KDNA file').setInputFiles(assetPath)
  await expect(page.getByTestId('asset-inspector')).toContainText('Laozi-Inspired Wuwei Judgment')
  await expect(page.getByTestId('load-status')).toHaveText('Runtime context loaded')

  const serialized = await page.getByTestId('runtime-context').textContent()
  const context = JSON.parse(serialized)
  expect(context.highest_question).toContain('minimum responsible intervention')
  expect(Array.isArray(context.axioms)).toBe(true)
  expect(context.axioms.length).toBeGreaterThan(0)
  expect(pageErrors).toEqual([])
})
