// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { build, emptyDir } from "x/dnt/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { VERSION } from "../version.ts";

await emptyDir("./npm");

const __dirname = dirname(fromFileUrl(import.meta.url));
const rootDir = join(__dirname, "..");

const packages = [
  "nifty-lil-tricks-testing",
];

function path(pkg: string, ...paths: string[]) {
  return join(rootDir, pkg, ...paths);
}

for (const pkg of packages) {
  Deno.chdir(path(pkg));
  await build({
    entryPoints: [path(pkg, "./mod.ts")],
    outDir: path(pkg, "./npm"),
    shims: {
      // see JS docs for overview and more options
      deno: true,
    },
    package: {
      // package.json properties
      name: pkg.replace("nifty-lil-tricks-", "@nifty-lil-tricks/"),
      version: VERSION,
      description: "TODO",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/jonnydgreen/nifty-lil-tricks-testing.git",
      },
      bugs: {
        url: "https://github.com/jonnydgreen/nifty-lil-tricks-testing/issues",
      },
    },
    async postBuild() {
      // steps to run after building and before running the tests
      await Deno.copyFile(join(rootDir, "LICENSE"), path(pkg, "npm/LICENSE"));
      await Deno.copyFile(path(pkg, "README.md"), path(pkg, "npm/README.md"));
    },
  });
}
