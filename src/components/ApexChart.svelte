<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type ApexCharts from 'apexcharts'

  let {
    options,
    type = 'line',
    height = 240,
  }: {
    options: any
    type?: string
    height?: number
  } = $props()

  let chartDiv: HTMLDivElement
  let chart: ApexCharts | null = null

  onMount(async () => {
    // Dynamically import ApexCharts (client-side only)
    const ApexChartsModule = await import('apexcharts')
    const ApexChartsClass = ApexChartsModule.default

    if (chartDiv) {
      chart = new ApexChartsClass(chartDiv, {
        chart: {
          type,
          fontFamily: 'inherit',
          height,
          parentHeightOffset: 0,
          toolbar: {
            show: false,
          },
          animations: {
            enabled: false,
          },
        },
        ...options,
      })
      chart.render()
    }
  })

  onDestroy(() => {
    if (chart) {
      chart.destroy()
    }
  })

  // Watch for options changes and update chart
  $effect(() => {
    if (chart && options) {
      chart.updateOptions(
        {
          chart: {
            type,
            fontFamily: 'inherit',
            height,
            parentHeightOffset: 0,
            toolbar: {
              show: false,
            },
            animations: {
              enabled: false,
            },
          },
          ...options,
        },
        true,
        true
      )
    }
  })
</script>

<div bind:this={chartDiv} class="position-relative"></div>
