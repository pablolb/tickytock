export interface Activity {
  _id?: string
  _rev?: string
  task: string
  tags: string[]
  from: number // Unix timestamp (ms)
  to: number | null // null = currently running
  timezone?: string // IANA timezone (e.g., 'America/New_York')
}

export interface ActivityDoc extends Activity {
  _id: string
  _rev: string
}
