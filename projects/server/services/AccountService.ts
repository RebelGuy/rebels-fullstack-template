import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import { NotLoggedInError } from '@INIT__PATH_ALIAS/shared/util/error'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'

type Deps = Dependencies<{
  accountStore: AccountStore
  logService: LogService
}>

export default class AccountService extends ContextClass {
  public readonly name = AccountService.name

  private readonly accountStore: AccountStore
  private readonly logService: LogService

  constructor (deps: Deps) {
    super()
    this.accountStore = deps.resolve('accountStore')
    this.logService = deps.resolve('logService')
  }

  /** Resets the user's password and returns a new login token.
   * @throws {@link NotLoggedInError}: When the provided old password is incorrect. */
  public async resetPassword (userId: number, oldPassword: string, newPassword: string): Promise<string> {
    const user = await this.accountStore.getUser(userId)
    const isAuthenticated = await this.accountStore.checkPassword(user.username, oldPassword)
    if (!isAuthenticated) {
      throw new NotLoggedInError('Invalid login details')
    }

    await this.accountStore.clearLoginTokens(userId)
    await this.accountStore.setPassword(user.username, newPassword)

    this.logService.logInfo(this, `User ${userId} (${user.username}) has reset their password.`)
    return await this.accountStore.createLoginToken(user.username)
  }
}
