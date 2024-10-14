# Project Details
Built JavaScript files live in the `./dist` folder, while generated data (e.g. logs) live in the `./data` folder.

## Scripts for development
1. `yarn install`
2. `yarn generate` to generate the Prisma client
3. `yarn watch:check` to build the code using `ts-loader` (checks types)
  - Use `yarn watch:check SKIP_TESTS=true` to not include test files in the build process
  - For faster development, you can use `swc` to skip type checking while bundling up the Javascript (about 4 times faster) by running `yarn watch`
    - This does not emit source maps: debugging within VSCode will not work
4. `yarn start:local` to run the server locally

## Logging
When deployed, we use Application Insights to track all error and warning messages via the Trace event.

At all times, we are logging all messages to the file system. On Azure, the data folder lives under `/site/data` and can be accessed via FileZilla.

## .env
Define `local.env`, `debug.env` and `release.env` files that set the following environment variables, one per line, in the format `KEY=value`. The `template.env` file can be used as a template. **On Azure, these variables must be set manually in the app service's configuration.**

The following environment variables must be set in the `.env` file:
- `PORT`: Which port the server should run on.
- `STUDIO_URL`: The URL to INIT__APP_NAME Studio (not ending in `/`).
- `DATABASE_URL`: The connection string to the MySQL database that Prisma should use. **Please ensure you append `?pool_timeout=30&connect_timeout=30` to the connection string (after the database name)** to prevent timeouts during busy times. More options can be found at https://www.prisma.io/docs/concepts/database-connectors/mysql
  - The local database connection string for the debug database is `mysql://root:root@localhost:3306/INIT__DB_NAME_LOCAL?connection_limit=5&pool_timeout=30&connect_timeout=30`
- `DB_LOG_LEVEL`: [Optional, defaults to `info`] The minimum log level to include for database logs. Must be either `full`, `error`, `warning`, `info`, or `disable`. For the allowed levels, the type of logging that will occur is set for each level individually via the other environment variables below.
- `API_LOG_LEVEL`: [Optional, defaults to `warning`] The minimum log level to include for API logs. Must be either `full`, `error`, `warning`, `info`, or `disable`. For the allowed levels, the type of logging that will occur is set for each level individually via the other environment variables below.
- `DEBUG_LOG_OUTPUT`: [Optional, defaults to `disable`] The log output method for debug messages. A value of `full` logs the message to the console and file, `file` logs the message to the file only, and `disable` skips logging the message.
- `INFO_LOG_OUTPUT`: [Optional, defaults to `full`] The log output method for info messages. A value of `full` logs the message to the console and file, `file` logs the message to the file only, and `disable` skips logging the message.
- `WARNING_LOG_OUTPUT`: [Optional, defaults to `full`] The log output method for warning messages. A value of `full` logs the message to the console and file, `file` logs the message to the file only, and `disable` skips logging the message.
- `ERROR_LOG_OUTPUT`: [Optional, defaults to `full`] The log output method for error messages. A value of `full` logs the message to the console and file, `file` logs the message to the file only, and `disable` skips logging the message.
- `DB_SEMAPHORE_CONCURRENT`: [Optional, defaults to `1000`] How many concurrent database requests to allow, before queuing any new requests. Note that operations on the Prisma Client generate many direct database requests, so this number shouldn't be too low (> 50).
- `DB_SEMAPHORE_TIMEOUT`: [Optional, defaults to `null`] The maximum number of milliseconds that a database request can be queued before timing it out. If null, does not timeout requests in the queue.
- `DB_TRANSACTION_TIMEOUT`: [Optional, defaults to `5000`] The maximum number of milliseconds a Prisma transaction can run before being cancelled and rolled back.
- `DB_SLOW_QUERY_THRESHOLD`: [Optional, defaults to `10000`] The threshold in milliseconds at which database queries are considered to be slow and will be logged as such.

The following environment variables are available only for **local development** (that is, where `NODE_ENV`=`local`):
- (none yet)

The following environmnet variables are available only for **deployed instances** (that is, where `NODE_ENV`=`debug` || `NODE_ENV`=`release`):
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: The connection string to use for connecting to the Azure Application Insights service. *This is set automatically by Azure.*

In addition, the following environment variables must be injected into the node instance using the `cross-env` package:
- `NODE_ENV`: Either `local`, `debug` or `release` to indicate which servers we are connecting to. Some behaviour is different when running the server locally than when the server is deployed.

Finally, the following environment variables must be present in the `<local|debug|release>.env` file when building via webpack. These are not checked at runtime, and ommitting them leads to undefined behaviour. *Note: if you change these, you need to update the `build-and-deploy.yml` file and ensure the new variables are inserted into the `.env` file.*
- `NAME`: A unique name to give this build.

For testing, define a `test.env` file that sets only a subset of the above variables:
- `DATABASE_URL`

## Database
Ensure the `DATABASE_URL` connection string is set in the respective [`.env`](#env) file.

`Prisma` is used as both the ORM and typesafe interface to manage communications with the underlying MySQL database. Run `yarn migrate:debug` to sync the local DB with the checked-out migrations and generate an up-to-date Prisma Client.

At any point where the prisma file (`prisma.schema` - the database schema) is modified, `yarn generate` can be run to immediately regenerate the Prisma Client for up-to-date typings. This should also be run if the project structure changes in some way. No actual database changes are performed as part of this command. For more help and examples with using the Prisma Client and querying, refer to the [Prisma docs](https://www.prisma.io/docs/concepts/components/prisma-client).

For more predictable handling of `datetime` entries, you may want to set your database timezone to UTC. This way, any dates you enter into the database will not have to be converted into UTC. You will also be able to use Javascript `Date`s' timestamps and the database's timestamps interchangeably without having to worry about conversions, plus, the deployed database uses a UTC timezone as well.

- Edit the MySql config: `sudo nano /etc/mysql/my.cnf`.
- Add the following:
  ```
  [mysqld]
  default-time-zone='+00:00'
  ```
- Restart the MySql service: `sudo systemctl restart mysql`.
- Verify the time zone has been set: `SELECT @@global.time_zone AS global_time_zone;`.


### Migrations
First, make the desired schema modifications in your `prisma.schema` file. Next, run `yarn migrate:schema` to generate a new `migration.sql` file for updating the MySQL database, which will automatically be opened for editing. This file will be prefilled by schema with the SQL code required to get from the current database schema to the proposed new schema. Note that while this migration is not applied, any earlier unapplied migrations will be executed prior to generating the new migration. All outstanding migrations can be applied explicitly, and a new Prisma Client generated, using `yarn migrate:apply`.

During a migration, ensure that the `.sql` is checked and edited to avoid data loss. Any schema changes in the `.sql` file should exactly correspond to the schema changes in the `schema.prisma` file.

Migrations are autoamtically run in CI during the deployment process. This occurs during the last step before deployment, but it is still possible that something goes wrong where the migration succeeds, but deployment fails. For this reason, migrations should follow an expand and contract pattern.

## Testing
`yarn workspace server test` performs the test suite.
`yarn workspace server test:db` Sets up the test database (i.e. by applying migrations, if required).
`yarn workspace server test <file regex>` includes only tests within files matching the expression.

Further, to filter individual tests, temporarily replace `test()` with `test.only()`. All other `test()`s will then be skipped.

Due to concurrency issues, all tests using the test database will need to be run from the central `_test/stores.test.ts` file. It imports the `<StoreName>.suite.ts` files which contain the actual tests, then run them one-by-one. Store tests are not currently performed as part of the CI build due to timing issues.

## Custom errors
Rather than throwing generic Javascript `Error`s, we use `InternalError`s (or other errors deriving from these) to denote known/handled errors, which increases the robustness of the unit tests. Let's say a unit test is verifying that a call to a method is throwing. Traditionally, it would achieve this by checking that an error is thrown. However, how do we know the error didn't occur because of an unhandled exception, for example, accessing a property on a null object? If, instead, the test checks that an error of type `InternalError` was thrown, we can be much more certain that the logic is working as intended. It is always preferred to use more specific errors where possible (e.g. `UserNotFoundError extends InternalError`), however, this is not always practical and can greatly pollute or complicate the code for little benefit.

## Stores
Stores are classes that abstract away direct interactions with the database via Prisma to segragate the testing of business logic and data access. Integration tests involving the live testing database must be defined in `stores.tests.ts` instead of their individual files to guarantee that they are run in series.

The number of concurrent queries that the database allows is limited, and there is some latency when communicating between the server and database (on the order of 10-20 ms, it seems). Preferrably, Prisma queries should return collections of results instead of individual results, so that aggregation of data is done directly on the database to reduce the number of queries and improve performance.

For example, instead of allowing getting only a specific user with related data and thus forcing multiple queries to get the related data of multiple users, write the store method in such a way that only a single query is required to get the related data of multiple users. Due to limitations with the Prisma ORM capabilities, this may require the use of raw SQL queries.

# API Endpoints
Use the API endpoints to communicate with the server while it is running. The local API base URL is `http://localhost:3010/api`.

Every response contains the following properties:
- `timestamp` (`number`): The unix timestamp (in ms) at which the response was generated.
- `success` (`boolean`): True if the request was processed correctly, and false otherwise.
- `data` (`object`): Only included if `success` is `true`. Contains the response data, outlined for each endpoint below.
- `error` (`object`): Only included if `success` is `false`. Contains the following properties:
  - `errorCode` (`number`): The HTTP error code that most closely matches the type of problem encountered.
  - `errorType` (`string`): The general type of error encounterd.
  - `internalErrorType` (`string`): The internal error type that was encountered, for example, the name of the CustomError classes in `/projects/shared/util/error.ts`.
  - `message` (`string`): An optional error message describing what went wrong.

Note that a `500` error can be expected for all endpoints and a `401` error for endpoints requiring authentication, but any other errors should be documented specifically in the below sections.

All non-primitive properties of `data` are of type `PublicObject`, which are reusable objects which themselves contain either primitive types or other `PublicObject`s. The definitions for these objects can be found in the `/projects/api-models/public` folder and will not be reproduced here.

Authentication is required for most endpoints. To authenticate a request, provide the login token returned by the `/account/register` or `/account/login` endpoints, and add it to requests via the `X-Login-Token` header.

## Websocket
Path: `/ws`, using the `ws` protocol (not `wss`).

The server offers a Websocket that clients can connect to in order to receive live updates without having to query the API.

Clients subscribe to topics, receive acknowledgement of their subscription, then receive messages whenever an event for their subscribed topic ocurrs.

To subscribe or unsubscribe, send a JSON object with the following schema:
- `type` (`string`): *Required* The type of message we are sending. In this case, set the value to either `"subscribe"` or `"unsubscribe"`.
- `data`: *Required* The message data. For subscription messages, the data should look like:
  - `topic` (`string`): *Required* The topic to subscribe to.
- `id` (`number`): *Optional* A unique number that represents this message. If included, the same id will be included in the acknowledgement message.

The server will respond with an acknowledgement of the form:
- `type` (`string`): The type of message. In this case, it is always set to `"acknowledge"`.
- `data`: The message data. For acknowledgement messages, the data looks like:
  - `success` (`boolean`): Whether the request action was processed successfully.
- `id` (`number | null`): The same id that was included in the client's request message or, if no id was included, `null`.

Once subscribed, the client will receive event messages as follows:
- `type` (`string`): The type of message. In this case, it is always set to `"event"`.
- `data`: The message data. For event messages, the data looks like:
  - `topic` (`string`): The topic to which this event belongs.
  - `data`: The event data. Its shape depends on the event's topic (see below).

### The `exampleTopic` topic
Example topic.

The event data will be of type `PublicExampleType`.

## Account Endpoints
Path: `/account`.

### `POST /register` [anonymous]
Registers a new user.

Request data (body):
- `username` (`string`): *Required.* The username for which to register a new account.
- `password` (`string`): *Required.* The password that will be used to log the user in.

Returns data with the following properties:
- `loginToken` (`string`): A token used to authenticate the user when making another API request.

Can return the following errors:
- `400`: When the request data is not sent, or is formatted incorrectly.

### `POST /login` [anonymous]
Logs the user into their account.

Request data (body):
- `username` (`string`): *Required.* The username of the account to log into.
- `password` (`string`): *Required.* The password of the account to log into.

Returns data with the following properties:
- `loginToken` (`string`): A token used to authenticate the user when making another API request.

Can return the following errors:
- `400`: When the request data is not sent, or is formatted incorrectly.
- `401`: When the credentials are incorrect.

### `POST /logout`
Logs the user out of their account by invalidating all login tokens. To authenticate, the user must call `/login` again.

Returns an empty response body.

### `POST /authenticate`
Authenticates the login token contained in the header. If successful, the login token can be used to authenticate other API requests.

Returns data with the following properties:
- `username` (`string`): The username associated with the login token.

Can return the following errors:
- `401`: When the login token is invalid.

### `POST /resetPassword`
Resets the user's password. Note that any active login tokens will be invalidated.

Request data (body):
- `oldPassword` (`string`): *Required.* The user's current password.
- `newPassword` (`string`): *Required.* The user's new password.

Returns data with the following properties:
- `loginToken` (`string`): The updated login token.

Can return the following errors:
- `401`: When the login token or old password is invalid.

## Rank Endpoints
Path: `/rank`.

### `GET`
Gets the list of current user-ranks.

Query parameters:
- `userId` (`number`): *Optional.* The ID of the user for which to get the list of ranks. Defaults to the logged-in user.

Returns data with the following properties:
- `ranks` (`PublicUserRank[]`): The list of ranks of the user, in descending order by time issued.

### `GET /accessible`
Gets the ranks accessible to the current user. At the moment, it returns all Regular ranks and Punishment ranks.

Returns data with the following properties:
- `accessibleRanks` (`PublicRank[]`): The list of ranks accessible to the user.

### `POST`
Adds a Regular rank to the specified user.

Request data (body):
- `rank` (`string`): *Required.* The name of the rank to add. Should be one of the following: `admin`.
- `userId` (`int`): *Required.* The user to which the rank should be added.
- `message` (`string`): *Optional.* A custom message to accompany the rank addition.
- `durationSeconds` (`number`): *Optional.* The duration of the rank, in seconds, after which it should automatically expire. If 0 or not provided, the rank is permanent.

Returns data with the following properties:
- `newRank` (`PublicUserRank`): The new user-rank that was added.

Can return the following errors:
- `400`: When the request data is not sent, or is formatted incorrectly. This error is also returned when a rank of the specified type is already active for the given user.

### `DELETE`
Removes a regular rank from the specified user.

Request data (body):
- `rank` (`string`): *Required.* The name of the rank to remove. Should be one of the following: `admin`.
- `userId` (`int`): *Required.* The user from which the rank should be removed.
- `message` (`string`): *Optional.* A custom message to accompany the rank removal.

Returns data with the following properties:
- `removedRank` (`PublicUserRank`): The rank that was removed.

Can return the following errors:
- `400`: When the request data is not sent, or is formatted incorrectly.
- `404`: When an active rank of the specified type was not found for the given user.

## Task Endpoints
Path: `/task`.

These are admin-only endpoints for managing recurring tasks on the Server.

### `GET /`
Gets the list of all available tasks.

Returns data with the following properties:
- `tasks` (`PublicTask`): The list of available tasks.

### `PATCH /`
Update editable properties of a task object.

Request data (body):
- `taskType` (`string`): The task type to update.
- `intervalMs` (`number`): The new task interval, in milliseconds, to apply. Must be between 1 hour and 1 year.

### `GET /log`
Gets the list of the recent task logs.

Query parameters:
- `taskType` (`string`): The task type for which to fetch the task logs.

Returns data with the following properties:
- `taskLogs` (`PublicTaskLog`): The list of task logs.

### `POST /execute`
Immediately executes a task. The response will only be sent once the task is completed.

Query parameters:
- `taskType` (`string`): The task type to execute.
