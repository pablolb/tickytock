<script lang="ts">
  import {
    createActivity,
    getAllActivities,
    getUniqueTasks,
    getUniqueTags,
    getTaskToTagsMap,
    getRunningActivities,
    stopActivity,
  } from '../lib/activities.svelte'
  import { onMount } from 'svelte'
  import Button from './Button.svelte'

  interface Props {
    onActivityCreated?: () => void
    autoStopRunning?: boolean
  }

  let { onActivityCreated, autoStopRunning = true }: Props = $props()

  let task = $state('')
  let tagsInput = $state('')
  let uniqueTasks = $state<string[]>([])
  let uniqueTags = $state<string[]>([])
  let taskToTags = $state<Map<string, string[]>>(new Map())

  async function loadAutocompleteData() {
    const activities = await getAllActivities()
    uniqueTasks = getUniqueTasks(activities)
    uniqueTags = getUniqueTags(activities)
    taskToTags = getTaskToTagsMap(activities)
  }

  function handleTaskInput() {
    // Auto-fill tags when task is selected from autocomplete
    const suggestedTags = taskToTags.get(task)
    if (suggestedTags && suggestedTags.length > 0) {
      tagsInput = suggestedTags.join(', ')
    }
  }

  async function handleSubmit() {
    if (!task.trim()) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    // Capture running activities BEFORE creating new one
    const runningBeforeCreate = autoStopRunning ? await getRunningActivities() : []

    // Create new activity
    await createActivity({
      task: task.trim(),
      tags,
      from: Date.now(),
      to: null,
    })

    // Stop previously running activities if auto-stop is enabled
    for (const running of runningBeforeCreate) {
      await stopActivity(running._id)
    }

    task = ''
    tagsInput = ''

    if (onActivityCreated) {
      onActivityCreated()
    }

    // Refresh autocomplete data
    loadAutocompleteData()
  }

  onMount(() => {
    loadAutocompleteData()
  })
</script>

<form
  onsubmit={(e) => {
    e.preventDefault()
    handleSubmit()
  }}
  class="mb-4"
>
  <div class="mb-3">
    <input
      type="text"
      class="form-control form-control-lg"
      bind:value={task}
      oninput={handleTaskInput}
      placeholder="What are you working on?"
      list="tasks-list"
      required
    />
    <datalist id="tasks-list">
      {#each uniqueTasks as taskOption}
        <option value={taskOption}></option>
      {/each}
    </datalist>
  </div>

  <div class="mb-3">
    <input
      type="text"
      class="form-control"
      bind:value={tagsInput}
      placeholder="Tags (comma-separated, e.g., work, project-x)"
      list="tags-list"
    />
    <datalist id="tags-list">
      {#each uniqueTags as tagOption}
        <option value={tagOption}></option>
      {/each}
    </datalist>
  </div>

  <Button variant="primary" size="lg" type="submit" class="w-100">Start Activity</Button>
</form>

<style>
  /* Enhanced large input styling */
  .form-control-lg {
    font-size: 1.25rem;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  /* Focus effect for inputs */
  .form-control:focus {
    border-color: var(--tblr-primary);
    box-shadow: 0 0 0 0.25rem rgba(32, 107, 196, 0.25);
  }
</style>
