import { PublicUserRank } from '@INIT__PATH_ALIAS/api-models/public/rank/PublicUserRank'
import { nonNull } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { assertUnreachable } from '@INIT__PATH_ALIAS/shared/util/typescript'
import useRequest, { ApiRequestError } from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import { authenticate, getRanks } from '@INIT__PATH_ALIAS/studio/utility/default/api'
import * as React from 'react'

const LOCAL_STORAGE_LOGIN_TOKEN = 'loginToken'

export type RankName = PublicUserRank['rank']

export type RefreshableDataType = 'userRanks'

type Props = {
  children: React.ReactNode
}

export function LoginProvider (props: Props) {
  const [loginToken, setLoginToken] = React.useState<string | null>(null)
  const [username, setUsername] = React.useState<string | null>(null)
  const [displayName, setDisplayName] = React.useState<string | null>(null)
  const [hasLoadedAuth, setHasLoadedAuth] = React.useState(false)
  const [authError, setAuthError] = React.useState<string | null>(null)

  const getRanksRequest = useRequest(getRanks(), {
    onDemand: true,
    loginToken: loginToken,
    onError: (error, type) => console.error(error)
  })

  function onSetLogin (usernameToSet: string, token: string) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_LOGIN_TOKEN, token)
    } catch (e: any) {
      console.error('Unable to save login token to local storage:', e)
    }

    setLoginToken(token)
    setUsername(usernameToSet)
    setAuthError(null)
  }

  function onClearAuthInfo () {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_LOGIN_TOKEN)
    } catch (e: any) {
      console.error('Unable to remove login token from local storage:', e)
    }

    setLoginToken(null)
    setUsername(null)
    setDisplayName(null)
  }

  const onLogin = React.useCallback(async () => {
    try {
      const storedLoginToken = window.localStorage.getItem(LOCAL_STORAGE_LOGIN_TOKEN)
      if (storedLoginToken == null) {
        setHasLoadedAuth(true)
        return
      }

      setAuthError(null)
      const response = await authenticate(storedLoginToken)
        // ugly hack: once authentication has completed, it will trigger the side effect of hydrating everything else.
        // however, this doesn't happen instantly and there are a few frames where we are logged in and not loading, causing the current page to possibly mount.
        // once we finished loading, the page will be re-mounted.
        // to avoid this interruption of the loading state, delay the time before we claim to have finished loading the authentication.
        .finally(() => window.setTimeout(() => setHasLoadedAuth(true), 50))

      if (response.success) {
        setLoginToken(storedLoginToken)
        setUsername(response.data.username)
        return
      } else if (response.error.errorCode === 401) {
        console.log('Stored login token was invalid. The user must log in.')
        onClearAuthInfo()
      }
    } catch (e: any) {
      console.error('Unable to login:', e)
      setAuthError(e.message)
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = async (dataType: RefreshableDataType): Promise<boolean> => {
    if (dataType === 'userRanks') {
      const results = await getRanksRequest.triggerRequest()
      return results.type === 'success'
    } else {
      assertUnreachable(dataType)
    }
  }

  // componentDidMount equivalent
  // authenticate the saved token, if any exists
  React.useEffect(() => {
    const loadContext = async () => {
      await onLogin()
    }
    void loadContext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (loginToken == null) {
      getRanksRequest.reset()
      return
    }

    getRanksRequest.triggerRequest()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginToken])

  const requests = username == null ? [] : [getRanksRequest]
  const isHydrated = requests.find(r => r.data == null && r.error == null) == null
  const isLoading = requests.find(r => r.isLoading) != null
  const errors = nonNull(requests.map(r => r.error))
  const ranks = getRanksRequest.data?.ranks ?? []

  return (
    <LoginContext.Provider
      value={{
        isHydrated: hasLoadedAuth && isHydrated,
        loginToken,
        username,
        isLoading: !hasLoadedAuth || isLoading,
        loadingData: nonNull([getRanksRequest.isLoading ? 'userRanks' : null]),
        errors: errors.length === 0 ? null : errors,
        authError: authError,
        ranks: ranks,
        setLogin: onSetLogin,
        logout: onClearAuthInfo,
        hasRank: rankName => ranks.find(r => r.rank === rankName) != null,
        refreshData: refreshData
      }}
    >
      {props.children}
    </LoginContext.Provider>
  )
}

export type LoginContextType = {
  isHydrated: boolean
  loginToken: string | null
  username: string | null
  isLoading: boolean
  loadingData: RefreshableDataType[]
  errors: ApiRequestError[] | null
  authError: string | null
  ranks: PublicUserRank[]

  setLogin: (username: string, token: string) => void
  logout: () => void
  hasRank: (rankName: RankName) => boolean

  // resolves to true if the refresh succeeded
  refreshData: (dataType: RefreshableDataType) => Promise<boolean>
}

const LoginContext = React.createContext<LoginContextType>(null!)
export default LoginContext
