// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { parse as parseSemver } from "std/semver/mod.ts";
import { ShimOptions } from "x/dnt/mod.ts";
import { SpecifierMappings } from "x/dnt/transform.ts";
import { VERSION } from "../version.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));
const rootDir = join(__dirname, "..");

export interface Package {
  name: string;
  description: string;
  dir: string;
  outDir: string;
  tags: string[];
  shims?: ShimOptions;
  test?: boolean;
  mappings?: SpecifierMappings;
}

const version = parseSemver(VERSION);
const minMajorVersion = version.major;
const minMinorVersion = minMajorVersion ? 0 : version.minor;

const partialPackages: Omit<Package, "outDir">[] = [
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
      "A nifty li'l plugin for setting up PostgreSQL database instances when testing",
    dir: join(rootDir, "plugin_postgresql"),
    tags: ["postgresql"],
    test: false,
    shims: { crypto: true },
    mappings: {
      "https://deno.land/x/nifty_lil_tricks_testing/mod.ts": {
        name: "@nifty-lil-tricks/testing",
        version: `^${minMajorVersion}.${minMinorVersion}.0`,
      },
    } as SpecifierMappings,
  },
  {
    name: "@nifty-lil-tricks/testing-plugin-nestjs",
    description:
      "A nifty li'l plugin for setting up NestJS applications when testing",
    dir: join(rootDir, "plugin_nestjs"),
    tags: ["nestjs"],
    test: true,
    mappings: {
      "https://deno.land/x/nifty_lil_tricks_testing/mod.ts": {
        name: "@nifty-lil-tricks/testing",
        version: `^${minMajorVersion}.${minMinorVersion}.0`,
      },
    } as SpecifierMappings,
  },
];

export const packages: Package[] = partialPackages.map((pkg) => ({
  ...pkg,
  outDir: join(rootDir, "./npm", pkg.name),
}));
