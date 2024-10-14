# Project
INIT__APP_NAME Studio is a React web-interface that interacts with the INIT__APP_NAME API. The frontend uses the `mui` package for pre-built components and styles.

Custom hooks are available for login management and for performing requests with automatic caching.

## Deployments
- [Local](http://localhost:3000)
- [Sandbox](INIT__SANDBOX_STUDIO_URL)
- [Production](INIT__PRODUCTION_STUDIO_URL)

## Typescript/alias configuration
In order to get `@INIT__PATH_ALIAS` importing to work, we needed to override the webpack configuration that `react-app` hides from us. To do this, we use `react-app-rewired` (config in `config-overrides.js`) which works for most of the cases, but it was unhappy about imports from a different project, and imports outside of the `src` folder are apparently not allowed. As a workaround, we use `react-app-rewire-alias`, which is configured by `react-app-rewired`, and requires a special `tsconfig` file to re-define the path aliases it should already know about (from the base `tsconfig`). So the inheritance for this project is:

`../../tsconfig.base.json` -> `tsconfig.paths.json` -> `tsconfig.json`

## Environment variables
The following environment variables are required to run the Studio app. They can be set either via a file called `.env`, or directly via the process environment. The `.env` file always takes precedence.

All environment variables **must** be of the form `REACT_APP_<VARIABLE_NAME>` and will be baked directly into the built files - **they must be provided during the build, as they cannot be modified at runtime**.

- `REACT_APP_SERVER_URL`: The URL of the server without a trailing slash.
- `DISABLE_ESLINT_PLUGIN`: Whether to disable ESLint checking during the CI build. If not set, or set to `false`, the build will fail if there are any ESLint warnings in the project.
- `REACT_APP_STUDIO_VERSION`: The Studio version (e.g. `1.2.3.456 (abcdefh)`).
- `REACT_APP_ENV=local`: Alias for `NODE_ENV`. Either `local`, `debug`, or `release`. We can't use `NODE_ENV` for this because it is overwritten by `react-app-rewired`.

Optional:
- (none yet)

## Scripts
- `start`: For local development. Builds and watches the source files, then starts up the development server and serves the static app. Does not emit files.
- `build`: For CI. Builds the app in production mode into the `./build` folder.

### `fix-typescript-build`
There is an annoying issue with a React package we depend on that causes a runtime error during compilation. As a result, the typescript checker is skipped, but Typescript files are still transpiled into Javascript. Turns out the responsible file is inconsequential in the build process and we can safely skip the logic within it. This is done via the `fix-typescript-build` script in the `package.json`. Running this will replace the published version of the file with our custom fix, thus allowing the build process to complete with a full type check.
