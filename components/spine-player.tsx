"use client"

import * as React from "react"
import spinePlayerUrl from "@closure-workshop/spine-player/build/spine-player.js?url"

import "./spine-player.css"

type SpineRuntime = typeof spine
type SpinePlayerInstance = spine.SpinePlayer
type SpineWindow = Window & { spine?: SpineRuntime }

type SpinePlayerSource =
  | { jsonUrl: string; skelUrl?: string }
  | { jsonUrl?: string; skelUrl: string }

export type SpinePlayerConfig = Partial<
  Omit<
    spine.SpinePlayerConfig,
    "jsonUrl" | "skelUrl" | "atlasUrl" | "success" | "error"
  >
> &
  SpinePlayerSource & {
    atlasUrl: string
  }

export interface SpinePlayerHandle {
  readonly player: SpinePlayerInstance | null
}

export interface SpinePlayerProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onError"> {
  config: SpinePlayerConfig
  onReady?: (player: SpinePlayerInstance) => void
  onError?: (player: SpinePlayerInstance | null, message: string) => void
}

let spinePlayerPromise: Promise<SpineRuntime> | null = null

function loadSpinePlayer(): Promise<SpineRuntime> {
  const runtime = (window as SpineWindow).spine
  if (runtime) {
    return Promise.resolve(runtime)
  }

  if (spinePlayerPromise) {
    return spinePlayerPromise
  }

  spinePlayerPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = spinePlayerUrl
    script.async = true

    script.onload = () => {
      const runtime = (window as SpineWindow).spine
      if (runtime) {
        resolve(runtime)
        return
      }

      script.remove()
      spinePlayerPromise = null
      reject(new Error("Spine Player loaded without exposing its runtime."))
    }

    script.onerror = () => {
      script.remove()
      spinePlayerPromise = null
      reject(new Error("Failed to load Spine Player."))
    }

    document.head.appendChild(script)
  })

  return spinePlayerPromise
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const SpinePlayer = React.forwardRef<SpinePlayerHandle, SpinePlayerProps>(
  function SpinePlayer({ config, onReady, onError, ...props }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const playerRef = React.useRef<SpinePlayerInstance | null>(null)
    const onReadyRef = React.useRef(onReady)
    const onErrorRef = React.useRef(onError)

    React.useImperativeHandle(
      ref,
      () => ({
        get player() {
          return playerRef.current
        },
      }),
      []
    )

    React.useEffect(() => {
      onReadyRef.current = onReady
      onErrorRef.current = onError
    })

    React.useEffect(() => {
      const container = containerRef.current
      if (!container) {
        return
      }

      let player: SpinePlayerInstance | null = null
      let disposed = false

      void loadSpinePlayer().then(
        (runtime) => {
          if (disposed) {
            return
          }

          try {
            player = new runtime.SpinePlayer(container, {
              ...config,
              success: (widget: SpinePlayerInstance) => {
                if (!disposed) {
                  onReadyRef.current?.(widget)
                }
              },
              error: (widget: SpinePlayerInstance, message: string) => {
                if (!disposed) {
                  onErrorRef.current?.(widget, getErrorMessage(message))
                }
              },
            } as spine.SpinePlayerConfig)
            playerRef.current = player
          } catch (error) {
            onErrorRef.current?.(null, getErrorMessage(error))
          }
        },
        (error: unknown) => {
          if (!disposed) {
            onErrorRef.current?.(null, getErrorMessage(error))
          }
        }
      )

      return () => {
        disposed = true
        player?.stopRendering()
        playerRef.current = null
        container.replaceChildren()
      }
    }, [config])

    return <div ref={containerRef} data-slot="spine-player" {...props} />
  }
)

export { SpinePlayer }
