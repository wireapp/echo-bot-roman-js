import { Application, Router, RouterContext } from 'https://deno.land/x/oak@v6.5.0/mod.ts';

const env = Deno.env.toObject();

const port = parseInt(env.PORT ?? '8080');
const romanMessageUrl = env.ROMAN_BROADCAST ?? 'https://roman.integrations.zinfra.io/conversation';
const romanServiceAuth = env.ROMAN_SERVICE_AUTH;

const app = new Application();
const router = new Router();

router.post('/roman', async (ctx: RouterContext) => {
  const authorized = ctx.request.headers.get('authorization')?.split(' ')?.find(x => x === romanServiceAuth);
  ctx.assert(authorized, 401, 'Authorization required.');

  const { type, text, token, mentions } = await ctx.request.body({ type: 'json' }).value;
  ctx.response.status = 200;

  switch (type) {
    case 'conversation.init': {
      ctx.response.status = await sendMessageToWire(`Hello there!`, token);
      return;
    }
    case 'conversation.new_text': {
      const prefix = `You said: `;
      mentions?.forEach((m: any) => m.offset += prefix.length);
      ctx.response.status = await sendMessageToWire(`${prefix}${text}`, token, mentions);
      return;
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

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', () => console.log(`Listening on localhost:${port}`));
await app.listen({ port });