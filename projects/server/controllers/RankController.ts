import { buildPath, ControllerBase, ControllerDependencies } from '@INIT__PATH_ALIAS/server/controllers/ControllerBase'
import { userRankToPublicObject } from '@INIT__PATH_ALIAS/server/models/rank'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'
import { single, sortBy } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { DELETE, GET, Path, POST, PreProcessor, QueryParam } from 'typescript-rest'
import RankStore, { AddUserRankArgs, RemoveUserRankArgs } from '@INIT__PATH_ALIAS/server/stores/RankStore'
import { UserRankAlreadyExistsError, UserRankNotFoundError } from '@INIT__PATH_ALIAS/shared/util/error'
import { addTime } from '@INIT__PATH_ALIAS/shared/util/datetime'
import { requireAuth, requireRank } from '@INIT__PATH_ALIAS/server/controllers/preProcessors'
import AccountService from '@INIT__PATH_ALIAS/server/services/AccountService'
import { AddUserRankRequest, AddUserRankResponse, GetAccessibleRanksResponse, GetUserRanksResponse, RemoveUserRankRequest, RemoveUserRankResponse } from '@INIT__PATH_ALIAS/api-models/schema/rank'
import { generateStringRangeValidator, positiveNumberValidator } from '@INIT__PATH_ALIAS/server/controllers/validation'

type Deps = ControllerDependencies<{
  logService: LogService
  rankStore: RankStore
  accountService: AccountService
}>

@Path(buildPath('rank'))
@PreProcessor(requireAuth)
export default class RankController extends ControllerBase {
  private readonly rankStore: RankStore
  private readonly accountService: AccountService

  constructor (deps: Deps) {
    super(deps, 'rank')
    this.rankStore = deps.resolve('rankStore')
    this.accountService = deps.resolve('accountService')
  }

  @GET
  public async getUserRanks (
    @QueryParam('userId') userId?: number
  ): Promise<GetUserRanksResponse> {
    const builder = this.registerResponseBuilder<GetUserRanksResponse>('GET')

    const validationError = builder.validateInput({
      userId: { type: 'number', optional: true }
    }, { userId: userId })
    if (validationError != null) {
      return validationError
    }

    try {
      if (userId == null) {
        userId = this.getCurrentUser().id
      }

      let ranks = single(await this.rankStore.getUserRanks([userId])).ranks
      ranks = sortBy(ranks, p => p.issuedAt.getTime(), 'desc')
      return builder.success({ ranks: ranks.map(userRankToPublicObject) })
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @GET
  @Path('/accessible')
  public getAccessibleRanks (): GetAccessibleRanksResponse {
    const builder = this.registerResponseBuilder<GetAccessibleRanksResponse>('GET /accessible')

    try {
      const accessibleRanks = this.apiService.getRanks() ?? []
      return builder.success({
        accessibleRanks: accessibleRanks
      })
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @POST
  @PreProcessor(requireRank('admin'))
  public async addUserRank (request: AddUserRankRequest): Promise<AddUserRankResponse> {
    const builder = this.registerResponseBuilder<AddUserRankResponse>('POST')

    const validationError = builder.validateInput({
      userId: { type: 'number' },
      message: { type: 'string', nullable: true },
      durationSeconds: { type: 'number', nullable: true, validators: [positiveNumberValidator] },
      rank: { type: 'string', validators: [generateStringRangeValidator('admin')] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      const args: AddUserRankArgs = {
        rank: request.rank,
        userId: request.userId,
        message: request.message,
        expirationTime: request.durationSeconds ? addTime(new Date(), 'seconds', request.durationSeconds) : null,
        assignee: this.getCurrentUser().id
      }
      const result = await this.rankStore.addUserRank(args)

      return builder.success({ newRank: userRankToPublicObject(result) })
    } catch (e: any) {
      if (e instanceof UserRankAlreadyExistsError) {
        return builder.failure(400, e)
      } else {
        return builder.failure(e)
      }
    }
  }

  @DELETE
  @PreProcessor(requireRank('admin'))
  public async removeUserRank (request: RemoveUserRankRequest): Promise<RemoveUserRankResponse> {
    const builder = this.registerResponseBuilder<RemoveUserRankResponse>('DELETE')

    const validationError = builder.validateInput({
      userId: { type: 'number' },
      message: { type: 'string', nullable: true },
      rank: { type: 'string', validators: [generateStringRangeValidator('admin')] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      const args: RemoveUserRankArgs = {
        rank: request.rank,
        userId: request.userId,
        message: request.message,
        removedBy: this.getCurrentUser().id
      }
      const result = await this.rankStore.removeUserRank(args)

      return builder.success({ removedRank: userRankToPublicObject(result) })
    } catch (e: any) {
      if (e instanceof UserRankNotFoundError) {
        return builder.failure(404, e)
      } else {
        return builder.failure(e)
      }
    }
  }
}
