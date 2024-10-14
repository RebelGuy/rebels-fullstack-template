import { RankName } from '@prisma/client'
import { getContextProvider } from '@INIT__PATH_ALIAS/shared/context/context'
import ApiService from '@INIT__PATH_ALIAS/server/controllers/ApiService'
import { InternalError, PreProcessorError } from '@INIT__PATH_ALIAS/shared/util/error'
import { toCamelCase } from '@INIT__PATH_ALIAS/shared/util/text'
import { Request, Response } from 'express'

/** User must have a valid login token attached to the request. The `user` context variable will be available during the request. */
export function requireAuth (req: Request, res?: Response) {
  return preProcessorWrapper(req, res, async (apiService) => {
    await apiService.authenticateCurrentUser()
    await apiService.hydrateRanks()
  })
}

/** Ensures that the logged-in user has any of the given ranks, or above. The `user` context variable will be available during the request. */
export function requireRank (firstRank: RankName, ...ranks: RankName[]) {
  return async (req: Request, res?: Response) => {
    return preProcessorWrapper(req, res, async (apiService) => {
      await requireAuth(req, res)
      await apiService.hydrateRanks()

      const hasAccess = [firstRank, ...ranks].find(r => !apiService.hasRankOrAbove(r)) == null
      if (!hasAccess) {
        throw new PreProcessorError(403, 'Forbidden')
      }
    })
  }
}

/** Any `PreProcessorError` errors thrown in the `handler` will terminate the current request. */
async function preProcessorWrapper (req: Request, res: Response | undefined, handler: (apiService: ApiService) => Promise<void>) {
  const context = getContextProvider(req)
  const apiService = context.getClassInstance(toCamelCase(ApiService.name)) as ApiService

  try {
    await handler(apiService)
  } catch (e: any) {
    if (res == null) {
      throw new InternalError('Unable to send response because the response object was undefined.')
    }

    if (e instanceof PreProcessorError) {
      res.status(e.statusCode).send(e.message)
    }

    throw e
  }
}
