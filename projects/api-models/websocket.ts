import { SafeExtract } from '@INIT__PATH_ALIAS/shared/types'

const EXAMPLE_TOPIC = 'exampleTopic'

// best practise is to put this in the public folder
type PublicExampleType = { msg: string }

export type ClientMessage =
  { type: 'subscribe', data: SubscribeMessageData, id?: number } |
  { type: 'unsubscribe', data: UnsubscribeMessageData, id?: number }

type SubscribeMessageData = {
  topic: Topic
}

type UnsubscribeMessageData = {
  topic: Topic
}

export type Topic = typeof EXAMPLE_TOPIC

export type ServerMessage =
  { type: 'acknowledge', data: AcknowledgeMessageData, id: number | null } |
  { type: 'event', data: EventMessageData }

type AcknowledgeMessageData = {
  success: boolean
}

type EventMessageData =
  { topic: SafeExtract<Topic, typeof EXAMPLE_TOPIC>, data: PublicExampleType }
  // union any other topics on here

export function parseClientMessage (message: Buffer | ArrayBuffer | Buffer[]): ClientMessage | null {
  if (message instanceof ArrayBuffer || Array.isArray(message)) {
    return null
  }

  let parsedMessage: unknown
  try {
    parsedMessage = JSON.parse(message.toString())
  } catch (e: any) {
    return null
  }

  if (parsedMessage == null || Array.isArray(parsedMessage) || typeof parsedMessage !== 'object') {
    return null
  }

  if (!('type' in parsedMessage) || !('data' in parsedMessage)) {
    return null
  }

  if (parsedMessage.type === 'subscribe' || parsedMessage.type === 'unsubscribe') {
    if (parsedMessage.data == null || typeof parsedMessage.data !== 'object' || !('topic' in parsedMessage.data)) {
      return null
    }

    if (parsedMessage.data.topic !== EXAMPLE_TOPIC) {
      return null
    }

    let id: number | undefined = undefined
    if ('id' in parsedMessage) {
      if (typeof parsedMessage.id !== 'number') {
        return null
      } else {
        id = parsedMessage.id
      }
    }

    return {
      type: parsedMessage.type,
      id: id,
      data: {
        topic: parsedMessage.data.topic
      }
    }
  } else {
    return null
  }
}
