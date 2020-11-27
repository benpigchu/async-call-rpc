import { createLogger } from './logger'
import { join } from 'path'
import { _AsyncVersionOf, _AsyncGeneratorVersionOf, AsyncCall, AsyncCallOptions, AsyncGeneratorCall } from '../../src'
import { createChannelPair } from './channels'
import { reproduceIDGenerator } from './reproduce'

export const defaultImpl = {
    add: (x: number, y: number) => x + y,
    echo: async <T>(x: T) => x,
    undefined: () => {},
    throws: async () => {
        throw new Error('impl error')
    },
    withThisRef() {
        return this.add(1, 2)
    },
}
const defaultImplGenerator = {
    async *echo(arr: number[]) {
        yield* arr
    },
}
export function withSnapshot(name: string, snapshot: string, f: () => Promise<string>, timeout = 2000) {
    test(name, async () => {
        expect(await race(f(), timeout)).toMatchFile(join(__dirname, '../__file_snapshots__/', snapshot))
    })
}
type Options<T> = {
    client?: Partial<AsyncCallOptions>
    server?: Partial<AsyncCallOptions>
    impl?: T | Promise<T>
}
export function withSnapshotDefault(
    name: string,
    snapshot: string,
    f: (
        call: <T extends object = DefaultImpl>(option?: Options<T>) => _AsyncVersionOf<T>,
        generatorCall: <T extends object = DefaultImplG>(option?: Options<T>) => _AsyncGeneratorVersionOf<T>,
        log: (...args: any) => void,
    ) => Promise<void>,
    timeout = 800,
) {
    test(name, async () => {
        const { emit, log } = createLogger(['server', 'client', 'jest'] as const)
        const { client, server } = createChannelPair(log)
        const idGenerator = reproduceIDGenerator()

        const serverShared = { channel: server, logger: log.server.log, idGenerator }
        const clientShared = { channel: client, logger: log.client.log, idGenerator }
        function setup<T extends object = DefaultImpl>(opt: Options<T> = {}): _AsyncVersionOf<T> {
            const { client, server, impl } = opt
            AsyncCall(impl || defaultImpl, { ...serverShared, ...server })
            return AsyncCall<T>({}, { ...clientShared, ...client })
        }
        function setupGenerator<T extends object = DefaultImplG>(opt: Options<T> = {}): _AsyncGeneratorVersionOf<T> {
            const { client, server, impl } = opt
            AsyncGeneratorCall(impl || defaultImplGenerator, { ...serverShared, ...server })
            return AsyncGeneratorCall<T>({}, { ...clientShared, ...client })
        }
        await race(f(setup, setupGenerator, log.jest.log.log), timeout)
        expect(emit()).toMatchFile(join(__dirname, '../__file_snapshots__/', snapshot + '.md'))
    })
}
type DefaultImpl = typeof defaultImpl
type DefaultImplG = typeof defaultImplGenerator

async function race<T>(x: Promise<T>, timeoutTime: number): Promise<T> {
    return Promise.race([x, timeout(timeoutTime)])
}
async function timeout(x: number): Promise<never> {
    await delay(x)
    throw new Error('Timeout')
}
export function delay(x: number) {
    return new Promise((r) => setTimeout(r, x))
}
