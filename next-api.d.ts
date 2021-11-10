import { _AsyncVersionOf } from './src'

export function createServer<T>(impl: T | Promise<T> | (() => Promise<T>), options?: ServerOptions): CreatedServer<T>
export type CreatedServer<T> = [
    messageHandler: ServerMessageHandler,
    initializedServer: _AsyncVersionOf<T>,
    closeServer: () => void,
]

export type ServerMessageHandler = (
    message: unknown,
    signal?: AbortSignal,
) => Promise<HandleResultEmpty | HandleResultError | HandleResultSuccess>
export interface HandleResultSuccess {
    ok: true
    err: false
    message: unknown
}
export interface HandleResultEmpty {
    ok: false
    err: false
    message: undefined
}
export interface HandleResultError {
    ok: false
    err: true
    aborted: boolean
    message: unknown
}
export interface ServerOptions {
    serializer?: Serialization
    // TODO: redesign
    logger?: unknown
    // TODO: redesign
    mapError?: unknown
    // ? New feature, performance measure & report
    measure?: unknown
    // ? New feature, revoke instance
    signal?: AbortSignal
    strict?: StrictJSONRPC | boolean
    thenable?: boolean
}
export interface Options extends ServerOptions {
    // ! CallbackBasedChannel removed, in flavor of new Server API
    channel: Channel
    parameterStructures?: 'by-position' | 'by-name'
    preferLocalImplementation?: boolean
    idGenerator?(): string | number
}
export interface Serialization {
    serialization(from: any): unknown | PromiseLike<unknown>
    deserialization(serialized: unknown): unknown | PromiseLike<unknown>
}
export interface Channel<Data = unknown> {
    on(listener: (data: Data) => void): void | (() => void)
    send(data: Data): void
}
export interface StrictJSONRPC {
    methodNotFound?: boolean
    unknownMessage?: boolean
}
