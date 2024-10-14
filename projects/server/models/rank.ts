import { PublicUserRank } from '@INIT__PATH_ALIAS/api-models/public/rank/PublicUserRank'
import RankHelpers from '@INIT__PATH_ALIAS/shared/helpers/RankHelpers'
import { UserRankWithRelations } from '@INIT__PATH_ALIAS/server/stores/RankStore'

export function userRankToPublicObject (userRank: UserRankWithRelations): PublicUserRank {
  return {
    rank: userRank.rank,
    id: userRank.id,
    issuedAt: userRank.issuedAt.getTime(),
    expirationTime: userRank.expirationTime?.getTime() ?? null,
    message: userRank.message,
    revokedAt: userRank.revokedTime?.getTime() ?? null,
    revokeMessage: userRank.revokeMessage,
    isActive: new RankHelpers().isRankActive(userRank) // I guess we can do this with helpers..
  }
}
