import { LoginResponse, RegisterResponse } from '@INIT__PATH_ALIAS/api-models/schema/account'
import { isNullOrEmpty } from '@INIT__PATH_ALIAS/shared/util/strings'
import { login, registerAccount } from '@INIT__PATH_ALIAS/studio/utility/default/api'
import Form from '@INIT__PATH_ALIAS/studio/components/default/Form'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { useContext, useEffect, useState } from 'react'
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom'
import TextField from '@mui/material/TextField'
import { Button, Checkbox, FormControlLabel } from '@mui/material'
import AccountHelpers from '@INIT__PATH_ALIAS/shared/helpers/AccountHelpers'
import { InvalidUsernameError } from '@INIT__PATH_ALIAS/shared/util/error'
import AutoFocus from '@INIT__PATH_ALIAS/studio/components/default/Autofocus'
import useRequest, { SuccessfulResponseData } from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import ApiLoading from '@INIT__PATH_ALIAS/studio/components/default/ApiLoading'
import ApiError from '@INIT__PATH_ALIAS/studio/components/default/ApiError'

export const RETURN_URL_QUERY_PARAM = 'returnUrl'

const accountHelpers = new AccountHelpers()

// by combining the login/registration form into a single component, we can easily handle redirects after the user logs in/registers
export default function LoginForm () {
  const loginContext = useContext(LoginContext)
  const [username, onSetUsername] = useState('')
  const [password, onSetPassword] = useState('')
  const [confirmedPassword, onSetConfirmedPassword] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const returnUrl = params.has(RETURN_URL_QUERY_PARAM) ? window.decodeURIComponent(params.get(RETURN_URL_QUERY_PARAM)!) : null

  const onSuccess = (data: SuccessfulResponseData<RegisterResponse | LoginResponse>) => {
    loginContext.setLogin(username, data.loginToken)

    // redirect them to the previous page. if `replace` is true, the login page will not show up in the browser page history
    navigate(returnUrl ?? generatePath('/'), { replace: returnUrl != null })
  }

  const registerRequest = useRequest(registerAccount({ username, password }), { onDemand: true, onSuccess })
  const loginRequest = useRequest(login({ username, password }), { onDemand: true, onSuccess })

  // we don't want to show the login page if the user is already logged in
  useEffect(() => {
    if (loginContext.loginToken != null) {
      navigate(returnUrl ?? generatePath('/'), { replace: returnUrl != null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let userNameError: string | null = null
  if (!isNullOrEmpty(username)) {
    try {
      accountHelpers.validateAndFormatUsername(username)
    } catch (e) {
      if (e instanceof InvalidUsernameError) {
        userNameError = e.message
      } else {
        throw e
      }
    }
  }

  const disableButton = isNullOrEmpty(username) || isNullOrEmpty(password) || (isNewUser && password !== confirmedPassword) || userNameError != null
  const isLoading = loginRequest.isLoading || registerRequest.isLoading || loginContext.isLoading
  const onSubmit = isNewUser ? () => { console.log('trigger'); registerRequest.triggerRequest() } : loginRequest.triggerRequest

  return (
    <div style={{ width: 'fit-content', margin: 'auto' }}>
      <Form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <AutoFocus>
          {(onRef) => (
            <TextField
              label="Username"
              disabled={isLoading}
              error={userNameError != null}
              helperText={userNameError}
              sx={{ width: 350, mt: 2 }}
              inputRef={onRef}
              onChange={e => onSetUsername(e.target.value)}
            />
          )}
        </AutoFocus>
        <TextField
          label="Password"
          type="password"
          disabled={isLoading}
          sx={{ width: 350, mt: 2 }}
          onChange={e => onSetPassword(e.target.value)}
        />
        {isNewUser && (
          <TextField
            label="Confirm password"
            onChange={e => onSetConfirmedPassword(e.target.value)}
            disabled={isLoading}
            sx={{ maxWidth: 350, mt: 2 }}
            type="password"
          />
        )}
        <FormControlLabel
          label="I am a new user"
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={isNewUser}
              onChange={() => setIsNewUser(!isNewUser)}
              disabled={isLoading}
            />
          }
        />
        <Button
          type="submit"
          disabled={disableButton || isLoading}
          sx={{ mt: 2, mb: 2 }}
        >
          {isNewUser ? 'Create account' : 'Login'}
        </Button>
        <ApiLoading isLoading={isLoading} />
        <ApiError requestObj={isNewUser ? registerRequest : loginRequest} />
      </Form>
    </div>
  )
}
