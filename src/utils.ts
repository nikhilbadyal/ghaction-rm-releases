import { getInput } from "@actions/core"

export interface ActionInputs {
  readonly GITHUB_TOKEN: string
  readonly RELEASE_PATTERN: string
  readonly RELEASES_TO_KEEP: number
  readonly EXCLUDE_PATTERN: string
  readonly DAYS_TO_KEEP: number
  readonly DRY_RUN: boolean
}
export function getInputs(): ActionInputs {
  const releasesToKeepInput = getInput("RELEASES_TO_KEEP", { required: false })
  let releasesToKeep: number

  if (releasesToKeepInput && releasesToKeepInput.trim() !== "") {
    const parsedValue = parseInt(releasesToKeepInput)
    if (
      isNaN(parsedValue) ||
      parsedValue < 0 ||
      releasesToKeepInput !== parsedValue.toString()
    ) {
      throw new Error("RELEASES_TO_KEEP must be a non-negative integer.")
    }
    releasesToKeep = parsedValue
  } else {
    releasesToKeep = 0
  }

  const daysToKeepInput = getInput("DAYS_TO_KEEP", { required: false })
  let daysToKeep: number

  if (daysToKeepInput && daysToKeepInput.trim() !== "") {
    const parsedValue = parseInt(daysToKeepInput)
    if (
      isNaN(parsedValue) ||
      parsedValue < 0 ||
      daysToKeepInput !== parsedValue.toString()
    ) {
      throw new Error("DAYS_TO_KEEP must be a non-negative integer.")
    }
    daysToKeep = parsedValue
  } else {
    daysToKeep = 0
  }

  return {
    DAYS_TO_KEEP: daysToKeep,
    DRY_RUN: getInput("DRY_RUN", { required: false }) === "true",
    EXCLUDE_PATTERN: getInput("EXCLUDE_PATTERN", { required: false }),
    GITHUB_TOKEN: getInput("GITHUB_TOKEN", { required: true }),
    RELEASES_TO_KEEP: releasesToKeep,
    RELEASE_PATTERN: getInput("RELEASE_PATTERN", { required: true })
  }
}
