import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'

// since we can't import from the `server`, we copy the relevant properties of the type instead
export type PartialUserRankWithRelations = {
  issuedAt: Date
  expirationTime: Date | null
  revokedTime: Date | null
}

export default class RankHelpers extends ContextClass {
  /** Checks if the given rank is currently active, or whether it was active at the provided time. */
  public isRankActive (rank: PartialUserRankWithRelations, atTime: Date = new Date()): boolean {
    return rank.issuedAt <= atTime && (rank.expirationTime == null || rank.expirationTime > atTime) && (rank.revokedTime == null || rank.revokedTime > atTime)
  }
}
