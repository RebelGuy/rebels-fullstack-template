import { Box, Tooltip, TooltipProps } from '@mui/material'
import { SafeOmit } from '@INIT__PATH_ALIAS/shared/types'

type Props = {
  text: string
  help: string
} & SafeOmit<TooltipProps, 'title' | 'children'>

export default function TextWithHelp ({ text, help, ...rest }: Props) {
  return (
    <Tooltip {...rest} title={help}>
      <Box sx={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlinePosition: 'under', textUnderlineOffset: 1 }}>
        {text}
      </Box>
    </Tooltip>
  )
}
