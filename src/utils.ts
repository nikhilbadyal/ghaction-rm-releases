import { getInput } from "@actions/core"

export interface ActionInputs {
  readonly GITHUB_TOKEN: string
  readonly RELEASE_PATTERN: string
  readonly RELEASES_TO_KEEP: number
}
export function getInputs(): ActionInputs {
  const releasesToKeepInput = getInput("RELEASES_TO_KEEP", { required: false })
  let releasesToKeep: number

  if (releasesToKeepInput) {
    const parsedValue = parseInt(releasesToKeepInput)
    if (isNaN(parsedValue) || parsedValue < 0) {
      throw new Error("RELEASES_TO_KEEP must be a non-negative integer.")
    }
    releasesToKeep = parsedValue
  } else {
    releasesToKeep = 0
  }

  return {
    GITHUB_TOKEN: getInput("GITHUB_TOKEN", { required: true }),
    RELEASES_TO_KEEP: Math.max(0, releasesToKeep),
    RELEASE_PATTERN: getInput("RELEASE_PATTERN", { required: true })
  }
}
