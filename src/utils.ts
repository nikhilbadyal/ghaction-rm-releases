import { getInput } from "@actions/core"

export interface ActionInputs {
  readonly GITHUB_TOKEN: string
  readonly RELEASE_PATTERN: string
}
export function getInputs(): ActionInputs {
  return {
    GITHUB_TOKEN: getInput("GITHUB_TOKEN", { required: true }),
    RELEASE_PATTERN: getInput("RELEASE_PATTERN", { required: true })
  }
}
