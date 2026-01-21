<script lang="ts">
  import { onMount } from 'svelte'
  import { getActivityStore, formatDuration } from '../lib/activityStore.svelte'
  import { getSettings, updateSettings, getDataStore } from '../lib/auth.svelte'
  import { getToastStore } from '../lib/toastStore.svelte'
  import PageLayout from './PageLayout.svelte'
  import SyncIndicator from './SyncIndicator.svelte'
  import type { SyncInfo } from '@mrbelloc/encrypted-pouch'
  import { IconPlayerPlay, IconX, IconPlus } from '@tabler/icons-svelte'
  import { Tooltip } from 'bootstrap'

  const toastStore = getToastStore()

  // Sync indicator reference
  let syncIndicator: SyncIndicator | undefined = $state()

  const store = getActivityStore()
  const settings = $derived(getSettings())
  const autoStopRunning = $derived(settings?.autoStopRunning ?? true)

  // Track if sync is actually connected (not just configured)
  let syncConnected = $state(false)

  // Reset syncConnected when settings change (e.g., sync disabled or different URL)
  $effect(() => {
    if (settings?.syncMode !== 'couchdb' || !settings?.couchdb?.url) {
      syncConnected = false
    }
  })

  // Determine if sync is enabled (show indicator only when connected)
  const syncEnabled = $derived(syncConnected)

  // Export method to be called when sync connection is established
  export function setSyncConnected(connected: boolean) {
    syncConnected = connected
  }

  // Export handleSync to be called from parent (App.svelte)
  export function handleSync(info: SyncInfo) {
    syncIndicator?.handleSync(info)
  }

  /**
   * Handle manual sync request from sync indicator
   */
  async function handleSyncNow() {
    try {
      const dataStore = getDataStore()
      await dataStore.syncNow()
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  /**
   * Toggle auto-stop setting
   */
  async function toggleAutoStop() {
    try {
      await updateSettings({ autoStopRunning: !autoStopRunning })
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  // Form state
  let taskInput = $state('')
  let tagsInput = $state('')

  // Reactive data
  const runningActivities = $derived(store.runningActivities)
  const recentTasks = $derived(store.recentTasks)
  const uniqueTasks = $derived(store.uniqueTasks)
  const uniqueTags = $derived(store.uniqueTags)
  const todayStats = $derived(store.todayStats)

  // Current time (for updating running durations)
  let now = $state(Date.now())
  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now()
    }, 1000) // Update every second for smooth UI
    return () => clearInterval(interval)
  })

  /**
   * Start a new activity
   */
  async function handleStartActivity() {
    const task = taskInput.trim()
    if (!task) return

    // Parse tags (comma or space separated)
    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    try {
      await store.startActivity(task, tags, autoStopRunning)

      // Clear form
      taskInput = ''
      tagsInput = ''
    } catch (error) {
      console.error('Failed to start activity:', error)
      toastStore.error('Failed to start activity')
    }
  }

  /**
   * Stop a running activity
   */
  async function handleStopActivity(id: string) {
    try {
      await store.stopActivity(id)
    } catch (error) {
      console.error('Failed to stop activity:', error)
      toastStore.error('Failed to stop activity')
    }
  }

  /**
   * Quick-start from recent task
   */
  async function handleQuickStart(task: string, tags: string[]) {
    try {
      await store.startActivity(task, tags, autoStopRunning)
    } catch (error) {
      console.error('Failed to start activity:', error)
      toastStore.error('Failed to start activity')
    }
  }

  /**
   * When task is selected from autocomplete, auto-fill tags
   */
  function handleTaskInput(e: Event) {
    const target = e.target as HTMLInputElement
    const task = target.value

    // If task matches a known task, suggest tags
    const suggestedTags = store.getTagsForTask(task)
    if (suggestedTags.length > 0 && !tagsInput) {
      tagsInput = suggestedTags.join(', ')
    }
  }

  /**
   * Handle Enter key in form
   */
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleStartActivity()
    }
  }

  /**
   * Initialize Bootstrap tooltips
   */
  onMount(() => {
    // Initialize all tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new Tooltip(tooltipTriggerEl)
    })
  })
</script>

<PageLayout>
  <div class="row row-cards g-3">
    <!-- Page Header -->
    <div class="col-12">
      <div class="page-header">
        <div class="row align-items-center">
          <div class="col">
            <h2 class="page-title">Track Time</h2>
          </div>
          <div class="col-auto d-flex align-items-center gap-3">
            <SyncIndicator bind:this={syncIndicator} {syncEnabled} onSyncNow={handleSyncNow} />
            <div class="text-secondary fs-4">
              Today: <span class="text-primary fw-bold fs-3"
                >{formatDuration(todayStats.totalDuration)}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Running Activities -->
    {#if runningActivities.length > 0}
      <div class="col-12">
        <div class="card border-success">
          <div class="card-status-top bg-success"></div>
          <div class="card-header">
            <h2 class="card-title text-uppercase tracking-wide fw-bold">Running</h2>
          </div>
          <div class="card-body">
            {#each runningActivities as activity (activity._id)}
              <div class="row align-items-center mb-3">
                <div class="col">
                  <div class="h3 mb-1">{activity.task}</div>
                  {#if activity.tags.length > 0}
                    <div class="text-secondary small mb-2">
                      {#each activity.tags as tag}
                        <span class="badge badge-outline text-secondary me-1">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                  <div class="display-6 text-success fw-bold">
                    {formatDuration(now - activity.from)}
                  </div>
                </div>
                <div class="col-auto">
                  <button
                    class="btn btn-sm btn-outline-danger ms-2"
                    onclick={() => handleStopActivity(activity._id)}
                  >
                    <IconX size={16} class="me-1" />
                    Stop
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Start Activity Form -->
    <div class="col-12">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title text-uppercase tracking-wide fw-bold">Start Activity</h2>
        </div>
        <div class="card-body">
          <form
            onsubmit={(e) => {
              e.preventDefault()
              handleStartActivity()
            }}
          >
            <div class="mb-3">
              <label class="form-label" for="task-input">Task</label>
              <input
                id="task-input"
                type="text"
                class="form-control"
                list="tasks-datalist"
                bind:value={taskInput}
                oninput={handleTaskInput}
                onkeydown={handleKeydown}
                placeholder="What are you working on?"
                autocomplete="off"
              />
              <datalist id="tasks-datalist">
                {#each uniqueTasks as task}
                  <option value={task}></option>
                {/each}
              </datalist>
            </div>

            <div class="mb-3">
              <label class="form-label" for="tags-input">Tags (space or comma separated)</label>
              <input
                id="tags-input"
                type="text"
                class="form-control"
                list="tags-datalist"
                bind:value={tagsInput}
                onkeydown={handleKeydown}
                placeholder="work, urgent"
                autocomplete="off"
              />
              <datalist id="tags-datalist">
                {#each uniqueTags as tag}
                  <option value={tag}></option>
                {/each}
              </datalist>
            </div>

            <div class="border rounded p-3">
              <button
                type="submit"
                class="btn btn-primary w-100 btn-lg"
                disabled={!taskInput.trim()}
              >
                <IconPlus size={20} class="me-2" />
                Start Activity
              </button>

              <div class="mt-3 pt-2 border-top">
                <div class="d-flex align-items-center gap-2">
                  <label class="form-check form-switch mb-0">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      checked={autoStopRunning}
                      onchange={toggleAutoStop}
                    />
                    <span class="form-check-label text-secondary small">
                      Stop running activities
                    </span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Automatically stops any running activities when you start a new one"
                  >
                    <span class="form-help">?</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Recent Activities (Quick Start) -->
    {#if recentTasks.length > 0}
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title text-uppercase tracking-wide fw-bold">Recent Activities</h2>
          </div>
          <div class="list-group list-group-flush">
            {#each recentTasks as recent (recent.task)}
              <button
                class="list-group-item list-group-item-action"
                onclick={() => handleQuickStart(recent.task, recent.tags)}
              >
                <div class="d-flex align-items-center">
                  <div class="flex-fill">
                    <div class="fw-medium">{recent.task}</div>
                    {#if recent.tags.length > 0}
                      <div class="text-secondary small mt-1">
                        {#each recent.tags as tag}
                          <span class="badge badge-outline text-secondary me-1">{tag}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <div class="ms-auto">
                    <IconPlayerPlay size={20} class="text-primary" />
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</PageLayout>
