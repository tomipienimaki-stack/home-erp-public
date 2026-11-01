import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC } from './public.decorator';

const USER_ID = 'user-1';
const API_TOKEN = 'secret-token-123';

function makeCtx(headers: Record<string, string> = {}, isPublic = false) {
  const handler = () => undefined;
  const cls = class {};
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC, true, handler);
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function makeGuard(env: Record<string, string> = {}, userFromToken?: string | null) {
  const getUser = jest.fn(async () =>
    userFromToken
      ? { data: { user: { id: userFromToken } }, error: null }
      : { data: { user: null }, error: new Error('invalid') },
  );
  const supabase = { auth: { getUser } } as any;
  const config = { get: (k: string) => env[k] } as any;
  const guard = new AuthGuard(new Reflector(), supabase, USER_ID, config);
  return { guard, getUser };
}

describe('AuthGuard', () => {
  it('REQ-M01-2: rejects a request without credentials with 401', async () => {
    const { guard } = makeGuard({ HOME_ERP_API_TOKEN: API_TOKEN });
    await expect(guard.canActivate(makeCtx())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('REQ-M01-2: lets a @Public() route through without credentials', async () => {
    const { guard } = makeGuard();
    await expect(guard.canActivate(makeCtx({}, true))).resolves.toBe(true);
  });

  describe('REQ-M01-3: Supabase JWT', () => {
    it('accepts a valid JWT of SINGLE_USER_ID', async () => {
      const { guard, getUser } = makeGuard({}, USER_ID);
      await expect(
        guard.canActivate(makeCtx({ authorization: 'Bearer good.jwt' })),
      ).resolves.toBe(true);
      expect(getUser).toHaveBeenCalledWith('good.jwt');
    });

    it("rejects another user's JWT with 401", async () => {
      const { guard } = makeGuard({}, 'someone-else');
      await expect(
        guard.canActivate(makeCtx({ authorization: 'Bearer other.jwt' })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an invalid JWT with 401', async () => {
      const { guard } = makeGuard({}, null);
      await expect(
        guard.canActivate(makeCtx({ authorization: 'Bearer bad.jwt' })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('REQ-M01-4 and REQ-M01-12: X-Api-Key header contract', () => {
    const env = { HOME_ERP_API_TOKEN: API_TOKEN };

    it('accepts the correct X-Api-Key', async () => {
      const { guard } = makeGuard(env);
      await expect(guard.canActivate(makeCtx({ 'x-api-key': API_TOKEN }))).resolves.toBe(true);
    });

    it('rejects a wrong X-Api-Key of the same length', async () => {
      const { guard } = makeGuard(env);
      await expect(
        guard.canActivate(makeCtx({ 'x-api-key': 'x'.repeat(API_TOKEN.length) })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an X-Api-Key of different length', async () => {
      const { guard } = makeGuard(env);
      await expect(
        guard.canActivate(makeCtx({ 'x-api-key': 'short' })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('disables the API-key route when HOME_ERP_API_TOKEN is not set', async () => {
      const { guard } = makeGuard({});
      await expect(guard.canActivate(makeCtx({ 'x-api-key': '' }))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(guard.canActivate(makeCtx({ 'x-api-key': 'anything' }))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('REQ-M01-5: AUTH_DISABLED', () => {
    it('lets everything through when AUTH_DISABLED=true', async () => {
      const { guard } = makeGuard({ AUTH_DISABLED: 'true' });
      await expect(guard.canActivate(makeCtx())).resolves.toBe(true);
    });

    it('is enforced by default and for any value other than true', async () => {
      const { guard } = makeGuard({ AUTH_DISABLED: 'false' });
      await expect(guard.canActivate(makeCtx())).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
