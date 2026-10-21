//! WIN MAC용 .sit 풀기: stuffit 크레이트를 브라우저(wasm32)에서 부르는 얇은 다리.
//! JS가 sit_alloc으로 자리를 받아 바이트를 넣고 sit_extract를 부르면,
//! 결과를 [개수 u32][이름길이 u32, 이름, 폴더여부 u8, 길이 u32, 데이터]… 로 담아 돌려준다.
//! 실패하면 0을 돌려주고 sit_error로 이유 문자열을 읽는다.
use encoding_rs::{EUC_KR, MACINTOSH};
use stuffit::SitArchive;

/// 옛 한글 맥에서 만든 sit는 이름이 맥 한글(EUC-KR 계열) 바이트인데, stuffit은 MacRoman으로 읽는다.
/// MacRoman으로 되돌린 바이트가 EUC-KR로 깨끗이 읽히고 한글이 나오면 그 이름을 쓴다.
fn fix_name(name: &str) -> String {
    if name.is_ascii() { return name.to_string(); }
    let (bytes, _, unmappable) = MACINTOSH.encode(name);
    if unmappable { return name.to_string(); }
    let (k, had_err) = EUC_KR.decode_without_bom_handling(&bytes);
    if !had_err && k.chars().any(|c| ('\u{AC00}'..='\u{D7A3}').contains(&c)) { k.into_owned() } else { name.to_string() }
}

static mut OUT: Vec<u8> = Vec::new();
static mut ERR: Vec<u8> = Vec::new();

#[no_mangle]
pub extern "C" fn sit_alloc(len: usize) -> *mut u8 {
    let mut v = vec![0u8; len];
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

#[no_mangle]
pub unsafe extern "C" fn sit_free(p: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(p, len, len));
}

fn put32(o: &mut Vec<u8>, n: usize) {
    o.extend_from_slice(&(n as u32).to_le_bytes());
}

fn run(data: &[u8]) -> Result<Vec<u8>, String> {
    let ar = SitArchive::parse_auto(data).map_err(|e| e.to_string())?;
    let mut o = Vec::new();
    put32(&mut o, ar.entries.len());
    for e in &ar.entries {
        let (d, _rsrc) = if e.is_folder { (Vec::new(), Vec::new()) } else { e.decompressed_forks().map_err(|x| format!("{}: {}", e.name, x))? };
        let name = fix_name(&e.name);
        put32(&mut o, name.len());
        o.extend_from_slice(name.as_bytes());
        o.push(e.is_folder as u8);
        put32(&mut o, d.len());
        o.extend_from_slice(&d);
    }
    Ok(o)
}

/// 성공하면 결과 포인터(길이는 sit_out_len), 실패하면 0.
#[no_mangle]
#[allow(static_mut_refs)]
pub unsafe extern "C" fn sit_extract(p: *const u8, len: usize) -> *const u8 {
    let data = std::slice::from_raw_parts(p, len);
    match run(data) {
        Ok(v) => { OUT = v; OUT.as_ptr() }
        Err(e) => { ERR = e.into_bytes(); std::ptr::null() }
    }
}

#[no_mangle]
#[allow(static_mut_refs)]
pub unsafe extern "C" fn sit_out_len() -> usize { OUT.len() }

#[no_mangle]
#[allow(static_mut_refs)]
pub unsafe extern "C" fn sit_error() -> *const u8 { ERR.as_ptr() }

#[no_mangle]
#[allow(static_mut_refs)]
pub unsafe extern "C" fn sit_error_len() -> usize { ERR.len() }

#[no_mangle]
#[allow(static_mut_refs)]
pub unsafe extern "C" fn sit_reset() { OUT = Vec::new(); ERR = Vec::new(); }
