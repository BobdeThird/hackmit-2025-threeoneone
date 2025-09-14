// Disable AI SDK warning logs globally (side-effect import)
declare global {
  // eslint-disable-next-line no-var
  var AI_SDK_LOG_WARNINGS: boolean | undefined
}

if (typeof globalThis !== 'undefined') {
  ;(globalThis as any).AI_SDK_LOG_WARNINGS = false
}

export {}


