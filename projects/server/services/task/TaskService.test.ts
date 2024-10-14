import { Task } from '@prisma/client'
import DateTimeHelpers from '@INIT__PATH_ALIAS/server/helpers/DateTimeHelpers'
import TimerHelpers from '@INIT__PATH_ALIAS/server/helpers/TimerHelpers'
import Task1 from '@INIT__PATH_ALIAS/server/services/task/Task1'
import Task2 from '@INIT__PATH_ALIAS/server/services/task/Task2'
import TaskService from '@INIT__PATH_ALIAS/server/services/task/TaskService'
import TaskStore from '@INIT__PATH_ALIAS/server/stores/TaskStore'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import { cast, nameof } from '@INIT__PATH_ALIAS/shared/testUtils'
import { single } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { MockProxy, mock } from 'jest-mock-extended'

let mockTask1: MockProxy<Task1>
let mockTask2: MockProxy<Task2>
let mockDateTimeHelpers: MockProxy<DateTimeHelpers>
let mockTaskStore: MockProxy<TaskStore>
let mockTimerHelpers: MockProxy<TimerHelpers>
let taskService: TaskService

beforeEach(() => {
  mockTask1 = mock()
  mockTask2 = mock()
  mockDateTimeHelpers = mock()
  mockTaskStore = mock()
  mockTimerHelpers = mock()

  mockTaskStore.getTaskTypes.calledWith().mockResolvedValue(['task1'])

  taskService = new TaskService(new Dependencies({
    task1: mockTask1,
    task2: mockTask2,
    dateTimeHelpers: mockDateTimeHelpers,
    logService: mock(),
    taskStore: mockTaskStore,
    timerHelpers: mockTimerHelpers
  }))
})

describe(nameof(TaskService, 'initialise'), () => {
  test('Schedules the task according to the interval', async () => {
    const intervalMs = 500
    const now = 10000
    const lastExecutionTime = now - 100
    mockDateTimeHelpers.ts.calledWith().mockReturnValue(now)
    mockTaskStore.getTask.calledWith('task1').mockResolvedValue(cast<Task>({ intervalMs }))
    mockTaskStore.getLastExecutionTime.calledWith('task1').mockResolvedValue(lastExecutionTime)

    await taskService.initialise()

    const timeoutAmount = single(mockTimerHelpers.setTimeout.mock.calls)[1]
    expect(timeoutAmount).toBe(lastExecutionTime + intervalMs - now)
  })

  test('Schedules the task immediately if the task has not been executed previously', async () => {
    const intervalMs = 500
    const now = 10000
    mockDateTimeHelpers.ts.calledWith().mockReturnValue(now)
    mockTaskStore.getTask.calledWith('task1').mockResolvedValue(cast<Task>({ intervalMs }))
    mockTaskStore.getLastExecutionTime.calledWith('task1').mockResolvedValue(null)

    await taskService.initialise()

    const timeoutAmount = single(mockTimerHelpers.setTimeout.mock.calls)[1]
    expect(timeoutAmount).toBe(0)
  })

  test('Successful task is handled correctly', async () => {
    const intervalMs = 500
    const now = 10000
    mockDateTimeHelpers.ts.calledWith().mockReturnValue(now)
    mockTaskStore.getTask.calledWith('task1').mockResolvedValue(cast<Task>({ intervalMs }))
    let firstTaskCancelled = false
    mockTimerHelpers.setTimeout.calledWith(expect.anything()).mockReturnValue(() => firstTaskCancelled = true)

    await taskService.initialise()

    const timeoutFn = single(mockTimerHelpers.setTimeout.mock.calls)[0]

    // now test the task execution mechanics
    const valueToLog = 'value to log'
    const taskLogId = 25
    mockTask1.execute.calledWith(expect.anything()).mockResolvedValue(valueToLog)
    mockTaskStore.startTask.calledWith('task1').mockResolvedValue(taskLogId)
    mockTimerHelpers.setTimeout.mockReset()

    await timeoutFn()

    const endTaskCall = single(mockTaskStore.endTask.mock.calls)
    expect(endTaskCall).toEqual<typeof endTaskCall>([taskLogId, valueToLog])

    expect(mockTaskStore.failTask.mock.calls.length).toBe(0)

    // we should have rescheduled the task
    const timeoutAmount = single(mockTimerHelpers.setTimeout.mock.calls)[1]
    expect(timeoutAmount).toBe(intervalMs)
    expect(firstTaskCancelled).toBe(true)
  })

  test('Failing task is handled correctly', async () => {
    const intervalMs = 500
    const now = 10000
    mockDateTimeHelpers.ts.calledWith().mockReturnValue(now)
    mockTaskStore.getTask.calledWith('task1').mockResolvedValue(cast<Task>({ intervalMs }))
    let firstTaskCancelled = false
    mockTimerHelpers.setTimeout.calledWith(expect.anything()).mockReturnValue(() => firstTaskCancelled = true)

    await taskService.initialise()

    const timeoutFn = single(mockTimerHelpers.setTimeout.mock.calls)[0]

    // now test the task execution mechanics
    const taskLogId = 25
    const error = 'test error'
    mockTask1.execute.calledWith(expect.anything()).mockRejectedValue(new Error(error))
    mockTaskStore.startTask.calledWith('task1').mockResolvedValue(taskLogId)
    mockTimerHelpers.setTimeout.mockReset()

    await timeoutFn()

    expect(mockTaskStore.endTask.mock.calls.length).toBe(0)

    const endTaskCall = single(mockTaskStore.failTask.mock.calls)
    expect(endTaskCall).toEqual<typeof endTaskCall>([taskLogId, '', error])

    // we should have rescheduled the task
    const timeoutAmount = single(mockTimerHelpers.setTimeout.mock.calls)[1]
    expect(timeoutAmount).toBe(intervalMs)
    expect(firstTaskCancelled).toBe(true)
  })
})

describe(nameof(TaskService, 'getTaskTypes'), () => {
  test('Returns values', () => {
    const result = taskService.getTaskTypes()

    expect(result.length).toBeGreaterThan(0)
  })
})

describe(nameof(TaskService, 'updateTask'), () => {
  test('Updates the task and correctly reschedules the next execution', async () => {
    mockDateTimeHelpers.ts.calledWith().mockReturnValue(100)
    mockTaskStore.getTask.calledWith('task1').mockResolvedValue(cast<Task>({ intervalMs: 1 }))
    let firstTaskCancelled = false
    mockTimerHelpers.setTimeout.calledWith(expect.anything()).mockReturnValue(() => firstTaskCancelled = true)
    const newInterval = 2

    await taskService.initialise()
    expect(mockTimerHelpers.setTimeout.mock.calls.length).toBe(1)

    await taskService.updateTask('task1', newInterval)

    const args = single(mockTaskStore.updateTask.mock.calls)
    expect(args).toEqual<typeof args>(['task1', newInterval])
    expect(mockTimerHelpers.setTimeout.mock.calls.length).toBe(2)
    expect(firstTaskCancelled).toBe(true)
  })
})
