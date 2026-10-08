import { spawn } from 'node:child_process'

const children = []

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  children.push(child)
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code)
    }
  })
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('npx', [
  'wrangler',
  'dev',
  '--config',
  'wrangler.dev.toml',
  '--port',
  '8787',
  '--persist-to',
  '.wrangler/state',
])

async function waitForApi() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:8787/api/health')
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

await waitForApi()
run('npx', ['vite'])
