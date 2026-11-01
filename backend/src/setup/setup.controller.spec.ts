import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { DEFAULT_OWNER_ID, ownerId, supabaseServiceKey, supabaseUrl } from '../supabase/env';

const make = (getUser: { data?: unknown; error?: unknown }) => {
  const admin = {
    getUserById: jest.fn().mockResolvedValue({ data: { user: null }, ...getUser }),
    createUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
  };
  const ctrl = new SetupController({ auth: { admin } } as any, DEFAULT_OWNER_ID);
  return { admin, ctrl };
};

describe('SetupController', () => {
  it('tyhjässä asennuksessa omistaja puuttuu ja luodaan kiinteällä tunnisteella', async () => {
    const { admin, ctrl } = make({ error: { status: 404, message: 'User not found' } });
    expect(await ctrl.status()).toEqual({ needsOwner: true });
    await ctrl.createOwner({ email: 'a@b.fi', password: 'salasana123' });
    expect(admin.createUser).toHaveBeenCalledWith({
      id: DEFAULT_OWNER_ID,
      email: 'a@b.fi',
      password: 'salasana123',
      email_confirm: true,
    });
  });

  it('kun omistaja on olemassa, uutta tunnusta ei voi luoda', async () => {
    const { admin, ctrl } = make({ data: { user: { id: DEFAULT_OWNER_ID } } });
    expect(await ctrl.status()).toEqual({ needsOwner: false });
    await expect(ctrl.createOwner({ email: 'x@y.fi', password: 'salasana123' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it('jos käyttäjätilaa ei saada selville, tunnusta ei luoda', async () => {
    const { admin, ctrl } = make({ error: { status: 500, message: 'boom' } });
    await expect(ctrl.createOwner({ email: 'a@b.fi', password: 'salasana123' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(admin.createUser).not.toHaveBeenCalled();
  });
});

describe('env', () => {
  it('lukee Vercelin Supabase-integraation nimet', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_x',
    };
    expect(supabaseUrl(env)).toBe('https://x.supabase.co');
    expect(supabaseServiceKey(env)).toBe('sb_secret_x');
  });

  it('SINGLE_USER_ID on valinnainen', () => {
    expect(ownerId({})).toBe(DEFAULT_OWNER_ID);
    expect(ownerId({ SINGLE_USER_ID: 'abc' })).toBe('abc');
  });
});
