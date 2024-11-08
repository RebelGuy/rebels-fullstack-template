import { SxProps } from '@mui/material'
import { Box } from '@mui/system'
import LoginContext, { RankName } from '@INIT__PATH_ALIAS/studio/contexts/default/LoginContext'
import { useContext } from 'react'

export type Props = {
  children: React.ReactElement
  forbidden?: React.ReactElement
  inverted?: boolean
  adminsCanBypass?: boolean
  hideAdminOutline?: boolean

  // only applied to the admin outline, if shown
  adminSx?: SxProps
} & { [name in RankName]?: boolean }

export default function RequireRank (props: Props) {
  const loginContext = useContext(LoginContext)

  const requiredRanks = (Object.keys(props) as (keyof Props)[]).filter(key =>
    key !== 'children'
    && key !== 'forbidden'
    && key !== 'inverted'
    && key !== 'adminsCanBypass'
    && props[key] === true
  ) as RankName[]
  let hasAnyRequiredRank = requiredRanks.find(rank => loginContext.hasRank(rank)) != null

  if (props.inverted) {
    hasAnyRequiredRank = !hasAnyRequiredRank
  }

  if (props.adminsCanBypass && loginContext.hasRank('admin')) {
    hasAnyRequiredRank = true
  }

  if (loginContext.loginToken != null && hasAnyRequiredRank) {
    if (props.admin && props.hideAdminOutline !== true) {
      return (
        <Box sx={{ border: '2px red dashed', ...(props.adminSx ?? {}) }}>
          {props.children}
        </Box>
      )
    } else {
      return props.children
    }
  } else {
    return props.forbidden ?? null
  }
}
