export class InternalError extends Error {
  constructor (proto: object, message?: string)
  constructor (message?: string)
  constructor (protoOrMessage: object | string | undefined, maybeMessage?: string) {
    let proto: object
    let message: string | undefined
    if (protoOrMessage == null || typeof protoOrMessage === 'string') {
      message = protoOrMessage
      proto = InternalError.prototype
    } else {
      message = maybeMessage
      proto = protoOrMessage
    }

    super(message)
    Object.setPrototypeOf(this, proto)
  }
}

export class DbError<TInnerError extends Error> extends InternalError {
  public readonly innerError: TInnerError

  constructor (innerError: TInnerError) {
    super(DbError.prototype, innerError.message)
    this.innerError = innerError
  }
}

export abstract class UnknownInternalError extends InternalError {
  constructor (message: string) {
    super(UnknownInternalError.prototype, message)
  }
}

export class NotFoundError extends InternalError {
  constructor (message: string) {
    super(NotFoundError.prototype, message)
  }
}

export class ForbiddenError extends InternalError {
  constructor (message: string) {
    super(ForbiddenError.prototype, message)
  }
}

export class TimeoutError extends InternalError {
  public readonly timeout?: number

  constructor (message?: string, timeout?: number) {
    super(TimeoutError.prototype, message)
    this.timeout = timeout
  }
}

export class UserRankNotFoundError extends InternalError {
  constructor (message?: string){
    super(UserRankNotFoundError.prototype, message ?? 'The user-rank could not be found.')
  }
}

export class UserRankAlreadyExistsError extends InternalError {
  constructor (message?: string){
    super(UserRankAlreadyExistsError.prototype, message ?? 'The user-rank already exists.')
  }
}

export class InvalidUsernameError extends InternalError {
  constructor (msg: string) {
    super(InvalidUsernameError.prototype, `Invalid username: ${msg}`)
  }
}

export class UsernameAlreadyExistsError extends InternalError {
  constructor (username: string) {
    super(UsernameAlreadyExistsError.prototype, `The username '${username}' already exists.`)
  }
}

export class PreProcessorError extends InternalError {
  public readonly statusCode: number

  constructor (statusCode: number, message: string) {
    super(PreProcessorError.prototype, message)
    this.statusCode = statusCode
  }
}

export class NotLoggedInError extends InternalError {
  constructor (message: string) {
    super(NotLoggedInError.prototype, message)
  }
}

export class NonDisposableClassError extends InternalError {
  constructor () {
    super(NonDisposableClassError.prototype, `This is a singleton class and cannot be disposed. Its lifetime should span the lifespan of the application.`)
  }
}

/** Intended to be used in .catch(). */
export function ignoreError (predicate: (e: any) => boolean) {
  return (e: any) => {
    if (predicate(e)) {
      return
    } else {
      throw e
    }
  }
}
