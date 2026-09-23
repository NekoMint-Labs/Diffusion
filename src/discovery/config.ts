import { enabledSources, customDiscoveryURL, type DiscoverySettings, type DiscoverySourceId } from './contracts.ts';

/** The validator and readiness rule live in `contracts.ts`, beside `describeDiscovery`, so the field
 * that accepts an address and the status that promises it answers the same question. Re-exported
 * here because this is where a caller that launches discovery already looks. */
export { customDiscoveryURL };

/** What the native layer needs to launch one discovery operation.
 *
 * It carries the engine's argument list and the *identifiers* of the sources the person enabled —
 * never a credential value. Two properties are deliberate:
 *
 * 1. **A secret never reaches this side.** The native layer resolves each enabled source's key from
 *    the operating system's credential store and builds the child process environment itself, so no
 *    plaintext discovery key exists in JavaScript, in React state, or in an IPC payload. A source
 *    the person did not turn on is written *off* there rather than omitted, because the engine
 *    treats `*_ENABLED` as defaulting to true: an omitted variable would let an unrelated ambient
 *    key answer for a source the UI says is disabled. The control and the behaviour must be the same
 *    claim, so that mapping lives beside the credential lookup that enforces it
 *    (`src-tauri/src/discovery_env.rs`) and nowhere else.
 * 2. **`args` stays exactly the engine's own machine contract.** User text only ever appears after
 *    the `--` delimiter, and a credential appears in no argument at all: an argument list is
 *    readable by other processes on the machine, an environment handed to one child is not.
 *
 * Reading a page is left to the engine's own automatic behaviour; Diffusion neither configures nor
 * disables it, so this has no opinion about the reader. The engine also has no config file and no
 * user-level persistence, so it cannot pick up a configuration the person did not choose here.
 */
export function discoveryInvocation(settings: DiscoverySettings, args: string[]): { args: string[]; sources: DiscoverySourceId[] } {
    // External exploration off means no source is enabled, said here as well as by the caller that
    // refrains from running the engine at all: the write-off must not depend on that discipline.
    return { args, sources: settings.external ? enabledSources(settings) : [] };
}

