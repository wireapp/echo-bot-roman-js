import { Application, Router, RouterContext } from 'https://deno.land/x/oak@v6.5.0/mod.ts';

const romanServiceAuth = Deno.env.get('ROMAN_SERVICE_AUTH');

const app = new Application();
const router = new Router();

router.post('/roman', async (ctx: RouterContext) => {
  const authorized = ctx.request.headers.get('authorization')?.split(' ')?.find(x => x === romanServiceAuth);
  ctx.assert(authorized, 401, 'Authorization required.');

  const { type, text, mentions } = await ctx.request.body({ type: 'json' }).value;
  ctx.response.status = 200;

  switch (type) {
    case 'conversation.init':
      ctx.response.body = { type: 'text', text: { data: `Hello there!`, mentions: [] } };
      return;
    case 'conversation.new_text':
      mentions?.forEach((m: any) => m.offset += 10); // shift mentions by 'You said: ' string
      ctx.response.body = { type: 'text', text: { data: `You said: ${text}`, mentions: mentions ?? [] } };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', () => console.log('Server up and running on localhost:8080'));
await app.listen({ port: 8080 });