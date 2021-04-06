import * as core from '@actions/core'
import {context} from '@actions/github'
import axios from 'axios'
import {promises as fs} from 'fs'

process.on('unhandledRejection', handleError)
main().catch(handleError)

interface GitSliceConfig {
  repoUrl: string
  folders: Array<string>
  branch: string
  ignore: Array<string>
}

interface GitSlicePullRequestBody {
  slice_github_token: string
  slice_git_username: string
  upstream_git_username?: string
  upstream_git_email: string
  upstream_git_token?: string
  slice_default_branch: string
  slice_owner: string
  slice_repo: string

  git_slice_config: GitSliceConfig
}

async function main(): Promise<void> {
  const slice_github_token = core.getInput('slice_github_token', {
    required: true
  })
  const upstream_git_username = core.getInput('upstream_git_username', {
    required: false
  })

  const slice_git_username = core.getInput('slice_git_username', {
    required: true
  })
  const upstream_git_token = core.getInput('upstream_git_token', {
    required: false
  })
  const upstream_git_email = core.getInput('upstream_git_email', {
    required: true
  })
  const slice_default_branch = core.getInput('slice_default_branch', {
    required: true
  })

  const gitSliceFile = await fs.readFile('./git-slice.json')
  const body: GitSlicePullRequestBody = {
    slice_github_token,
    upstream_git_username,
    upstream_git_email,
    upstream_git_token,
    slice_default_branch,
    slice_git_username,

    slice_owner: context.repo.owner,
    slice_repo: context.repo.repo,

    git_slice_config: JSON.parse(gitSliceFile.toString())
  }

  const resp = await axios.post(
    `https://hooks.gitstart.com/api/gitslice/pull`,
    body
  )

  if (resp.data && resp.data.error && !resp.data.success) {
    console.error('got back error with pull: ', resp.data.error)
    return core.setFailed(`Unhandled error with pull`)
  }

  console.log(
    'got back response from API: ',
    resp.data,
    resp.status,
    resp.statusText
  )

  core.setOutput('result', 'Success')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}