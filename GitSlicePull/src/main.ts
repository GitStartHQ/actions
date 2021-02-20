import * as core from '@actions/core'
import {context} from '@actions/github'
import axios from 'axios'
import * as fs from 'fs/promises'

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main(): Promise<void> {
  const slice_github_token = core.getInput('slice_github_token', {
    required: true
  })
  const upstream_username = core.getInput('upstream_git_username', {
    required: true
  })
  const upstream_github_token = core.getInput('upstream_github_token', {
    required: true
  })
  const upstream_email = core.getInput('upstream_git_email', {required: true})
  const slice_default_branch = core.getInput('slice_default_branch', {
    required: true
  })

  try {
    const gitSliceFile = await fs.readFile('./git-slice.json')
    const object = {
      slice_github_token,
      upstream_username,
      upstream_email,
      upstream_github_token,
      slice_default_branch,
      slice_owner: context.repo.owner,
      slice_repo: context.repo.repo,
      ...JSON.parse(gitSliceFile.toString())
    }

    const queryString = new URLSearchParams(object).toString()

    const resp = await axios.get(
      `https://hooks.gitstart.dev/api/gitslice/pull?${queryString}`
    )

    console.log(
      'got back response from API: ',
      resp.data,
      resp.status,
      resp.statusText
    )

    core.setOutput('result', 'Success')
  } catch (e) {
    console.error(e)
    core.error(JSON.stringify(e))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
