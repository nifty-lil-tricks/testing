// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { build, type BuildOptions, emptyDir } from "x/dnt/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { parse } from "std/flags/mod.ts";
import { VERSION } from "../version.ts";

const { _: [pkgToBuild] } = parse(Deno.args);

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
  {
    name: "@nifty-lil-tricks/testing-plugin-postgresql",
    description:
      "A nifty li'l plugin for setting up postgresql database instances when testing",
    dir: join(rootDir, "plugin_postgresql"),
    tags: ["postgresql"],
  },
  {
    name: "@nifty-lil-tricks/testing-plugin-prisma",
    description:
      "A nifty li'l plugin for setting up a database with prisma when testing",
    dir: join(rootDir, "plugin_prisma"),
    tags: ["prisma"],
  },
];

let filteredPackages = packages;
if (pkgToBuild) {
  filteredPackages = packages.filter((pkg) => pkg.name === pkgToBuild);
  if (filteredPackages.length === 0) {
    throw new Error(`Could not find package ${pkgToBuild}`);
  }
}

async function rmBuildDir(dir: string) {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Do nothing
  }
}

for (const pkg of filteredPackages) {
  const outDir = join(rootDir, "./npm", pkg.name);
  Deno.chdir(pkg.dir);
  await rmBuildDir(outDir);
  const options: BuildOptions = {
    entryPoints: [join(pkg.dir, "./mod.ts")],
    outDir,
    shims: {
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
        join(outDir, "LICENSE"),
      );
      await Deno.copyFile(
        join(pkg.dir, "README.md"),
        join(outDir, "README.md"),
      );
    },
  };

  // Build and test
  await build({
    ...options,
    test: true,
    importMap: join(rootDir, "test_import_map.json"),
  });
  await rmBuildDir(outDir);

  // Build for publish
  await build({ ...options, test: false });
}
