<script lang="ts">
  import { getActivityStore } from '../lib/activityStore.svelte'
  import { getLocalDateString } from '../lib/dateUtils'

  const activityStore = getActivityStore()

  interface Props {
    onActivityCreated?: () => void
    onCancel?: () => void
  }

  let { onActivityCreated, onCancel }: Props = $props()

  let task = $state('')
  let tagsInput = $state('')
  let fromDate = $state('')
  let fromTime = $state('')
  let toDate = $state('')
  let toTime = $state('')

  // Reactive getters - auto-update when activities change
  let uniqueTasks = $derived(activityStore.uniqueTasks)
  let uniqueTags = $derived(activityStore.uniqueTags)

  // Initialize with today's date
  $effect(() => {
    if (!fromDate) {
      const now = new Date()
      fromDate = getLocalDateString(now)
      toDate = fromDate
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

    await activityStore.createActivity({
      task: task.trim(),
      tags,
      from: fromTimestamp,
      to: toTimestamp,
    })

    task = ''
    tagsInput = ''
    fromDate = ''
    fromTime = ''
    toDate = ''
    toTime = ''

    if (onActivityCreated) {
      onActivityCreated()
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
    <h3 class="card-title">Add Past Activity</h3>
  </div>

  <div class="card-body">
    <div class="mb-3">
      <label class="form-label" for="task">Task</label>
      <input
        id="task"
        type="text"
        class="form-control"
        bind:value={task}
        oninput={handleTaskInput}
        placeholder="What were you working on?"
        list="manual-tasks-list"
        required
      />
      <datalist id="manual-tasks-list">
        {#each uniqueTasks as taskOption}
          <option value={taskOption}></option>
        {/each}
      </datalist>
    </div>

    <div class="mb-3">
      <label class="form-label" for="tags">Tags</label>
      <input
        id="tags"
        type="text"
        class="form-control"
        bind:value={tagsInput}
        placeholder="Comma-separated tags"
        list="manual-tags-list"
      />
      <datalist id="manual-tags-list">
        {#each uniqueTags as tagOption}
          <option value={tagOption}></option>
        {/each}
      </datalist>
      <div class="form-text">Optional: Separate multiple tags with commas</div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="from-date">Start Date</label>
          <input id="from-date" type="date" class="form-control" bind:value={fromDate} required />
        </div>
      </div>

      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="from-time">Start Time</label>
          <input id="from-time" type="time" class="form-control" bind:value={fromTime} required />
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="to-date">End Date</label>
          <input id="to-date" type="date" class="form-control" bind:value={toDate} />
        </div>
      </div>

      <div class="col-md-6">
        <div class="mb-3">
          <label class="form-label" for="to-time">End Time</label>
          <input id="to-time" type="time" class="form-control" bind:value={toTime} />
        </div>
      </div>
    </div>
  </div>

  <div class="card-footer">
    <div class="btn-list justify-content-end">
      <button type="button" class="btn btn-secondary" onclick={onCancel}>Cancel</button>
      <button type="submit" class="btn btn-primary">Add Activity</button>
    </div>
  </div>
</form>

<style>
  /* Ensure proper spacing and layout */
  form {
    margin-bottom: 2rem;
  }
</style>
