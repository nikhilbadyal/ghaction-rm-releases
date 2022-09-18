import { getInput } from '@actions/core'

export interface ActionInputs {
  readonly GITHUB_TOKEN: string
  readonly RELEASE_PATTERN: string
}
export function getInputs(): ActionInputs {
  return {
    GITHUB_TOKEN: getInput('GITHUB_TOKEN', { required: true }),
    RELEASE_PATTERN: getInput('RELEASE_PATTERN', { required: true })
  }
}

export const asyncForEach = async (array, callback): Promise<void> => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
