import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import DateTimeHelpers from '@INIT__PATH_ALIAS/server/helpers/DateTimeHelpers'
import { Db } from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import RankStore, { AddUserRankArgs, RemoveUserRankArgs, UserRankWithRelations } from '@INIT__PATH_ALIAS/server/stores/RankStore'
import { startTestDb, DB_TEST_TIMEOUT, stopTestDb, expectRowCount } from '@INIT__PATH_ALIAS/server/_test/db'
import { mock, MockProxy } from 'jest-mock-extended'
import * as data from '@INIT__PATH_ALIAS/server/_test/testData'
import { addTime } from '@INIT__PATH_ALIAS/shared/util/datetime'
import { Rank } from '@prisma/client'
import { expectArray, expectObject, nameof } from '@INIT__PATH_ALIAS/shared/testUtils'
import { single } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { UserRankNotFoundError, UserRankAlreadyExistsError } from '@INIT__PATH_ALIAS/shared/util/error'


export default () => {
  const time1 = data.time1
  const time2 = data.time2
  const time3 = data.time3
  const time4 = addTime(data.time3, 'hours', 1)
  const time5 = addTime(data.time3, 'hours', 2)
  const time6 = addTime(data.time3, 'hours', 3)
  let user1: number
  let user2: number
  let user3: number
  let user4: number
  let adminRank: Rank

  let db: Db
  let mockDateTimeHelpers: MockProxy<DateTimeHelpers>
  let rankStore: RankStore

  beforeEach(async () => {
    mockDateTimeHelpers = mock()

    const dbProvider = await startTestDb()

    rankStore = new RankStore(new Dependencies({
      dbProvider,
      dateTimeHelpers: mockDateTimeHelpers
    }))
    db = dbProvider.get()

    user1 = (await db.user.create({ data: { username: '1', hashedPassword: '' }})).id
    user2 = (await db.user.create({ data: { username: '2', hashedPassword: '' }})).id
    user3 = (await db.user.create({ data: { username: '3', hashedPassword: '' }})).id
    user4 = (await db.user.create({ data: { username: '4', hashedPassword: '' }})).id

    adminRank = await db.rank.create({ data: { name: 'admin' }})
  }, DB_TEST_TIMEOUT)

  afterEach(() => {
    stopTestDb()
  })

  describe(nameof(RankStore, 'addUserRank'), () => {
    test('Adds rank to user with no description and expiration time', async () => {
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time1)
      const args: AddUserRankArgs = {
        userId: user1,
        assignee: null,
        rank: 'admin',
        message: null,
        expirationTime: null
      }

      const result = await rankStore.addUserRank(args)

      await expectRowCount(db.userRank).toBe(1)
      expect(result).toEqual(expectObject<UserRankWithRelations>({
        userId: args.userId,
        assignedByUserId: args.assignee,
        issuedAt: time1,
        message: null,
        expirationTime: null,
        revokeMessage: null,
        revokedByUserId: null,
        revokedTime: null,
        rank: 'admin'
      }))
    })

    test('Adds rank to user with description and expiration time', async () => {
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time1)
      const args: AddUserRankArgs = {
        userId: user1,
        assignee: user2,
        rank: 'admin',
        message: 'You can be a mod for today',
        expirationTime: time2
      }

      const result = await rankStore.addUserRank(args)

      await expectRowCount(db.userRank).toBe(1)
      expect(result).toEqual(expectObject<UserRankWithRelations>({
        userId: args.userId,
        assignedByUserId: args.assignee,
        issuedAt: time1,
        message: args.message,
        expirationTime: args.expirationTime,
        revokeMessage: null,
        revokedByUserId: null,
        revokedTime: null,
        rank: 'admin'
      }))
    })

    test(`Throws ${UserRankAlreadyExistsError.name} if the user-rank already exists`, async () => {
      await db.userRank.create({ data: {
        userId: user1,
        issuedAt: time1,
        rankId: adminRank.id
      }})

      const args: AddUserRankArgs = {
        userId: user1,
        rank: adminRank.name,
        message: null,
        assignee: null,
        expirationTime: null
      }
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time2)

      await expect(async () => await rankStore.addUserRank(args)).rejects.toThrowError(UserRankAlreadyExistsError)
    })

    test('Allows adding a duplicate rank if the existing one is no longer active', async () => {
      await db.userRank.createMany({
        data: [
          { userId: user1, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 },
          { userId: user1, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 },
        ]
      })

      const args: AddUserRankArgs = {
        userId: user1,
        rank: adminRank.name,
        message: null,
        assignee: null,
        expirationTime: null
      }
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time5)

      const result = await rankStore.addUserRank(args)

      await expectRowCount(db.userRank).toBe(3)
      expect(result).toEqual(expectObject<UserRankWithRelations>({
        userId: args.userId,
        assignedByUserId: args.assignee,
        issuedAt: time5,
        message: args.message,
        expirationTime: args.expirationTime,
        revokeMessage: null,
        revokedByUserId: null,
        revokedTime: null,
        rank: adminRank.name
      }))
    })
  })

  describe(nameof(RankStore, 'getRanks'), () => {
    test('Returns Standard ranks', async () => {
      const result = await rankStore.getRanks()

      expect(result).toEqual(expectArray([adminRank]))
    })
  })

  describe(nameof(RankStore, 'getUserRankById'), () => {
    test('Returns the correct rank', async () => {
      await db.userRank.createMany({ data: [
        {
          userId: user1,
          issuedAt: time1,
          rankId: adminRank.id
        }, {
          userId: user2,
          issuedAt: time2,
          rankId: adminRank.id
        }
      ]})

      const result = await rankStore.getUserRankById(2)

      expect(result.id).toBe(2)
      expect(result.rank).toBe(adminRank.name)
    })

    test('Throws if the rank does not exist', async () => {
      await db.userRank.create({ data: {
        userId: user1,
        issuedAt: time1,
        rankId: adminRank.id
      }})

      await expect(() => rankStore.getUserRankById(2)).rejects.toThrowError(UserRankNotFoundError)
    })
  })

  describe(nameof(RankStore, 'getUserRanks'), () => {
    test('Returns empty array if no user-ranks are present for the specified users', async () => {
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time2)
      await db.userRank.createMany({ data: [
        { userId: user1, issuedAt: time1, rankId: adminRank.id } // wrong user
      ]})

      const result = await rankStore.getUserRanks([user2, user3])

      expect(result.length).toBe(2)
      expect(result[0].ranks.length).toBe(0)
      expect(result[1].ranks.length).toBe(0)
    })

    test('Ignores inactive ranks', async () => {
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time6)
      await db.userRank.createMany({
        data: [
          { userId: user1, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 },
          { userId: user1, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 },
          { userId: user1, issuedAt: time5, rankId: adminRank.id }, // the only active rank
          { userId: user2, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 },
          { userId: user2, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 },
        ]
      })

      const result = await rankStore.getUserRanks([1, 2])

      expect(result.length).toBe(2)
      expect(single(result[0].ranks).rank).toBe(adminRank.name)
      expect(result[1].ranks.length).toBe(0)
    })
  })

  describe(nameof(RankStore, 'getAllUserRanks'), () => {
    test('Returns current ranks', async () => {
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time6)

      await db.userRank.createMany({
        data: [
          { userId: user1, issuedAt: time1, rankId: adminRank.id, revokedTime: time2 },
          { userId: user1, issuedAt: time3, rankId: adminRank.id },
          { userId: user2, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 },
          { userId: user2, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 },
          { userId: user2, issuedAt: time2, rankId: adminRank.id }
        ]
      })

      let result = await rankStore.getAllUserRanks(user1)

      expect(result.ranks.length).toBe(1)
      expect(result.ranks[0].rank).toBe('admin')
    })
  })

  describe(nameof(RankStore, 'removeUserRank'), () => {
    test(`Throws ${UserRankNotFoundError.name} if no active rank of the specified type exists for the user`, async () => {
      await db.userRank.createMany({
        data: [
          { userId: user1, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 }, // expired
          { userId: user1, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 } // revoked
        ]
      })

      const args: RemoveUserRankArgs = {
        userId: user1,
        message: 'Test',
        rank: 'admin',
        removedBy: user2
      }
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time6)

      await expect(() => rankStore.removeUserRank(args)).rejects.toThrowError(UserRankNotFoundError)
    })

    test('Revokes the rank', async () => {
      await db.userRank.createMany({
        data: [
          { userId: user1, issuedAt: time1, rankId: adminRank.id, expirationTime: time2 },
          { userId: user1, issuedAt: time3, rankId: adminRank.id, revokedTime: time4 },
          { userId: user1, issuedAt: time5, rankId: adminRank.id },
        ]
      })

      const args: RemoveUserRankArgs = {
        userId: user1,
        message: 'Test',
        rank: 'admin',
        removedBy: user2
      }
      mockDateTimeHelpers.now.calledWith().mockReturnValue(time6)

      const result = await rankStore.removeUserRank(args)

      await expectRowCount(db.userRank).toBe(3)
      expect(result).toEqual(expectObject<UserRankWithRelations>({
        userId: args.userId,
        assignedByUserId: null,
        issuedAt: time5,
        message: null,
        expirationTime: null,
        revokeMessage: args.message,
        revokedByUserId: args.removedBy,
        revokedTime: time6,
        rank: 'admin'
      }))
    })
  })

  describe(nameof(RankStore, 'updateRankExpiration'), () => {
    test('Sets time correctly', async () => {
      const rank = await db.userRank.create({ data: { userId: user1, issuedAt: time5, rankId: adminRank.id } })

      const result = await rankStore.updateRankExpiration(rank.id, data.time1)

      expect(result.expirationTime).toEqual(data.time1)
    })

    test('Throws error if rank was not found', async () => {
      await expect(() => rankStore.updateRankExpiration(1, null)).rejects.toThrowError(UserRankNotFoundError)
    })
  })
}
