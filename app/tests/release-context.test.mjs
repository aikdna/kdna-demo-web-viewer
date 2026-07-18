import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_CHANGELOG_TITLE,
  releaseContextErrors,
} from '../scripts/verify-release-context.mjs'

const valid = {
  eventAction: 'published',
  isDraft: 'false',
  isPrerelease: 'false',
  tag: '0.1.0',
  version: '0.1.0',
  changelog: `# Changelog\n\n${EXPECTED_CHANGELOG_TITLE}\n\n- Verified.\n`,
  head: 'a'.repeat(40),
  tagCommit: 'a'.repeat(40),
  headIsInOriginMain: true,
}

test('release context accepts the exact stable mainline contract', () => {
  assert.deepEqual(releaseContextErrors(valid), [])
})

for (const hostile of [
  {
    name: 'a tag that does not resolve to HEAD',
    change: { tagCommit: 'b'.repeat(40) },
    message: /does not resolve to HEAD/,
  },
  {
    name: 'a release commit outside origin main',
    change: { headIsInOriginMain: false },
    message: /ancestor of authoritative origin\/main/,
  },
  {
    name: 'a different first version heading',
    change: { changelog: `# Changelog\n\n## 0.0.9 - 2026-07-17\n\n${EXPECTED_CHANGELOG_TITLE}\n` },
    message: /first CHANGELOG version heading/,
  },
  {
    name: 'a duplicated exact release heading',
    change: { changelog: `# Changelog\n\n${EXPECTED_CHANGELOG_TITLE}\n\n${EXPECTED_CHANGELOG_TITLE}\n` },
    message: /heading must appear once/,
  },
  {
    name: 'a second heading for the same version',
    change: { changelog: `# Changelog\n\n${EXPECTED_CHANGELOG_TITLE}\n\n## 0.1.0 - 2026-07-19\n` },
    message: /exactly one CHANGELOG heading/,
  },
  {
    name: 'a mismatched release tag',
    change: { tag: 'v0.1.0' },
    message: /tag must exactly equal/,
  },
  {
    name: 'a prerelease event',
    change: { isPrerelease: 'true' },
    message: /prereleases are not accepted/,
  },
]) {
  test(`release context rejects ${hostile.name}`, () => {
    assert.match(releaseContextErrors({ ...valid, ...hostile.change }).join('; '), hostile.message)
  })
}
