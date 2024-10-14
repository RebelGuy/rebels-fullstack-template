import { ARGS, DB_PROVIDER } from '@INIT__PATH_ALIAS/server/scripts/consts'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import AccountHelpers from '@INIT__PATH_ALIAS/shared/helpers/AccountHelpers'
import { isNullOrEmpty } from '@INIT__PATH_ALIAS/shared/util/strings'

// admin script to reset the password for a user.
// usage: `yarn workspace server reset-password:<local|debug|release> <username> <new password>`

const [username, password] = ARGS
if (isNullOrEmpty(username)) {
  throw new Error('Username must be defined.')
} else if (isNullOrEmpty(password)) {
  throw new Error('Password must be defined.')
}

const accountHelpers = new AccountHelpers()
const accountStore = new AccountStore(new Dependencies({
  dbProvider: DB_PROVIDER
}))

const formattedUsername = accountHelpers.validateAndFormatUsername(username)

const _ = (async () => {
  try {
    const user = await accountStore.getUserFromName(formattedUsername)
    if (user == null) {
      throw new Error('Could not find user')
    }

    await accountStore.clearLoginTokens(user.id)
    await accountStore.setPassword(user.username, password)
    console.log(`Successfully updated password for user ${formattedUsername}`)

  } catch (e) {
    console.error(`Failed to update password for user ${formattedUsername}:`, e)
  }
})()
