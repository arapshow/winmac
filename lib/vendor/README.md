# 외부 오픈소스 목록

| 이름 | 버전 | 용도 | 라이선스 |
|---|---|---|---|
| fflate (`fflate.min.js`, UMD) | 0.8.2 | zip 읽기·쓰기 | MIT (Arjun Barrett) |
| unegg (`unegg.wasm`, WebAssembly) | 0.2.1 | 알집 .egg 풀기. crates.io의 unegg 0.2.1 소스를 `cargo build --release --target wasm32-wasip1`로 그대로 조립 | MIT (alkegi, github.com/alkegi/unegg) |
| browser_wasi_shim (`wasi-shim.min.js`, 전역 `WasiShim`) | 0.4.2 | unegg.wasm을 브라우저 안 가상 폴더에서 돌림. npm `@bjorn3/browser_wasi_shim`을 esbuild로 한 파일(iife)로 묶음 | MIT 또는 Apache-2.0 (bjorn3) |
| stuffit (`sit.wasm`, WebAssembly) | 0.4.0 | 스터핏 .sit 풀기(StuffIt 1.x~5.x, .sitx는 안 됨). crates.io의 stuffit 0.4.0을 얇은 다리 크레이트로 감싸 `wasm32-unknown-unknown`으로 조립. 다리 소스는 `lib/vendor/sitwasm/` | MIT 또는 Apache-2.0 (benletchford, github.com/benletchford/stuffit-rs) |
