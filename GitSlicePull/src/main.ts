import * as core from '@actions/core'
import {context} from '@actions/github'
import axios from 'axios'

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main(): Promise<void> {
  const github_token = core.getInput('fork_github_token', {required: true})
  const upstream_username = core.getInput('upstream_username', {required: true})
  const upstream_password = core.getInput('upstream_password', {required: true})
  const fork_default_branch = core.getInput('fork_default_branch', {
    required: true
  })

  try {
    const object = {
      github_token,
      upstream_username,
      upstream_password,
      fork_default_branch,
      forked_owner: context.repo.owner,
      forked_repo: context.repo.repo
    }
    const queryString = new URLSearchParams(object).toString()
    await axios.get(
      `https://hooks.gitstart.dev/api/github/actions/open_source/sync_issues?${queryString}`
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
