import AccountHelpers from '@INIT__PATH_ALIAS/shared/helpers/AccountHelpers'
import { InvalidUsernameError } from '@INIT__PATH_ALIAS/shared/util/error'
import { nameof } from '@INIT__PATH_ALIAS/shared/testUtils'

let accountHelpers: AccountHelpers

beforeEach(() => {
  accountHelpers = new AccountHelpers()
})

describe(nameof(AccountHelpers, 'validateAndFormatUsername'), () => {
  test('Returns valid username', () => {
    const username = 'valid.username'

    const result = accountHelpers.validateAndFormatUsername(username)

    expect(result).toBe(username)
  })

  test('Formats and returns valid username', () => {
    const username = 'Valid.Username'

    const result = accountHelpers.validateAndFormatUsername(username)

    expect(result).toBe('valid.username')
  })

  test('Throws on invalid username', () => {
    const username = '!@#$'

    expect(() => accountHelpers.validateAndFormatUsername(username)).toThrowError(InvalidUsernameError)
  })
})
