import { readFileSync } from 'fs';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';

function loadImports(vercel: string | undefined): any[] {
  const prev = process.env.VERCEL;
  if (vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = vercel;
  try {
    let imports: any[] = [];
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppModule } = require('../app.module');
      imports = Reflect.getMetadata('imports', AppModule);
    });
    return imports;
  } finally {
    if (prev === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prev;
  }
}

const hasSchedule = (imports: any[]) =>
  imports.some((i) => i === ScheduleModule || i?.module?.name === 'ScheduleModule');

const mainSrc = () => readFileSync(join(__dirname, '../main.ts'), 'utf8');

describe('AppModule', () => {
  it('REQ-M02-2: VERCEL-muuttujan kanssa ScheduleModulea ei rekisteröidä', () => {
    expect(hasSchedule(loadImports('1'))).toBe(false);
  });

  it('REQ-M02-2, REQ-M02-8: ilman VERCEL-muuttujaa ScheduleModule rekisteröidään', () => {
    expect(hasSchedule(loadImports(undefined))).toBe(true);
  });

  it('main.ts kuuntelee PORT-muuttujaa ja kutsuu bootstrapia ylätasolla', () => {
    expect(mainSrc()).toMatch(/PORT/);
    expect(mainSrc()).toMatch(/NestFactory\.create/);
    expect(mainSrc()).toMatch(/^bootstrap\(\);?$/m);
  });

  it('CORS säilyy paikallista kehitystä varten', () => {
    const configure = readFileSync(join(__dirname, '../configure-app.ts'), 'utf8');
    expect(mainSrc()).toMatch(/configureApp\(app\)/);
    expect(configure).toMatch(/enableCors/);
    expect(configure).toMatch(/CORS_ORIGIN/);
  });
});
