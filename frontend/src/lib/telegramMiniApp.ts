export function getTelegramWebApp() {
  if (typeof window === "undefined") return null
  return window.Telegram?.WebApp ?? null
}

export function initializeTelegramMiniApp() {
  const webApp = getTelegramWebApp()
  if (!webApp) return null

  webApp.ready()
  webApp.expand()
  applyTelegramTheme(webApp.themeParams ?? {})
  return webApp
}

export function applyTelegramTheme(
  themeParams: Record<string, string | undefined>,
) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const themeMap: Array<[string, string | undefined]> = [
    ["--tg-theme-bg", themeParams.bg_color],
    ["--tg-theme-text", themeParams.text_color],
    ["--tg-theme-hint", themeParams.hint_color],
    ["--tg-theme-secondary-bg", themeParams.secondary_bg_color],
  ]

  for (const [property, value] of themeMap) {
    if (value) root.style.setProperty(property, value)
  }
}

export function getTelegramStartParam() {
  if (typeof window === "undefined") return undefined
  const webAppParam = getTelegramWebApp()?.initDataUnsafe?.start_param
  if (webAppParam) return webAppParam

  const params = new URLSearchParams(window.location.search)
  return (
    params.get("tgWebAppStartParam") ||
    params.get("startapp") ||
    params.get("ref") ||
    undefined
  )
}

export function telegramSelectionHaptic() {
  getTelegramWebApp()?.HapticFeedback?.selectionChanged()
}

export function telegramImpactHaptic(style: TelegramHapticStyle = "medium") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style)
}

export function telegramNotificationHaptic(
  type: "error" | "success" | "warning",
) {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred(type)
}

export function openTelegramShare(url: string, message: string) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`
  const webApp = getTelegramWebApp()
  if (webApp) {
    webApp.openTelegramLink(shareUrl)
    return
  }
  window.open(shareUrl, "_blank", "noopener,noreferrer")
}
