type TelegramHapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft"

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: {
    start_param?: string
    user?: {
      id: number
      username?: string
      first_name?: string
      last_name?: string
    }
  }
  themeParams?: Record<string, string | undefined>
  colorScheme?: "light" | "dark"
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: TelegramHapticStyle) => void
    selectionChanged: () => void
    notificationOccurred: (type: "error" | "success" | "warning") => void
  }
  ready: () => void
  expand: () => void
  openTelegramLink: (url: string) => void
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}
