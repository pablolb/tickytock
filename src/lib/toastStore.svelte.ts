/**
 * Toast notification store
 * Provides a simple API for showing toast messages
 */

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}

class ToastStore {
  toasts = $state<Toast[]>([])

  /**
   * Show a toast notification
   */
  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = { id, message, type, duration }

    this.toasts.push(toast)

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, duration)
    }

    return id
  }

  /**
   * Show a success toast
   */
  success(message: string, duration = 3000) {
    return this.show(message, 'success', duration)
  }

  /**
   * Show an error toast
   */
  error(message: string, duration = 4000) {
    return this.show(message, 'error', duration)
  }

  /**
   * Show an info toast
   */
  info(message: string, duration = 3000) {
    return this.show(message, 'info', duration)
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.toasts = []
  }
}

// Singleton instance
const toastStore = new ToastStore()

export function getToastStore() {
  return toastStore
}
