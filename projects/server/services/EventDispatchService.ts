import { SingletonContextClass } from '@INIT__PATH_ALIAS/shared/context/ContextClass'

// generic and centralised service for collecting and distributing data.
// this helps avoid complicated or even circular service dependencies.
// events can be internal (i.e. services notifying each other) or public (i.e. relayed directly to clients via the websocket)

export const EVENT_EXAMPLE = Symbol('EVENT_EXAMPLE')

// define the internal data
export type EventData = {
  [EVENT_EXAMPLE]: { msg: string }
}

export type DataPair<T extends keyof EventData> = [T, EventData[T]]

type Listener<T extends keyof EventData = any> = (data: EventData[T]) => any | Promise<any>

export default class EventDispatchService extends SingletonContextClass {
  private isReady: boolean
  private tempStore: DataPair<any>[]
  private listeners: Map<keyof EventData, Listener[]>

  constructor () {
    super()

    this.isReady = false
    this.tempStore = []
    this.listeners = new Map()
  }

  // don't distribute data until initial listeners have subscribed.
  // it is assumed that all subscriptions are completed in the `initialise()` cycle.
  public override async onReady () {
    this.isReady = true

    // replay stored data one-by-one
    for (const pair of this.tempStore) {
      await this.addData(pair[0], pair[1])
    }
    this.tempStore = null!
  }

  /** Notifies subscribers of the new data. */
  public async addData<T extends keyof EventData> (type: T, data: EventData[T]) {
    if (!this.isReady) {
      const pair: DataPair<T> = [type, data]
      this.tempStore.push(pair)
      return
    }

    if (this.listeners.has(type)) {
      await Promise.all(this.listeners.get(type)!.map(listener => listener(data)))
    }
  }

  public isListening<T extends keyof EventData> (type: T, listener: Listener<T>) {
    if (!this.listeners.has(type)) {
      return false
    } else {
      return this.listeners.get(type)!.includes(listener)
    }
  }

  /** Starts listening to data. The listener is responsible for catching all errors. */
  public onData<T extends keyof EventData> (type: T, listener: Listener<T>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  /** Removes the listener for the event type. */
  public unsubscribe<T extends keyof EventData> (type: T, listener: Listener<T>) {
    if (!this.listeners.has(type)) {
      return
    }

    this.listeners.set(type, this.listeners.get(type)!.filter(l => l !== listener))
  }
}
