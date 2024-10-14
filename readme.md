Rebel's Fullstack Template is a bare-bones fullstack app that powers [ChatMate](https://github.com/RebelGuy/chat-mate). It consists of two main parts:
- Server (`./projects/server`): Node.js Express app that runs the core logic for INIT__APP_NAME and directly interacts with external services. It exposes a collection of REST API endpoints and Websocket.
- Studio (`./projects/studio`): [React](https://github.com/facebook/react) web interface for managing data on the server. It communicates with the server API endpoints and Websocket.

Other projects in this repo:
- API Models (`./projects/api-models`): Contains the schema definition of each of the Server's API endpoints. Further, it defines all Public Objects, which are serialisable data objects used by the API endpoints.
- Shared (`./projects/shared`): General code that is used by both the Server and Studio projects.

Many helper methods and classes are included, and everything is wired up for a plug-and-play experience. It is assumed that the app is hosted in Microsoft Azure.

For more info about each project, refer to the project's Readme file.

## Setting up
- Install Node 18 (recommend to use [nvm](https://github.com/nvm-sh/nvm)).
- Install a global version of `yarn` by running `npm install --global yarn`. This will be used for package management.
- Install MySQL and make sure the service is running.
- Run `yarn install` for installing dependencies.
- Edit the `init.env` file and set your desired project configuration.
- Run `yarn init-project` to set up the project using the settings from the previous step. This may take a minute.

## Development
Recommended VSCode extensions:
- `ESLint` for code formatting
- `GitLens` and `Git Graph` for working with Git visually
- `DotENV` for parsing `.env` environment variable files
- `Prisma` for type checking the database schema
- `GitHub Actions` for managing the Github CI

Ensure the VSCode Typescript version is the same as the one used in the workspace to avoid getting "Type instantiation is excessively deep and possibly infinite" errors all over the place.

## CI and deployment
Github Actions are used for automatically building and deploying the Server/Studio projects when pushed.

Pushing to any branch will trigger the build process. Pushing to `master` (production) or `develop` (sandbox) will also trigger automatic deployment to the respective environment, unless the string `--skip-deploy` is contained in the commit message.

By default, the deployment of the Server includes an automatic migration of the database. If the string `--skip-migrations` is included in the commit message, new migrations will not be applied (for both the server build and test runs). Note that migrations in the server build are already skipped if `--skip-deploy` is included in the commit message.

If the string `--skip-tests` is included in the commit message, test files will not be built and unit tests will be skipped.

If the string `--skip-server` is included in the commit message, the Server project will not be built, tested, or deployed. Note that migrations will still run.

If the string `--skip-studio` is included in the commit message, the Studio project will not be built, tested, or deployed.

When deploying the server that includes database migrations, ensure you stop the server before the migration, and after the server deployment has succeeded. Failure to do so causes undefined behaviour with potentially corrupt data being persisted to the database.
