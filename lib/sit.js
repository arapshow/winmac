// .sit(스터핏, 옛 맥 압축) 풀기. stuffit 0.4.0(Rust, MIT/Apache)을 감싼 /lib/vendor/sit.wasm을 브라우저에서 바로 부른다.
// 결과: { ok, files: [{ path, bytes }], dirs: [path], error? }. 서버로 아무것도 보내지 않는다.
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
  var dec = new TextDecoder();
  function str(u8) { return dec.decode(u8); }
  // StuffIt 1.x~5.x는 'SIT!' 또는 'StuffIt'로 시작(맥바이너리로 싼 .sit.bin은 128바이트 뒤)
  function isSit(u8, name) {
    var h = str(u8.subarray(0, 8));
    return h.indexOf('SIT!') === 0 || h.indexOf('StuffIt') === 0 || /\.sit(\.bin)?$/i.test(name || '');
  }
  async function unSit(u8, opts) {
    opts = opts || {};
    var inst = await WebAssembly.instantiate(await load(opts.wasm || '/lib/vendor/sit.wasm?v=1'), {});
    var x = inst.exports, mem = function () { return new Uint8Array(x.memory.buffer); };
    x.sit_reset();
    var p = x.sit_alloc(u8.length);
    mem().set(u8, p);
    var out = x.sit_extract(p, u8.length);
    x.sit_free(p, u8.length);
    if (!out) return { ok: false, files: [], dirs: [], error: str(mem().slice(x.sit_error(), x.sit_error() + x.sit_error_len())) };
    var b = mem().slice(out, out + x.sit_out_len()), dv = new DataView(b.buffer), o = 0;
    var n = dv.getUint32(o, true), res = { ok: true, files: [], dirs: [] };
    o += 4;
    for (var i = 0; i < n; i++) {
      var nl = dv.getUint32(o, true); o += 4;
      var path = str(b.subarray(o, o + nl)).replace(/^\/+/, '').replace(/:/g, '/'); o += nl;
      var folder = b[o]; o += 1;
      var len = dv.getUint32(o, true); o += 4;
      if (folder) res.dirs.push(path.replace(/\/$/, ''));
      else res.files.push({ path: path, bytes: b.slice(o, o + len) });
      o += len;
    }
    x.sit_reset();
    return res;
  }
  var api = { unSit: unSit, isSit: isSit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WinMacSit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
