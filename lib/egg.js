// .egg(알집 압축) 풀기. unegg(Rust, MIT)를 WebAssembly로 조립한 /lib/vendor/unegg.wasm을
// 브라우저 안의 가상 폴더(wasi-shim)에서 돌린다. 서버로 아무것도 보내지 않는다.
// 결과: { ok, files: [{ path, bytes }], dirs: [path], needPassword?, error? }
(function (root) {
  'use strict';
  var mod = null;
  function load(url) {
    if (!mod) mod = typeof process !== 'undefined' && process.versions && process.versions.node
      ? WebAssembly.compile(require('fs').readFileSync(url))
      : fetch(url).then(function (r) { if (!r.ok) throw new Error('wasm ' + r.status); return r.arrayBuffer(); }).then(WebAssembly.compile);
    mod.catch(function () { mod = null; });
    return mod;
  }
  function walk(dir, pre, out) {
    dir.contents.forEach(function (node, name) {
      var p = pre ? pre + '/' + name : name;
      if (node.contents instanceof Map) { out.dirs.push(p); walk(node, p, out); }
      else out.files.push({ path: p, bytes: node.data });
    });
  }
  // wasi-shim은 파일에 쓸 때마다 전체를 새로 복사해서(큰 사진에서 몇 배 느림) 두 배씩 늘리는 방식으로 바꾼다
  function patch(S) {
    var P = S.OpenFile.prototype;
    if (P._wmFast) return;
    P._wmFast = true;
    P.fd_write = function (data) {
      var f = this.file;
      if (f.readonly) return { ret: 8, nwritten: 0 }; // ERRNO_BADF
      if (!f._buf || f.data.buffer !== f._buf.buffer) f._buf = f.data;
      var pos = Number(this.file_pos), end = pos + data.byteLength, len = Math.max(f.data.byteLength, end);
      if (end > f._buf.byteLength) {
        var nb = new Uint8Array(Math.max(end, f._buf.byteLength * 2, 65536));
        nb.set(f.data); f._buf = nb;
      }
      f._buf.set(data, pos);
      f.data = f._buf.subarray(0, len);
      this.file_pos = BigInt(end);
      return { ret: 0, nwritten: data.byteLength };
    };
  }
  function isEgg(u8) { return u8.length > 4 && u8[0] === 0x45 && u8[1] === 0x47 && u8[2] === 0x47 && u8[3] === 0x41; }
  /** egg 바이트를 풀어 파일 목록으로. opts.password는 암호 걸린 egg일 때만. */
  async function unEgg(u8, opts) {
    opts = opts || {};
    var S = root.WasiShim || require('./vendor/wasi-shim.min.js');
    patch(S);
    var out = new S.Directory(new Map());
    var inp = new S.Directory(new Map([['a.egg', new S.File(u8, { readonly: true })]]));
    var log = [];
    var sink = function () { return S.ConsoleStdout.lineBuffered(function (l) { log.push(l); }); };
    var args = ['unegg', '-q', '-d', '/out'];
    if (opts.password) args.push('-P', opts.password);
    args.push('/in/a.egg');
    var wasi = new S.WASI(args, [], [new S.OpenFile(new S.File([])), sink(), sink(),
      new S.PreopenDirectory('/in', inp.contents), new S.PreopenDirectory('/out', out.contents)], { debug: false });
    var inst = await WebAssembly.instantiate(await load(opts.wasm || '/lib/vendor/unegg.wasm?v=1'), { wasi_snapshot_preview1: wasi.wasiImport });
    var code;
    try { code = wasi.start(inst); } catch (e) { code = e && e.code != null ? e.code : 1; if (!(e && e.code != null)) log.push(String(e)); }
    var res = { files: [], dirs: [], ok: code === 0, log: log };
    walk(out, '', res);
    if (!res.ok) { res.error = log.join(' '); res.needPassword = /password/i.test(res.error); }
    return res;
  }
  var api = { unEgg: unEgg, isEgg: isEgg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WinMacEgg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
