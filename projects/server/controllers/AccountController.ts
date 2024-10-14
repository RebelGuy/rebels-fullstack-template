import { buildPath, ControllerBase, ControllerDependencies } from '@INIT__PATH_ALIAS/server/controllers/ControllerBase'
import { requireAuth } from '@INIT__PATH_ALIAS/server/controllers/preProcessors'
import AccountHelpers from '@INIT__PATH_ALIAS/shared/helpers/AccountHelpers'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import { InvalidUsernameError, NotLoggedInError, TimeoutError, UsernameAlreadyExistsError } from '@INIT__PATH_ALIAS/shared/util/error'
import { sleep } from '@INIT__PATH_ALIAS/shared/util/node'
import Semaphore from '@INIT__PATH_ALIAS/shared/util/Semaphore'
import { Path, POST, PreProcessor } from 'typescript-rest'
import { AuthenticateResponse, LoginRequest, LoginResponse, LogoutResponse, RegisterRequest, RegisterResponse, ResetPasswordRequest, ResetPasswordResponse } from '@INIT__PATH_ALIAS/api-models/schema/account'
import AccountService from '@INIT__PATH_ALIAS/server/services/AccountService'
import { nonEmptyStringValidator } from '@INIT__PATH_ALIAS/server/controllers/validation'

// prevent brute-force login attacks by limiting the number of concurrent requests
const loginSemaphore = new Semaphore(1, 2000)
const registerSemaphore = new Semaphore(1, 2000)

type Deps = ControllerDependencies<{
  accountStore: AccountStore
  accountHelpers: AccountHelpers
  accountService: AccountService
}>

@Path(buildPath('account'))
export default class AccountController extends ControllerBase {
  private readonly accountStore: AccountStore
  private readonly accountHelpers: AccountHelpers
  private readonly accountService: AccountService

  constructor (deps: Deps) {
    super(deps, 'account')
    this.accountStore = deps.resolve('accountStore')
    this.accountHelpers = deps.resolve('accountHelpers')
    this.accountService = deps.resolve('accountService')
  }

  @POST
  @Path('register')
  public async register (request: RegisterRequest): Promise<RegisterResponse> {
    const builder = this.registerResponseBuilder<RegisterResponse>('POST /register')

    const validationError = builder.validateInput({
      username: { type: 'string', validators: [nonEmptyStringValidator] },
      password: { type: 'string', validators: [nonEmptyStringValidator] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      await registerSemaphore.enter()
      await sleep(1000)
    } catch (e: any) {
      if (e instanceof TimeoutError)
        return builder.failure(500, new Error('Timed out. Please try again later.'))
      else {
        return builder.failure(e)
      }
    } finally {
      registerSemaphore.exit()
    }

    try {
      const username = this.accountHelpers.validateAndFormatUsername(request.username)
      await this.accountStore.addUser({ username: username, password: request.password })
      const token = await this.accountStore.createLoginToken(username)
      return builder.success({ loginToken: token })
    } catch (e: any) {
      if (e instanceof InvalidUsernameError) {
        return builder.failure(400, e)
      } else if (e instanceof UsernameAlreadyExistsError) {
        return builder.failure(400, new UsernameAlreadyExistsError(request.username))
      }
      return builder.failure(e)
    }
  }

  @POST
  @Path('login')
  public async login (request: LoginRequest): Promise<LoginResponse> {
    const builder = this.registerResponseBuilder<LoginResponse>('POST /login')

    const validationError = builder.validateInput({
      username: { type: 'string', validators: [nonEmptyStringValidator] },
      password: { type: 'string', validators: [nonEmptyStringValidator] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      await loginSemaphore.enter()
      await sleep(1000)
    } catch (e: any) {
      if (e instanceof TimeoutError)
        return builder.failure(500, new Error('Timed out. Please try again later.'))
      else {
        return builder.failure(e)
      }
    } finally {
      loginSemaphore.exit()
    }

    try {
      const username = this.accountHelpers.validateAndFormatUsername(request.username)
      const validPassword = await this.accountStore.checkPassword(username, request.password)
      if (!validPassword) {
        return builder.failure(401, new Error('Invalid login details'))
      }

      const token = await this.accountStore.createLoginToken(username)
      return builder.success({ loginToken: token })
    } catch (e: any) {
      if (e instanceof InvalidUsernameError) {
        return builder.failure(401, new Error('Invalid login details'))
      }
      return builder.failure(e)
    }
  }

  @POST
  @Path('logout')
  public async logout (): Promise<LogoutResponse> {
    const builder = this.registerResponseBuilder<LogoutResponse>('POST /logout')

    try {
      await this.apiService.authenticateCurrentUser()
      const user = super.getCurrentUser()
      await this.accountStore.clearLoginTokens(user.id)
    } catch (e: any) {
      // ignore
    }

    // always allow the user to log out, regardless of whether we are able to authenticate them or not.
    // this is really just a nicety for easier client-side handling
    return builder.success({})
  }

  @POST
  @Path('authenticate')
  @PreProcessor(requireAuth)
  public authenticate (): AuthenticateResponse {
    const builder = this.registerResponseBuilder<AuthenticateResponse>('POST /authenticate')

    try {
      const user = super.getCurrentUser()
      return builder.success({
        username: user.username
      })
    } catch (e: any) {
      return builder.failure(e)
    }
  }

  @POST
  @Path('resetPassword')
  @PreProcessor(requireAuth)
  public async resetPassword (request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const builder = this.registerResponseBuilder<ResetPasswordResponse>('POST /resetPassword')

    const validationError = builder.validateInput({
      oldPassword: { type: 'string' },
      newPassword: { type: 'string', validators: [nonEmptyStringValidator] }
    }, request)
    if (validationError != null) {
      return validationError
    }

    try {
      await loginSemaphore.enter()
      await sleep(1000)

      const user = super.getCurrentUser()
      await this.accountService.resetPassword(user.id, request.oldPassword, request.newPassword)

      const token = await this.accountStore.createLoginToken(user.username)
      return builder.success({ loginToken: token })

    } catch (e: any) {
      if (e instanceof NotLoggedInError) {
        return builder.failure(401, e)
      }
      return builder.failure(e)
    } finally {
      loginSemaphore.exit()
    }
  }
}
