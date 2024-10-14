import { Box } from '@mui/material'
import CentredLoadingSpinner from '@INIT__PATH_ALIAS/studio/components/default/CentredLoadingSpinner'
import LinkToPage, { PageProps } from '@INIT__PATH_ALIAS/studio/components/default/LinkToPage'
import RequireRank from '@INIT__PATH_ALIAS/studio/components/default/RequireRank'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { PageHome, Page, PageTask } from '@INIT__PATH_ALIAS/studio/pages/navigation'
import { cloneElement, useContext } from 'react'
import { useLocation, matchPath } from 'react-router-dom'

export default function Navigation () {
  const loginContext = useContext(LoginContext)

  if (!loginContext.isHydrated && loginContext.isLoading) {
    return <CentredLoadingSpinner />
  }

  return (
    <nav>
      <NavItem page={PageHome} />
      <NavItem page={PageTask} />
    </nav>
  )
}

function NavItem<P extends Page> (props: PageProps<P>) {
  const loginContext = useContext(LoginContext)
  const { pathname: currentPath } = useLocation()

  const page = props.page
  if (!loginContext.isHydrated && page.requireRanksProps != null || loginContext.username == null && page.requiresLogin) {
    return null
  }

  const isSelected = matchPath({ path: page.path }, currentPath)

  const content = (
    <Box sx={{ m: 0.5 }}>
      <LinkToPage style={{ color: 'black', textDecoration: 'none' }} {...props}>
        <Box sx={{
          padding: 1,
          backgroundColor: 'rgba(0, 0, 255, 0.1)',
          borderRadius: 2,
          border: `1px ${isSelected != null ? 'red' : 'transparent'} solid`,
          display: 'flex',
          flexDirection: 'row',
          verticalAlign: 'middle',
          ':hover': {
            backgroundColor: 'rgba(0, 0, 255, 0.05)'
          }
        }}>
          {cloneElement(page.icon, { sx: { pr: 0.5 }})}
          <div style={{ marginTop: 1 }}>{page.title}</div>
        </Box>
      </LinkToPage>
    </Box>
  )

  if (page.requireRanksProps == null) {
    return content
  } else {
    return (
      <RequireRank {...page.requireRanksProps}>
        {content}
      </RequireRank>
    )
  }
}
