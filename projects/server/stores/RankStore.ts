import { Prisma, Rank, RankName, UserRank } from '@prisma/client'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import DateTimeHelpers from '@INIT__PATH_ALIAS/server/helpers/DateTimeHelpers'
import DbProvider, { Db } from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import { group, unique } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { NotFoundError, UserRankAlreadyExistsError, UserRankNotFoundError } from '@INIT__PATH_ALIAS/shared/util/error'
import { SafeOmit } from '@INIT__PATH_ALIAS/shared/types'
import { isUnknownPrismaError } from '@INIT__PATH_ALIAS/server/prismaUtil'

export type UserRanks = {
  userId: number
  ranks: UserRankWithRelations[]
}

export type UserRankWithRelations = SafeOmit<UserRank, 'rankId'> & {
  rank: RankName
}

export type AddUserRankArgs = {
  rank: RankName
  userId: number
  message: string | null

  /** `null` if assigned by the system. */
  assignee: number | null

  /** `null` if the rank shouldn't expire. */
  expirationTime: Date | null

  /** Optionally specify the reported time at which the rank was added. If not provided, uses the current time */
  time?: Date
}

export type RemoveUserRankArgs = {
  rank: RankName
  userId: number
  message: string | null

  /** `null` if removed by the system. */
  removedBy: number | null
}

type Deps = Dependencies<{
  dbProvider: DbProvider
  dateTimeHelpers: DateTimeHelpers
}>

export default class RankStore extends ContextClass {
  private readonly db: Db
  private readonly dateTimeHelpers: DateTimeHelpers

  constructor (deps: Deps) {
    super()
    this.db = deps.resolve('dbProvider').get()
    this.dateTimeHelpers = deps.resolve('dateTimeHelpers')
  }

  /** Adds the rank to the user.
   * @throws {@link UserRankAlreadyExistsError}: When a user-rank of that type is already active.
   */
  public async addUserRank (args: AddUserRankArgs): Promise<UserRankWithRelations> {
    // note: there is a BEFORE INSERT trigger (`TRG_CHECK_EXISTING_ACTIVE_RANK`) in the `user_rank` table that ensures the user-rank doesn't already exist.
    // this avoids any potential race conditions that may arise if we were to check this server-side.

    try {
      const result = await this.db.userRank.create({
        data: {
          user: { connect: { id: args.userId }},
          rank: { connect: { name: args.rank }},
          issuedAt: args.time ?? this.dateTimeHelpers.now(),
          assignedByUser: args.assignee == null ? undefined : { connect: { id: args.assignee }},
          message: args.message,
          expirationTime: args.expirationTime
        },
        include: includeUserRankRelations
      })
      return rawDataToUserRankWithRelations(result)

    } catch (e: any) {
      // annoyingly we don't have access to the inner server object, as it is only included in serialised form in the message directly
      if (isUnknownPrismaError(e) && e.innerError.message.includes('DUPLICATE_RANK')) {
        throw new UserRankAlreadyExistsError(`The '${args.rank}' rank is already active for chat user ${args.userId}.`)
      }

      throw e
    }
  }

  /** Gets all ranks. */
  public async getRanks (): Promise<Rank[]> {
    return await this.db.rank.findMany()
  }

  /** Gets the user rank that has the specified id.
   * @throws {@link UserRankNotFoundError}: When no user-rank with the given id is found. */
  public async getUserRankById (userRankId: number): Promise<UserRankWithRelations> {
    const result = await this.db.userRank.findUnique({
      where: { id: userRankId },
      include: includeUserRankRelations
    })

    if (result == null) {
      throw new UserRankNotFoundError(`Could not find a user-rank with ID ${userRankId}.`)
    } else {
      return rawDataToUserRankWithRelations(result)
    }
  }

  /** Gets the active ranks for each of the provided users. */
  public async getUserRanks (userIds: number[]): Promise<UserRanks[]> {
    userIds = unique(userIds)

    const result = await this.db.userRank.findMany({
      where: {
        ...activeUserRankFilter(),
        userId: { in: userIds },
      },
      include: includeUserRankRelations
    })

    const groups = group(result.map(rawDataToUserRankWithRelations), r => r.userId)
    return userIds.map(userId => ({
      userId: userId,
      ranks: groups.find(g => g.group === userId)?.items ?? []
    }))
  }

  /** Gets the active ranks for the user. */
  public async getAllUserRanks (userId: number): Promise<UserRanks> {
    const result = await this.db.userRank.findMany({
      where: {
        ...activeUserRankFilter(),
        userId: userId,
      },
      include: includeUserRankRelations
    })

    return {
      userId: userId,
      ranks: result.map(rawDataToUserRankWithRelations)
    }
  }

  /** Removes the rank from the user.
   * @throws {@link UserRankNotFoundError}: When no user-rank of that type is currently active.
  */
  public async removeUserRank (args: RemoveUserRankArgs): Promise<UserRankWithRelations> {
    let existing: { id: number }
    try {
      existing = await this.db.userRank.findFirstOrThrow({
        where: {
          ...activeUserRankFilter(),
          userId: args.userId,
          rank: { name: args.rank },
        },
        select: { id: true }
      })
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        throw new UserRankNotFoundError(`Could not find an active '${args.rank}' rank for chat user ${args.userId}.`)
      }

      throw e
    }

    const result = await this.db.userRank.update({
      where: { id: existing.id },
      data: {
        revokedTime: this.dateTimeHelpers.now(),
        revokeMessage: args.message,
        revokedByUserId: args.removedBy
      },
      include: includeUserRankRelations
    })

    return rawDataToUserRankWithRelations(result)
  }

  /** Sets the expiration time for the given user-rank.
   * @throws {@link UserRankNotFoundError}: When the user-rank was not found.
  */
  public async updateRankExpiration (rankId: number, newExpiration: Date | null): Promise<UserRankWithRelations> {
    try {
      const result = await this.db.userRank.update({
        where: { id: rankId },
        data: { expirationTime: newExpiration },
        include: includeUserRankRelations
      })

      return rawDataToUserRankWithRelations(result)
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        throw new UserRankNotFoundError(`Could not update expiration for rank ${rankId} because it does not exist.`)
      }

      throw e
    }
  }
}

const activeUserRankFilter = () => Prisma.validator<Prisma.UserRankWhereInput>()({
  AND: [
    // the rank is not revoked
    { revokedTime: null },

    // and the rank hasn't expired yet
    { OR: [
      { expirationTime: null },
      { AND: [
        { NOT: { expirationTime: null }},
        { expirationTime: { gt: new Date() }}
      ]}
    ]}
  ]
})

const includeUserRankRelations = Prisma.validator<Prisma.UserRankInclude>()({
  rank: true
})

type RawResult = UserRank & {
  rank: Rank
}

function rawDataToUserRankWithRelations (data: RawResult): UserRankWithRelations {
  return {
    id: data.id,
    userId: data.userId,
    assignedByUserId: data.assignedByUserId,
    expirationTime: data.expirationTime,
    issuedAt: data.issuedAt,
    message: data.message,
    rank: data.rank.name,
    revokedByUserId: data.revokedByUserId,
    revokedTime: data.revokedTime,
    revokeMessage: data.revokeMessage,
  }
}
