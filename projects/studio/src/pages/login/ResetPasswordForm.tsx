import { ResetPasswordResponse } from '@INIT__PATH_ALIAS/api-models/schema/account'
import { isNullOrEmpty } from '@INIT__PATH_ALIAS/shared/util/strings'
import { resetPassword } from '@INIT__PATH_ALIAS/studio/utility/default/api'
import Form from '@INIT__PATH_ALIAS/studio/components/default/Form'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { useContext, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'
import TextField from '@mui/material/TextField'
import { Button } from '@mui/material'
import useRequest, { SuccessfulResponseData } from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import ApiLoading from '@INIT__PATH_ALIAS/studio/components/default/ApiLoading'
import ApiError from '@INIT__PATH_ALIAS/studio/components/default/ApiError'

export default function LoginForm () {
  const loginContext = useContext(LoginContext)
  const [oldPassword, onSetPassword] = useState('')
  const [newPassword, onSetNewPassword] = useState('')
  const [confirmedNewPassword, onSetConfirmedNewPassword] = useState('')
  const navigate = useNavigate()

  const onSuccess = (data: SuccessfulResponseData<ResetPasswordResponse>) => {
    loginContext.setLogin(loginContext.username!, data.loginToken)
    navigate(generatePath('/'))
  }

  const resetPasswordRequest = useRequest(resetPassword({ oldPassword, newPassword }), { onDemand: true, onSuccess })

  const disableButton = isNullOrEmpty(oldPassword) || isNullOrEmpty(newPassword) || (newPassword !== confirmedNewPassword)
  const isLoading = resetPasswordRequest.isLoading || loginContext.isLoading
  const onSubmit = resetPasswordRequest.triggerRequest

  return (
    <div style={{ width: 'fit-content', margin: 'auto' }}>
      <Form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <TextField
          label="Current password"
          type="password"
          disabled={isLoading}
          sx={{ width: 350, mt: 2 }}
          onChange={e => onSetPassword(e.target.value)}
        />
        <TextField
          label="New Password"
          type="password"
          disabled={isLoading}
          sx={{ width: 350, mt: 2 }}
          onChange={e => onSetNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm password"
          onChange={e => onSetConfirmedNewPassword(e.target.value)}
          disabled={isLoading}
          sx={{ maxWidth: 350, mt: 2 }}
          type="password"
        />
        <Button
          type="submit"
          disabled={disableButton || isLoading}
          sx={{ mt: 2, mb: 2 }}
        >
          Change password
        </Button>
        <ApiLoading isLoading={isLoading} />
        <ApiError requestObj={resetPasswordRequest} />
      </Form>
    </div>
  )
}
