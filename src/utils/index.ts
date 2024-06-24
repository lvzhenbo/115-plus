import md5 from 'crypto-js/md5';
import bigInt from 'big-integer';

export interface FileItem {
  name: string;
  isDir: boolean;
  code: string;
  cateId?: string;
  fileMode?: string;
}

const gKts = [
  240, 229, 105, 174, 191, 220, 191, 138, 26, 69, 232, 190, 125, 166, 115, 184, 222, 143, 231, 196,
  69, 218, 134, 196, 155, 100, 139, 20, 106, 180, 241, 170, 56, 1, 53, 158, 38, 105, 44, 134, 0,
  107, 79, 165, 54, 52, 98, 166, 42, 150, 104, 24, 242, 74, 253, 189, 107, 151, 143, 77, 143, 137,
  19, 183, 108, 142, 147, 237, 14, 13, 72, 62, 215, 47, 136, 216, 254, 254, 126, 134, 80, 149, 79,
  209, 235, 131, 38, 52, 219, 102, 123, 156, 126, 157, 122, 129, 50, 234, 182, 51, 222, 58, 169, 89,
  52, 102, 59, 170, 186, 129, 96, 72, 185, 213, 129, 156, 248, 108, 132, 119, 255, 84, 120, 38, 95,
  190, 232, 30, 54, 159, 52, 128, 92, 69, 44, 155, 118, 213, 27, 143, 204, 195, 184, 245,
];
const gKeyS = [0x29, 0x23, 0x21, 0x5e];
const gKeyL = [120, 6, 173, 76, 51, 134, 93, 24, 76, 1, 63, 70];

export const getDownLoadUrl = (file: FileItem) => {
  const time = Math.floor(new Date().getTime() / 1000);
  const { data, key } = m115Encode(
    JSON.stringify({
      pickcode: file.code,
    }),
    time,
  );
  const download = {
    name: '',
    url: '',
  };
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: `http://proapi.115.com/app/chrome/downurl?t=${time}`,
      data: `data=${encodeURIComponent(data)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      onload: (response) => {
        const json = JSON.parse(response.responseText);
        if (!json.state) {
          reject(json.msg);
        } else {
          const data = Object.values(JSON.parse(m115Decode(json.data, key)))[0] as {
            file_name: string;
            url: {
              url: string;
            };
          };
          download.name = data.file_name;
          download.url = data.url.url;
          resolve(download);
        }
      },
      onerror: (error) => {
        reject(error);
      },
    });
  });
};

const m115Encode = (code: string, time: number) => {
  const key = stringToBytes(md5(`!@###@#${time}DFDR@#@#`).toString());
  const bytes = stringToBytes(code);
  const tmp1 = m115SymEncode(bytes, bytes.length, key);
  const tmp2 = key.slice(0, 16).concat(tmp1);
  return {
    data: m115AsymEncode(tmp2, tmp2.length),
    key,
  };
};

const m115Decode = function (src: string, key: number[]) {
  const bytes = stringToBytes(window.atob(src));
  const tmp = m115AsymDecode(bytes, bytes.length);
  return bytesToString(m115SymDecode(tmp.slice(16), tmp.length - 16, key, tmp.slice(0, 16)));
};

const stringToBytes = (str: string) => {
  const arr = [];
  const strLength = str.length;
  for (let i = 0; i < strLength; i++) {
    arr.push(str.charCodeAt(i));
  }
  return arr;
};

const m115SymEncode = (src: number[], srclen: number, key1: number[]) => {
  let ret;
  const k1 = m115Getkey(4, key1);
  const k2 = m115Getkey(12, null);
  ret = xor115Enc(src, srclen, k1, 4);
  ret.reverse();
  ret = xor115Enc(ret, srclen, k2, 12);
  return ret;
};

const m115SymDecode = (src: number[], srclen: number, key1: number[], key2: number[]) => {
  const k1 = m115Getkey(4, key1);
  const k2 = m115Getkey(12, key2);
  let ret = xor115Enc(src, srclen, k2, 12);
  ret.reverse();
  ret = xor115Enc(ret, srclen, k1, 4);
  return ret;
};

const m115Getkey = (length: number, key: number[] | null) => {
  if (key != null) {
    const results = [];
    for (let i = 0; i < length; i++) {
      results.push(((key[i] + gKts[length * i]) & 0xff) ^ gKts[length * (length - 1 - i)]);
    }
    return results;
  }
  if (length === 12) {
    return gKeyL.slice(0);
  }
  return gKeyS.slice(0);
};

const xor115Enc = (src: number[], srclen: number, key: number[], keylen: number) => {
  const mod4 = srclen % 4;
  const ret = [];
  if (mod4 !== 0) {
    for (let i = 0, j = 0; 0 <= mod4 ? j < mod4 : j > mod4; i = 0 <= mod4 ? ++j : --j) {
      ret.push(src[i] ^ key[i % keylen]);
    }
  }
  for (
    let i = mod4, k = mod4;
    mod4 <= srclen ? k < srclen : k > srclen;
    i = mod4 <= srclen ? ++k : --k
  ) {
    ret.push(src[i] ^ key[(i - mod4) % keylen]);
  }
  return ret;
};

const m115AsymEncode = (src: number[], srclen: number) => {
  const m = 128 - 11;
  let ret = '';
  const ref = Math.floor((srclen + m - 1) / m);
  for (let i = 0, j = 0; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    ret += RSA().encrypt(bytesToString(src.slice(i * m, Math.min((i + 1) * m, srclen))));
  }
  return window.btoa(RSA().hex2a(ret));
};

const m115AsymDecode = function (src: number[], srclen: number) {
  const m = 128;
  let ret = '';
  const ref = Math.floor((srclen + m - 1) / m);
  for (let i = 0, j = 0; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    ret += RSA().decrypt(bytesToString(src.slice(i * m, Math.min((i + 1) * m, srclen))));
  }
  return stringToBytes(ret);
};

const bytesToString = (b: number[]) => {
  let ret = '';
  for (let j = 0; j < b.length; j++) {
    ret += String.fromCharCode(b[j]);
  }
  return ret;
};

const RSA = () => {
  const n = bigInt(
    '8686980c0f5a24c4b9d43020cd2c22703ff3f450756529058b1cf88f09b8602136477198a6e2683149659bd122c33592fdb5ad47944ad1ea4d36c6b172aad6338c3bb6ac6227502d010993ac967d1aef00f0c8e038de2e4d3bc2ec368af2e9f10a6f1eda4f7262f136420c07c331b871bf139f74f3010e3c4fe57df3afb71683',
    16,
  );
  const e = bigInt('10001', 16);

  const pkcs1pad2 = (s: string, n: number) => {
    if (n < s.length + 11) {
      return null;
    }
    const ba = [];
    let i = s.length - 1;
    while (i >= 0 && n > 0) {
      ba[--n] = s.charCodeAt(i--);
    }
    ba[--n] = 0;
    while (n > 2) {
      ba[--n] = 0xff;
    }
    ba[--n] = 2;
    ba[--n] = 0;
    const c = a2hex(ba);
    return bigInt(c, 16);
  };

  const pkcs1unpad2 = (a: bigInt.BigInteger) => {
    let b = a.toString(16);
    if (b.length % 2 !== 0) {
      b = '0' + b;
    }
    const c = hex2a(b);
    let i = 1;
    while (c.charCodeAt(i) !== 0) {
      i++;
    }
    return c.slice(i + 1);
  };

  const a2hex = (byteArray: number[]) => {
    let hexString = '';
    for (let i = 0; i < byteArray.length; i++) {
      let nextHexByte = byteArray[i].toString(16);
      if (nextHexByte.length < 2) {
        nextHexByte = '0' + nextHexByte;
      }
      hexString += nextHexByte;
    }
    return hexString;
  };

  const hex2a = (hex: string) => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  };

  const encrypt = (text: string) => {
    const m = pkcs1pad2(text, 0x80);
    if (m === null) {
      return null;
    }
    let h = m.modPow(e, n).toString(16);
    while (h.length < 0x80 * 2) {
      h = '0' + h;
    }
    return h;
  };

  const decrypt = (text: string) => {
    const ba = [];
    let i = 0;
    while (i < text.length) {
      ba[i] = text.charCodeAt(i);
      i += 1;
    }
    const c = bigInt(a2hex(ba), 16).modPow(e, n);
    const d = pkcs1unpad2(c);
    return d;
  };

  return {
    encrypt,
    decrypt,
    hex2a,
  };
};
