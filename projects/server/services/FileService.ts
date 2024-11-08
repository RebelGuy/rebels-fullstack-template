import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import { GenericObject } from '@INIT__PATH_ALIAS/shared/types'
import * as fs from 'fs'
import path from 'node:path'

export type WriteOptions = {
  // defaults to false
  append: boolean
}

type Deps = Dependencies<{
  dataPath: string
}>

export default class FileService extends ContextClass {
  private readonly dataPath: string

  constructor (deps: Deps) {
    super()
    this.dataPath = deps.resolve('dataPath')
  }

  public getDataFilePath (...relPath: string[]) {
    return path.resolve(this.dataPath, ...relPath)
  }

  public writeLine (filePath: string, contents: string, options?: WriteOptions) {
    this.write(filePath, contents + '\n', options)
  }

  public write (filePath: string, contents: string, options?: WriteOptions) {
    const directory = path.dirname(filePath)
    this.ensureDir(directory)
    if (options?.append) {
      fs.appendFileSync(filePath, contents)
    } else {
      fs.writeFileSync(filePath, contents)
    }
  }

  public writeObject<T extends GenericObject> (filePath: string, object: T) {
    this.write(filePath, JSON.stringify(object))
  }

  public read (filePath: string): string | null {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath).toString()
    } else {
      return null
    }
  }

  public readObject<T extends GenericObject> (filePath: string): T | null {
    const contents = this.read(filePath)
    return contents ? JSON.parse(contents) as T : null
  }

  private ensureDir (dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}
