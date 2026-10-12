import reducer, { runFolderEvent } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';
const REQUEST_UID = 'run-1';

const REQUEST_SENT = { method: 'GET', url: 'https://example.com/userinfo', headers: {} };

const FULL_RESPONSE = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { ok: true },
  size: 12,
  duration: 34
};

const REDUCED_RESPONSE = { status: 200, statusText: 'OK' };

const makeInitialState = () => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [
        {
          uid: ITEM_UID,
          name: 'user_info',
          type: 'http-request',
          request: { url: 'https://example.com/userinfo', method: 'GET' }
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

const seedRunner = (state) => {
  state = reducer(state, runFolderEvent({
    type: 'testrun-started',
    collectionUid: COLLECTION_UID,
    folderUid: null,
    isRecursive: false,
    cancelTokenUid: 'cancel-1'
  }));
  return reducer(state, runFolderEvent({
    type: 'request-queued',
    collectionUid: COLLECTION_UID,
    folderUid: null,
    itemUid: ITEM_UID,
    requestUid: REQUEST_UID
  }));
};

const emit = (state, payload) => reducer(state, runFolderEvent({
  collectionUid: COLLECTION_UID,
  folderUid: null,
  itemUid: ITEM_UID,
  ...payload
}));

const runnerItem = (state) => state.collections[0].runnerResult.items.find((i) => i.uid === ITEM_UID);

describe('runFolderEvent — runner exchange events', () => {
  describe('request-queued', () => {
    it('keeps the requestUid the payloads are stored under', () => {
      expect(runnerItem(seedRunner(makeInitialState())).requestUid).toBe(REQUEST_UID);
    });
  });

  describe('request-sent', () => {
    it('leaves requestSent unset when the payload was stored', () => {
      const state = emit(seedRunner(makeInitialState()), { type: 'request-sent' });

      const item = runnerItem(state);
      expect(item.status).toBe('running');
      expect(item.requestSent).toBeUndefined();
    });

    it('attaches requestSent when the store failed and the event carries it', () => {
      const state = emit(seedRunner(makeInitialState()), { type: 'request-sent', requestSent: REQUEST_SENT });

      const item = runnerItem(state);
      expect(item.status).toBe('running');
      expect(item.requestSent).toEqual(REQUEST_SENT);
    });
  });

  describe('response-received', () => {
    it('attaches only the list fields when the payload was stored', () => {
      const state = emit(seedRunner(makeInitialState()), {
        type: 'response-received',
        responseReceived: REDUCED_RESPONSE
      });

      const item = runnerItem(state);
      expect(item.status).toBe('completed');
      expect(item.responseReceived).toEqual(REDUCED_RESPONSE);
    });

    it('attaches the full response when the store failed and the event carries it', () => {
      const state = emit(seedRunner(makeInitialState()), {
        type: 'response-received',
        responseReceived: FULL_RESPONSE
      });

      const item = runnerItem(state);
      expect(item.status).toBe('completed');
      expect(item.responseReceived).toEqual(FULL_RESPONSE);
    });
  });

  describe('test-results — operações de banco', () => {
    const operation = (sql) => ({
      timestamp: '2024-01-02T03:04:05.678Z',
      sgbd: 'mssql',
      sql,
      parameters: ['***'],
      durationMs: 5,
      status: 'success',
      resultSummary: '1 registro',
      resultRows: [{ id: 1 }],
      resultRowsTotal: 1,
      resultRowsTruncated: false
    });

    it('agrega as operações das três fases no item do runner', () => {
      let state = seedRunner(makeInitialState());

      state = emit(state, {
        type: 'test-results-pre-request',
        preRequestTestResults: [],
        databaseOperations: [operation('SELECT 1')]
      });
      state = emit(state, {
        type: 'test-results-post-response',
        postResponseTestResults: [],
        databaseOperations: [operation('SELECT 2')]
      });
      state = emit(state, {
        type: 'test-results',
        testResults: [],
        databaseOperations: [operation('SELECT 3')]
      });

      const item = runnerItem(state);

      // A ordem importa: o relatório mostra as operações na sequência em que rodaram.
      expect(item.databaseOperations.map((entry) => entry.sql)).toEqual(['SELECT 1', 'SELECT 2', 'SELECT 3']);
      // As linhas do resultado precisam sobreviver até aqui — é o que o relatório exibe.
      expect(item.databaseOperations[0].resultRows).toEqual([{ id: 1 }]);
    });

    it('não cria a lista quando o evento não traz operações', () => {
      const state = emit(seedRunner(makeInitialState()), { type: 'test-results', testResults: [] });

      expect(runnerItem(state).databaseOperations).toBeUndefined();
    });
  });
});
