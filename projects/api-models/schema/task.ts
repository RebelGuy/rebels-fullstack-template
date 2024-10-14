import { ApiRequest, ApiResponse } from '@INIT__PATH_ALIAS/api-models/types'
import { PublicTask } from '@INIT__PATH_ALIAS/api-models/public/task/PublicTask'
import { PublicTaskLog } from '@INIT__PATH_ALIAS/api-models/public/task/PublicTaskLog'
import { EmptyObject } from '@INIT__PATH_ALIAS/shared/types'

export type GetTasksResponse = ApiResponse<{ tasks: PublicTask[] }>

export type GetTaskLogsResponse = ApiResponse<{ taskLogs: PublicTaskLog[] }>

export type UpdateTaskRequest = ApiRequest<{ taskType: string, intervalMs: number }>

export type UpdateTaskResponse = ApiResponse<EmptyObject>

export type ExecuteTaskResponse = ApiResponse<EmptyObject>