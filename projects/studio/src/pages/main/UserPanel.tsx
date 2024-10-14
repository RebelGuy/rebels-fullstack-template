import { Box } from '@mui/material'
import CentredLoadingSpinner from '@INIT__PATH_ALIAS/studio/components/default/CentredLoadingSpinner'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import UserInfo from '@INIT__PATH_ALIAS/studio/pages/main/UserInfo'
import { ReactElement, useContext } from 'react'

export default function UserPanel () {
  const loginContext = useContext(LoginContext)

  let content: ReactElement
  if (!loginContext.isHydrated && loginContext.isLoading) {
    // i can't work out how to centre it vertically, but this looks ok
    content = <Box style={{ marginTop: '50%' }}>
      <CentredLoadingSpinner />
    </Box>
  } else {
    content = <>
      <UserInfo />
    </>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between' }}>
      <Box sx={{ flex: 1 }}>{content}</Box>
    </Box>
  )
}
