import RequireRank from '@INIT__PATH_ALIAS/studio/components/default/RequireRank'
import RouteParamsObserver from '@INIT__PATH_ALIAS/studio/components/default/RouteParamsObserver'
import { Outlet } from 'react-router-dom'
import { Alert, Box, Container, Typography } from '@mui/material'
import NavigationPanel from '@INIT__PATH_ALIAS/studio/pages/main/NavigationPanel'
import UserPanel from '@INIT__PATH_ALIAS/studio/pages/main/UserPanel'
import { styled } from '@mui/material'
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import useRequest from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import useCurrentPage from '@INIT__PATH_ALIAS/studio/hooks/default/useCurrentPage'
import CentredLoadingSpinner from '@INIT__PATH_ALIAS/studio/components/default/CentredLoadingSpinner'
import ErrorBoundary from '@INIT__PATH_ALIAS/studio/components/default/ErrorBoundary'
import { STUDIO_VERSION, NODE_ENV } from '@INIT__PATH_ALIAS/studio/utility/default/global'
import useRequireLogin from '@INIT__PATH_ALIAS/studio/hooks/default/useRequireLogin'

const Panel = styled('div')({
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: 12,
  padding: 4,
  boxShadow: '3px 3px 5px rgba(0, 0, 0, 0.1)',
  overflow: 'auto'
})

const titleSuffix: Record<typeof NODE_ENV, string> = {
  release: '',
  debug: ' Sandbox',
  local: ' Local'
}

export default function MainView () {
  const [headerHeight, setHeaderHeight] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null!)

  return (
    <Box sx={{ overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column', typography: 'body1' }}>
      {/* header */}
      <Typography variant="h3" style={{ fontWeight: 500, margin: 'auto' }} ref={node => setHeaderHeight(node?.clientHeight ?? 0)}>
        INIT__APP_NAME {titleSuffix[NODE_ENV]}
      </Typography>

      {/* body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        <Container style={{ flex: '1 0 250px', paddingRight: 0 }}>
          <Panel style={{ height: 'calc(50% - 20px)', marginBottom: 20 }}>
            <NavigationPanel />
          </Panel>
          <Panel style={{ height: 'calc(50% - 15px)' }}>
            <UserPanel />
          </Panel>
        </Container>

        <Container style={{ minWidth: 300, maxWidth: 10000, maxHeight: `calc(100vh - ${headerHeight}px - 30px)` }}>
          <Panel style={{ height: '100%' }} ref={r => panelRef.current = r!}>
            <PanelContext.Provider value={panelRef.current}>
              <ErrorBoundary>
                <CurrentPage />
              </ErrorBoundary>
            </PanelContext.Provider>
          </Panel>
        </Container>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', color: 'grey' }}>
        <div style={{ width: '100%', bottom: 8, textAlign: 'center' }}>
          {/* empty */}
        </div>
        <div style={{ width: '100%', bottom: 8, textAlign: 'center' }}>
          {/* empty */}
        </div>
        <div style={{ width: '100%', bottom: 8, textAlign: 'right', paddingRight: 4 }}>
          <em style={{ fontSize: 14 }}>INIT__APP_NAME Studio v{STUDIO_VERSION}</em>
        </div>
      </div>

      {/* special */}
      <RouteParamsObserver />
    </Box>
  )
}

export const PanelContext = createContext<HTMLDivElement>(null!)

function CurrentPage () {
  const loginContext = useContext(LoginContext)
  const page = useCurrentPage()
  const { onRequireLogin } = useRequireLogin()

  useEffect(() => {
    if (loginContext.loginToken == null && page?.requiresLogin) {
      onRequireLogin()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginContext.loginToken])

  if (loginContext.isLoading && !loginContext.isHydrated) {
    return <CentredLoadingSpinner />
  }

  let content: ReactNode
  if (page == null || page.requireRanksProps == null) {
    content = <Outlet />
  } else {
    content = (
      <RequireRank
        hideAdminOutline
        forbidden={<Alert severity="error">You do not have permission to access this page.</Alert>}
        {...page.requireRanksProps}
      >
        <Outlet />
      </RequireRank>
    )
  }

  return (
    <Box sx={{ m: 1 }}>
      {content}
    </Box>
  )
}
