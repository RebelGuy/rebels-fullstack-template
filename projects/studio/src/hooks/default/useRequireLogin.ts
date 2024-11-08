import { RETURN_URL_QUERY_PARAM } from '@INIT__PATH_ALIAS/studio/pages/login/LoginForm'
import { PageLogin } from '@INIT__PATH_ALIAS/studio/pages/navigation'
import { useLocation, generatePath, useNavigate } from 'react-router-dom'

/** Use the `onRequireLogin` function to send the user to the login page and have them redirected to the current page upon loggin in. */
export default function useRequireLogin () {
  const { pathname: currentPath, search: currentSearch, hash: currentHash } = useLocation()
  const loginPath = generatePath(PageLogin.path)
  const navigate = useNavigate()

  const queryParam = `?${RETURN_URL_QUERY_PARAM}=${window.encodeURIComponent(currentPath + currentSearch + currentHash)}`
  const onRequireLogin = () => navigate(loginPath + queryParam)
  return { onRequireLogin }
}
