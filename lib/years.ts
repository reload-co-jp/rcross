// 歴史年 (historical year): 紀元前 = 負数, 紀元後 = 正数, 0 は存在しない (前1年 → 1年)。
// 座標計算は「天文年」(前1年 = 0, 前2年 = -1) で行い、年0の欠落による1年ズレを防ぐ。

export type Era = "BC" | "AD"

export const isValidYear = (y: unknown): y is number =>
  typeof y === "number" && Number.isInteger(y) && y !== 0

export const toAstronomical = (y: number): number => {
  if (!isValidYear(y)) throw new RangeError(`invalid historical year: ${y}`)
  return y < 0 ? y + 1 : y
}

export const fromAstronomical = (a: number): number => {
  const n = Math.floor(a)
  return n <= 0 ? n - 1 : n
}

/** 2つの年の間の経過年数 (前1年 → 1年 は 1年) */
export const yearsBetween = (from: number, to: number): number =>
  toAstronomical(to) - toAstronomical(from)

export const formatYear = (y: number, long = false): string => {
  if (!isValidYear(y)) return "不明"
  if (y < 0) return `${long ? "紀元前" : "前"}${-y}年`
  return long ? `紀元後${y}年` : `${y}年`
}

export const toEraInput = (y: number): { era: Era; value: number } =>
  y < 0 ? { era: "BC", value: -y } : { era: "AD", value: y }

/** 入力 (紀元前/紀元後 + 正の年数) → 歴史年。不正なら null */
export const fromEraInput = (era: Era, value: number): number | null => {
  if (!Number.isInteger(value) || value < 1) return null
  return era === "BC" ? -value : value
}

/** 年 + 年数 (年0をまたいでも正しく) */
export const addYears = (y: number, delta: number): number =>
  fromAstronomical(toAstronomical(y) + delta)
