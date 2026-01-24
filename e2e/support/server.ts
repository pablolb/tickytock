import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

let devServer: ChildProcess | null = null

export async function startDevServer(): Promise<void> {
  if (devServer) return // Already running

  console.log('Starting dev server...')

  devServer = spawn('npm', ['run', 'dev:e2e'], {
    stdio: 'pipe',
    shell: true,
  })

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Dev server failed to start within 30s'))
    }, 30000)

    let stdoutBuffer = ''
    let stderrBuffer = ''

    devServer!.stdout?.on('data', (data) => {
      const output = data.toString()
      stdoutBuffer += output
      console.log('[dev server]', output.trim())

      if (output.includes('Local:') || output.includes('localhost:5173')) {
        clearTimeout(timeout)
        console.log('Dev server ready!')
        resolve()
      }
    })

    devServer!.stderr?.on('data', (data) => {
      const output = data.toString()
      stderrBuffer += output
      console.error('[dev server error]', output.trim())
    })

    devServer!.on('error', (error) => {
      clearTimeout(timeout)
      reject(new Error(`Failed to spawn dev server: ${error.message}`))
    })

    devServer!.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(
          new Error(
            `Dev server exited with code ${code}\nStdout: ${stdoutBuffer}\nStderr: ${stderrBuffer}`
          )
        )
      }
    })
  })
}

export function stopDevServer(): void {
  if (devServer) {
    console.log('Stopping dev server...')
    devServer.kill()
    devServer = null
  }
}
