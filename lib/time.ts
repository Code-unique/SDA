export function getTimeAgo(dateStr: string | Date) {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"]
  ]

  for (const [unitSeconds, label] of units) {
    const value = Math.floor(seconds / unitSeconds)
    if (value >= 1) return `${value} ${label}${value > 1 ? "s" : ""} ago`
  }

  return "just now"
}
