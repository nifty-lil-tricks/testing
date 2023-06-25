// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { build, type BuildOptions, emptyDir } from "x/dnt/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { VERSION } from "../version.ts";

await emptyDir("./npm");

const __dirname = dirname(fromFileUrl(import.meta.url));
const rootDir = join(__dirname, "..");

const packages = [
  {
    name: "@nifty-lil-tricks/testing",
    description:
      "A selection of useful utilities (or nifty li'l tricks!) for all things testing",
    dir: rootDir,
    tags: [],
  },
];

async function rmBuildDir(dir: string) {
  try {
    await Deno.remove(join(dir, "./npm"), { recursive: true });
  } catch {
    // Do nothing
  }
}

for (const pkg of packages) {
  Deno.chdir(pkg.dir);
  await rmBuildDir(pkg.dir);
  const options: BuildOptions = {
    entryPoints: [join(pkg.dir, "./mod.ts")],
    outDir: join(pkg.dir, "./npm"),
    shims: {
      // see JS docs for overview and more options
      deno: true,
    },
    rootTestDir: pkg.dir,
    testPattern: "*.test.ts",
    package: {
      // package.json properties
      name: pkg.name,
      version: VERSION,
      description: pkg.description,
      author: "Jonny Green <hello@jonnydgreen.com>",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/jonnydgreen/nifty-lil-tricks-testing.git",
      },
      bugs: {
        url: "https://github.com/jonnydgreen/nifty-lil-tricks-testing/issues",
      },
      homepage: "https://github.com/jonnydgreen/nifty-lil-tricks-testing",
      keywords: [
        "testing",
        "deno",
        "nodejs",
        ...pkg.tags,
      ],
      engines: {
        node: ">=18",
      },
    },
    async postBuild() {
      // steps to run after building and before running the tests
      await Deno.copyFile(
        join(rootDir, "LICENSE"),
        join(pkg.dir, "npm/LICENSE"),
      );
      await Deno.copyFile(
        join(pkg.dir, "README.md"),
        join(pkg.dir, "npm/README.md"),
      );
    },
  };

  // Build and test
  await build({
    ...options,
    test: true,
    importMap: join(rootDir, "test_import_map.json"),
  });
  await rmBuildDir(pkg.dir);

  // Build for publish
  await build({ ...options, test: false });
}
