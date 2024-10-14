import { Alert, AlertProps, Box } from '@mui/material'
import { SafeOmit } from '@INIT__PATH_ALIAS/shared/types'

type Props = AlertProps | {
  severity: 'none'
} & SafeOmit<AlertProps, 'severity'>

export default function OptionalAlert (props: Props) {
  if (props.severity === 'none') {
    return <Box {...props} />
  } else {
    return <Alert {...props} />
  }
}
