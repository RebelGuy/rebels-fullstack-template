import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Popover, SxProps } from '@mui/material'
import { PublicUserRank } from '@INIT__PATH_ALIAS/api-models/public/rank/PublicUserRank'
import { isNullOrEmpty } from '@INIT__PATH_ALIAS/shared/util/strings'
import { toSentenceCase } from '@INIT__PATH_ALIAS/shared/util/text'
import { assertUnreachable } from '@INIT__PATH_ALIAS/shared/util/typescript'
import RelativeTime from '@INIT__PATH_ALIAS/studio/components/default/RelativeTime'
import LoginContext from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import useRequest from '@INIT__PATH_ALIAS/studio/hooks/default/useRequest'
import { PageChangePassword, PageLogin } from '@INIT__PATH_ALIAS/studio/pages/navigation'
import { logout } from '@INIT__PATH_ALIAS/studio/utility/default/api'
import React, { CSSProperties, ReactElement, useState } from 'react'
import { useContext } from 'react'
import { useNavigate, generatePath, useLocation } from 'react-router-dom'
import RankHelpers from '@INIT__PATH_ALIAS/shared/helpers/RankHelpers'
import { RETURN_URL_QUERY_PARAM } from '@INIT__PATH_ALIAS/studio/pages/login/LoginForm'
import Clickable from '@INIT__PATH_ALIAS/studio/components/default/styled/Clickable'

const rankHelpers = new RankHelpers()

export default function UserInfo () {
  const loginContext = useContext(LoginContext)
  const navigate = useNavigate()
  const { pathname: currentPath } = useLocation()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const onLoggedOut = () => {
    loginContext.logout()
    navigate(generatePath('/'))
    setMenuAnchor(null)
  }
  const logoutRequest = useRequest(logout(), { onDemand: true, onDone: onLoggedOut })

  const onChangePassword = () => {
    navigate(PageChangePassword.path)
    setMenuAnchor(null)
  }

  const loginUrl = generatePath(PageLogin.path) + `?${RETURN_URL_QUERY_PARAM}=${currentPath}`
  const isLoggedIn = loginContext.username != null
  if (!isLoggedIn) {
    return <>
      <Alert severity="info">
        You are not currently logged in.
      </Alert>
      <Button onClick={() => navigate(loginUrl)} fullWidth sx={{ marginTop: 1, marginBottom: 1 }}>Login</Button>

      {loginContext.authError != null && <>
        <Alert severity="error">{loginContext.authError}</Alert>
      </>}
    </>
  }

  const isLoading = logoutRequest.isLoading

  return <>
    <Clickable onClick={e => setMenuAnchor(e.currentTarget)} width="40px" margin="auto">
      <Avatar />
    </Clickable>
    <UserName />
    <UserRanks sx={{ mt: 1, mb: 1 }} />

    <Popover
      open={menuAnchor != null}
      anchorEl={menuAnchor}
      onClose={() => setMenuAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <MenuItem disabled={isLoading} onClick={logoutRequest.triggerRequest}>Log out</MenuItem>
      <MenuItem disabled={isLoading} onClick={onChangePassword}>Change password</MenuItem>
    </Popover>
  </>
}

function UserName () {
  const loginContext = React.useContext(LoginContext)

  return <Box sx={{ textAlign: 'center' }}>
    Hi, <b>{loginContext.username}</b>!
  </Box>
}

function UserRanks (props: { sx: SxProps }) {
  const loginContext = React.useContext(LoginContext)
  let [selectedRank, setSelectedRank] = useState<PublicUserRank | null>(null)

  // reference the loginContext's ranks so that when we update the rank (e.g. by customising the name), the selection automatically changes as well
  selectedRank = selectedRank != null ? loginContext.ranks.find(r => r.id === selectedRank!.id) ?? null : null

  // have to add up to 12
  const gridLeft = 4
  const gridRight = 12 - gridLeft

  return <Box sx={props.sx}>
    <Box>
      {loginContext.ranks.map(r => <Rank key={r.id} rank={r} onClick={setSelectedRank} />)}
    </Box>
    {selectedRank != null &&
      <Dialog open>
        <DialogTitle>
          {toSentenceCase(selectedRank!.rank)} rank details
        </DialogTitle>
        <DialogContent sx={{ typography: 'body1' }}>
          <Grid container spacing={2}>
            <Grid item xs={gridLeft}>Message:</Grid><Grid item xs={gridRight}>{getRankMessage(selectedRank!)}</Grid>
            <Grid item xs={gridLeft}>Active since:</Grid><Grid item xs={gridRight}><RelativeTime time={selectedRank!.issuedAt} /> ago</Grid>
            <Grid item xs={gridLeft}>Expiration:</Grid><Grid item xs={gridRight}>{selectedRank!.expirationTime == null ? 'Never' : <>In <RelativeTime time={selectedRank!.expirationTime} /></>}</Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRank(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    }
  </Box>
}

type RankProps = {
  rank: PublicUserRank
  onClick: (rank: PublicUserRank) => void
}

function Rank (props: RankProps) {
  const color = getRankColor(props.rank)

  return (
    <Chip
      onClick={() => props.onClick(props.rank)}
      label={<Box display="flex">{toSentenceCase(props.rank.rank)}</Box>}
      sx={{ p: 0.5, m: 0.5, border: `1px ${color} solid` }}
    />
  )
}

function getRankColor (rank: PublicUserRank): CSSProperties['color'] {
  switch (rank.rank) {
    case 'admin':
      return 'red'
    default:
      assertUnreachable(rank.rank)
  }
}

function getRankMessage (rank: PublicUserRank): ReactElement {
  if (isNullOrEmpty(rank.message)) {
    return <em>No message.</em>
  }

  return <Box>
    {rank.message}
  </Box>
}
