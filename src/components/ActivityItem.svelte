<script lang="ts">
  import type { ActivityDoc } from '../lib/types'
  import { formatDuration, getActivityStore } from '../lib/activityStore.svelte'
  import Button from './Button.svelte'

  const activityStore = getActivityStore()

  interface Props {
    activity: ActivityDoc
    onUpdate?: () => void
    onEdit?: () => void
  }

  let { activity, onUpdate, onEdit }: Props = $props()

  let now = $state(Date.now())
  let interval: number

  $effect(() => {
    if (activity.to === null) {
      interval = setInterval(() => {
        now = Date.now()
      }, 1000)

      return () => clearInterval(interval)
    }
  })

  let duration = $derived(() => {
    const end = activity.to || now
    return end - activity.from
  })

  async function handleStop() {
    await activityStore.stopActivity(activity._id)
    if (onUpdate) onUpdate()
  }

  async function handleDelete() {
    if (confirm('Delete this activity?')) {
      await activityStore.deleteActivity(activity._id)
      if (onUpdate) onUpdate()
    }
  }
</script>

<div class="list-group-item">
  <div class="d-flex align-items-start gap-3">
    <div class="flex-fill">
      <!-- Header with task and running badge -->
      <div class="d-flex align-items-center gap-2 mb-2">
        <strong class="fs-5">{activity.task}</strong>
        {#if activity.to === null}
          <span class="badge bg-success-subtle text-success">Running</span>
        {/if}
      </div>

      <!-- Tags -->
      {#if activity.tags.length > 0}
        <div class="d-flex gap-1 flex-wrap mb-2">
          {#each activity.tags as tag}
            <span class="badge badge-outline text-secondary">{tag}</span>
          {/each}
        </div>
      {/if}

      <!-- Time info -->
      <div class="d-flex gap-3 text-secondary small">
        <span class="fw-bold text-primary">{formatDuration(duration())}</span>
        <span>
          {new Date(activity.from).toLocaleTimeString()}
          {#if activity.to}
            - {new Date(activity.to).toLocaleTimeString()}
          {/if}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="btn-list">
      {#if activity.to === null}
        <Button variant="warning" size="sm" onclick={handleStop}>Stop</Button>
      {/if}
      <Button variant="primary" size="sm" onclick={onEdit}>Edit</Button>
      <Button variant="danger" size="sm" onclick={handleDelete}>Delete</Button>
    </div>
  </div>
</div>

<style>
  /* Mobile responsive layout */
  @media (max-width: 640px) {
    .d-flex.align-items-start {
      flex-direction: column;
    }

    .btn-list {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
    }

    .btn-list :global(.btn) {
      flex: 1;
      min-width: 0;
    }
  }

  /* Ensure proper touch targets on mobile */
  .btn-list :global(.btn) {
    min-height: 44px;
  }
</style>
