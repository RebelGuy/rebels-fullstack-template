import ApiService from '@INIT__PATH_ALIAS/server/controllers/ApiService'
import ContextClass from '@INIT__PATH_ALIAS/shared/context/ContextClass'
import { Dependencies } from '@INIT__PATH_ALIAS/shared/context/context'
import { RawData, WebSocket } from 'ws'
import { Request } from 'express'
import { assertUnreachable } from '@INIT__PATH_ALIAS/shared/util/typescript'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'
import { ServerMessage, Topic, parseClientMessage } from '@INIT__PATH_ALIAS/api-models/websocket'
import EventDispatchService, { EVENT_EXAMPLE, EventData } from '@INIT__PATH_ALIAS/server/services/EventDispatchService'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import RankStore from '@INIT__PATH_ALIAS/server/stores/RankStore'

type Deps = Dependencies<{
  request: Request
  apiService: ApiService
  wsClient: WebSocket
  logService: LogService
  eventDispatchService: EventDispatchService
  rankStore: RankStore
  accountStore: AccountStore
}>

let id = 0

export default class WebsocketClient extends ContextClass {
  public readonly name

  private readonly request: Request
  private readonly apiService: ApiService
  private readonly wsClient: WebSocket
  private readonly logService: LogService
  private readonly eventDispatchService: EventDispatchService
  private readonly rankStore: RankStore
  private readonly accountStore: AccountStore

  private readonly id: number

  private subscriptions: Set<Topic>

  constructor (deps: Deps) {
    super()

    this.request = deps.resolve('request')
    this.apiService = deps.resolve('apiService')
    this.wsClient = deps.resolve('wsClient')
    this.logService = deps.resolve('logService')
    this.eventDispatchService = deps.resolve('eventDispatchService')
    this.rankStore = deps.resolve('rankStore')
    this.accountStore = deps.resolve('accountStore')

    this.id = id++
    this.name = `${WebsocketClient.name}-${this.id}`
    this.subscriptions = new Set()
  }

  public override initialise (): void | Promise<void> {
    this.wsClient.on('open', this.onOpen)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.wsClient.on('message', this.onMessage)
    this.wsClient.on('close', this.onClose)
    this.wsClient.on('error', this.onError)

    if (this.getState() === 'open') {
      this.onOpen()
    }
  }

  public override dispose (): void | Promise<void> {
    this.close()

    this.wsClient.off('open', this.onOpen)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.wsClient.off('message', this.onMessage)
    this.wsClient.off('close', this.onClose)
    this.wsClient.off('error', this.onError)

    this.eventDispatchService.unsubscribe(EVENT_EXAMPLE, this.onExampleEvent)

    this.subscriptions = new Set()
  }

  private onOpen = () => {
    this.logService.logInfo(this, `Websocket connection established`)
  }

  private onMessage = (data: RawData, isBinary: boolean) => {
    try {
      const parsedMessage = isBinary ? null : parseClientMessage(data)

      if (parsedMessage == null) {
        this.send({ type: 'acknowledge', id: null, data: { success: false }})
        return
      }

      const messageId = parsedMessage.id ?? null
      const resolvedTopic = parsedMessage.data.topic

      if (parsedMessage.type === 'subscribe') {
        this.subscriptions.add(resolvedTopic)

        if (parsedMessage.data.topic === 'exampleTopic') {
          if (!this.eventDispatchService.isListening(EVENT_EXAMPLE, this.onExampleEvent)) {
            this.eventDispatchService.onData(EVENT_EXAMPLE, this.onExampleEvent)
          }
        } else {
          assertUnreachable(parsedMessage.data.topic)
        }

      } else if (parsedMessage.type === 'unsubscribe') {
        this.subscriptions.add(resolvedTopic)

        if (parsedMessage.data.topic === 'exampleTopic') {
          this.eventDispatchService.unsubscribe(EVENT_EXAMPLE, this.onExampleEvent)
        } else {
          assertUnreachable(parsedMessage.data.topic)
        }

      } else {
        assertUnreachable(parsedMessage)
      }

      this.send({ type: 'acknowledge', id: messageId, data: { success: true }})

    } catch (e: any) {
      this.logService.logError(this, 'Encountered error in the onMessage handler for data', data, e)

      this.send({ type: 'acknowledge', id: null, data: { success: false }})
    }
  }

  private onClose = (code: number, reason: Buffer) => {
    this.logService.logInfo(this, `Websocket connection closed with code ${code}. Reason:`, reason)

    void this.dispose()
  }

  private onError = (error: Error) => {
    this.logService.logError(this, `Websocket connection errored:`, error)
  }

  private onExampleEvent = (internalData: EventData[typeof EVENT_EXAMPLE]) => {
    try {
      if (!this.subscriptions.has('exampleTopic')) {
        return
      }

      // do logic using dependencies

      this.send({
        type: 'event',
        data: {
          topic: 'exampleTopic',
          data: { msg: internalData.msg }
        }
      })
    } catch (e: any) {
      this.logService.logError(this, 'Unable to dispatch chat event', internalData, e)
    }
  }

  private getState () {
    if (this.wsClient.readyState === this.wsClient.CONNECTING) {
      return 'connecting'
    } else if (this.wsClient.readyState === this.wsClient.OPEN) {
      return 'open'
    } else if (this.wsClient.readyState === this.wsClient.CLOSING) {
      return 'closing'
    } else if (this.wsClient.readyState === this.wsClient.CLOSED) {
      return 'closed'
    } else {
      assertUnreachable(this.wsClient.readyState)
    }
  }

  private close () {
    if (this.getState() !== 'open') {
      return
    }

    this.wsClient.close()
  }

  private send (message: ServerMessage) {
    this.wsClient.send(JSON.stringify(message), error => {
      if (error != null) {
        this.logService.logError(this, 'Failed to send message', message, 'because of an error:', error)
      }
    })
  }
}
