import { ControllerDependencies, buildPath, ControllerBase } from '@INIT__PATH_ALIAS/server/controllers/ControllerBase'
import { requireRank } from '@INIT__PATH_ALIAS/server/controllers/preProcessors'
import TaskService from '@INIT__PATH_ALIAS/server/services/task/TaskService'
import TaskStore, { TaskType } from '@INIT__PATH_ALIAS/server/stores/TaskStore'
import { GET, PATCH, POST, Path, PreProcessor, QueryParam } from 'typescript-rest'
import { ExecuteTaskResponse, GetTaskLogsResponse, GetTasksResponse, UpdateTaskRequest, UpdateTaskResponse } from '@INIT__PATH_ALIAS/api-models/schema/task'
import { taskLogToPublic, taskToPublic } from '@INIT__PATH_ALIAS/server/models/task'
import { generateInclusiveNumberRangeValidator, generateStringRangeValidator } from '@INIT__PATH_ALIAS/server/controllers/validation'
import { ONE_HOUR, ONE_YEAR } from '@INIT__PATH_ALIAS/shared/util/datetime'

type Deps = ControllerDependencies<{
  taskStore: TaskStore
  taskService: TaskService
}>

@Path(buildPath('task'))
@PreProcessor(requireRank('admin'))
export default class TaskController extends ControllerBase {
  private readonly taskStore: TaskStore
  private readonly taskService: TaskService

  constructor (deps: Deps) {
    super(deps, 'task')

    this.taskStore = deps.resolve('taskStore')
    this.taskService = deps.resolve('taskService')
  }

  @GET
  @Path('/')
  public async getTasks (): Promise<GetTasksResponse> {
    const builder = this.registerResponseBuilder<GetTasksResponse>('GET /')

    try {
      const tasks = await this.taskStore.getAllTasks()
      const successes = await Promise.all(tasks.map(t => this.taskStore.getLastSuccessTime(t.taskType as TaskType)))
      const failures = await Promise.all(tasks.map(t => this.taskStore.getLastFailureTime(t.taskType as TaskType)))
      return builder.success({ tasks: tasks.map((t, i) => taskToPublic(t, successes[i], failures[i])) })
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @PATCH
  @Path('/')
  public async updateTask (request: UpdateTaskRequest): Promise<UpdateTaskResponse> {
    const builder = this.registerResponseBuilder<UpdateTaskResponse>('PATCH /')

    const validationError = builder.validateInput({
      taskType: { type: 'string', validators: [generateStringRangeValidator(...this.taskService.getTaskTypes())] },
      intervalMs: { type: 'number', validators: [generateInclusiveNumberRangeValidator(ONE_HOUR, ONE_YEAR)] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      await this.taskService.updateTask(request.taskType as TaskType, request.intervalMs)
      return builder.success({})
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @GET
  @Path('/log')
  public async getTaskLogs (@QueryParam('taskType') taskType: string): Promise<GetTaskLogsResponse> {
    const builder = this.registerResponseBuilder<GetTaskLogsResponse>('GET /log')

    const validationError = builder.validateInput({
      taskType: { type: 'string', validators: [generateStringRangeValidator(...this.taskService.getTaskTypes())] }
    }, { taskType })
    if (validationError != null) {
      return validationError
    }

    try {
      const taskLogs = await this.taskStore.getTaskLogs(taskType as TaskType)
      return builder.success({ taskLogs: taskLogs.map(taskLogToPublic) })
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @POST
  @Path('/execute')
  public async executeTask (@QueryParam('taskType') taskType: string): Promise<ExecuteTaskResponse> {
    const builder = this.registerResponseBuilder<ExecuteTaskResponse>('POST /execute')

    const validationError = builder.validateInput({
      taskType: { type: 'string', validators: [generateStringRangeValidator(...this.taskService.getTaskTypes())] }
    }, { taskType })
    if (validationError != null) {
      return validationError
    }

    try {
      await this.taskService.executeTask(taskType as TaskType)
      return builder.success({})
    } catch (e: any) {
      return builder.failure(e)
    }
  }
}