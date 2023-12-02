# Contributing

## Setup git hooks

It is recommended to setup git hooks to ensure code quality and consistency.

To setup git hooks, run the following:

```sh
git config core.hooksPath .githooks
```

## Install Deno

> **Note:** This project uses Deno version >= 1.37.x

### Via asdf

[Guide](https://asdf-vm.com/guide/getting-started.html)

Once asdf is installed, run the following:

```sh
asdf install
```

### Via Deno docs

[Guide](https://deno.land/manual/getting_started/installation)

## Install Docker

[Install Docker](https://docs.docker.com/get-docker/)

## Testing

> **Note:** Before running the tests, ensure the above pre-requisites are are
> satisfied and Docker is up and running.

To run tests, run the following:

```sh
deno task test
```

## Coverage

To check coverage, run the following:

```sh
deno task cov:check
```

To check report, run the following:

```sh
deno task report
```

## Release Process

To release a new version, take the following steps:

- Bump the version by running the
  [`version_bump`](https://github.com/nifty-lil-tricks/testing/actions/workflows/version_bump.yml)
  GitHub Action and choose the appropriate version bump:

![version-bump](docs/img/version-bump.png)

- Wait for the Pull Request to be created and merge this into main.

- Wait for the
  [`main` branch action](https://github.com/nifty-lil-tricks/testing/actions?query=branch%3Amain)
  to complete.

- Find the created
  [draft release](https://github.com/nifty-lil-tricks/testing/releases) and
  publish it.
