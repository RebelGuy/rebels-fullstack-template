import { InternalError } from '@INIT__PATH_ALIAS/shared/util/error'
import { isNullOrEmpty } from '@INIT__PATH_ALIAS/shared/util/strings'

// beautiful use of the template literal type!
function getEnvironmentVariable (environmentVariable: `REACT_APP_${string}`, optional?: false): string
function getEnvironmentVariable (environmentVariable: `REACT_APP_${string}`, optional: true): string | null
function getEnvironmentVariable (environmentVariable: `REACT_APP_${string}`, optional?: boolean): string | null {
  const value = process.env[environmentVariable]
  if (!optional && isNullOrEmpty(value)) {
    throw new InternalError(`Environment variable ${environmentVariable} is required but was not found.`)
  } else {
    return value ?? null
  }
}

export const SERVER_URL = getEnvironmentVariable('REACT_APP_SERVER_URL')

export const STUDIO_VERSION = getEnvironmentVariable('REACT_APP_STUDIO_VERSION')

export const NODE_ENV = getEnvironmentVariable('REACT_APP_ENV') as 'local' | 'debug' | 'release'
