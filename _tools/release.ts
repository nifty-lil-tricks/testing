#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --allow-run=git --no-check

// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

import { packages } from "https://deno.land/x/nifty_lil_tricks_testing@__VERSION__/_tools/release_packages.ts";
import { loadRepo, VersionFile } from "./release_repo.ts";

const repo = await loadRepo();

// TODO: uncomment this when we're ready to release
// // only run this for commits that contain a version number in the commit message
// if (!containsVersion(await repo.gitCurrentCommitMessage())) {
//   console.log("Exiting: No version found in commit name.");
//   Deno.exit();
// }

// // ensure this is the main branch
// if ((await repo.gitCurrentBranch()) !== "main") {
//   console.log("Exiting: Not on main branch.");
//   Deno.exit();
// }

// now attempt to create a release by tagging
// the repo and creating a draft release
const versionFile = new VersionFile();
// const releasesMd = getReleasesMdFile();

await repo.gitFetchTags("origin");
const repoTags = await repo.getGitTags();
const tagName = versionFile.version.toString();

if (repoTags.has(tagName)) {
  console.log(`Tag ${tagName} already exists.`);
} else {
  console.log(`Tagging ${tagName}...`);
  // TODO: uncomment
  // await repo.gitTag(tagName);
  // await repo.gitPush("origin", tagName);

  await publishNpm();

  // TODO: uncomment
  // console.log(`Creating GitHub release...`);
  // await createOctoKit().request(`POST /repos/{owner}/{repo}/releases`, {
  //   ...getGitHubRepository(),
  //   tag_name: tagName,
  //   name: tagName,
  //   body: releasesMd.getLatestReleaseText().fullText,
  //   draft: true,
  // });
}

async function publishNpm(): Promise<void> {
  for (const pkg of packages) {
    console.log(`Publishing ${pkg.name} to npm...`);
    const command = new Deno.Command("npm", {
      // TODO: remove dry run
      args: ["publish", "--dry-run"],
      cwd: pkg.dir,
    });
    const output = await command.output();
    if (!output.success) {
      console.log(`Failed to publish ${pkg.name} to npm.`);
      console.log("Stdout:", output.stdout);
      console.log("Stderr:", output.stderr);
      Deno.exit(1);
    }
  }
}
