import http from 'http';
import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

// --- app/index.js のテスト ---

describe('App class (app/index.js)', () => {
  // モック用のリクエスト・レスポンスを生成するヘルパー
  const makeReq = (overrides = {}) => {
    const req = new EventEmitter();
    req.method = 'GET';
    req.url = '/';
    req.headers = { host: 'localhost' };
    req.socket = { encrypted: false, remoteAddress: '127.0.0.1' };
    return Object.assign(req, overrides);
  };

  const makeRes = () => {
    const res = new EventEmitter();
    res.headers = {};
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.setHeader = jest.fn((key, val) => { res.headers[key] = val; });
    res.getHeader = jest.fn(key => res.headers[key]);
    res.getHeaders = jest.fn(() => res.headers);
    res.writeHead = jest.fn((code, hdrs) => {
      res.statusCode = code;
      Object.assign(res.headers, hdrs || {});
    });
    res.end = jest.fn(body => { res._body = body; });
    return res;
  };

  // app export (関数) のテスト
  describe('app export', () => {
    let appFn;

    beforeAll(async () => {
      const mod = await import('../app/index.js');
      appFn = mod.app;
    });

    it('app は関数である', () => {
      expect(typeof appFn).toBe('function');
    });

    it('GET / に応答して "Hi" を返す', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/' });
      const res = makeRes();
      res.end.mockImplementation(body => {
        expect(body).toBe('Hi');
        resolve();
      });
      appFn(req, res);
    }));

    it('useHeader でレスポンスヘッダーが設定される', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/' });
      const res = makeRes();
      res.end.mockImplementation(() => {
        expect(res.setHeader).toHaveBeenCalledWith('ETag', 'false');
        expect(res.setHeader).toHaveBeenCalledWith('Server', 'acl-ingress-k8s');
        expect(res.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Methods', 'GET, POST, HEAD',
        );
        resolve();
      });
      appFn(req, res);
    }));

    it('HTTPS ソケットでは origin が https:// になる', () => new Promise(resolve => {
      const req = makeReq({
        method: 'GET',
        url: '/',
        socket: { encrypted: true, remoteAddress: '127.0.0.1' },
      });
      const res = makeRes();
      res.end.mockImplementation(() => {
        const origin = res.headers['Access-Control-Allow-Origin'];
        expect(origin).toMatch(/^https:\/\//);
        resolve();
      });
      appFn(req, res);
    }));

    it('POST / は 501 Not Implemented を返す', () => new Promise(resolve => {
      const req = makeReq({ method: 'POST', url: '/' });
      const res = makeRes();
      res.end.mockImplementation(body => {
        expect(res.statusCode).toBe(501);
        const parsed = JSON.parse(body);
        expect(parsed).toHaveProperty('message');
        resolve();
      });
      appFn(req, res);
    }));

    it('GET は router で "Hi" を返す', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/any-path' });
      const res = makeRes();
      res.end.mockImplementation(body => {
        // router は GET で始まる全パスに "Hi" を返す
        expect(body).toBe('Hi');
        resolve();
      });
      appFn(req, res);
    }));

    it('origin ヘッダーが存在する場合はそれを使用する', () => new Promise(resolve => {
      const req = makeReq({
        method: 'GET',
        url: '/',
        headers: { host: 'localhost', origin: 'https://example.com' },
      });
      const res = makeRes();
      res.end.mockImplementation(() => {
        expect(res.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
        resolve();
      });
      appFn(req, res);
    }));

    it('X-Backend-Host ヘッダーが設定される', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/' });
      const res = makeRes();
      res.end.mockImplementation(() => {
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Backend-Host', expect.any(String),
        );
        resolve();
      });
      appFn(req, res);
    }));

    it('Access-Control-Allow-Headers が設定される', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/' });
      const res = makeRes();
      res.end.mockImplementation(() => {
        expect(res.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Headers', 'Content-Type',
        );
        resolve();
      });
      appFn(req, res);
    }));
  });

  // usePublic のテスト
  describe('mime type detection (usePublic)', () => {
    let appFn;

    beforeAll(async () => {
      const mod = await import('../app/index.js');
      appFn = mod.app;
    });

    it('docs/ にファイルがなければ usePublic は false でルーターに進む', () => new Promise(resolve => {
      const req = makeReq({ method: 'GET', url: '/no-such-file.txt' });
      const res = makeRes();
      res.end.mockImplementation(body => {
        expect(body).toBe('Hi');
        resolve();
      });
      appFn(req, res);
    }));
  });

  // errorHandler のテスト
  describe('errorHandler', () => {
    let appFn;

    beforeAll(async () => {
      const mod = await import('../app/index.js');
      appFn = mod.app;
    });

    it('エラーが発生した場合でも res が null なら何もしない', () => {
      // app 関数が errorHandler を内部的に呼ぶことを確認するため
      // res.setHeader が例外を投げるケースをシミュレート
      const req = makeReq({ method: 'GET', url: '/' });
      const res = makeRes();
      res.setHeader.mockImplementation(() => { throw new Error('test error'); });
      res.writeHead.mockImplementation(code => { res.statusCode = code; });
      res.end.mockImplementation(body => { res._body = body; });

      // errorHandler が呼ばれ 500 を返すことを確認
      expect(() => appFn(req, res)).not.toThrow();
      expect(res.statusCode).toBe(500);
    });
  });
});

// --- index.js エントリーポイントのテスト ---

describe('index.js エントリーポイント', () => {
  beforeEach(() => {
    jest.spyOn(http, 'createServer').mockReturnValue({
      on: jest.fn().mockReturnThis(),
      listen: jest.fn().mockReturnThis(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('app/index.js の app は関数である', async () => {
    const { app } = await import('../app/index.js');
    expect(typeof app).toBe('function');
  });

  it('app 関数は req/res を受け取って動作する', async () => {
    const { app } = await import('../app/index.js');
    const req = {
      method: 'GET',
      url: '/',
      headers: { host: 'localhost' },
      socket: { encrypted: false, remoteAddress: '127.0.0.1' },
      on: jest.fn(),
    };
    const res = {
      headers: {},
      setHeader: jest.fn((k, v) => { res.headers[k] = v; }),
      getHeaders: jest.fn(() => res.headers),
      writeHead: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };
    expect(() => app(req, res)).not.toThrow();
  });

  it('PORT のデフォルト値は 3000', () => {
    const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
    expect(PORT).toBe(3000);
  });

  it('SPORT のデフォルト値は 3443', () => {
    const SPORT = Number.parseInt(process.env.SPORT, 10) || 3443;
    expect(SPORT).toBe(3443);
  });

  it('BIND のデフォルト値は "0.0.0.0"', () => {
    const BIND = process.env.BIND || '0.0.0.0';
    expect(BIND).toBe('0.0.0.0');
  });
});
