import { PublicUserRank } from '@INIT__PATH_ALIAS/api-models/public/rank/PublicUserRank'
import { ApiResponse, ApiRequest, PublicObject } from '@INIT__PATH_ALIAS/api-models/types'

export type GetUserRanksResponse = ApiResponse<{ ranks: PublicUserRank[] }>

export type GetAccessibleRanksResponse = ApiResponse<{ accessibleRanks: string[] }>

export type AddUserRankRequest = ApiRequest<{
  userId: number,
  message: string | null,
  durationSeconds: number | null,
  rank: 'admin'
}>
export type AddUserRankResponse = ApiResponse<{
  newRank: PublicObject<PublicUserRank>
}>

export type RemoveUserRankRequest = ApiRequest<{
  userId: number,
  message: string | null,
  rank: 'admin'
}>
export type RemoveUserRankResponse = ApiResponse<{
  removedRank: PublicObject<PublicUserRank>
}>
