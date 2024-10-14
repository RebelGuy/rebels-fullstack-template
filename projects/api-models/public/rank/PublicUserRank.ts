import { PublicObject } from '@INIT__PATH_ALIAS/api-models/types'

export type PublicUserRank = PublicObject<{
  /** The id of the user rank object. */
  id: number

  /** The time at which the rank was originally issued to the user. */
  issuedAt: number

  /** Whether the user rank is active. This is a convenience property that can be derived from other properties of the user rank. */
  isActive: boolean

  /** The time at which the user rank expires. Set to null if the user rank is permanent. */
  expirationTime: number | null

  /** The assignment message, if set. */
  message: string | null

  /** The time at which the user rank was revoked, if revoked. */
  revokedAt: number | null

  /** The user rank revoke message, if revoked and set. */
  revokeMessage: string | null

  /** The rank which this UserRank represents. */
  rank: 'admin'
}>
