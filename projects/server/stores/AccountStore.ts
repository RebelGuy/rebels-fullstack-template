import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import DbProvider, { Db } from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import { UsernameAlreadyExistsError } from '@INIT__PATH_ALIAS/shared/util/error'
import { randomString } from '@INIT__PATH_ALIAS/shared/util/random'
import { hashString } from '@INIT__PATH_ALIAS/shared/util/strings'
import { PRISMA_CODE_UNIQUE_CONSTRAINT_FAILED, isKnownPrismaError } from '@INIT__PATH_ALIAS/server/prismaUtil'
import { User } from '@prisma/client'

export type UserCreateArgs = {
  username: string
  password: string
}

type Deps = Dependencies<{
  dbProvider: DbProvider
}>

export default class AccountStore extends ContextClass {
  private readonly db: Db

  constructor (deps: Deps) {
    super()

    this.db = deps.resolve('dbProvider').get()
  }

  /** @throws {@link UsernameAlreadyExistsError}: When a user with the same username already exists. */
  public async addUser (user: UserCreateArgs) {
    // this generates a unique hash even if multiple users use the same password
    const hashedPassword = hashString(user.username + user.password)

    try {
      await this.db.user.create({ data: {
        username: user.username,
        hashedPassword: hashedPassword,
      }})
    } catch (e: any) {
      if (isKnownPrismaError(e) && e.innerError.code === PRISMA_CODE_UNIQUE_CONSTRAINT_FAILED) {
        throw new UsernameAlreadyExistsError(user.username)
      }
      throw e
    }
  }

  /** For each of the given chat users, returns the user that they belong to. The results are sorted in an undefined order. */
  public async getUser (userId: number): Promise<User> {
    return await this.db.user.findUniqueOrThrow({ where: { id: userId }})
  }

  public async checkPassword (username: string, password: string): Promise<boolean> {
    const hashedPassword = hashString(username + password)
    const match = await this.db.user.findUnique({
      where: { username: username }
    })

    return match?.hashedPassword === hashedPassword
  }

  public async clearLoginTokens (userId: number) {
    await this.db.loginToken.deleteMany({
      where: { userId }
    })
  }

  public async createLoginToken (username: string): Promise<string> {
    const token = randomString(8)
    await this.db.loginToken.create({ data: {
      token: token,
      user: { connect: { username: username }}
    }})
    return token
  }

  public async getUserFromName (username: string): Promise<User | null> {
    return await this.db.user.findFirst({
      where: { username: username }
    })
  }

  public async getUserFromToken (token: string): Promise<User | null> {
    const result = await this.db.loginToken.findUnique({
      where: { token: token },
      include: { user: true }
    })
    return result?.user ?? null
  }

  /** Sets the password of an existing user. */
  public async setPassword (username: string, newPassword: string): Promise<void> {
    await this.db.user.update({
      where: { username: username },
      data: { hashedPassword: hashString(username + newPassword) }
    })
  }
}
