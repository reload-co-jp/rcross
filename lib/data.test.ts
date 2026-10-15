import { describe, expect, it } from "vitest"
import rawItems from "@/data/items.json"
import { HistoryItem, ITEMS, validateItems } from "./data"
import { filterItems, searchItems } from "./filter"
import { layoutLane } from "./layout"
import { createScale } from "./scale"

const base: HistoryItem = {
  id: "x",
  name: "X",
  type: "period",
  startYear: -100,
  endYear: 100,
  datePrecision: "approximate",
  regions: ["europe"],
  genres: ["politics"],
  summary: "s",
  relatedIds: [],
  sources: [{ title: "t", url: "https://example.org/" }],
  reviewed: false,
}

describe("data validation", () => {
  it("items.json is valid", () => {
    expect(validateItems(rawItems)).toEqual([])
    expect(ITEMS.length).toBeGreaterThanOrEqual(50)
  })

  it("every item has a source and covers all regions", () => {
    const regions = new Set(ITEMS.flatMap((it) => it.regions))
    expect(regions.size).toBe(11)
    expect(ITEMS.every((it) => it.sources.length > 0)).toBe(true)
  })

  it("detects broken data", () => {
    const errs = validateItems([
      { ...base, startYear: 0 },
      { ...base, id: "y", regions: ["atlantis"], relatedIds: ["nope"] },
      { ...base, id: "y" },
      { ...base, id: "z", type: "period", endYear: undefined },
      { ...base, id: "w", startYearMin: 50 },
      { ...base, id: "v", sources: [] },
    ])
    expect(errs.join("\n")).toMatch(/invalid startYear: 0/)
    expect(errs.join("\n")).toMatch(/unknown region: atlantis/)
    expect(errs.join("\n")).toMatch(/unknown relatedId: nope/)
    expect(errs.join("\n")).toMatch(/duplicate id/)
    expect(errs.join("\n")).toMatch(/missing endYear/)
    expect(errs.join("\n")).toMatch(/startYearMin > startYear/)
    expect(errs.join("\n")).toMatch(/no sources/)
  })
})

describe("filter & search", () => {
  const items: HistoryItem[] = [
    base,
    { ...base, id: "b", startYear: 500, endYear: 600, regions: ["east-asia"] },
    {
      ...base,
      id: "c",
      type: "event",
      startYear: -50,
      endYear: undefined,
      genres: ["war"],
      name: "戦い",
      aliases: ["Battle"],
    },
  ]
  const all = {
    from: -1000,
    to: 2000,
    regions: ["europe", "east-asia"],
    genres: ["politics", "war"],
  }

  it("filters by overlap, region and genre", () => {
    expect(filterItems(items, all).map((i) => i.id)).toEqual(["x", "b", "c"])
    expect(filterItems(items, { ...all, from: 101 }).map((i) => i.id)).toEqual([
      "b",
    ])
    expect(filterItems(items, { ...all, to: -60 }).map((i) => i.id)).toEqual([
      "x",
    ])
    expect(
      filterItems(items, { ...all, regions: ["east-asia"] }).map((i) => i.id)
    ).toEqual(["b"])
    expect(
      filterItems(items, { ...all, genres: ["war"] }).map((i) => i.id)
    ).toEqual(["c"])
  })

  it("searches names, aliases and summary", () => {
    expect(searchItems(items, "battle").map((i) => i.id)).toEqual(["c"])
    expect(searchItems(items, "戦い").map((i) => i.id)).toEqual(["c"])
    expect(searchItems(items, "  ")).toEqual([])
    expect(searchItems(ITEMS, "前漢")[0].id).toBe("han-dynasty")
  })
})

describe("lane layout", () => {
  const scale = createScale(-1000, 2000, 1)

  it("packs overlapping periods into separate columns", () => {
    const { bands, columns } = layoutLane(
      [
        base,
        { ...base, id: "b", startYear: 50, endYear: 300 },
        { ...base, id: "c", startYear: 200, endYear: 400 },
      ],
      scale
    )
    expect(columns).toBe(2)
    expect(bands.find((b) => b.item.id === "b")!.column).toBe(1)
    expect(bands.find((b) => b.item.id === "c")!.column).toBe(0)
  })

  it("draws uncertainty separately from the representative span", () => {
    const [b] = layoutLane(
      [{ ...base, startYearMin: -200, endYearMax: 150 }],
      scale
    ).bands
    expect(b.top).toBe(scale.top(-100))
    expect(b.uncertainTop).toBe(scale.top(-200))
    expect(b.uncertainTop + b.uncertainHeight).toBe(scale.top(150) + 1)
  })
})

describe("url state", () => {
  it("round-trips and rejects invalid values", async () => {
    const { parseView, serializeView, DEFAULT_VIEW } =
      await import("./urlState")
    const v = {
      ...DEFAULT_VIEW,
      from: -500,
      to: 500,
      regions: ["europe"],
      lane: "genre" as const,
      selected: "han-dynasty",
    }
    expect(parseView(serializeView(v))).toEqual(v)
    expect(serializeView(DEFAULT_VIEW)).toBe("")
    const bad = parseView("?from=0&to=abc&z=999&r=atlantis,europe")
    expect(bad.from).toBe(DEFAULT_VIEW.from)
    expect(bad.to).toBe(DEFAULT_VIEW.to)
    expect(bad.pxPerYear).toBe(DEFAULT_VIEW.pxPerYear)
    expect(bad.regions).toEqual(["europe"])
  })
})

describe("event uncertainty", () => {
  it("spans min to max for disputed events", () => {
    const scale = createScale(-1000, 2000, 1)
    const ev: HistoryItem = {
      ...base,
      type: "event",
      startYear: -480,
      endYear: undefined,
      startYearMin: -563,
      startYearMax: -400,
    }
    const [m] = layoutLane([ev], scale).markers
    expect(m.uncertain!.top).toBe(scale.top(-563))
    expect(m.uncertain!.top + m.uncertain!.height).toBe(scale.top(-400) + 1)
    const [plain] = layoutLane(
      [{ ...ev, startYearMin: undefined, startYearMax: undefined }],
      scale
    ).markers
    expect(plain.uncertain).toBeNull()
  })
})

describe("lanes", () => {
  it("builds mixed lanes in compare mode", async () => {
    const { laneDefs } = await import("./lanes")
    const { DEFAULT_VIEW, parseView, serializeView } =
      await import("./urlState")
    const v = {
      ...DEFAULT_VIEW,
      lane: "compare" as const,
      compare: ["g:war", "r:europe", "x:bad"],
    }
    const lanes = laneDefs(v)
    expect(lanes.map((l) => l.key)).toEqual(["g:war", "r:europe"])
    expect(lanes[0].match({ ...base, genres: ["war"] })).toBe(true)
    expect(lanes[1].match({ ...base, regions: ["east-asia"] })).toBe(false)
    expect(
      laneDefs({ ...DEFAULT_VIEW, regions: ["europe"] }).map((l) => l.key)
    ).toEqual(["r:europe"])
    // URL 往復で順序維持・不正キー除去
    expect(parseView(serializeView(v)).compare).toEqual(["g:war", "r:europe"])
    expect(parseView("?lane=compare&c=").compare).toEqual([])
  })
})
