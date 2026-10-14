import { fromAstronomical, toAstronomical } from "./years"

// 線形スケール。1年 = pxPerYear ピクセル。年 y は [top(y), top(y) + pxPerYear) を占める。
export type Scale = {
  start: number
  end: number
  pxPerYear: number
  height: number
  top: (year: number) => number
  /** 期間 (開始年の初め〜終了年の終わり) の px 範囲 */
  span: (start: number, end: number) => { top: number; height: number }
  yearAt: (px: number) => number
}

export const createScale = (
  start: number,
  end: number,
  pxPerYear: number
): Scale => {
  const a0 = toAstronomical(start)
  const a1 = toAstronomical(end)
  if (a1 < a0) throw new RangeError("end must not precede start")
  const top = (year: number) => (toAstronomical(year) - a0) * pxPerYear
  return {
    start,
    end,
    pxPerYear,
    height: (a1 + 1 - a0) * pxPerYear,
    top,
    span: (s, e) => {
      const t = top(s)
      return { top: t, height: top(e) + pxPerYear - t }
    },
    yearAt: (px) => fromAstronomical(a0 + px / pxPerYear),
  }
}

const STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000]

export const tickStep = (pxPerYear: number, minGapPx = 56): number =>
  STEPS.find((s) => s * pxPerYear >= minGapPx) ?? 1000

/** 目盛り年。step の倍数。年0は存在しないため「1年」(紀元の始まり) に置き換える */
export const ticks = (start: number, end: number, step: number): number[] => {
  const out: number[] = []
  const first = Math.ceil(start / step) * step
  for (let y = first; y <= end; y += step) {
    const year = y === 0 ? 1 : y
    if (year >= start) out.push(year)
  }
  return out
}
