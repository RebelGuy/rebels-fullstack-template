import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import AccountService from '@INIT__PATH_ALIAS/server/services/AccountService'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import { cast, expectInvocation, nameof } from '@INIT__PATH_ALIAS/shared/testUtils'
import { mock, MockProxy } from 'jest-mock-extended'
import { NotLoggedInError } from '@INIT__PATH_ALIAS/shared/util/error'
import { User } from '@prisma/client'

let mockAccountStore: MockProxy<AccountStore>
let accountService: AccountService

beforeEach(() => {
  mockAccountStore = mock()

  accountService = new AccountService(new Dependencies({
    accountStore: mockAccountStore,
    logService: mock()
  }))
})

describe(nameof(AccountService, 'resetPassword'), () => {
  test(`Clears the user's tokens, changes the password, and returns the new token`, async () => {
    const userId = 51
    const oldPassword = 'oldPassword'
    const newPassword = 'newPassword'
    const username = 'testUser'
    const newLoginToken = 'newLoginToken'
    mockAccountStore.getUser.calledWith(userId).mockResolvedValue(cast<User>({ username }))
    mockAccountStore.checkPassword.calledWith(username, oldPassword).mockResolvedValue(true)
    mockAccountStore.createLoginToken.calledWith(username).mockResolvedValue(newLoginToken)

    const result = await accountService.resetPassword(userId, oldPassword, newPassword)

    expectInvocation(mockAccountStore.clearLoginTokens, [userId])
    expectInvocation(mockAccountStore.setPassword, [username, newPassword])
    expect(result).toBe(newLoginToken)
  })

  test(`Throws ${NotLoggedInError.name} if the current password is incorrect`, async () => {
    const userId = 51
    const username = 'testUser'
    const oldPassword = 'oldPassword'
    mockAccountStore.getUser.calledWith(userId).mockResolvedValue(cast<User>({ username }))
    mockAccountStore.checkPassword.calledWith(username, oldPassword).mockResolvedValue(false)

    await expect(() => accountService.resetPassword(userId, oldPassword, '')).rejects.toThrowError(NotLoggedInError)

    expect(mockAccountStore.setPassword.mock.calls.length).toBe(0)
  })
})
