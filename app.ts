import { Application, Router, RouterContext } from 'https://deno.land/x/oak@v6.5.0/mod.ts';

const romanServiceAuth = Deno.env.get('ROMAN_SERVICE_AUTH');

const app = new Application();
const router = new Router();

router.post('/roman', async (ctx: RouterContext) => {
  const authorized = ctx.request.headers.get('authorization')?.split(' ')?.find(x => x === romanServiceAuth);
  ctx.assert(authorized, 401, 'Authorization required.');

  const body = await ctx.request.body({ type: 'json' }).value;
  const { type } = body;
  switch (type) {
    case 'conversation.init':
      ctx.response.body = { type: 'text', text: { data: `Hello there!` } };
      break;
    case 'conversation.new_text':
      ctx.response.body = { type: 'text', text: { data: `You said: ${body.text.data}` } };
      break;
  }
  ctx.response.status = 200;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener('listen', () => console.log('Server up and running on localhost:8080'));
await app.listen({ port: 8080 });
