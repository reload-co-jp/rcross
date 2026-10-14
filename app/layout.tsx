import Link from "next/link"
import { Header, Title } from "@/components/elements/layout"
import "./reset.css"

export const metadata = {
  title: {
    default: "世界史クロスビュー",
    template: "%s | 世界史クロスビュー",
  },
  description:
    "世界史の出来事を地域・ジャンルを超えて同じ時間軸に並べ、同時代の動きを比較できる年表。",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <body>
        <Header>
          <Title>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              🌏 世界史クロスビュー
            </Link>
          </Title>
          <nav style={{ fontSize: ".8rem", whiteSpace: "nowrap" }}>
            <Link href="/about/">使い方</Link>
          </nav>
        </Header>
        {children}
      </body>
    </html>
  )
}
export default RootLayout
