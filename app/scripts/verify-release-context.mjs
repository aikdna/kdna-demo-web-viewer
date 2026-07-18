import fs from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const appRoot = path.resolve(path.dirname(scriptPath), '..')
const repoRoot = path.resolve(appRoot, '..')

export const EXPECTED_CHANGELOG_TITLE = '## 0.1.0 - 2026-07-18'

export function releaseContextErrors({
  eventAction,
  isDraft,
  isPrerelease,
  tag,
  version,
  changelog,
  head,
  tagCommit,
  headIsInOriginMain,
}) {
  const errors = []
  const headings = changelog.match(/^## .+$/gm) ?? []
  const versionHeadings = headings.filter((heading) => heading.startsWith(`## ${version} `))

  if (eventAction !== 'published') errors.push('release event must be published')
  if (isDraft !== 'false') errors.push('draft releases are not accepted')
  if (isPrerelease !== 'false') errors.push('prereleases are not accepted')
  if (tag !== version) errors.push(`release tag must exactly equal ${version}`)
  if (head !== tagCommit) errors.push('checked-out release tag does not resolve to HEAD')
  if (!headIsInOriginMain) errors.push('release commit must be an ancestor of authoritative origin/main')
  if (headings[0] !== EXPECTED_CHANGELOG_TITLE) {
    errors.push(`first CHANGELOG version heading must exactly equal ${EXPECTED_CHANGELOG_TITLE}`)
  }
  if (headings.filter((heading) => heading === EXPECTED_CHANGELOG_TITLE).length !== 1) {
    errors.push('exact release CHANGELOG heading must appear once')
  }
  if (versionHeadings.length !== 1) errors.push('release version must have exactly one CHANGELOG heading')

  return errors
}

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
  const changelog = fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8')
  const tag = process.env.RELEASE_TAG
  const head = git('rev-parse', 'HEAD')
  const tagCommit = git('rev-parse', `${tag}^{commit}`)
  const headIsInOriginMain = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', head, 'origin/main'],
    { cwd: repoRoot, stdio: 'ignore' },
  ).status === 0
  const errors = releaseContextErrors({
    eventAction: process.env.RELEASE_EVENT_ACTION,
    isDraft: process.env.RELEASE_IS_DRAFT,
    isPrerelease: process.env.RELEASE_IS_PRERELEASE,
    tag,
    version: manifest.version,
    changelog,
    head,
    tagCommit,
    headIsInOriginMain,
  })

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log(`Release context verified for ${tag} at ${head} on origin/main`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main()
