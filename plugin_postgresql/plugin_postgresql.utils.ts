// Copyright 2023-2023 the Nifty li'l' tricks authors. All rights reserved. MIT license.

export interface DenoCommandOptions {
  args: string[];
}

export interface DenoCommandOutput {
  success: boolean;
  code: number;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
}

// TODO: remove when the following is supported as a shim
// Issue: https://github.com/denoland/node_shims/issues/110
export class DenoCommand {
  #command: string;
  #options: DenoCommandOptions;

  constructor(command: string, options: DenoCommandOptions) {
    this.#command = command;
    this.#options = options;
  }

  async output(): Promise<DenoCommandOutput> {
    // deno-lint-ignore no-deprecated-deno-api
    const runResult = await Deno.run({
      cmd: [this.#command, ...this.#options.args ?? []],
      stdout: "piped",
      stderr: "piped",
    });
    const status = await runResult.status();
    const stdout = await runResult.output();
    const stderr = await runResult.stderrOutput();
    runResult.close();
    return {
      success: status.success,
      code: status.code,
      stdout,
      stderr,
    };
  }
}
