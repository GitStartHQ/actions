import * as core from '@actions/core'
import {context} from '@actions/github'
import axios from 'axios'
import {promises as fs} from 'fs'

process.on('unhandledRejection', handleError)
main().catch(handleError)

function conditionalBoolean(strBoolean: string | undefined) {
  return strBoolean === 'true'
    ? true
    : strBoolean == 'false'
    ? false
    : undefined
}

async function main(): Promise<void> {
  // Read environment values
  const slicedRepoToken = core.getInput('slice_git_token', {
    required: false
  })
  const slicedRepoUsername = core.getInput('slice_git_username', {
    required: false
  })
  const slicedRepoBranch = core.getInput('slice_default_branch', {
    required: true
  })
  const slicedRepoOwner = context.repo.owner
  const slicedRepoName = context.repo.repo

  const upstreamRepoToken = core.getInput('upstream_git_token', {
    required: false
  })
  const upstreamRepoUsername = core.getInput('upstream_git_username', {
    required: false
  })
  const upstreamRepoEmail = core.getInput('upstream_git_email', {
    required: true
  })

  const is_open_source = core.getInput('is_open_source', {
    required: false
  })
  const gitSliceFile = await fs.readFile('./git-slice.json')

  // Prepare request
  const endpoint = 'https://gateway.gitstart.com/graphql'
  const headers = {
    'content-type': 'application/json'
  }

  const query = `
  mutation Pull($input: ExecuteGitSlicePullInput!) {
    executeGitSlicePull(input: $input) {
      result
      logs
    }
  }
  `
  const variables = {
    input: {
      slicedRepoToken: slicedRepoToken,
      slicedRepoUsername: slicedRepoUsername,
      slicedRepoBranch: slicedRepoBranch,
      slicedRepoName: slicedRepoName,
      slicedRepoOwner: slicedRepoOwner,

      upstreamRepoToken: upstreamRepoToken,
      upstreamRepoUsername: upstreamRepoUsername,
      upstreamRepoEmail: upstreamRepoEmail,

      config: JSON.parse(gitSliceFile.toString()),
      isOpenSource: conditionalBoolean(is_open_source)
    }
  }

  const graphqlQuery = {
    query: query,
    variables: variables
  }

  let retries = 3

  while (retries > 0) {
    try {
      const response = await axios({
        url: endpoint,
        method: 'post',
        headers: headers,
        data: graphqlQuery
      })

      if (response.data && response.data.error && !response.data.success) {
        const errorsMessages = response.data.errors.map(
          (error: {message: string}) => error.message
        )
        const errorMessage = errorsMessages.join('\n')
        throw errorMessage
      }

      const pullResult = response.data.data.executeGitSlicePull
      const logs = pullResult.logs
      logs.map((log: string) => console.log(log))

      if (pullResult.result == 'SUCCESS') {
        return core.setOutput('result', 'Success')
      } else {
        return core.setFailed(
          logs.length > 0 ? logs[logs.length - 1] : 'Call to Hooks failed'
        )
      }
    } catch (error) {
      console.error('got back error with pull: ', error)
      console.error(`Retries left = ${retries}`)
      --retries
      if (retries === 0) {
        return core.setFailed(error as Error)
      }
      // Sleep for 3 seconds before retrying
      await new Promise(res => {
        setTimeout(res, 3000)
      })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}
