import { Application, isHttpError, Router, RouterContext } from 'https://deno.land/x/oak@v6.5.0/mod.ts';

const env = Deno.env.toObject();

const port = parseInt(env.PORT ?? '8080');
const romanMessageUrl = env.ROMAN_BROADCAST ?? 'https://roman.integrations.zinfra.io/conversation';
const romanServiceAuth = env.ROMAN_SERVICE_AUTH;

const app = new Application();
const router = new Router();

router.post('/roman', async (ctx: RouterContext) => {
  const authorized = ctx.request.headers.get('authorization')?.split(' ')?.find(x => x === romanServiceAuth);
  ctx.assert(authorized, 401, 'Authorization required.');

  const body = await ctx.request.body({ type: 'json' }).value;
  const { type, text, token, mentions } = body;
  ctx.response.status = 200;

  switch (type) {
    case 'conversation.init': {
      ctx.response.status = await sendMessageToWire(`Hello there!`, token);
      break;
    }
    case 'conversation.new_text': {
      const prefix = `You said: `;
      mentions?.forEach((m: any) => m.offset += prefix.length);
      ctx.response.status = await sendMessageToWire(`${prefix}${text}`, token, mentions);
      break;
    }
  }
});

const sendMessageToWire = async (message: string, token: string, mentions = []) => {
  const response = await fetch(
    romanMessageUrl,
    {
      method: 'POST',
      headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'text', text: { data: message, mentions } })
    }
  );
  if (response.status >= 400) {
    console.log(await response.json());
  }
  return response.status;
};


/* ----------------- WIRE Common ----------------- */
// k8s indication the service is running
router.get('/status', ({ response }) => {
  response.status = 200;
});
// technical endpoint to display the version
router.get('/version', async ({ response }) => {
  let version: string | undefined;
  const releaseFilePath = Deno.env.get('RELEASE_FILE_PATH');
  if (releaseFilePath) {
    try {
      version = await Deno.readTextFile(releaseFilePath).then(text => text.trim());
    } catch {
    }
  }
  response.body = { version: version ?? 'development' };
});
// log all failures that were not handled
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (!isHttpError(err)) {
      console.log(err);
    }
    throw err;
  }
});
/* //--------------- WIRE Common ----------------- */

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', () => console.log(`Listening on localhost:${port}`));
await app.listen({ port });