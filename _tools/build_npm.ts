// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { parse } from "std/flags/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { build, BuildOptions, emptyDir } from "x/dnt/mod.ts";
import { SpecifierMappings } from "x/dnt/transform.ts";
import { VERSION } from "../version.ts";
import { Package, packages } from "./release_packages.ts";

const { _: [pkgToBuild] } = parse(Deno.args);

await emptyDir("./npm");

const __dirname = dirname(fromFileUrl(import.meta.url));
const rootDir = join(__dirname, "..");

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
  Deno.chdir(pkg.dir);
  await rmBuildDir(pkg.outDir);
  const mappings: SpecifierMappings = {};
  const deps: Record<string, string> = {};
  for (const [name, mapping] of Object.entries(pkg.mappings ?? {})) {
    mappings[name] = typeof mapping === "string" ? mapping : mapping.name;
    if (typeof mapping !== "string" && mapping.version) {
      deps[mapping.name] = mapping.version;
    }
  }
  const options: BuildOptions = {
    entryPoints: [join(pkg.dir, "./mod.ts")],
    outDir: pkg.outDir,
    shims: {
      deno: true,
    },
    rootTestDir: pkg.dir,
    testPattern: "*.test.ts",
    packageManager: "npm",
    mappings,
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
        join(pkg.outDir, "LICENSE"),
      );
      await Deno.copyFile(
        join(rootDir, ".npmrc"),
        join(pkg.outDir, ".npmrc"),
      );
      await Deno.copyFile(
        join(pkg.dir, "README.md"),
        join(pkg.outDir, "README.md"),
      );
    },
  };

  // Build and test
  if (pkg.test !== false) {
    await build({
      ...options,
      test: true,
      mappings: undefined,
      importMap: join(rootDir, "test_import_map.json"),
    });
    await rmBuildDir(pkg.outDir);
  }

  // Build for publish
  await build({
    ...options,
    typeCheck: false,
    test: false,
  });
  await adjustPackageJson(pkg, pkg.outDir);
}

// Cleanup to ensure the uploaded artifacts do not include node_modules
for (const pkg of packages) {
  await Deno.remove(join(pkg.outDir, "node_modules"), { recursive: true });
}

async function adjustPackageJson(pkg: Package, outDir: string): Promise<void> {
  const path = join(outDir, "package.json");
  const rawPackageJson = await Deno.readTextFile(path);
  const packageJson = JSON.parse(rawPackageJson);
  const deps: Record<string, string> = {};
  for (const mapping of Object.values(pkg.mappings ?? {})) {
    if (typeof mapping !== "string" && mapping.version) {
      deps[mapping.name] = mapping.version;
    }
  }
  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...deps,
  };
  await Deno.writeTextFile(path, JSON.stringify(packageJson, null, 2));
}
