import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'

process.on('unhandledRejection', handleError)
main().catch(handleError)

async function main(): Promise<void> {
  const token = core.getInput('token', {required: true})
  const branch = core.getInput('branch', {required: true})
  const owner = core.getInput('owner', {required: true})
  const repo = core.getInput('repo', {required: true})
  const base = core.getInput('base', {required: true})

  const github = getOctokit(token)

  try {
    const payload = await github.pulls.list({
      owner: owner,
      repo: repo,
      head: `gitstart:${branch}`
    })

    const pullRequest = await github.pulls.list({
      owner: owner,
      repo: repo,
      head: `gitstart:${branch}`
    })

    if (!pullRequest.data.length) {
      await github.pulls.create({
        owner: 'GitStartHQ',
        title: payload.data[0].title,
        repo: repo,
        head: `gitstart:${branch}`,
        base: base
      })
    }
    core.setOutput('result', 'Success')
  } catch (e) {
    core.error(JSON.stringify(e))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
