import { PrismaClient } from '@prisma/client'
import env from '@INIT__PATH_ALIAS/server/globals'
import DbProvider from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'
import { cast } from '@INIT__PATH_ALIAS/shared/testUtils'
import { NO_OP } from '@INIT__PATH_ALIAS/shared/util/typescript'
import path from 'node:path'

export const NODE_ENV = env('nodeEnv')

export const DATABASE_URL = env('databaseUrl')

// required so we get the most up-to-date client, even if the schema changes during the lifespan of the process
export const refreshDb = () => new PrismaClient({ datasources: { db: { url: DATABASE_URL }},  }) as PrismaClient

export const DB = refreshDb()

export const DB_PROVIDER = { get: () => DB } as Pick<DbProvider, 'get'> as DbProvider

export const MIGRATIONS_FOLDER = path.join(__dirname, '../../projects/server/prisma/migrations')

export const ARGS = process.argv.slice(2)

export const LOG_SERVICE: LogService = cast<LogService>({
  logDebug: NO_OP,
  logInfo: NO_OP,
  logWarning: NO_OP,
  logError: NO_OP,
  logApiRequest: NO_OP,
  logApiResponse: NO_OP,
  logSlowQuery: NO_OP
})
