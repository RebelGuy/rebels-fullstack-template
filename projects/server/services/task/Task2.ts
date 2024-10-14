import { ITask } from '@INIT__PATH_ALIAS/server/services/task/TaskService'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'

type Deps = Dependencies<{
  // add dependencies
}>

export default class Task2 extends ContextClass implements ITask {
  constructor (deps: Deps) {
    super()
  }

  public execute (onLog: (logToAppend: string) => void): Promise<string | null> {
    return Promise.resolve(null)
  }
}
