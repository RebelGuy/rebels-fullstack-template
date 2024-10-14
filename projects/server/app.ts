import 'source-map-support/register' // so our stack traces are converted to the typescript equivalent files/lines
import express, { NextFunction, Request, Response } from 'express'
import { Server } from 'typescript-rest'
import env from './globals'
import { ContextProvider, setContextProvider } from '@INIT__PATH_ALIAS/shared/context/context'
import ServiceFactory from '@INIT__PATH_ALIAS/shared/context/CustomServiceFactory'
import path from 'node:path'
import FileService from '@INIT__PATH_ALIAS/server/services/FileService'
import LogService from '@INIT__PATH_ALIAS/server/services/LogService'
import DbProvider from '@INIT__PATH_ALIAS/server/providers/DbProvider'
import TimerHelpers from '@INIT__PATH_ALIAS/server/helpers/TimerHelpers'
import EventDispatchService from '@INIT__PATH_ALIAS/server/services/EventDispatchService'
import DateTimeHelpers from '@INIT__PATH_ALIAS/server/helpers/DateTimeHelpers'
import { Express } from 'express-serve-static-core'
import { InternalError, TimeoutError } from '@INIT__PATH_ALIAS/shared/util/error'
import RankStore from '@INIT__PATH_ALIAS/server/stores/RankStore'
import RankHelpers from '@INIT__PATH_ALIAS/shared/helpers/RankHelpers'
import * as fs from 'fs'
import AccountController from '@INIT__PATH_ALIAS/server/controllers/AccountController'
import AccountHelpers from '@INIT__PATH_ALIAS/shared/helpers/AccountHelpers'
import AccountStore from '@INIT__PATH_ALIAS/server/stores/AccountStore'
import ApiService from '@INIT__PATH_ALIAS/server/controllers/ApiService'
import AccountService from '@INIT__PATH_ALIAS/server/services/AccountService'
import { createLogContext } from '@INIT__PATH_ALIAS/shared/ILogService'
import WebService from '@INIT__PATH_ALIAS/server/services/WebService'
import { ApiResponse } from '@INIT__PATH_ALIAS/api-models/types'
import expressWs from 'express-ws'
import WebsocketClient from '@INIT__PATH_ALIAS/server/controllers/WebsocketClient'
import * as AI from 'applicationinsights'
import TaskService from '@INIT__PATH_ALIAS/server/services/task/TaskService'
import TaskStore from '@INIT__PATH_ALIAS/server/stores/TaskStore'
import Task1 from '@INIT__PATH_ALIAS/server/services/task/Task1'
import Task2 from '@INIT__PATH_ALIAS/server/services/task/Task2'
import TaskController from '@INIT__PATH_ALIAS/server/controllers/TaskController'
import ApplicationInsightsService from '@INIT__PATH_ALIAS/server/services/ApplicationInsightsService'
import RankController from '@INIT__PATH_ALIAS/server/controllers/RankController'

const STARTUP_TIME = Date.now()

const main = async () => {
  const app: Express = express()
  const wsApp = expressWs(app, undefined, { wsOptions: { }})

  const port = env('port')
  const studioUrl = env('studioUrl')
  const dataPath = path.resolve(__dirname, `../../data/`)
  const applicationInsightsConnectionString = env('applicationinsightsConnectionString')
  const dbLogLevel = env('dbLogLevel')
  const apiLogLevel = env('apiLogLevel')
  const debugLogOutput = env('debugLogOutput')
  const infoLogOutput = env('infoLogOutput')
  const warningLogOutput = env('warningLogOutput')
  const errorLogOutput = env('errorLogOutput')
  const dbSemaphoreConcurrent = env('dbSemaphoreConcurrent')
  const dbSemaphoreTimeout = env('dbSemaphoreTimeout')
  const dbTransactionTimeout = env('dbTransactionTimeout')
  const dbSlowQueryThreshold = env('dbSlowQueryThreshold')

  let isAdministrativeMode = false
  let isContextInitialised = false

  let appInsightsClient: AI.TelemetryClient | null
  if (applicationInsightsConnectionString == null) {
    appInsightsClient = null
  } else {
    console.debug('Starting ApplicationInsights client...')
    AI.setup(applicationInsightsConnectionString)
      .setAutoCollectConsole(false) // doesn't seem to work properly - instead, we manually track these via `trackTrace()` for better control
      .setSendLiveMetrics(true) // so we can monitor the app in real-time
      .start()
    appInsightsClient = AI.defaultClient
    console.debug('Successfully started ApplicationInsights client')
  }

  const globalContext = ContextProvider.create()
    .withVariable('isAdministrativeMode', () => isAdministrativeMode)
    .withVariable('isContextInitialised', () => isContextInitialised)
    .withObject('app', app)
    .withObject('appInsightsClient', appInsightsClient)
    .withProperty('port', port)
    .withProperty('studioUrl', studioUrl)
    .withProperty('dataPath', dataPath)
    .withProperty('nodeEnv', env('nodeEnv'))
    .withProperty('databaseUrl', env('databaseUrl'))
    .withProperty('dbLogLevel', dbLogLevel)
    .withProperty('apiLogLevel', apiLogLevel)
    .withProperty('debugLogOutput', debugLogOutput)
    .withProperty('infoLogOutput', infoLogOutput)
    .withProperty('warningLogOutput', warningLogOutput)
    .withProperty('errorLogOutput', errorLogOutput)
    .withProperty('dbSemaphoreConcurrent', dbSemaphoreConcurrent)
    .withProperty('dbSemaphoreTimeout', dbSemaphoreTimeout)
    .withProperty('dbTransactionTimeout', dbTransactionTimeout)
    .withProperty('dbSlowQueryThreshold', dbSlowQueryThreshold)
    .withHelpers('timerHelpers', TimerHelpers)
    .withHelpers('dateTimeHelpers', DateTimeHelpers)
    .withHelpers('rankHelpers', RankHelpers)
    .withHelpers('accountHelpers', AccountHelpers)
    .withClass('fileService', FileService)
    .withClass('applicationInsightsService', ApplicationInsightsService)
    .withClass('logService', LogService)
    .withClass('dbProvider', DbProvider)
    .withClass('eventDispatchService', EventDispatchService)
    .withClass('webService', WebService)
    .withClass('accountStore', AccountStore)
    .withClass('rankStore', RankStore)
    .withClass('accountService', AccountService)
    .withClass('task1', Task1)
    .withClass('task2', Task2)
    .withClass('taskStore', TaskStore)
    .withClass('taskService', TaskService)
    .build()

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.header('Access-Control-Allow-Headers', '*')

    if (req.method === 'OPTIONS') {
      res.sendStatus(200)
    } else {
      next()
    }
  })

  app.use((req, res, next) => {
    // intercept the JSON body so we can customise the error code
    // "inspired" by https://stackoverflow.com/a/57553226
    const send = res.send.bind(res)

    res.send = (body) => {
      if (res.headersSent) {
        // already sent
        return res
      }

      let responseBody: ApiResponse<any> | null
      if (body == null) {
        responseBody = null
      } else {
        try {
          responseBody = JSON.parse(body)
        } catch (e: any) {
          // the response body was just a message (string), so we must construct the error object explicitly
          if (res.statusCode === 200) {
            throw new InternalError('It is expected that only errors are ever sent with a simple message.')
          }

          responseBody = {
            timestamp: new Date().getTime(),
            success: false,
            error: {
              errorCode: res.statusCode as any,
              errorType: res.statusMessage ?? 'Internal Server Error',
              internalErrorType: 'Error',
              message: body
            }
          }
          res.set('Content-Type', 'application/json')
        }
      }

      if (responseBody?.success === false) {
        res.status(responseBody.error.errorCode ?? 500)
      }

      return send(JSON.stringify(responseBody))
    }

    next()
  })

  app.get('/', (_, res) => {
    let contents = fs.readFileSync(path.join(__dirname, 'default.html')).toString()
    contents = contents.replace('__SERVER_STARTUP_TIME_PLACEHOLDER__', STARTUP_TIME.toString())
    res.end(contents)
  })
  app.get('/robots933456.txt', (_, res) => res.sendFile('robots.txt', { root: __dirname }))
  app.get('/robots.txt', (_, res) => res.sendFile('robots.txt', { root: __dirname }))
  app.get('/favicon_local.ico', (_, res) => res.sendFile('favicon_local.ico', { root: __dirname }))
  app.get('/favicon_debug.ico', (_, res) => res.sendFile('favicon_debug.ico', { root: __dirname }))
  app.get('/favicon_release.ico', (_, res) => res.sendFile('favicon_release.ico', { root: __dirname }))

  const logContext = createLogContext(globalContext.getClassInstance('logService'), { name: 'App' })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.use(async (req, res, next) => {
    const context = globalContext.asParent()
      .withObject('request', req) // these are required because, within the ApiService, we don't have access to @Context yet at the time that preprocessors fire
      .withObject('response', res)
      .withClass('apiService', ApiService)
      .withClass('rankController', RankController)
      .withClass('accountController', AccountController)
      .withClass('taskController', TaskController)
      .build()
    await context.initialise()
    setContextProvider(req, context)

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    res.on('finish', async () => {
      await context.dispose()
    })

    next()
  })

  // for each request, the Server will instantiate a new instance of each Controller.
  // since we want to inject dependencies, we need to provide a custom implementation.
  Server.registerServiceFactory(new ServiceFactory())

  // tells the server which classes to use as Controllers
  Server.buildServices(app,
    RankController,
    AccountController,
    TaskController
  )


  // test using https://piehost.com/websocket-tester
  wsApp.app.ws('/ws', async (client, request, next) => {
    const websocketContext = globalContext.asParent()
      .withObject('request', request)
      .withObject('response', {} as any)
      .withObject('wsClient', client)
      .withClass('apiService', ApiService)
      .withClass('websocketService', WebsocketClient)
      .build()

    await websocketContext.initialise()
  })

  // at this point, none of the routes have matched, so we want to return a custom formatted error
  // from https://expressjs.com/en/starter/faq.html#how-do-i-handle-404-responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return
    }

    res.status(404).send('Not found.')
  })

  // error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // any errors reaching here are unhandled - just return a 500
    logContext.logError(`Express encountered error for the ${req.method} request at ${req.url}:`, err)

    if (!res.headersSent) {
      res.status(500).send(err.message)
    }

    // don't call `next(error)` - the next middleware would be the default express error handler,
    // which just logs the error to the console.
    // also by not calling `next`, we indicate to express that the request handling is over and the response should be sent
  })

  process.on('unhandledRejection', (error) => {
    if (error instanceof TimeoutError) {
      // when a db request queues a high number of callbacks in the semaphore, timing out the first
      // callback will correctly fail the request, but there may be more callbacks whose timeout
      // error takes a bit longer to fire. at that point, though, there won't be a listener anymore
      // (because the original request has already failed) and errors will bubble up to this point.
      // we can safely ignore them
      return
    }

    // from https://stackoverflow.com/questions/46629778/debug-unhandled-promise-rejections
    // to debug timers quietly failing: https://github.com/nodejs/node/issues/22149#issuecomment-410706698
    logContext.logError('process.unhandledRejection', error)
    throw error
  })

  process.on('uncaughtException', (error) => {
    logContext.logError('process.uncaughtException', error)
    throw error
  })

  // it is possible to ignore initialisation failure by adding some logic in here (e.g. a non-critical startup error)
  await globalContext.initialise((erroredClass, stage, e) => {
    return 'abort'
  })

  app.listen(port, () => {
    logContext.logInfo(`Server is listening on ${port}`)
    isContextInitialised = true
  })
}

void main()
