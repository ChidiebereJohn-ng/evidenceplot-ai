export interface Env {
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'evidenceplot-ai',
        aiConfigured: Boolean(env?.AI),
        version: '0.1.0',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${url.pathname} not found.`,
        retryable: false,
      },
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
