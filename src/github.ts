import { getOctokit, context } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'
import { info, setFailed } from '@actions/core'
import { asyncForEach } from './utils'
import type { OctokitOptions } from '@octokit/core/dist-types/types'

export interface Release {
  id: number
  name: string
  tag_name: string
  body: string
  draft: boolean
  prerelease: boolean
}
export interface Tag {
  name: string
}
const minimumReleases = 0
export function getMyOctokit(
  token: string,
  options?: OctokitOptions
): InstanceType<typeof GitHub> {
  info('Initiating GitHub connection.')
  if (token === '') {
    setFailed('Need "Github Token')
    throw new Error('Need Github Token')
  }
  return getOctokit(token, options)
}

export async function getReleases(
  octokit,
  pattern: string
): Promise<Release[]> {
  info(`Getting releases matching with ${pattern}`)
  try {
    const releases: Release[] = await octokit.paginate(
      octokit.rest.repos.listReleases,
      {
        ...context.repo
      }
    )
    return releases.filter(function releaseFilter(release) {
      return release.tag_name.match(pattern)
    })
  } catch (error) {
    throw new Error(`Unable to list release: ${error}`)
  }
}
export async function deleteRelease(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<void> {
  info(`Deleting release ${release.id}`)
  try {
    await octokit.rest.repos.deleteRelease({
      ...context.repo,
      release_id: release.id
    })
  } catch (error) {
    throw new Error(`Unable to release tag ${release.id}: ${error}`)
  }
}

export async function deleteTag(
  octokit: InstanceType<typeof GitHub>,
  tagName: string
): Promise<void> {
  info(`Deleting tag ${tagName}`)
  try {
    await octokit.rest.git.deleteRef({
      ...context.repo,
      ref: `tags/${tagName}`
    })
  } catch (error) {
    throw new Error(`Unable to delete tag ${tagName}: ${error}`)
  }
}

async function deleteReleaseAndTag(
  octokit: InstanceType<typeof GitHub>,
  release: Release
): Promise<void> {
  await deleteRelease(octokit, release)
  await deleteTag(octokit, release.tag_name)
}

export async function rmReleases(
  octokit: InstanceType<typeof GitHub>,
  releasePattern: string
): Promise<void> {
  const releases: Release[] = await getReleases(octokit, releasePattern)
  const matches: number = releases.length
  if (matches > minimumReleases) {
    info(`Found ${releases.length.toString()} release to delete.`)
    await asyncForEach(releases, async (release: Release) => {
      await deleteReleaseAndTag(octokit, release)
    })
  } else {
    info('No release to delete.')
  }
}
