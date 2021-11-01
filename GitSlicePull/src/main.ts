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
  const slice_git_token = core.getInput('slice_git_token', {
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

  let retries = 3

  while (retries > 0) {
    try {
      const resp = await axios.post(
        `https://hooks.gitstart.com/api/gitslice/pull`,
        body,
        {
          responseType: 'stream'
        }
      )

      if (resp.data && resp.data.error && !resp.data.success) {
        throw resp.data.error
      }

      // Shows response as it comes in ...
      const stream = resp.data
      await new Promise((res, rej) => {
        let isErrored = false,
          isSuccessful = false
        stream.on('data', (chunk: any) => {
          const str = ab2str(chunk)
          console.log(str)
          if (isError(str)) {
            isErrored = true
            rej(str)
          } else if (isSuccess(str)) {
            isSuccessful = true
            res(str)
          }
        })
        stream.on('end', () => {
          if (!isErrored && !isSuccessful) {
            isErrored = true
            rej('Timed out response from GitSlice Hooks API. Gonna try again')
          }
        })
      })
      break
    } catch (error) {
      console.error('got back error with pull: ', error)
      console.error(`Retries left = ${retries}`)
      --retries
      if (retries === 0) {
        return core.setFailed(error as Error)
      }
      await new Promise(res => {
        setTimeout(res, 3000)
      })
    }
  }
  core.setOutput('result', 'Success')
}

function isError(str: string) {
  return str.includes('GitSlicePullError')
}

function ab2str(buf: any) {
  return String.fromCharCode.apply(null, buf)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}

function isSuccess(str: string) {
  return str.includes('GitSlicePullSuccess')
}
