import { notFound } from "next/navigation"

import { SpinePlayer } from "@/components/spine-player"
import Image from "next/image"

const DYN_BASE_URL = "https://static.prts.wiki/spine38"

interface SkinPageProps {
  params: Promise<{ skin_id: string }>
  searchParams: Promise<{
    control?: string | string[]
  }>
}

interface DynLayers {
  background: string | null
  foreground: string | null
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

// 动态立绘资源 ID 为 dyn_illust_<皮肤ID>,但 PRTS 对结尾序号的命名不统一:
// 小人素材用单下划线(char_113_cqbw_epoque_7),动态立绘常用双下划线
// (dyn_illust_char_113_cqbw_epoque__7)。无法从皮肤 ID 机械推导,
// 故按候选顺序探测,首个存在的即为目标;均无则该皮肤无动态立绘。
function getDynCandidates(skinId: string): string[] {
  const candidates = [
    `dyn_illust_${skinId}`,
    `dyn_illust_${skinId.replace(/_(\d+)$/, "__$1")}`,
  ]
  return [...new Set(candidates)]
}

async function resolveDynId(skinId: string): Promise<string | null> {
  for (const candidate of getDynCandidates(skinId)) {
    const skelUrl = `${DYN_BASE_URL}/dyn/${candidate}/${candidate}/${candidate}.skel`
    const response = await fetch(skelUrl, { method: "HEAD" })

    if (response.ok) {
      return candidate
    }
  }

  return null
}

// 动态立绘可选的静态背景层/前景层,按 PRTS 惯例命名 _bg.png / _fg.png,
// 并非每个皮肤都有,逐个探测
async function resolveDynLayers(dynId: string): Promise<DynLayers> {
  const layers: DynLayers = { background: null, foreground: null }

  for (const [key, suffix] of [
    ["background", "_bg.png"],
    ["foreground", "_fg.png"],
  ] as const) {
    const upstreamUrl = `${DYN_BASE_URL}/dynbg/${dynId}/${dynId}${suffix}`
    const response = await fetch(upstreamUrl, { method: "HEAD" })

    if (response.ok) {
      layers[key] = `/spine/dynbg/${dynId}/${dynId}${suffix}`
    }
  }

  return layers
}

export default async function SkinPage({ params, searchParams }: SkinPageProps) {
  const [{ skin_id: skinId }, query] = await Promise.all([params, searchParams])
  const showControls = getSearchParam(query.control) === "true"
  const dynId = await resolveDynId(skinId)

  if (!dynId) {
    notFound()
  }

  const layers = await resolveDynLayers(dynId)

  // static.prts.wiki 无 CORS 响应头,浏览器无法直连,
  // 经 /spine/dyn/[...asset] 与 /spine/dynbg/[...asset] 路由代理同源加载
  const resourceUrl = `/spine/dyn/${dynId}/${dynId}/${dynId}`
  const config = {
    skelUrl: `${resourceUrl}.skel`,
    atlasUrl: `${resourceUrl}.atlas`,
    showControls,
    // 画布默认不透明(黑色),会挡住下方的背景图层,需显式开启透明
    alpha: true,
    backgroundColor: "#00000000",
  }

  return (
    <main className="relative h-svh w-full overflow-hidden bg-black">
      {layers.background && (
        <Image
          src={layers.background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {/* 默认隐藏控制栏且屏蔽鼠标事件:画布点击会切换暂停,需一并拦截 */}
      <div
        className={
          showControls ? "absolute inset-0" : "pointer-events-none absolute inset-0"
        }
      >
        <SpinePlayer
          config={config}
          className="h-full w-full"
          aria-label={`动态立绘 ${skinId}`}
        />
      </div>
      {layers.foreground && (
        <Image
          src={layers.foreground}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      )}
      <h1 className="sr-only">{skinId}</h1>
    </main>
  )
}
