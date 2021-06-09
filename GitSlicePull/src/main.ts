import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'
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
  slice_git_token?: string
  slice_git_username?: string
  upstream_git_username?: string
  upstream_git_email: string
  upstream_git_token?: string
  slice_default_branch: string
  slice_owner: string
  slice_repo: string

  git_slice_config: GitSliceConfig
}

async function main(): Promise<void> {
  // Use secrets.GITHUB_TOKEN for this
  const slice_git_token = core.getInput('slice_git_token', {
    required: true
  })

  // Get from GitHub app installation
  const upstream_git_username = core.getInput('upstream_git_username', {
    required: false
  })
  const slice_git_username = core.getInput('slice_git_username', {
    required: false
  })
  const upstream_git_token = core.getInput('upstream_git_token', {
    required: false
  })

  // Must provie email of gitstart bot specific to client
  const upstream_git_email = core.getInput('upstream_git_email', {
    required: true
  })

  const octokit = getOctokit(slice_git_token)
  // get from octokit library
  const repoData = await octokit.request('GET /repos/{owner}/{repo}', {
    owner: context.repo.owner,
    repo: context.repo.repo
  })

  const slice_default_branch = repoData.data.default_branch

  const gitSliceFile = await fs.readFile('./git-slice.json')
  const body: GitSlicePullRequestBody = {
    slice_git_token,
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
    body,
    {
      responseType: 'stream'
    }
  )

  if (resp.data && resp.data.error && !resp.data.success) {
    console.error('got back error with pull: ', resp.data.error)
    return core.setFailed(`Unhandled error with pull`)
  }

  // Shows response as it comes in ...
  const stream = resp.data
  await new Promise((res, rej) => {
    stream.on('data', (chunk: any) => {
      const str = ab2str(chunk)
      if (isError(str)) {
        rej(str)
      } else {
        console.log(str)
      }
    })
    stream.on('end', res)
  })

  core.setOutput('result', 'Success')
}

function isError(str: string) {
  return str.toLowerCase().includes('error')
}

function ab2str(buf: any) {
  return String.fromCharCode.apply(null, buf)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
