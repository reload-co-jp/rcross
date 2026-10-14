import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Footer, Main } from "@/components/elements/layout"
import { ItemDetail, itemYears } from "@/components/ItemDetail"
import { ITEM_BY_ID, ITEMS } from "@/lib/data"

type Props = { params: Promise<{ id: string }> }

export const dynamicParams = false

export const generateStaticParams = () => ITEMS.map((it) => ({ id: it.id }))

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const item = ITEM_BY_ID.get((await params).id)
  if (!item) return {}
  return {
    title: `${item.name}（${itemYears(item)}）`,
    description: item.summary,
    // 出典照合前の項目は検索エンジンに載せない
    robots: item.reviewed ? undefined : { index: false, follow: true },
  }
}

const ItemPage = async ({ params }: Props) => {
  const item = ITEM_BY_ID.get((await params).id)
  if (!item) notFound()
  return (
    <>
      <Main>
        <p style={{ fontSize: ".85rem", marginBottom: "1rem" }}>
          <Link href={`/?sel=${item.id}`}>← 年表で見る</Link>
        </p>
        <ItemDetail item={item} headingLevel={1} />
      </Main>
      <Footer>
        <p>世界史クロスビュー</p>
      </Footer>
    </>
  )
}

export default ItemPage
