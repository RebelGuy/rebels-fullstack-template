import { GetAccessibleRanksResponse, GetUserRanksResponse } from '@INIT__PATH_ALIAS/api-models/schema/rank'
import { SERVER_URL } from '@INIT__PATH_ALIAS/studio/utility/default/global'
import { AuthenticateResponse, LoginRequest, LoginResponse, LogoutResponse, RegisterRequest, RegisterResponse, ResetPasswordRequest, ResetPasswordResponse } from '@INIT__PATH_ALIAS/api-models/schema/account'
import { GenericObject } from '@INIT__PATH_ALIAS/shared/types'
import { ApiResponse } from '@INIT__PATH_ALIAS/api-models/types'
import { Method, Request } from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import { PublicObject } from '@INIT__PATH_ALIAS/api-models/types'
import { ExecuteTaskResponse, GetTaskLogsResponse, GetTasksResponse, UpdateTaskRequest, UpdateTaskResponse } from '@INIT__PATH_ALIAS/api-models/schema/task'

const LOGIN_TOKEN_HEADER = 'X-Login-Token'

const baseUrl = SERVER_URL + '/api'

function requestBuilder<TResponse extends ApiResponse<any>, TRequestData extends PublicObject<any> | false = false, TArgs extends any[] = []> (method: TRequestData extends false ? Method : Exclude<Method, 'GET'>, path: string,                                requiresLogin?: boolean): TRequestData extends false ? () => Request<TResponse, TRequestData> : (data: TRequestData) => Request<TResponse, TRequestData>
function requestBuilder<TResponse extends ApiResponse<any>, TRequestData extends PublicObject<any> | false = false, TArgs extends any[] = []> (method: TRequestData extends false ? Method : Exclude<Method, 'GET'>, path: (...args: TArgs) => string,            requiresLogin?: boolean): (...args: TRequestData extends false ? TArgs : [TRequestData, ...TArgs]) => Request<TResponse, TRequestData>
function requestBuilder<TResponse extends ApiResponse<any>, TRequestData extends PublicObject<any> | false, TArgs extends any[]>              (method: TRequestData extends false ? Method : Exclude<Method, 'GET'>, path: string | ((...args: TArgs) => string), requiresLogin?: boolean): (...args: TRequestData extends false ? TArgs : [TRequestData, ...TArgs]) => Request<TResponse, TRequestData> {
  if (method === 'GET') {
    // GET method implies that `TRequestData extends false` (and hence `data extends never`), but the compiler doesn't understand that
    return (...args: any) => ({
      method: method,
      path: typeof path === 'string' ? path : path(...args),
      requiresLogin
    }) as any
  } else {
    return (...args: TRequestData extends false ? TArgs : [TRequestData, ...TArgs]) => ({
      method: method,
      path: typeof path === 'string' ? path : path(...((typeof args[0] === 'object' ? args.slice(1) : args) as TArgs)), // yuck
      data: typeof args[0] === 'object' ? args[0] : (null as any), // null is used in place of never
      requiresLogin
    })
  }
}

export const LOGIN_PATH = `/account/login`

export const getAccessibleRanks = requestBuilder<GetAccessibleRanksResponse>('GET', `/rank/accessible`)

export const getRanks = requestBuilder<GetUserRanksResponse>('GET', `/rank`)

export const registerAccount = requestBuilder<RegisterResponse, RegisterRequest>('POST', `/account/register`, false)

export const login = requestBuilder<LoginResponse, LoginRequest>('POST', LOGIN_PATH, false)

export const logout = requestBuilder<LogoutResponse>('POST', `/account/logout`)

export async function authenticate (loginToken: string): Promise<AuthenticateResponse> {
  return await POST('/account/authenticate', {}, loginToken)
}

export const resetPassword = requestBuilder<ResetPasswordResponse, ResetPasswordRequest>('POST', `/account/resetPassword`)

export const getTasks = requestBuilder<GetTasksResponse>('GET', '/task')

export const updateTask = requestBuilder<UpdateTaskResponse, UpdateTaskRequest>('PATCH', '/task')

export const getTaskLogs = requestBuilder<GetTaskLogsResponse, false, [taskType: string]>(
  'GET',
  taskType => constructPath('/task/log', { taskType })
)

export const executeTask = requestBuilder<ExecuteTaskResponse, false, [taskType: string]>(
  'POST',
  taskType => constructPath('/task/execute', { taskType })
)

async function GET (path: string, loginToken?: string): Promise<any> {
  return await request('GET', path, null, loginToken)
}

async function POST (path: string, requestData: GenericObject | null, loginToken?: string): Promise<any> {
  return await request('POST', path, requestData, loginToken)
}

async function PATCH (path: string, requestData: GenericObject | null, loginToken?: string): Promise<any> {
  return await request('PATCH', path, requestData, loginToken)
}

async function DELETE (path: string, requestData: GenericObject | null, loginToken?: string): Promise<any> {
  return await request('DELETE', path, requestData, loginToken)
}

async function request (method: string, path: string, requestData: GenericObject | null, loginToken: string | undefined) {
  let headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  if (loginToken != null) {
    headers[LOGIN_TOKEN_HEADER] = loginToken
  }

  const response = await fetch(baseUrl + path, {
    method: method,
    body: requestData == null ? undefined : JSON.stringify(requestData),
    headers: headers
  })
  const body = await response.text()
  return JSON.parse(body)
}

function constructPath (path: string, queryParams?: Record<string, string | number | boolean | undefined>) {
  let definedParams: [string, string | number | boolean][] = []
  for (const key in queryParams) {
    if (['string', 'number', 'boolean'].includes(typeof queryParams[key])) {
      definedParams.push([key, queryParams[key]!])
    }
  }

  definedParams.forEach((pair, i) => path += `${i === 0 ? '?' : '&'}${pair[0]}=${pair[1]}`)
  return path
}
