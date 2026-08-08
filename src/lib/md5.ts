/** Minimal MD5 for Active Storage checksums (browser-safe). Returns Base64 digest. */
export function md5(bytes: Uint8Array): string {
  // Convert to word array
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8)
  }
  const bitLen = bytes.length * 8

  words[bitLen >> 5] |= 0x80 << (bitLen % 32)
  words[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  const ff = (x: number, y: number, z: number) => (x & y) | (~x & z)
  const gg = (x: number, y: number, z: number) => (x & z) | (y & ~z)
  const hh = (x: number, y: number, z: number) => x ^ y ^ z
  const ii = (x: number, y: number, z: number) => y ^ (x | ~z)
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n))
  const add = (x: number, y: number) => (x + y) | 0
  const cmn = (q: number, a0: number, b0: number, x: number, s: number, t: number) =>
    add(rotl(add(add(a0, q), add(x, t)), s), b0)

  for (let i = 0; i < words.length; i += 16) {
    const oa = a
    const ob = b
    const oc = c
    const od = d

    const w = (j: number) => words[i + j] | 0

    a = cmn(ff(b, c, d), a, b, w(0), 7, -680876936)
    d = cmn(ff(a, b, c), d, a, w(1), 12, -389564586)
    c = cmn(ff(d, a, b), c, d, w(2), 17, 606105819)
    b = cmn(ff(c, d, a), b, c, w(3), 22, -1044525330)
    a = cmn(ff(b, c, d), a, b, w(4), 7, -176418897)
    d = cmn(ff(a, b, c), d, a, w(5), 12, 1200080426)
    c = cmn(ff(d, a, b), c, d, w(6), 17, -1473231341)
    b = cmn(ff(c, d, a), b, c, w(7), 22, -45705983)
    a = cmn(ff(b, c, d), a, b, w(8), 7, 1770035416)
    d = cmn(ff(a, b, c), d, a, w(9), 12, -1958414417)
    c = cmn(ff(d, a, b), c, d, w(10), 17, -42063)
    b = cmn(ff(c, d, a), b, c, w(11), 22, -1990404162)
    a = cmn(ff(b, c, d), a, b, w(12), 7, 1804603682)
    d = cmn(ff(a, b, c), d, a, w(13), 12, -40341101)
    c = cmn(ff(d, a, b), c, d, w(14), 17, -1502002290)
    b = cmn(ff(c, d, a), b, c, w(15), 22, 1236535329)

    a = cmn(gg(b, c, d), a, b, w(1), 5, -165796510)
    d = cmn(gg(a, b, c), d, a, w(6), 9, -1069501632)
    c = cmn(gg(d, a, b), c, d, w(11), 14, 643717713)
    b = cmn(gg(c, d, a), b, c, w(0), 20, -373897302)
    a = cmn(gg(b, c, d), a, b, w(5), 5, -701558691)
    d = cmn(gg(a, b, c), d, a, w(10), 9, 38016083)
    c = cmn(gg(d, a, b), c, d, w(15), 14, -660478335)
    b = cmn(gg(c, d, a), b, c, w(4), 20, -405537848)
    a = cmn(gg(b, c, d), a, b, w(9), 5, 568446438)
    d = cmn(gg(a, b, c), d, a, w(14), 9, -1019803690)
    c = cmn(gg(d, a, b), c, d, w(3), 14, -187363961)
    b = cmn(gg(c, d, a), b, c, w(8), 20, 1163531501)
    a = cmn(gg(b, c, d), a, b, w(13), 5, -1444681467)
    d = cmn(gg(a, b, c), d, a, w(2), 9, -51403784)
    c = cmn(gg(d, a, b), c, d, w(7), 14, 1735328473)
    b = cmn(gg(c, d, a), b, c, w(12), 20, -1926607734)

    a = cmn(hh(b, c, d), a, b, w(5), 4, -378558)
    d = cmn(hh(a, b, c), d, a, w(8), 11, -2022574463)
    c = cmn(hh(d, a, b), c, d, w(11), 16, 1839030562)
    b = cmn(hh(c, d, a), b, c, w(14), 23, -35309556)
    a = cmn(hh(b, c, d), a, b, w(1), 4, -1530992060)
    d = cmn(hh(a, b, c), d, a, w(4), 11, 1272893353)
    c = cmn(hh(d, a, b), c, d, w(7), 16, -155497632)
    b = cmn(hh(c, d, a), b, c, w(10), 23, -1094730640)
    a = cmn(hh(b, c, d), a, b, w(13), 4, 681279174)
    d = cmn(hh(a, b, c), d, a, w(0), 11, -358537222)
    c = cmn(hh(d, a, b), c, d, w(3), 16, -722521979)
    b = cmn(hh(c, d, a), b, c, w(6), 23, 76029189)
    a = cmn(hh(b, c, d), a, b, w(9), 4, -640364487)
    d = cmn(hh(a, b, c), d, a, w(12), 11, -421815835)
    c = cmn(hh(d, a, b), c, d, w(15), 16, 530742520)
    b = cmn(hh(c, d, a), b, c, w(2), 23, -995338651)

    a = cmn(ii(b, c, d), a, b, w(0), 6, -198630844)
    d = cmn(ii(a, b, c), d, a, w(7), 10, 1126891415)
    c = cmn(ii(d, a, b), c, d, w(14), 15, -1416354905)
    b = cmn(ii(c, d, a), b, c, w(5), 21, -57434055)
    a = cmn(ii(b, c, d), a, b, w(12), 6, 1700485571)
    d = cmn(ii(a, b, c), d, a, w(3), 10, -1894986606)
    c = cmn(ii(d, a, b), c, d, w(10), 15, -1051523)
    b = cmn(ii(c, d, a), b, c, w(1), 21, -2054922799)
    a = cmn(ii(b, c, d), a, b, w(8), 6, 1873313359)
    d = cmn(ii(a, b, c), d, a, w(15), 10, -30611744)
    c = cmn(ii(d, a, b), c, d, w(6), 15, -1560198380)
    b = cmn(ii(c, d, a), b, c, w(13), 21, 1309151649)
    a = cmn(ii(b, c, d), a, b, w(4), 6, -145523070)
    d = cmn(ii(a, b, c), d, a, w(11), 10, -1120210379)
    c = cmn(ii(d, a, b), c, d, w(2), 15, 718787259)
    b = cmn(ii(c, d, a), b, c, w(9), 21, -343485551)

    a = add(a, oa)
    b = add(b, ob)
    c = add(c, oc)
    d = add(d, od)
  }

  const out = new Uint8Array(16)
  const write = (val: number, offset: number) => {
    out[offset] = val & 0xff
    out[offset + 1] = (val >>> 8) & 0xff
    out[offset + 2] = (val >>> 16) & 0xff
    out[offset + 3] = (val >>> 24) & 0xff
  }
  write(a, 0)
  write(b, 4)
  write(c, 8)
  write(d, 12)
  let binary = ''
  out.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}
