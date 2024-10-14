import { RankName, User } from '@prisma/client'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import RankStore from '@INIT__PATH_ALIAS/server/stores/RankStore'
import { single } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { InternalError, PreProcessorError } from '@INIT__PATH_ALIAS/shared/util/error'
import { Request, Response } from 'express'

const LOGIN_TOKEN_HEADER = 'X-Login-Token'

type Deps = Dependencies<{
  request: Request
  response: Response
  accountStore: AccountStore
  rankStore: RankStore
}>

// we could do a lot of these things directly in the ControllerBase, but it will be trickier to get the preProcessors to work because we don't know which controller instance from the context to use
export default class ApiService extends ContextClass {
  public readonly name = ApiService.name

  private readonly accountStore: AccountStore
  private readonly request: Request
  private readonly response: Response
  private readonly rankStore: RankStore

  private user: User | null = null
  private ranks: RankName[] | null = null

  constructor (deps: Deps) {
    super()
    this.request = deps.resolve('request')
    this.response = deps.resolve('response')
    this.accountStore = deps.resolve('accountStore')
    this.rankStore = deps.resolve('rankStore')
  }

  /** If this method runs to completion, `getCurrentUser` will return a non-null object.
   * @throws {@link PreProcessorError}: When the user could not be authenticated. */
  public async authenticateCurrentUser (): Promise<void> {
    const loginToken = this.request.headers[LOGIN_TOKEN_HEADER.toLowerCase()]
    if (loginToken == null) {
      throw new PreProcessorError(401, `The ${LOGIN_TOKEN_HEADER} header is required for authentication.`)
    } else if (Array.isArray(loginToken)) {
      throw new PreProcessorError(400, `The ${LOGIN_TOKEN_HEADER} header was malformed.`)
    }

    this.user = await this.accountStore.getUserFromToken(loginToken)

    if (this.user == null) {
      throw new PreProcessorError(401, 'Invalid login session. Please login again.')
    }
  }

  public async hydrateRanks (): Promise<void> {
    if (this.ranks != null) {
      return
    }

    const user = this.user
    if (user == null) {
      throw new InternalError('Context user must be set')
    }

    const userRanks = single(await this.rankStore.getUserRanks([user.id]))
    this.ranks = userRanks.ranks.map(r => r.rank)
  }

  public getCurrentUser (optional?: false): User
  public getCurrentUser (optional: true): User | null
  public getCurrentUser (optional?: boolean): User | null {
    if (!optional && this.user == null) {
      throw new InternalError('Current user is required but null - ensure you are using the `requireAuth` pre-processor.')
    }

    return this.user
  }

  public getRanks (): RankName[] | null {
    return this.ranks
  }

  /** Checks whether the user has the rank. Throws if `hydrateRanks()` has not been called yet. */
  public hasRank (rank: RankName): boolean {
    return this.ranks!.includes(rank)
  }

  /** Checks whether the user has the rank, or haigher. Throws if `hydrateRanks()` has not been called yet. */
  public hasRankOrAbove (rank: RankName): boolean {
    if (this.ranks!.includes('admin')) {
      return true
    }

    // todo: implement rank hierarchy
    return this.ranks!.includes(rank)
  }

  public getRequest (): Request {
    return this.request
  }

  public getResponse (): Response {
    return this.response
  }

  public getClientIp (): string {
    return (this.request.get('x-client-ip') as string | undefined) ?? this.request.ip ?? '<unknown IP>'
  }
}
