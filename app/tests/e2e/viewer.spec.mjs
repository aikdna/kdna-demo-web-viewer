import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFixtures } from '../fixtures.mjs'
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.resolve(process.env.KDNA_EVIDENCE_DIR ?? '.demo-test-results')
const fixtureDir = path.join(output,'fixtures')
mkdirSync(output,{recursive:true})
function record(name,value) { writeFileSync(path.join(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'}) }
async function freePort() {
  const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port
  await new Promise(resolve=>server.close(resolve));return port
}
async function isOpen(port) {
  return new Promise(resolve=>{ const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false)) })
}
async function startDemo(label,policy='allow',delayMs=0) {
  const port=await freePort(),hostPort=await freePort(),started=new Date().toISOString()
  const keys=['PATH','HOME','TMPDIR','LANG','LC_ALL','NODE_DISABLE_COMPILE_CACHE','npm_config_cache']
  const env=Object.fromEntries(keys.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))
  Object.assign(env,{KDNA_DEMO_POLICY:policy,KDNA_DEMO_DELAY_MS:String(delayMs),NEXT_TELEMETRY_DISABLED:'1'})
  const argv=['--unhandled-rejections=strict','scripts/start-local.mjs','--port',String(port),'--host-port',String(hostPort)]
  const child=spawn(process.execPath,argv,{cwd:app,env,stdio:['ignore','pipe','pipe']})
  let stdout='',stderr='',closed=false
  child.stdout.on('data',b=>{stdout+=b;if(stdout.length>1000000) child.kill('SIGTERM')})
  child.stderr.on('data',b=>{stderr+=b;if(stderr.length>1000000) child.kill('SIGTERM')})
  const exited=once(child,'exit')
  async function stop() {
    if (closed) return
    if (child.exitCode===null&&child.signalCode===null) child.kill('SIGTERM')
    let timer
    let exit
    try { exit=await Promise.race([exited,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Demo did not stop')),6000)})]) } finally {clearTimeout(timer)}
    closed=true
    const ports=[{port,open:await isOpen(port)},{port:hostPort,open:await isOpen(hostPort)}]
    record('resource-'+label+'-'+child.pid,{started,end:new Date().toISOString(),argv,cwd:app,environment_names:Object.keys(env),pid:child.pid,exit,closed,ports,stdout,stderr})
    expect(ports.every(x=>!x.open)).toBe(true)
    expect(stdout).toContain('demo-closed')
  }
  try {
    for(let i=0;i<300;i++) {
      if(stdout.includes('"event":"demo-ready"')) return {url:'http://127.0.0.1:'+port,hostUrl:'http://127.0.0.1:'+hostPort,stop,child,stdout:()=>stdout}
      if(child.exitCode!==null||child.signalCode!==null) throw new Error('Demo startup exited: '+stdout+' '+stderr)
      await delay(100)
    }
    throw new Error('Demo startup timeout')
  } catch(error) { await stop(); throw error }
}
let demo
const observations=new Map()
test.beforeAll(async({},info)=>{await writeFixtures(fixtureDir);demo=await startDemo(info.project.name+'-allow','allow',300)})
test.afterAll(async()=>{await demo?.stop()})
test.beforeEach(async({page},info)=>{
  const row={project:info.project.name,browser:page.context().browser().version(),requests:[],external:[],console:[],pageErrors:[],dialogs:[]}
  observations.set(info.testId,row)
  page.on('request',req=>{row.requests.push({url:req.url(),method:req.method()});if(new URL(req.url()).hostname!=='127.0.0.1')row.external.push(req.url())})
  page.on('console',msg=>{if(['warning','error'].includes(msg.type()))row.console.push({type:msg.type(),text:msg.text(),url:msg.location().url})})
  page.on('pageerror',error=>row.pageErrors.push(error.message))
  page.on('dialog',async dialog=>{row.dialogs.push(dialog.message());await dialog.dismiss()})
  await page.goto(demo.url)
  await expect(page.getByLabel('Choose a KDNA file')).toBeVisible()
})
test.afterEach(async({page},info)=>{
  const row=observations.get(info.testId)
  row.expectedResourceErrors=row.console.filter(x=>/Failed to load resource/.test(x.text)&&/(404|422|502)/.test(x.text))
  row.unexpectedConsole=row.console.filter(x=>!row.expectedResourceErrors.includes(x))
  record(info.project.name+'-'+info.title.replace(/[^a-zA-Z0-9]+/g,'-'),row)
  expect(row.external).toEqual([]);expect(row.pageErrors).toEqual([]);expect(row.dialogs).toEqual([]);expect(row.unexpectedConsole).toEqual([])
})
const select=async(page,name='basic-1.1.kdna')=>page.getByLabel('Choose a KDNA file').setInputFiles(path.join(fixtureDir,name))
const received=async(page,text='DEMO_SENTINEL_1.1')=>{
  await expect(page.getByRole('status').filter({hasText:'Read state: received'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Remote read result'})).toContainText(text)
}
test('selection has no HTTP; explicit Read displays official ViewModel and proof limits; release resets',async({page},info)=>{
  const row=observations.get(info.testId),before=row.requests.filter(x=>x.url.includes('/api/')).length
  await select(page);await expect(page.getByRole('button',{name:'Read',exact:true})).toBeEnabled();await page.waitForTimeout(200)
  expect(row.requests.filter(x=>x.url.includes('/api/')).length).toBe(before)
  await page.getByRole('button',{name:'Read',exact:true}).click();await received(page)
  await expect(page.getByRole('region',{name:'Remote read result'})).toContainText('NOT_PROVEN')
  await expect(page.getByRole('region',{name:'Remote read result'})).toContainText('local_capabilities')
  expect(row.requests.filter(x=>x.url.endsWith('/api/kdna/read')).length).toBe(1)
  await expect(page.getByRole('button',{name:/expand/i})).toHaveCount(0)
  await page.getByRole('button',{name:'Release',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'Read state: released'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Read',exact:true})).toBeDisabled()
  await expect(page.getByRole('region',{name:'Remote read result'})).not.toContainText('DEMO_SENTINEL')
})
test('invalid and oversized files reject locally and cannot Read',async({page},info)=>{
  const row=observations.get(info.testId)
  for(const name of ['invalid.kdna','oversized.kdna']) {
    await select(page,name);await expect(page.getByRole('status').filter({hasText:'Read state: rejected'})).toBeVisible()
    await expect(page.getByRole('button',{name:'Read',exact:true})).toBeDisabled()
  }
  expect(row.requests.filter(x=>x.url.includes('/api/'))).toEqual([])
})
async function beginPending(page) {
  await select(page)
  const sent=page.waitForRequest(req=>req.url().endsWith('/api/kdna/read'))
  await page.getByRole('button',{name:'Read',exact:true}).click();await sent
}
test('cancel and release during real HTTP suppress late results',async({page})=>{
  await beginPending(page);await page.getByRole('button',{name:'Cancel',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'CLIENT_CANCELLED'})).toBeVisible();await page.waitForTimeout(900)
  await expect(page.getByRole('region',{name:'Remote read result'})).not.toContainText('DEMO_SENTINEL')
  await beginPending(page);await page.getByRole('button',{name:'Release',exact:true}).click()
  await page.waitForTimeout(900);await expect(page.getByRole('status').filter({hasText:'Read state: released'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Remote read result'})).not.toContainText('DEMO_SENTINEL')
})
test('replacing a file during HTTP suppresses the old result and reads only the new selection',async({page})=>{
  await beginPending(page);await select(page,'replacement-1.1.kdna')
  await expect(page.getByRole('status').filter({hasText:'Read state: selected'})).toBeVisible();await page.waitForTimeout(900)
  await expect(page.getByRole('region',{name:'Remote read result'})).not.toContainText('DEMO_SENTINEL')
  await page.getByRole('button',{name:'Read',exact:true}).click();await received(page,'REPLACEMENT_SENTINEL_1.1')
})
test('disclosed text remains text, is bounded, and the page retains mobile and keyboard controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});await select(page,'text-1.1.kdna')
  await page.getByRole('button',{name:'Read',exact:true}).click()
  const result=page.getByRole('region',{name:'Remote read result'})
  await expect(result).toContainText('<img src=x onerror=alert(1)>');await expect(result).toContainText('[display truncated]')
  await expect(result.locator('img,script')).toHaveCount(0)
  expect((await result.textContent()).length).toBeLessThan(30000)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  const button=page.getByRole('button',{name:'Release',exact:true});await button.focus();await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({hasText:'Read state: released'})).toBeVisible()
})
test('configured local Host denial and transport failure cross actual HTTP and remain bounded',async({page},info)=>{
  for(const policy of ['deny','transport']) {
    const other=await startDemo(info.project.name+'-'+policy,policy)
    try {
      await page.goto(other.url);await select(page);await page.getByRole('button',{name:'Read',exact:true}).click()
      const result=page.getByRole('region',{name:'Remote read result'})
      await expect(result).toContainText(policy==='deny'?'READ_HOST_DENIED':'READ_TRANSPORT_FAILURE')
      await expect(result).not.toContainText('DEMO_SENTINEL');await expect(result).toContainText('Content not disclosed')
      const health=await (await fetch(other.hostUrl+'/health')).json();expect(health.calls).toBe(1);expect(health.active).toBe(0)
    } finally {await other.stop()}
  }
})
test('unsupported routes fail closed and an unexpected Host exit closes the owned Next process',async({request},info)=>{
  const response=await request.post(demo.url+'/api/kdna/expand');expect(response.status()).toBe(501)
  const other=await startDemo(info.project.name+'-abnormal')
  const ready=other.stdout().split('\n').filter(x=>x.startsWith('{')).map(x=>JSON.parse(x)).find(x=>x.event==='demo-ready')
  process.kill(ready.children[0],'SIGTERM')
  await delay(300)
  await other.stop()
})
