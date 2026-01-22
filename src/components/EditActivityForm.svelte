<script lang="ts">
  import { getActivityStore } from '../lib/activityStore.svelte'
  import { getLocalDateString, getLocalTimeString } from '../lib/dateUtils'
  import type { ActivityDoc } from '../lib/types'
  import Button from './Button.svelte'

  const activityStore = getActivityStore()

  interface Props {
    activity: ActivityDoc
    onActivityUpdated?: () => void
    onCancel?: () => void
  }

  let { activity, onActivityUpdated, onCancel }: Props = $props()

  let task = $state(activity.task)
  let tagsInput = $state(activity.tags.join(', '))
  let fromDate = $state('')
  let fromTime = $state('')
  let toDate = $state('')
  let toTime = $state('')

  // Reactive getters - auto-update when activities change
  let uniqueTasks = $derived(activityStore.uniqueTasks)
  let uniqueTags = $derived(activityStore.uniqueTags)

  // Initialize with activity data
  $effect(() => {
    const fromDateTime = new Date(activity.from)
    fromDate = getLocalDateString(fromDateTime)
    fromTime = getLocalTimeString(fromDateTime)

    if (activity.to) {
      const toDateTime = new Date(activity.to)
      toDate = getLocalDateString(toDateTime)
      toTime = getLocalTimeString(toDateTime)
    } else {
      toDate = ''
      toTime = ''
    }
  })

  function handleTaskInput() {
    // Auto-fill tags when task is selected from autocomplete
    const suggestedTags = activityStore.getTagsForTask(task)
    if (suggestedTags && suggestedTags.length > 0) {
      tagsInput = suggestedTags.join(', ')
    }
  }

  async function handleSubmit() {
    if (!task.trim() || !fromDate || !fromTime) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const fromTimestamp = new Date(`${fromDate}T${fromTime}`).getTime()
    let toTimestamp = null

    if (toDate && toTime) {
      toTimestamp = new Date(`${toDate}T${toTime}`).getTime()
    }

    await activityStore.updateActivity(activity._id, {
      task: task.trim(),
      tags,
      from: fromTimestamp,
      to: toTimestamp,
    })

    if (onActivityUpdated) {
      onActivityUpdated()
    }
  }
</script>

<form
  onsubmit={(e) => {
    e.preventDefault()
    handleSubmit()
  }}
  class="card"
>
  <div class="card-header">
    <h3 class="card-title">Edit Activity</h3>
  </div>

  <div class="card-body">
    <div class="mb-3">
      <label class="form-label" for="edit-task">Task</label>
      <input
        id="edit-task"
        type="text"
        class="form-control"
        bind:value={task}
        oninput={handleTaskInput}
        placeholder="What were you working on?"
        list="edit-tasks-list"
        required
      />
      <datalist id="edit-tasks-list">
        {#each uniqueTasks as taskOption}
          <option value={taskOption}></option>
        {/each}
      </datalist>
    </div>

    <div class="mb-3">
      <label class="form-label" for="edit-tags">Tags</label>
      <input
        id="edit-tags"
        type="text"
        class="form-control"
        bind:value={tagsInput}
        placeholder="Comma-separated tags"
        list="edit-tags-list"
      />
      <datalist id="edit-tags-list">
        {#each uniqueTags as tagOption}
          <option value={tagOption}></option>
        {/each}
      </datalist>
      <div class="form-text">Optional: Separate multiple tags with commas</div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="edit-from-date">Start Date</label>
          <input
            id="edit-from-date"
            type="date"
            class="form-control"
            bind:value={fromDate}
            required
          />
        </div>
      </div>

      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="edit-from-time">Start Time</label>
          <input
            id="edit-from-time"
            type="time"
            class="form-control"
            bind:value={fromTime}
            required
          />
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="edit-to-date">End Date</label>
          <input id="edit-to-date" type="date" class="form-control" bind:value={toDate} />
        </div>
      </div>

      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="edit-to-time">End Time</label>
          <input id="edit-to-time" type="time" class="form-control" bind:value={toTime} />
        </div>
      </div>
    </div>
  </div>

  <div class="card-footer">
    <div class="btn-list justify-content-end">
      <Button variant="secondary" type="button" onclick={onCancel}>Cancel</Button>
      <Button variant="primary" type="submit">Save Changes</Button>
    </div>
  </div>
</form>

<style>
  /* Ensure proper spacing and layout */
  form {
    margin-bottom: 2rem;
  }
</style>
