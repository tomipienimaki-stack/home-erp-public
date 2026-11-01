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

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRecipeDto } from '../recipes/dto';
import { STARTER_RECIPES, STARTER_TAG } from './starter-recipes';

describe('esimerkkireseptit', () => {
  it('kaikki läpäisevät reseptin validoinnin ja raaka-aineilla on kategoria ja taso', () => {
    expect(STARTER_RECIPES).toHaveLength(8);
    for (const r of STARTER_RECIPES) {
      const errors = validateSync(plainToInstance(CreateRecipeDto, r));
      expect({ recipe: r.name, errors: errors.map((e) => e.toString()) }).toEqual({ recipe: r.name, errors: [] });
      for (const i of r.ingredients) {
        expect(i.category).toBeTruthy();
        expect(i.tier).toBeTruthy();
      }
    }
  });

  it('ei sisällä merkkinimiä eikä henkilökohtaisia huomautuksia', () => {
    const text = JSON.stringify(STARTER_RECIPES).toLowerCase();
    for (const banned of ['de buyer', 'pasta basilico', 'itse paistoin', 'gullichsen']) {
      expect(text).not.toContain(banned);
    }
  });

  const owner = () => {
    const admin = {
      getUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: { status: 404 } }),
      createUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const recipes = { create: jest.fn().mockResolvedValue({}) };
    const ctrl = new SetupController({ auth: { admin } } as any, DEFAULT_OWNER_ID, recipes as any);
    return { recipes, ctrl };
  };

  it('lisätään oletuksena esimerkki-tagilla', async () => {
    const { recipes, ctrl } = owner();
    expect(await ctrl.createOwner({ email: 'a@b.fi', password: 'salasana123' })).toEqual({ created: true, starterRecipes: 8 });
    expect(recipes.create).toHaveBeenCalledTimes(8);
    expect(recipes.create.mock.calls[0][0].tags).toContain(STARTER_TAG);
  });

  it('voi jättää pois', async () => {
    const { recipes, ctrl } = owner();
    expect(await ctrl.createOwner({ email: 'a@b.fi', password: 'salasana123', starterRecipes: false })).toEqual({ created: true, starterRecipes: 0 });
    expect(recipes.create).not.toHaveBeenCalled();
  });

  it('yksittäisen reseptin virhe ei kaada tunnuksen luontia', async () => {
    const { recipes, ctrl } = owner();
    recipes.create.mockRejectedValueOnce(new Error('verkko'));
    expect((await ctrl.createOwner({ email: 'a@b.fi', password: 'salasana123' })).starterRecipes).toBe(7);
  });
});
