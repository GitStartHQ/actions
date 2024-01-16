import * as core from '@actions/core'
import {context} from '@actions/github'
import axios from 'axios'

process.on('unhandledRejection', handleError)
main().catch(handleError)

interface GitSlicePullRequestBody {
  slice_git_token?: string
  branch_to_pull?: string
  slice_default_branch: string
  slice_owner: string
  slice_repo: string
  is_open_source?: boolean
}

// TODO: refactor this to share code between pull and push
function conditionalBoolean(strBoolean: string | undefined) {
  return strBoolean === 'true'
    ? true
    : strBoolean == 'false'
    ? false
    : undefined
}

async function main(): Promise<void> {
  const slice_git_token = core.getInput('slice_git_token', {
    required: false
  })
  const slice_default_branch = core.getInput('slice_default_branch', {
    required: true
  })
  const branch_to_pull = core.getInput('branch_to_pull', {
    required: false
  })

  const is_open_source = core.getInput('is_open_source', {
    required: false
  })

  const body: GitSlicePullRequestBody = {
    slice_git_token,
    slice_default_branch,
    is_open_source: conditionalBoolean(is_open_source),
    branch_to_pull,
    slice_owner: context.repo.owner,
    slice_repo: context.repo.repo
  }

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
  } catch (error) {
    console.error('got back error with pull: ', error)
    return core.setFailed(error as Error)
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
