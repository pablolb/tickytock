import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

let devServer: ChildProcess | null = null

async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        console.log(`Server is responding at ${url}`)
        return
      }
    } catch {
      // Server not ready yet, wait and retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`)
}

export async function startDevServer(): Promise<void> {
  if (devServer) return // Already running

  console.log('Starting dev server...')

  devServer = spawn('npm', ['run', 'dev:e2e'], {
    stdio: 'pipe',
    shell: true,
  })

  let stdoutBuffer = ''
  let stderrBuffer = ''

  devServer.stdout?.on('data', (data) => {
    const output = data.toString()
    stdoutBuffer += output
    console.log('[dev server]', output.trim())
  })

  devServer.stderr?.on('data', (data) => {
    const output = data.toString()
    stderrBuffer += output
    console.error('[dev server error]', output.trim())
  })

  devServer.on('error', (error) => {
    throw new Error(`Failed to spawn dev server: ${error.message}`)
  })

  devServer.on('exit', (code) => {
    if (code !== null && code !== 0) {
      throw new Error(
        `Dev server exited with code ${code}\nStdout: ${stdoutBuffer}\nStderr: ${stderrBuffer}`
      )
    }
  })

  // Wait for the server to actually be responding
  try {
    await waitForServer('http://localhost:5173', 60000)
  } catch (error) {
    if (devServer) {
      devServer.kill()
      devServer = null
    }
    throw error
  }
}

export function stopDevServer(): void {
  if (devServer) {
    console.log('Stopping dev server...')
    devServer.kill()
    devServer = null
  }
}
