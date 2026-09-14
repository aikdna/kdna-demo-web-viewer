import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const value = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const port = Number(value('--port', process.env.KDNA_DEMO_PORT ?? 3210))
const hostPort = Number(value('--host-port', process.env.KDNA_DEMO_HOST_PORT ?? port + 1))
if (![port,hostPort].every(n => Number.isInteger(n) && n >= 1024 && n <= 65535) || port === hostPort) throw new Error('DEMO_PORT_INVALID')
const keys = ['PATH','HOME','TMPDIR','LANG','LC_ALL','NODE_DISABLE_COMPILE_CACHE','npm_config_cache','KDNA_DEMO_POLICY','KDNA_DEMO_DELAY_MS']
const env = Object.fromEntries(keys.filter(k => process.env[k] !== undefined).map(k => [k,process.env[k]]))
Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', KDNA_DEMO_INTERNAL_TOKEN: randomBytes(32).toString('hex'),
  KDNA_DEMO_ORIGIN: 'http://127.0.0.1:' + port, KDNA_DEMO_HOST_PORT: String(hostPort), KDNA_DEMO_HOST_URL: 'http://127.0.0.1:' + hostPort })
const children = []; let stopping = false
async function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  await Promise.all(children.map(async child => {
    for (let i=0;i<30 && child.exitCode===null && child.signalCode===null;i++) await delay(100)
    if (child.exitCode===null && child.signalCode===null) { child.kill('SIGKILL'); await new Promise(resolve => child.once('exit',resolve)) }
  }))
  console.log(JSON.stringify({ event: 'demo-closed', pid: process.pid, ports: [port,hostPort], children: children.map(c => ({ pid:c.pid,exitCode:c.exitCode,signal:c.signalCode })) }))
  process.exit(code)
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop())
function launch(argv, cwd) {
  const child = spawn(process.execPath, ['--unhandled-rejections=strict', ...argv], { cwd, env, stdio: 'inherit' })
  children.push(child)
  child.once('error', () => stop(1)); child.once('exit', () => { if (!stopping) stop(1) })
  return child
}
async function waitFor(url) {
  for (let i=0;i<600&&!stopping;i++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(500) }); await response.arrayBuffer(); if (response.ok) return } catch { /* startup only */ }
    await delay(100)
  }
  throw new Error('DEMO_START_TIMEOUT')
}
try {
  launch(['server.mjs'], path.join(app, 'host'))
  await waitFor('http://127.0.0.1:' + hostPort + '/health')
  launch([path.join(app,'node_modules/next/dist/bin/next'), args.includes('--dev') ? 'dev' : 'start', ...(args.includes('--dev') ? ['--webpack'] : []), '--hostname','127.0.0.1','--port',String(port)], app)
  await waitFor('http://127.0.0.1:' + port)
  console.log(JSON.stringify({ event:'demo-ready',pid:process.pid,port,hostPort,children:children.map(c=>c.pid) }))
} catch { await stop(1) }
