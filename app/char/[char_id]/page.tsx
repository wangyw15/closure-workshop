import { notFound } from "next/navigation"

import { SpinePlayer } from "@/components/spine-player"

interface CharacterMetadata {
  name: string
  prefix: string
  skin: Record<string, Record<string, { file: string }>>
}

interface CharacterPageProps {
  params: Promise<{ char_id: string }>
  searchParams: Promise<{
    skin?: string | string[]
    model?: string | string[]
    control?: string | string[]
  }>
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function CharacterPage({
  params,
  searchParams,
}: CharacterPageProps) {
  const [{ char_id: charId }, query] = await Promise.all([params, searchParams])
  const skinName = getSearchParam(query.skin) || "默认"
  const modelName = getSearchParam(query.model) || "正面"
  const showControls = getSearchParam(query.control) === "true"
  const metadataUrl = `https://torappu.prts.wiki/assets/char_spine/${encodeURIComponent(charId)}/meta.json`
  const response = await fetch(metadataUrl, {
    headers: { Accept: "application/json" },
  })

  if (response.status === 404) {
    notFound()
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch character metadata: ${response.status}`)
  }

  const metadata = (await response.json()) as CharacterMetadata
  const model = metadata.skin[skinName]?.[modelName]

  if (!model) {
    notFound()
  }

  const resourceUrl = `${metadata.prefix}${model.file}`
  const config = {
    skelUrl: `${resourceUrl}.skel`,
    atlasUrl: `${resourceUrl}.atlas`,
    showControls,
  }

  return (
    <main className="h-svh w-full bg-black">
      <h1 className="sr-only">
        {metadata.name} - {skinName} - {modelName}
      </h1>
      {/* 默认隐藏控制栏且屏蔽鼠标事件:画布点击会切换暂停,需一并拦截 */}
      <div
        className={
          showControls
            ? "h-full w-full"
            : "pointer-events-none h-full w-full"
        }
      >
        <SpinePlayer
          config={config}
          className="h-full w-full"
          aria-label={`${metadata.name} ${skinName} ${modelName}`}
        />
      </div>
    </main>
  )
}
