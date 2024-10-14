import { PublicObject } from '@INIT__PATH_ALIAS/api-models/types'
import { PublicUserRank } from '@INIT__PATH_ALIAS/api-models/public/rank/PublicUserRank'

export type PublicUser = PublicObject<{
  /** The internal ID of the user. */
  userId: number

  /** The list of active user-ranks, not sorted in any particular order. */
  activeRanks: PublicUserRank[]
}>
