# 世界史クロスビュー（World History Crossview）

世界史の出来事を、地域・ジャンルを超えて同じ縦の時間軸上に並べ、同時代の動きを比較・探索できる年表 Web サービスの MVP です。

- 地域別（またはジャンル別）のレーンを並べた縦型タイムライン
- 期間型（王朝・国家）は帯、時点型（戦争・発明）は記号マーカー、範囲型（伝播・交易）は斜線の帯＋レーン間の破線
- 推定年代の幅（`startYearMin` など）は帯の周囲の点線枠で表示
- ズーム（ボタン・スライダー・Ctrl/⌘＋ホイール・＋/−キー）、地域・ジャンル・年代フィルター、キーワード検索
- 詳細パネル（年代・確度・地域・ジャンル・概要・関連項目・出典）、項目ごとの個別ページ `/items/{id}/`
- 表示状態は URL クエリ（`from` `to` `z` `r` `g` `lane` `sel`）に保存され共有可能

## 技術スタック

Next.js 16（App Router / Static Export）・React 19・TypeScript・Vitest。描画は HTML/CSS（絶対配置）で、外部 API・DB は不要です。

## 起動・ビルド

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # 単体テスト（年代変換・座標・フィルター・データ検証）
pnpm lint
pnpm typecheck
pnpm build      # 静的サイトを ./out に出力
```

`main` への push で GitHub Pages にデプロイされます（`.github/workflows/deploy.yml`）。本番の `basePath` は `next.config.js` の `/rcross` です。リポジトリ名を変える場合は合わせて変更してください。

## ディレクトリ構成

```
app/
  page.tsx            # 年表（メイン画面）
  about/page.tsx      # 使い方・データ方針
  items/[id]/page.tsx # 項目の個別ページ（静的生成）
components/
  Timeline.tsx        # 年表 UI（状態・URL 同期・操作）
  ItemDetail.tsx      # 詳細表示（パネルと個別ページで共用）
data/items.json       # 歴史項目データ（一次データ）
lib/
  years.ts            # 紀元前/紀元後 ⇔ 内部年・天文年の変換、表示
  scale.ts            # 年 ⇔ ピクセル座標、目盛り
  layout.ts           # レーン内の帯の列詰め・ラベル間引き
  filter.ts           # フィルター・検索
  data.ts             # 型・地域/ジャンル定義・データ検証
  urlState.ts         # URL クエリ ⇔ 表示状態
```

## 年代の扱い

- 内部では符号付き整数。紀元前は負数、紀元後は正数で、**年 0 は存在しません**（前1年の次は1年）。
- 座標計算は天文年（前1年 = 0）に変換してから行うため、紀元をまたいでも1年ずれません。変換は `lib/years.ts` に集約しています。
- 期間は「開始年の初め〜終了年の終わり」を占めます（前206年〜220年 = 426年分）。縮尺は線形です。

## データの追加方法

`data/items.json` に項目を追加するだけで、コード変更なしに年表・検索・個別ページへ反映されます。

```json
{
  "id": "han-dynasty",
  "name": "漢",
  "nameEn": "Han dynasty",
  "aliases": ["前漢", "後漢"],
  "type": "period",
  "startYear": -206,
  "endYear": 220,
  "startYearMax": -202,
  "datePrecision": "approximate",
  "regions": ["east-asia"],
  "genres": ["politics", "society"],
  "summary": "中国史における王朝。",
  "relatedIds": ["roman-empire"],
  "sources": [
    {
      "title": "Wikipedia: Han dynasty",
      "url": "https://en.wikipedia.org/wiki/Han_dynasty"
    }
  ],
  "reviewed": false
}
```

- `type`: `period`（期間型）/ `event`（時点型、`endYear` 省略可）/ `process`（範囲型）
- `datePrecision`: `exact`（確定）/ `approximate`（推定）/ `disputed`（諸説あり）
- `startYearMin` / `startYearMax` / `endYearMin` / `endYearMax`: 年代の幅（任意）。`startYear` / `endYear` は代表値
- `regions` / `genres`: `lib/data.ts` の `REGIONS` / `GENRES` の ID
- `sources`: 1件以上必須
- `reviewed`: 出典と照合済みなら `true`。`false` の項目は画面で「サンプル・未検証」と表示し、個別ページは `noindex` になります

追加後は `pnpm test` を実行してください。ID 重複、年 0、不正な地域/ジャンル ID、存在しない `relatedIds`、出典欠落、年代の矛盾を検知します（開発サーバーでも不正データは読み込み時にエラーになります）。

## 現状のデータについて

収録している約85件は **サンプルデータ** です。各項目に参考出典（主に英語版 Wikipedia）を付けていますが、出典との照合は未完了（全件 `reviewed: false`）で、画面上もその旨を表示しています。公開前に内容を確認し、照合済みの項目から `reviewed: true` にしてください。

## 未実装・今後

- タッチ端末のピンチズーム（ボタン・スライダーで代替。トラックパッドのピンチは対応）
- 比較モード（地域・ジャンルフィルターで選んだレーンだけを並べることで代替）
- 時点型の推定幅の図示（詳細欄には表示）

## ライセンス

ISC
