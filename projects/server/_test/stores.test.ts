import AccountStoreSuite from '@INIT__PATH_ALIAS/server/stores/AccountStore.test'
import RankStoreSuite from '@INIT__PATH_ALIAS/server/stores/RankStore.test'
import TaskStoreSuite from '@INIT__PATH_ALIAS/server/stores/TaskStore.test'

// keep an eye on this one: https://github.com/prisma/prisma/issues/732
// it would HUGELY improve efficiency if we can use an in-memory mock database for testing.

// re-enable if CHAT-78 is done
const describeFn = process.env.CI === 'true' ? describe.skip : describe

describeFn('AccountStore Suite', AccountStoreSuite)

describeFn('RankStore Suite', RankStoreSuite)

describeFn('TaskStore Suite', TaskStoreSuite)
