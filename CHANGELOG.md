# [1.5.0](https://github.com/ElJijuna/infinity-fetch/compare/v1.4.0...v1.5.0) (2026-08-20)


### Bug Fixes

* make cancellation reach the fetcher and the pending delays ([4f74758](https://github.com/ElJijuna/infinity-fetch/commit/4f74758466aa1d196f82d0d9a5295b05534bd8e8))


### Features

* add exponentialBackoff retry helper ([8a57adb](https://github.com/ElJijuna/infinity-fetch/commit/8a57adbb0cbba207341687421647b8c9493bc58d))
* add linkFetch for RFC 5988 Link header pagination ([7c8d087](https://github.com/ElJijuna/infinity-fetch/commit/7c8d087335b7f5a7e9794f2f41bb55a624185a4b))
* add maxItems, stopWhen and per-item transforms ([e018e7a](https://github.com/ElJijuna/infinity-fetch/commit/e018e7a52951de14318624726b95bc42ece80158))
* add pageFetch for page-number APIs ([bd286f4](https://github.com/ElJijuna/infinity-fetch/commit/bd286f479447c959d2d4b954a012d598c299dd27))
* enhance README with detailed pagination options and examples ([f77fb64](https://github.com/ElJijuna/infinity-fetch/commit/f77fb64c79140366311d27c689a087853166add7))
* stream pages instead of buffering them all ([c3fc7e6](https://github.com/ElJijuna/infinity-fetch/commit/c3fc7e63beba3a4fa47984f705b5f15f968ee52b))

# [1.4.0](https://github.com/ElJijuna/infinity-fetch/compare/v1.3.1...v1.4.0) (2026-06-23)


### Bug Fixes

* update terminology from Bitbucket-style to offset-based paginated APIs in documentation and code comments ([fd47e32](https://github.com/ElJijuna/infinity-fetch/commit/fd47e32fc9f65480cb70a130a4e80bf27e40d322))


### Features

* add cursorFetch helper for cursor-based pagination and enhance type definitions ([b9f3759](https://github.com/ElJijuna/infinity-fetch/commit/b9f3759cc6c7ebd2c01a295d9951fe0e1709a6fb))
* add support for aborting pagination with AbortSignal and enhance InfinityFetchError handling ([c3ff7de](https://github.com/ElJijuna/infinity-fetch/commit/c3ff7dec9c67f3366d51c65b7e676ff4200075e5))
* implement InfinityFetchError class and refactor pagination types for improved error handling and structure ([c8998d1](https://github.com/ElJijuna/infinity-fetch/commit/c8998d1da938d4d8757477922d36df7ade73dd14))

## [1.3.1](https://github.com/ElJijuna/infinity-fetch/compare/v1.3.0...v1.3.1) (2026-06-07)


### Bug Fixes

* adopt super-configs tooling and update files syntax ([3734e74](https://github.com/ElJijuna/infinity-fetch/commit/3734e74e6c7238e09843a42cc54e207f75ae766a))

# [1.3.0](https://github.com/ElJijuna/infinity-fetch/compare/v1.2.0...v1.3.0) (2026-05-12)


### Bug Fixes

* align pagedFetch lifecycle callbacks and pagination guard ([f303588](https://github.com/ElJijuna/infinity-fetch/commit/f303588f8da3114ff098e553033d799fc2e45dbc))


### Features

* add retry support for paginated fetches. ([81f865f](https://github.com/ElJijuna/infinity-fetch/commit/81f865fe63abaa2b72fc33823e8a7545e8c283bc))

# [1.2.0](https://github.com/ElJijuna/infinity-fetch/compare/v1.1.0...v1.2.0) (2026-04-08)


### Features

* add optional delay between page fetches ([df052e2](https://github.com/ElJijuna/infinity-fetch/commit/df052e226affebd4c160e4254741a86a4943436f))

# [1.1.0](https://github.com/ElJijuna/infinity-fetch/compare/v1.0.0...v1.1.0) (2026-04-07)


### Features

* add onStart and onEnd lifecycle callbacks. ([17f2b23](https://github.com/ElJijuna/infinity-fetch/commit/17f2b2377521427eedd7b6a7b995ab5f6dc18260))

# 1.0.0 (2026-04-07)


### Features

* scaffold infinity-fetch library ([4b504cb](https://github.com/ElJijuna/infinity-fetch/commit/4b504cb2da748b99a157cf1b0ad1c2aa3d83333d))
