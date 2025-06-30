import { getOctokit, context } from "@actions/github"
import type { GitHub } from "@actions/github/lib/utils"
import { info, setFailed } from "@actions/core"
import type { OctokitOptions } from "@octokit/core/dist-types/types"

export interface Release {
  id: number
  name: string
  tag_name: string
  body: string
  draft: boolean
  prerelease: boolean
}

const minimumReleases = 0
export function getMyOctokit(
  token: string,
  options?: OctokitOptions
): InstanceType<typeof GitHub> {
  info("Initiating GitHub connection.")
  if (!token || token.trim() === "") {
    setFailed("Need Github Token")
    throw new Error("Need Github Token")
  }
  return getOctokit(token, options)
}

export async function getReleases(
  octokit,
  pattern: string
): Promise<Release[]> {
  info(`Getting releases matching with ${pattern}`)

  // Return empty array for empty pattern
  if (!pattern || pattern === "") {
    return []
  }

  try {
    const releases: Release[] = await octokit.paginate(
      octokit.rest.repos.listReleases,
      {
        ...context.repo
      }
    )
    const regex = new RegExp(pattern)
    return releases.filter(function releaseFilter(release) {
      // Handle null/undefined release objects and tag_name gracefully
      if (!release?.tag_name) {
        return false
      }
      return regex.test(release.tag_name)
    })
  } catch (error) {
    throw new Error(
      `Unable to list release: ${error instanceof Error ? error.message : String(error)}`
    )
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
    throw new Error(
      `Unable to delete release ${release.id}: ${error instanceof Error ? error.message : String(error)}`
    )
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
    throw new Error(
      `Unable to delete tag ${tagName}: ${error instanceof Error ? error.message : String(error)}`
    )
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
    await Promise.all(
      releases.map(async release => {
        await deleteReleaseAndTag(octokit, release)
      })
    )
  } else {
    info("No release to delete.")
  }
}
