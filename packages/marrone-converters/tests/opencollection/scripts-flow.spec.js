import { describe, it, expect } from '@jest/globals';
import { marroneToOpenCollection } from '../../src/opencollection/marrone-to-opencollection';
import { openCollectionToMarrone } from '../../src/opencollection/opencollection-to-marrone';

describe('marroneToOpenCollection (export): scripts.flow', () => {
  it('writes flow: sequential under extensions.marrone.scripts', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    expect(oc.extensions?.marrone?.scripts?.flow).toBe('sequential');
  });

  it('writes flow: sandwich under extensions.marrone.scripts', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sandwich' } },
      items: []
    });
    expect(oc.extensions?.marrone?.scripts?.flow).toBe('sandwich');
  });

  it('writes nothing when the collection has no flow', () => {
    const oc = marroneToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    expect(oc.extensions?.marrone?.scripts).toBeUndefined();
  });

  it('drops an unrecognized flow value', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'parallel' } },
      items: []
    });
    expect(oc.extensions?.marrone?.scripts).toBeUndefined();
  });
});

describe('openCollectionToMarrone (import): scripts.flow', () => {
  it('reads flow: sequential from extensions.marrone.scripts', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { marrone: { scripts: { flow: 'sequential' } } }
    });
    expect(brunoConfig.scripts?.flow).toBe('sequential');
  });

  it('ignores an unrecognized flow value', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { marrone: { scripts: { flow: 'parallel' } } }
    });
    expect(brunoConfig.scripts).toBeUndefined();
  });
});

describe('scripts.flow: export then import keeps it the same', () => {
  it('preserves flow across a round trip', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    const { brunoConfig } = openCollectionToMarrone(oc);
    expect(brunoConfig.scripts?.flow).toBe('sequential');
  });
});
