import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import { Db } from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import { NotFoundError, UsernameAlreadyExistsError } from '@INIT__PATH_ALIAS/shared/util/error'
import { hashString } from '@INIT__PATH_ALIAS/shared/util/strings'
import { DB_TEST_TIMEOUT, expectRowCount, startTestDb, stopTestDb } from '@INIT__PATH_ALIAS/server/_test/db'
import { nameof } from '@INIT__PATH_ALIAS/shared/testUtils'

export default () => {
  let db: Db
  let accountStore: AccountStore

  beforeEach(async () => {
    const dbProvider = await startTestDb()
    accountStore = new AccountStore(new Dependencies({ dbProvider }))
    db = dbProvider.get()
  }, DB_TEST_TIMEOUT)

  afterEach(stopTestDb)

  describe(nameof(AccountStore, 'addUser'), () => {
    test('Adds the user', async () => {
      const username = 'username'

      await accountStore.addUser({ username: username, password: 'test' })

      await expectRowCount(db.user).toBe(1)
      const storedUser = await db.user.findFirst()
      expect(storedUser!.username).toBe(username)
    })

    test('Throws if username already exists', async () => {
      const username = 'username'
      await db.user.create({ data: { username: username, hashedPassword: 'test' }})

      await expect(() => accountStore.addUser({ username: username, password: 'test' })).rejects.toThrowError(UsernameAlreadyExistsError)
    })
  })

  describe(nameof(AccountStore, 'checkPassword'), () => {
    test('Returns true if user exists and password matches', async () => {
      const username = 'username'
      const password = 'test'
      await db.user.create({ data: { username: username, hashedPassword: hashString(username + password) }})

      const result = await accountStore.checkPassword(username, password)

      expect(result).toBe(true)
    })

    test('Returns false if user exists but password does not match', async () => {
      const username = 'username'
      await db.user.create({ data: { username: username, hashedPassword: 'test' }})

      const result = await accountStore.checkPassword(username, 'test')

      expect(result).toBe(false)
    })

    test('Returns false if user does not exist', async () => {
      const result = await accountStore.checkPassword('test', 'test')

      expect(result).toBe(false)
    })
  })

  describe(nameof(AccountStore, 'clearLoginTokens'), () => {
    test(`Clears all of the user's login tokens`, async () => {
      await db.user.createMany({ data: [
        { username: 'user1', hashedPassword: 'pass1' },
        { username: 'user2', hashedPassword: 'pass2' }
      ]})
      await db.loginToken.createMany({ data: [
        { userId: 1, token: 'a' },
        { userId: 1, token: 'b' },
        { userId: 2, token: 'c' }
      ]})

      await accountStore.clearLoginTokens(1)

      await expectRowCount(db.loginToken).toBe(1)
    })
  })

  describe(nameof(AccountStore, 'createLoginToken'), () => {
    test('Creates a new token for the given user', async () => {
      const username = 'test'
      await db.user.create({ data: { username: username, hashedPassword: 'test' }})

      const result = await accountStore.createLoginToken(username)

      await expectRowCount(db.loginToken).toBe(1)
      expect(result).not.toBeNull()
    })

    test('Throws if the user does not exist', async () => {
      await expect(() => accountStore.createLoginToken('test')).rejects.toThrowError(NotFoundError)
    })
  })

  describe(nameof(AccountStore, 'getUserFromName'), () => {
    test('Returns the correct user', async () => {
      const user1 = await db.user.create({ data: { username: 'test1', hashedPassword: 'test1' }})
      const user2 = await db.user.create({ data: { username: 'test2', hashedPassword: 'test2' }})

      const result = await accountStore.getUserFromName('test2')

      expect(result).toEqual(user2)
    })

    test('Returns null if user is not found', async () => {
      const result = await accountStore.getUserFromName('name')

      expect(result).toBe(null)
    })
  })

  describe(nameof(AccountStore, 'getUserFromToken'), () => {
    test('Returns the user for the given token', async () => {
      const token = 'token'
      const user = await db.user.create({ data: { username: 'test', hashedPassword: 'test' }})
      await db.loginToken.create({ data: { token, userId: user.id }})

      const result = await accountStore.getUserFromToken(token)

      expect(result!.username).toBe(user.username)
    })

    test('Returns null if no user exists for the given token', async () => {
      const result = await accountStore.getUserFromToken('test')

      expect(result).toBeNull()
    })
  })

  describe(nameof(AccountStore, 'setPassword'), () => {
    test(`Changes the user's password`, async () => {
      await db.user.create({ data: { username: 'test1', hashedPassword: 'test1' }})
      await db.user.create({ data: { username: 'test2', hashedPassword: 'test2' }})

      await accountStore.setPassword('test2', 'newPassword')

      const updatedUser = await db.user.findFirst({ where: { id: 2 }})
      expect(updatedUser?.hashedPassword).not.toBe('test2')
    })
  })
}
