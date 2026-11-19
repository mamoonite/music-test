/* The answer code, format 2 - read back by mixdesk/mxd/listening.py (decode); keep the two in step.
   Bits, most significant first: format 4 | build 16 | block-1 2 | background 2 | device 2 (3 = none) |
   order 18 x 5 | ratings 18 x 4 x 3 (1..5 kept as 0..4, 7 = none) | play seconds 18 x 6 (max 63) | minutes 7 (max 127),
   zero bits to the byte, CRC-16/CCITT-FALSE (2 bytes), base64url without "=". */
(function (root) {
  "use strict";
  var FORMAT = 2, N_CLIP = 18, N_Q = 4;

  function crc16(bytes) {
    var c = 0xFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c ^= bytes[i] << 8;
      for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
    return c;
  }

  function Bits() { this.bytes = []; this.acc = 0; this.n = 0; }
  Bits.prototype.put = function (v, width) {
    for (var i = width - 1; i >= 0; i--) {
      this.acc = (this.acc << 1) | ((v >> i) & 1);
      if (++this.n === 8) { this.bytes.push(this.acc); this.acc = 0; this.n = 0; }
    }
  };
  Bits.prototype.done = function () {
    if (this.n) { this.bytes.push((this.acc << (8 - this.n)) & 0xFF); this.acc = 0; this.n = 0; }
    return this.bytes;
  };

  function clamp(v, lo, hi) { v = Math.round(+v || 0); return v < lo ? lo : v > hi ? hi : v; }

  function b64url(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /* a = {build, block (1..4), background, device (0..2 or null), order [18], ratings [18][4] (1..5 or null),
          play [18] (seconds), minutes} */
  function encode(a) {
    var w = new Bits(), k, q;
    w.put(FORMAT, 4);
    w.put(a.build & 0xFFFF, 16);
    w.put(a.block - 1, 2);
    w.put(a.background == null ? 3 : a.background, 2);
    w.put(a.device == null ? 3 : a.device, 2);
    for (k = 0; k < N_CLIP; k++) w.put(a.order[k], 5);
    for (k = 0; k < N_CLIP; k++) for (q = 0; q < N_Q; q++) {
      var r = a.ratings[k][q];
      w.put(r == null ? 7 : r - 1, 3);
    }
    for (k = 0; k < N_CLIP; k++) w.put(clamp(a.play[k], 0, 63), 6);
    w.put(clamp(a.minutes, 0, 127), 7);
    var bytes = w.done(), c = crc16(bytes);
    bytes.push(c >> 8, c & 0xFF);
    return b64url(bytes);
  }

  root.LTCodec = { FORMAT: FORMAT, encode: encode, crc16: crc16 };
})(typeof window !== "undefined" ? window : this);
