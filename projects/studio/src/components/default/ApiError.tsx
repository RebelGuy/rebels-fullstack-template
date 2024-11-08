import { Alert, Box, Button } from '@mui/material'
import { nonNull, unique } from '@INIT__PATH_ALIAS/shared/util/arrays'
import { ApiRequestError, RequestResult } from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'

type Props = {
  hideRetryButton?: boolean
} & ({
  error: ApiRequestError | null
  isLoading?: boolean
} | {
  requestObj: RequestResult<any> | (RequestResult<any> | null | undefined)[]
})

export default function ApiError (props: Props) {
  const hideRetryButton = props.hideRetryButton ?? false
  let errors: ApiRequestError[]
  let isLoading: boolean

  if ('error' in props) {
    isLoading = props.isLoading ?? false
    errors = props.error == null ? [] : [props.error]
  } else if (Array.isArray(props.requestObj)) {
    const objs = nonNull(props.requestObj)
    isLoading = objs.find(obj => obj.isLoading) != null
    errors = nonNull(objs.map(obj => obj.error))
  } else {
    isLoading = props.requestObj.isLoading
    errors = props.requestObj.error == null ? [] : [props.requestObj.error]
  }

  if (errors.length === 0) {
    return null
  }

  const showRetryButton = !hideRetryButton && errors.find(err => err.onRetry != null) != null
  const errorMessages = unique(errors.map(err => err.message))

  const onRetry = () => {
    errors!.filter(err => err.onRetry != null).forEach(err => err.onRetry!())
  }

  return (
    <Alert severity="error" sx={{ mt: 1, mb: 1 }} action={showRetryButton && (
      <Button disabled={isLoading} onClick={onRetry} style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        Retry
      </Button>
    )}>
      Error: {errorMessages.length === 1 ? errorMessages[0] : errorMessages.map((msg, i) => (
        <Box key={i} sx={{ ml: 1 }}>
          - {msg}
        </Box>
      ))}
    </Alert>
  )
}
