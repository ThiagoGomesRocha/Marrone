import { describe, it, expect } from '@jest/globals';
import { marroneToOpenCollection } from '../../src/opencollection/marrone-to-opencollection';
import { openCollectionToMarrone } from '../../src/opencollection/opencollection-to-marrone';

const makeMarroneCollection = (presets) => ({
  name: 'My API',
  brunoConfig: { name: 'My API', type: 'collection', ignore: [], presets },
  items: [],
  environments: [],
  root: {}
});

describe('presets.defaultEnvironment mapping between marrone and opencollection', () => {
  it('maps brunoConfig.presets.defaultEnvironment to extensions.marrone.presets.defaultEnvironment', () => {
    const oc = marroneToOpenCollection(
      makeMarroneCollection({ requestType: 'http', requestUrl: 'https://example.com', defaultEnvironment: 'prod' })
    );

    expect(oc.extensions.marrone.presets.defaultEnvironment).toBe('prod');
  });

  it('reads defaultEnvironment back from opencollection into brunoConfig.presets', () => {
    const marrone = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'My API' },
      items: [],
      extensions: { marrone: { presets: { defaultEnvironment: 'staging' } } }
    });

    expect(marrone.brunoConfig.presets.defaultEnvironment).toBe('staging');
  });

  it('round-trips defaultEnvironment through marrone to opencollection and back', () => {
    const oc = marroneToOpenCollection(makeMarroneCollection({ defaultEnvironment: 'prod' }));
    const back = openCollectionToMarrone(oc);

    expect(back.brunoConfig.presets.defaultEnvironment).toBe('prod');
  });

  it('does not add a presets block when defaultEnvironment is absent', () => {
    const oc = marroneToOpenCollection(makeMarroneCollection(undefined));

    expect(oc.extensions?.marrone?.presets).toBeUndefined();
  });
});
