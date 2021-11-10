import { createServer } from './next-api'
import { Server } from 'ws'
import { _AsyncVersionOf } from './src'

// JSON RPC Server
const RPCMethods = { add: (a: number, b: number) => a + b }
const [handleMessage, initializedServer, close] = createServer(RPCMethods)

// Web Socket
const WebSocketServer = new Server()
WebSocketServer.addListener('connection', (client) => {
    const ac = new AbortController()
    client.addListener('close', () => ac.abort())

    client.addListener('message', async (message) => {
        const result = await handleMessage(message, ac.signal)
        if (ac.signal.aborted || !result.message) return
        client.send(result.message)
    })
})


// declare function withProgressSupport<P extends any[], Progress, Return>(
//     f: (...args: P) => AsyncGenerator<Progress, Return, void>,
// ): (
//     tokenSelector: (...args: P) => string | number | undefined,
// ) => WithProgress<(...args: P) => Promise<Return>, Progress>
type WithProgress<T, P> = T & { __progressType?: P }
// declare function requireProgressReport<A extends any[], R, P>(
//     f: WithProgress<(...args: A) => Promise<R>, P>,
//     appendToken: (id: number, params: A) => void,
// ): (onProgress: (progrss: P) => void, ...args: A) => R

// const serverSide = withProgressSupport(async function* (a: string, b: string, _progressToken?: number) {
//     yield 0.5
//     return a + b
// })((_, __, token) => token)

// const f = requireProgressReport(serverSide, (id, param) => (param[2] = id))
// const result = await f((progress) => console.log('current progress =', progress), 'param1', 'param2')

declare function withContext<A extends any[], G, R>(f: (this: Context, ...arg: A) => AsyncGenerator<G, R, void>): (...args: A) => WithProgress<Promise<R>, G>
declare function withAbortSignal<A extends any[], L>(f: (...args: A) => L): (signal?: AbortSignal, ...args: A) => L
declare function withProgress<R, G>(callback: (id: number) => WithProgress<Promise<R>, G>, onProgress: (progress: G) => void): Promise<R>

type Context = {
    get context(): unknown
    get signal(): AbortSignal
    setProgressToken(token: any): (progress: unknown) => void
    id: string | number | null
}

// Server
//    serverFunction: (a: number, progressToken?: number) => WithProgress<Promise<string>, number>
const serverFunction = withContext(async function* (a: number, progressToken?: number) {
    this.signal.addEventListener('abort', console.error)
    this.setProgressToken(progressToken)

    yield 0.5 // progress
    return ""
})

// Client
const controller = new AbortController()

//    f: (signal?: AbortSignal, a: number, progressToken?: number) => WithProgress<Promise<string>, number>
const f = withAbortSignal(serverFunction)

withProgress(
    // call f with progressToken
    token => f(controller.signal, 0, token),
    // progress is type number
    progress => console.log('progress reported', progress)
).then(result => typeof result === 'string')
controller.abort()
