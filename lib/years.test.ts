import { describe, expect, it } from "vitest"
import {
  addYears,
  formatYear,
  fromAstronomical,
  fromEraInput,
  toAstronomical,
  toEraInput,
  yearsBetween,
} from "./years"
import { createScale, ticks, tickStep } from "./scale"

describe("years", () => {
  it("maps BC/AD across the missing year 0", () => {
    expect(toAstronomical(-1)).toBe(0)
    expect(toAstronomical(1)).toBe(1)
    expect(toAstronomical(-206)).toBe(-205)
    expect(fromAstronomical(0)).toBe(-1)
    expect(fromAstronomical(1)).toBe(1)
    for (const y of [-3000, -2, -1, 1, 2, 1999])
      expect(fromAstronomical(toAstronomical(y))).toBe(y)
  })

  it("rejects year 0 and non-integers", () => {
    expect(() => toAstronomical(0)).toThrow()
    expect(() => toAstronomical(1.5)).toThrow()
  })

  it("counts elapsed years without year 0", () => {
    expect(yearsBetween(-1, 1)).toBe(1)
    expect(yearsBetween(-206, 220)).toBe(425)
    expect(addYears(-1, 1)).toBe(1)
    expect(addYears(1, -1)).toBe(-1)
    expect(addYears(-10, 20)).toBe(11)
  })

  it("formats and parses era input consistently", () => {
    expect(formatYear(-206)).toBe("前206年")
    expect(formatYear(-206, true)).toBe("紀元前206年")
    expect(formatYear(220)).toBe("220年")
    expect(formatYear(0)).toBe("不明")
    expect(fromEraInput("BC", 206)).toBe(-206)
    expect(fromEraInput("AD", 1)).toBe(1)
    expect(fromEraInput("BC", 0)).toBeNull()
    expect(fromEraInput("AD", -5)).toBeNull()
    for (const y of [-500, -1, 1, 1453]) {
      const { era, value } = toEraInput(y)
      expect(fromEraInput(era, value)).toBe(y)
    }
  })
})

describe("scale", () => {
  const s = createScale(-10, 10, 2)

  it("places 1 BC directly before AD 1", () => {
    expect(s.top(-1) + 2).toBe(s.top(1))
    expect(s.top(-10)).toBe(0)
    // 前10〜10年 = 20年 (年0なし)
    expect(s.height).toBe(40)
  })

  it("spans long periods inclusively and linearly", () => {
    const long = createScale(-3500, 2000, 1)
    const han = long.span(-206, 220)
    expect(han.height).toBe(426) // 前206年初め〜220年終わり
    expect(long.span(-3100, -30).height).toBe(3071)
    // 線形: 同じ年数は同じ長さ
    expect(long.span(-500, -401).height).toBe(long.span(1500, 1599).height)
  })

  it("inverts pixels back to years", () => {
    expect(s.yearAt(s.top(-1))).toBe(-1)
    expect(s.yearAt(s.top(1))).toBe(1)
    expect(s.yearAt(s.top(7) + 1)).toBe(7)
  })

  it("generates ticks without year 0", () => {
    expect(ticks(-300, 300, 100)).toEqual([-300, -200, -100, 1, 100, 200, 300])
    expect(ticks(-50, 50, 1000)).toEqual([1])
    expect(tickStep(0.1)).toBe(1000)
    expect(tickStep(10)).toBe(10)
  })
})
