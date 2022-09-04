import { getInput } from '@actions/core'

export interface ActionInputs {
  readonly github_token: string
  readonly release_pattern: string
}
export function getInputs(): ActionInputs {
  return {
    github_token: getInput('github_token', { required: true }),
    release_pattern: getInput('release_pattern', { required: true })
  }
}

export const asyncForEach = async (array, callback): Promise<void> => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
