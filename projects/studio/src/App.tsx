import { LoginProvider } from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { Route, Routes } from 'react-router-dom'
import MainView from '@INIT__PATH_ALIAS/studio/pages/main/MainView'
import { pages } from '@INIT__PATH_ALIAS/studio/pages/navigation'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { Alert, GlobalStyles } from '@mui/material'
import ErrorBoundary from '@INIT__PATH_ALIAS/studio/components/default/ErrorBoundary'
import { RequestContextProvider } from '@INIT__PATH_ALIAS/studio/contexts/default/RequestContext'

// https://mui.com/material-ui/customization/theme-components/
// https://zenoo.github.io/mui-theme-creator/#BottomNavigation
const theme = createTheme({
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      },
      styleOverrides: {
        root: {
          // so that the title doesn't get cut off
          marginTop: 8
        }
      }
    },
    MuiButton: {
      defaultProps: {
        variant: 'outlined'
      }
    }
  }
})

const globalStyles = <GlobalStyles styles={{
  // override html styles here, e.g. { h1: { color: 'grey' }}
}} />

export default function App () {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        {globalStyles}
        <RequestContextProvider>
          <LoginProvider>
            <Routes>
              <Route path="/" element={<MainView />}>
                {pages.map(page =>
                  <Route key={page.id} path={page.path} element={page.element} />
                )}
                <Route path="*" element={<Alert severity="error">Page not found.</Alert>} />
              </Route>
            </Routes>
          </LoginProvider>
        </RequestContextProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
