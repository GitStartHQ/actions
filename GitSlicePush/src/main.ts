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

export interface GitSlicePushRequestBody {
  slice_git_token?: string
  slice_git_username?: string
  upstream_git_username?: string
  upstream_git_email: string
  upstream_git_token?: string
  slice_default_branch: string
  slice_branch_to_push: string
  custom_commit_message: string
  push_pr?: boolean
  overide_previous_push?: boolean

  slice_owner: string
  slice_repo: string

  git_slice_config: GitSliceConfig
}

async function main(): Promise<void> {
  const slice_git_token = core.getInput('slice_github_token', {
    required: false
  })
  const upstream_git_username = core.getInput('upstream_git_username', {
    required: false
  })

  const slice_git_username = core.getInput('slice_git_username', {
    required: false
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
  const slice_branch_to_push = core.getInput('slice_branch_to_push', {
    required: true
  })
  const custom_commit_message = core.getInput('custom_commit_message', {
    required: true
  })
  const push_pr = core.getInput('push_pr', {
    required: false
  })
  const overide_previous_push = core.getInput('overide_previous_push', {
    required: false
  })

  const gitSliceFile = await fs.readFile('./git-slice.json')
  const body: GitSlicePushRequestBody = {
    slice_git_token,
    upstream_git_username,
    upstream_git_email,
    upstream_git_token,
    slice_default_branch,
    slice_git_username,
    slice_branch_to_push,
    custom_commit_message,
    overide_previous_push: overide_previous_push === 'true',
    push_pr: push_pr === 'true',

    slice_owner: context.repo.owner,
    slice_repo: context.repo.repo,

    git_slice_config: JSON.parse(gitSliceFile.toString())
  }

  const resp = await axios.post(
    `https://dacf08cf7c55.ngrok.io/api/gitslice/push`,
    body,
    {
      responseType: 'stream'
      // adapter: httpAdapter
    }
  )

  if (resp.data && resp.data.error && !resp.data.success) {
    console.error('got back error with pull: ', resp.data.error)
    return core.setFailed(`Unhandled error with pull`)
  }

  // Shows response as it comes in ...
  const stream = resp.data
  stream.on('data', (chunk: any) => {
    console.log(`Rec data`, chunk)
    const buf = Buffer.from(chunk)
    console.log(buf)
  })

  await new Promise((res, rej) => {
    stream.on('end', res)
  })

  // console.log(
  //   'got back response from API: ',
  //   resp.data,
  //   resp.status,
  //   resp.statusText
  // )

  core.setOutput('result', 'Success')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
