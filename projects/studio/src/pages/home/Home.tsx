import { Alert, Box, Button, Typography } from '@mui/material'
import PanelHeader from '@INIT__PATH_ALIAS/studio/components/default/styled/PanelHeader'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { PageLogin } from '@INIT__PATH_ALIAS/studio/pages/navigation'
import { useContext } from 'react'
import { generatePath, Link } from 'react-router-dom'

export default function Home () {
  const loginContext = useContext(LoginContext)
  const loginPath = generatePath(PageLogin.path)

  return (
    <Box>
      <PanelHeader>Welcome to INIT__APP_NAME</PanelHeader>
      <Typography>This is your home page.</Typography>

      {loginContext.username == null && (
        <Alert severity="info" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 2 }}>Get started by logging in or creating a free account - it takes less than 10 seconds!</Typography>
            <Link to={loginPath} style={{ color: 'black', textDecoration: 'none' }}>
              <Button>
                Let's go!
              </Button>
            </Link>
          </Box>
        </Alert>
      )}
    </Box>
  )
}
