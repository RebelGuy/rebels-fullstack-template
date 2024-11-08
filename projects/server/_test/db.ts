import { PrismaClient, PrismaPromise } from '@prisma/client'
import { mock } from 'jest-mock-extended'
import DbProvider from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'
import Semaphore from '@INIT__PATH_ALIAS/shared/util/Semaphore'

/** Use this in the `beforeEach` of store tests when setting up the database.
 * This timeout helps prevent the "Exceeded timeout of 5000 ms for a hook." error. */
export const DB_TEST_TIMEOUT = 30000

// use this below if you need to access logging while debugging tests. only prints to the console, not file
const logServiceWithConsoleOutput = new LogService(new Dependencies({
  apiLogLevel: 'disable',
  dbLogLevel: 'full',
  applicationInsightsService: mock(),
  debugLogOutput: 'full',
  errorLogOutput: 'full',
  fileService: mock(),
  infoLogOutput: 'full',
  warningLogOutput: 'full'
}))

const semaphore: Semaphore = new Semaphore()
const dbProvider = new DbProvider(new Dependencies({
  logService: mock(),
  databaseUrl: process.env.DATABASE_URL!,
  dbSemaphoreConcurrent: 1000,
  dbSemaphoreTimeout: null,
  dbSlowQueryThreshold: 100000
}))
let connected = false

export async function startTestDb (): Promise<DbProvider> {
  if (!connected) {
    await dbProvider.initialise()
    connected = true
  }
  await semaphore.enter()

  // casting is fine because dbProvider actually returns the full object
  const client = dbProvider.get() as PrismaClient
  await clearDatabase(client)

  return dbProvider
}

export function stopTestDb (): void {
  semaphore.exit()
}

async function clearDatabase (client: PrismaClient) {
  // from https://www.prisma.io/docs/concepts/components/prisma-client/crud#deleting-all-data-with-raw-sql--truncate
  const transactions: PrismaPromise<any>[] = []
  transactions.push(client.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`)

  const tablenames = await client.$queryRaw<Array<{ tablename: string }>>`SELECT TABLE_NAME as tablename from information_schema.TABLES WHERE TABLE_SCHEMA='INIT__DB_TEST_NAME_LOCAL';`

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      transactions.push(client.$executeRawUnsafe(`TRUNCATE \`${tablename}\`;`))
    }
  }

  transactions.push(client.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`)

  await client.$transaction(transactions)
}

// can be chained directly with toEqual(), and the whole chain must be awaited
export function expectRowCount<Tables extends any[]> (...tables: Tables)
  : jest.AndNot<jest.Matchers<Promise<void>, Promise<Tables['length'] extends 1 ? number : number[]>>>
{
  const getRowCount = (table: any): number => table.count()

  if (tables.length === 1) {
    return expect(getRowCount(tables[0])).resolves
  } else {
    return expect(Promise.all(tables.map(table => getRowCount(table)))).resolves
  }
}
