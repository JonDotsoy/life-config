import { atom } from "nanostores";

type RequestResponseDebug = {
  request: {
    method: string;
    url: string;
    header: Record<string, string>;
  };
  response: {
    status: number;
    header: Record<string, string>;
  };
};

const defaultResponse = async () =>
  new Response(new TextEncoder().encode("ok"));

const debug = (message: string) => {
  // console.log(`🏕️ ${message}`)
};

export class TestServer {
  serverPromise = Promise.withResolvers<import("bun").Server>();
  private started = false;
  subsFetches = new Set<(request: Request, response: Response) => void>();
  atomResponse = atom<(request: Request) => Promise<Response>>(defaultResponse);
  readonly cbsRequestResponseDebug = new Set<
    (requestResponseDebug: RequestResponseDebug) => void
  >();

  constructor(private port: number = 34765) {}

  async [Symbol.asyncDispose]() {
    await this.stop();
  }

  reset() {
    this.atomResponse.set(defaultResponse);
  }

  async start() {
    if (this.started) {
      await this.serverPromise.promise;
      return this;
    }
    this.started = true;
    this.serverPromise.resolve(
      Bun.serve({
        port: this.port,

        fetch: async (request) => {
          debug(
            `◀️ ${request.method} ${request.url} [ ${Array.from(
              request.headers.entries(),
            )
              .map(([k, h]) => `${k}: ${h}`)
              .join(" | ")} ]`,
          );
          const requestBody = await request.arrayBuffer();
          const response = await this.atomResponse.get()(
            new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: requestBody,
            }),
          );
          const responseBody = await response.arrayBuffer();

          this.subsFetches.forEach((cb) => {
            cb(
              new Request(request.url, {
                method: request.method,
                headers: request.headers,
                body: requestBody,
              }),
              new Response(responseBody, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
              }),
            );
          });

          const res = new Response(responseBody, {
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
          });
          debug(
            `▶️ ${res.status} [ ${Array.from(res.headers.entries())
              .map(([k, h]) => `${k}: ${h}`)
              .join(" | ")} ]`,
          );
          const requestResponseDebug: RequestResponseDebug = {
            request: {
              method: request.method,
              url: request.url,
              header: Object.fromEntries(Array.from(request.headers)),
            },
            response: {
              status: res.status,
              header: Object.fromEntries(Array.from(res.headers)),
            },
          };
          this.cbsRequestResponseDebug.forEach((cb) =>
            cb(requestResponseDebug),
          );
          return res;
        },
      }),
    );

    return this;
  }

  response(cb: Response | ((request: Request) => Promise<Response>)) {
    if (cb instanceof Response) {
      this.atomResponse.set(async () => cb);
      return;
    }
    this.atomResponse.set(cb);
  }

  subscribe(cb: (request: Request, response: Response) => void) {
    this.subsFetches.add(cb);
    return () => {
      this.subsFetches.delete(cb);
    };
  }

  subscribeDebug(cb: (requestResponseDebug: RequestResponseDebug) => void) {
    this.cbsRequestResponseDebug.add(cb);
    const unsubscribe = () => this.cbsRequestResponseDebug.delete(cb);
    const dispose = () => {
      unsubscribe();
    };
    unsubscribe.unsubscribe = unsubscribe;
    unsubscribe[Symbol.dispose] = dispose;
    return unsubscribe;
  }

  spyRequests() {
    const fetches: [request: Request, response: Response][] = [];

    const cb = (request: Request, response: Response) => {
      fetches.push([request, response]);
    };

    const unsubscribe = this.subscribe(cb);

    return {
      fetches,
      unsubscribe,
      [Symbol.dispose]: () => {
        this.reset();
        unsubscribe();
      },
    };
  }

  async stop(force: boolean = false) {
    const server = await this.serverPromise.promise;
    server.stop(force);
  }

  async url() {
    const server = await this.serverPromise.promise;
    return server.url;
  }
}
