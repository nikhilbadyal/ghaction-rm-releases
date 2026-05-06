import { getInput } from "@actions/core"

export interface ActionInputs {
  readonly GITHUB_TOKEN: string
  readonly RELEASE_PATTERN: string
  readonly RELEASES_TO_KEEP: number
  readonly MIN_RELEASES_TO_KEEP: number
  readonly EXCLUDE_PATTERN: string
  readonly DAYS_TO_KEEP: number
  readonly DRY_RUN: boolean
  readonly DELETE_TAGS: boolean
  readonly DELETE_DRAFT_RELEASES_ONLY: boolean
  readonly DELETE_PRERELEASES_ONLY: boolean
  readonly TARGET_BRANCH_PATTERN: string
  readonly MAX_CONCURRENCY: number
}

function parseIntegerInput(
  name: string,
  defaultValue: number,
  minimumValue: number
): number {
  const inputValue = getInput(name, { required: false })

  if (!inputValue || inputValue.trim() === "") {
    return defaultValue
  }

  const parsedValue = Number(inputValue)
  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimumValue ||
    inputValue !== parsedValue.toString()
  ) {
    throw new Error(
      `${name} must be ${minimumValue === 0 ? "a non-negative" : "a positive"} integer.`
    )
  }

  return parsedValue
}

function parseBooleanInput(name: string, defaultValue: boolean): boolean {
  const inputValue = getInput(name, { required: false })

  if (!inputValue || inputValue.trim() === "") {
    return defaultValue
  }

  // GitHub's toolkit accepts YAML 1.2 boolean spellings, so keep that runtime contract while still allowing local tests to omit optional action defaults.
  if (["true", "True", "TRUE"].includes(inputValue)) {
    return true
  }

  if (["false", "False", "FALSE"].includes(inputValue)) {
    return false
  }

  throw new Error(`${name} must be a boolean value: true or false.`)
}

export function getInputs(): ActionInputs {
  const releasesToKeep = parseIntegerInput("RELEASES_TO_KEEP", 0, 0)
  const daysToKeep = parseIntegerInput("DAYS_TO_KEEP", 0, 0)
  const maxConcurrency = parseIntegerInput("MAX_CONCURRENCY", 5, 1)
  const minReleasesToKeep = parseIntegerInput("MIN_RELEASES_TO_KEEP", 0, 0)

  return {
    DAYS_TO_KEEP: daysToKeep,
    DELETE_DRAFT_RELEASES_ONLY: parseBooleanInput(
      "DELETE_DRAFT_RELEASES_ONLY",
      false
    ),
    DELETE_PRERELEASES_ONLY: parseBooleanInput(
      "DELETE_PRERELEASES_ONLY",
      false
    ),
    DELETE_TAGS: parseBooleanInput("DELETE_TAGS", true),
    DRY_RUN: parseBooleanInput("DRY_RUN", false),
    EXCLUDE_PATTERN: getInput("EXCLUDE_PATTERN", { required: false }),
    GITHUB_TOKEN: getInput("GITHUB_TOKEN", { required: true }),
    MAX_CONCURRENCY: maxConcurrency,
    MIN_RELEASES_TO_KEEP: minReleasesToKeep,
    RELEASES_TO_KEEP: releasesToKeep,
    RELEASE_PATTERN: getInput("RELEASE_PATTERN", { required: true }),
    TARGET_BRANCH_PATTERN: getInput("TARGET_BRANCH_PATTERN", {
      required: false
    })
  }
}
