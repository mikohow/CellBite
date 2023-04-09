!function t(r,e,n){function i(u,f){if(!e[u]){if(!r[u]){var s="function"==typeof require&&require;if(!f&&s)return s(u,!0);if(o)return o(u,!0);var h=new Error("Cannot find module '"+u+"'");throw h.code="MODULE_NOT_FOUND",h}var a=e[u]={exports:{}};r[u][0].call(a.exports,function(t){var e=r[u][1][t];return i(e||t)},a,a.exports,t,r,e,n)}return e[u].exports}for(var o="function"==typeof require&&require,u=0;u<n.length;u++)i(n[u]);return i}({1:[function(t,r,e){"use strict";function n(t){var r=t.length;if(r%4>0)throw new Error("Invalid string. Length must be a multiple of 4");return"="===t[r-2]?2:"="===t[r-1]?1:0}function i(t){return 3*t.length/4-n(t)}function o(t){var r,e,i,o,u,f,s=t.length;u=n(t),f=new c(3*s/4-u),i=u>0?s-4:s;var h=0;for(r=0,e=0;r<i;r+=4,e+=3)o=a[t.charCodeAt(r)]<<18|a[t.charCodeAt(r+1)]<<12|a[t.charCodeAt(r+2)]<<6|a[t.charCodeAt(r+3)],f[h++]=o>>16&255,f[h++]=o>>8&255,f[h++]=255&o;return 2===u?(o=a[t.charCodeAt(r)]<<2|a[t.charCodeAt(r+1)]>>4,f[h++]=255&o):1===u&&(o=a[t.charCodeAt(r)]<<10|a[t.charCodeAt(r+1)]<<4|a[t.charCodeAt(r+2)]>>2,f[h++]=o>>8&255,f[h++]=255&o),f}function u(t){return h[t>>18&63]+h[t>>12&63]+h[t>>6&63]+h[63&t]}function f(t,r,e){for(var n,i=[],o=r;o<e;o+=3)n=(t[o]<<16)+(t[o+1]<<8)+t[o+2],i.push(u(n));return i.join("")}function s(t){for(var r,e=t.length,n=e%3,i="",o=[],u=0,s=e-n;u<s;u+=16383)o.push(f(t,u,u+16383>s?s:u+16383));return 1===n?(r=t[e-1],i+=h[r>>2],i+=h[r<<4&63],i+="=="):2===n&&(r=(t[e-2]<<8)+t[e-1],i+=h[r>>10],i+=h[r>>4&63],i+=h[r<<2&63],i+="="),o.push(i),o.join("")}e.byteLength=i,e.toByteArray=o,e.fromByteArray=s;for(var h=[],a=[],c="undefined"!=typeof Uint8Array?Uint8Array:Array,p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",l=0,g=p.length;l<g;++l)h[l]=p[l],a[p.charCodeAt(l)]=l;a["-".charCodeAt(0)]=62,a["_".charCodeAt(0)]=63},{}],2:[function(t,r,e){"use strict";function n(t){if(t>H)throw new RangeError("Invalid typed array length");var r=new Uint8Array(t);return r.__proto__=i.prototype,r}function i(t,r,e){if("number"==typeof t){if("string"==typeof r)throw new Error("If encoding is specified then the first argument must be a string");return s(t)}return o(t,r,e)}function o(t,r,e){if("number"==typeof t)throw new TypeError('"value" argument must not be a number');return t instanceof ArrayBuffer?c(t,r,e):"string"==typeof t?h(t,r):p(t)}function u(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function f(t,r,e){return u(t),t<=0?n(t):void 0!==r?"string"==typeof e?n(t).fill(r,e):n(t).fill(r):n(t)}function s(t){return u(t),n(t<0?0:0|l(t))}function h(t,r){if("string"==typeof r&&""!==r||(r="utf8"),!i.isEncoding(r))throw new TypeError('"encoding" must be a valid string encoding');var e=0|y(t,r),o=n(e),u=o.write(t,r);return u!==e&&(o=o.slice(0,u)),o}function a(t){for(var r=t.length<0?0:0|l(t.length),e=n(r),i=0;i<r;i+=1)e[i]=255&t[i];return e}function c(t,r,e){if(r<0||t.byteLength<r)throw new RangeError("'offset' is out of bounds");if(t.byteLength<r+(e||0))throw new RangeError("'length' is out of bounds");var n;return n=void 0===r&&void 0===e?new Uint8Array(t):void 0===e?new Uint8Array(t,r):new Uint8Array(t,r,e),n.__proto__=i.prototype,n}function p(t){if(i.isBuffer(t)){var r=0|l(t.length),e=n(r);return 0===e.length?e:(t.copy(e,0,0,r),e)}if(t){if(X(t)||"length"in t)return"number"!=typeof t.length||J(t.length)?n(0):a(t);if("Buffer"===t.type&&Array.isArray(t.data))return a(t.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}function l(t){if(t>=H)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+H.toString(16)+" bytes");return 0|t}function g(t){return+t!=t&&(t=0),i.alloc(+t)}function y(t,r){if(i.isBuffer(t))return t.length;if(X(t)||t instanceof ArrayBuffer)return t.byteLength;"string"!=typeof t&&(t=""+t);var e=t.length;if(0===e)return 0;for(var n=!1;;)switch(r){case"ascii":case"latin1":case"binary":return e;case"utf8":case"utf-8":case void 0:return F(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*e;case"hex":return e>>>1;case"base64":return Y(t).length;default:if(n)return F(t).length;r=(""+r).toLowerCase(),n=!0}}function w(t,r,e){var n=!1;if((void 0===r||r<0)&&(r=0),r>this.length)return"";if((void 0===e||e>this.length)&&(e=this.length),e<=0)return"";if(e>>>=0,r>>>=0,e<=r)return"";for(t||(t="utf8");;)switch(t){case"hex":return T(this,r,e);case"utf8":case"utf-8":return C(this,r,e);case"ascii":return S(this,r,e);case"latin1":case"binary":return M(this,r,e);case"base64":return U(this,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return x(this,r,e);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}function d(t,r,e){var n=t[r];t[r]=t[e],t[e]=n}function v(t,r,e,n,o){if(0===t.length)return-1;if("string"==typeof e?(n=e,e=0):e>2147483647?e=2147483647:e<-2147483648&&(e=-2147483648),e=+e,J(e)&&(e=o?0:t.length-1),e<0&&(e=t.length+e),e>=t.length){if(o)return-1;e=t.length-1}else if(e<0){if(!o)return-1;e=0}if("string"==typeof r&&(r=i.from(r,n)),i.isBuffer(r))return 0===r.length?-1:b(t,r,e,n,o);if("number"==typeof r)return r&=255,"function"==typeof Uint8Array.prototype.indexOf?o?Uint8Array.prototype.indexOf.call(t,r,e):Uint8Array.prototype.lastIndexOf.call(t,r,e):b(t,[r],e,n,o);throw new TypeError("val must be string, number or Buffer")}function b(t,r,e,n,i){function o(t,r){return 1===u?t[r]:t.readUInt16BE(r*u)}var u=1,f=t.length,s=r.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||r.length<2)return-1;u=2,f/=2,s/=2,e/=2}var h;if(i){var a=-1;for(h=e;h<f;h++)if(o(t,h)===o(r,-1===a?0:h-a)){if(-1===a&&(a=h),h-a+1===s)return a*u}else-1!==a&&(h-=h-a),a=-1}else for(e+s>f&&(e=f-s),h=e;h>=0;h--){for(var c=!0,p=0;p<s;p++)if(o(t,h+p)!==o(r,p)){c=!1;break}if(c)return h}return-1}function E(t,r,e,n){e=Number(e)||0;var i=t.length-e;n?(n=Number(n))>i&&(n=i):n=i;var o=r.length;if(o%2!=0)throw new TypeError("Invalid hex string");n>o/2&&(n=o/2);for(var u=0;u<n;++u){var f=parseInt(r.substr(2*u,2),16);if(J(f))return u;t[e+u]=f}return u}function m(t,r,e,n){return V(F(r,t.length-e),t,e,n)}function A(t,r,e,n){return V(j(r),t,e,n)}function B(t,r,e,n){return A(t,r,e,n)}function I(t,r,e,n){return V(Y(r),t,e,n)}function _(t,r,e,n){return V(q(r,t.length-e),t,e,n)}function U(t,r,e){return 0===r&&e===t.length?Z.fromByteArray(t):Z.fromByteArray(t.slice(r,e))}function C(t,r,e){e=Math.min(t.length,e);for(var n=[],i=r;i<e;){var o=t[i],u=null,f=o>239?4:o>223?3:o>191?2:1;if(i+f<=e){var s,h,a,c;switch(f){case 1:o<128&&(u=o);break;case 2:128==(192&(s=t[i+1]))&&(c=(31&o)<<6|63&s)>127&&(u=c);break;case 3:s=t[i+1],h=t[i+2],128==(192&s)&&128==(192&h)&&(c=(15&o)<<12|(63&s)<<6|63&h)>2047&&(c<55296||c>57343)&&(u=c);break;case 4:s=t[i+1],h=t[i+2],a=t[i+3],128==(192&s)&&128==(192&h)&&128==(192&a)&&(c=(15&o)<<18|(63&s)<<12|(63&h)<<6|63&a)>65535&&c<1114112&&(u=c)}}null===u?(u=65533,f=1):u>65535&&(u-=65536,n.push(u>>>10&1023|55296),u=56320|1023&u),n.push(u),i+=f}return L(n)}function L(t){var r=t.length;if(r<=K)return String.fromCharCode.apply(String,t);for(var e="",n=0;n<r;)e+=String.fromCharCode.apply(String,t.slice(n,n+=K));return e}function S(t,r,e){var n="";e=Math.min(t.length,e);for(var i=r;i<e;++i)n+=String.fromCharCode(127&t[i]);return n}function M(t,r,e){var n="";e=Math.min(t.length,e);for(var i=r;i<e;++i)n+=String.fromCharCode(t[i]);return n}function T(t,r,e){var n=t.length;(!r||r<0)&&(r=0),(!e||e<0||e>n)&&(e=n);for(var i="",o=r;o<e;++o)i+=D(t[o]);return i}function x(t,r,e){for(var n=t.slice(r,e),i="",o=0;o<n.length;o+=2)i+=String.fromCharCode(n[o]+256*n[o+1]);return i}function R(t,r,e){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+r>e)throw new RangeError("Trying to access beyond buffer length")}function k(t,r,e,n,o,u){if(!i.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(r>o||r<u)throw new RangeError('"value" argument is out of bounds');if(e+n>t.length)throw new RangeError("Index out of range")}function N(t,r,e,n,i,o){if(e+n>t.length)throw new RangeError("Index out of range");if(e<0)throw new RangeError("Index out of range")}function O(t,r,e,n,i){return r=+r,e>>>=0,i||N(t,r,e,4,3.4028234663852886e38,-3.4028234663852886e38),G.write(t,r,e,n,23,4),e+4}function P(t,r,e,n,i){return r=+r,e>>>=0,i||N(t,r,e,8,1.7976931348623157e308,-1.7976931348623157e308),G.write(t,r,e,n,52,8),e+8}function z(t){if((t=t.trim().replace(Q,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}function D(t){return t<16?"0"+t.toString(16):t.toString(16)}function F(t,r){r=r||1/0;for(var e,n=t.length,i=null,o=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!i){if(e>56319){(r-=3)>-1&&o.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&o.push(239,191,189);continue}i=e;continue}if(e<56320){(r-=3)>-1&&o.push(239,191,189),i=e;continue}e=65536+(i-55296<<10|e-56320)}else i&&(r-=3)>-1&&o.push(239,191,189);if(i=null,e<128){if((r-=1)<0)break;o.push(e)}else if(e<2048){if((r-=2)<0)break;o.push(e>>6|192,63&e|128)}else if(e<65536){if((r-=3)<0)break;o.push(e>>12|224,e>>6&63|128,63&e|128)}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;o.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128)}}return o}function j(t){for(var r=[],e=0;e<t.length;++e)r.push(255&t.charCodeAt(e));return r}function q(t,r){for(var e,n,i,o=[],u=0;u<t.length&&!((r-=2)<0);++u)n=(e=t.charCodeAt(u))>>8,i=e%256,o.push(i),o.push(n);return o}function Y(t){return Z.toByteArray(z(t))}function V(t,r,e,n){for(var i=0;i<n&&!(i+e>=r.length||i>=t.length);++i)r[i+e]=t[i];return i}function X(t){return"function"==typeof ArrayBuffer.isView&&ArrayBuffer.isView(t)}function J(t){return t!==t}var Z=t("base64-js"),G=t("ieee754");e.Buffer=i,e.SlowBuffer=g,e.INSPECT_MAX_BYTES=50;var H=2147483647;e.kMaxLength=H,i.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()}catch(t){return!1}}(),i.TYPED_ARRAY_SUPPORT||"undefined"==typeof console||"function"!=typeof console.error||console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),"undefined"!=typeof Symbol&&Symbol.species&&i[Symbol.species]===i&&Object.defineProperty(i,Symbol.species,{value:null,configurable:!0,enumerable:!1,writable:!1}),i.poolSize=8192,i.from=function(t,r,e){return o(t,r,e)},i.prototype.__proto__=Uint8Array.prototype,i.__proto__=Uint8Array,i.alloc=function(t,r,e){return f(t,r,e)},i.allocUnsafe=function(t){return s(t)},i.allocUnsafeSlow=function(t){return s(t)},i.isBuffer=function(t){return null!=t&&!0===t._isBuffer},i.compare=function(t,r){if(!i.isBuffer(t)||!i.isBuffer(r))throw new TypeError("Arguments must be Buffers");if(t===r)return 0;for(var e=t.length,n=r.length,o=0,u=Math.min(e,n);o<u;++o)if(t[o]!==r[o]){e=t[o],n=r[o];break}return e<n?-1:n<e?1:0},i.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},i.concat=function(t,r){if(!Array.isArray(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return i.alloc(0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var n=i.allocUnsafe(r),o=0;for(e=0;e<t.length;++e){var u=t[e];if(!i.isBuffer(u))throw new TypeError('"list" argument must be an Array of Buffers');u.copy(n,o),o+=u.length}return n},i.byteLength=y,i.prototype._isBuffer=!0,i.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var r=0;r<t;r+=2)d(this,r,r+1);return this},i.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var r=0;r<t;r+=4)d(this,r,r+3),d(this,r+1,r+2);return this},i.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var r=0;r<t;r+=8)d(this,r,r+7),d(this,r+1,r+6),d(this,r+2,r+5),d(this,r+3,r+4);return this},i.prototype.toString=function(){var t=this.length;return 0===t?"":0===arguments.length?C(this,0,t):w.apply(this,arguments)},i.prototype.equals=function(t){if(!i.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===i.compare(this,t)},i.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},i.prototype.compare=function(t,r,e,n,o){if(!i.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===r&&(r=0),void 0===e&&(e=t?t.length:0),void 0===n&&(n=0),void 0===o&&(o=this.length),r<0||e>t.length||n<0||o>this.length)throw new RangeError("out of range index");if(n>=o&&r>=e)return 0;if(n>=o)return-1;if(r>=e)return 1;if(r>>>=0,e>>>=0,n>>>=0,o>>>=0,this===t)return 0;for(var u=o-n,f=e-r,s=Math.min(u,f),h=this.slice(n,o),a=t.slice(r,e),c=0;c<s;++c)if(h[c]!==a[c]){u=h[c],f=a[c];break}return u<f?-1:f<u?1:0},i.prototype.includes=function(t,r,e){return-1!==this.indexOf(t,r,e)},i.prototype.indexOf=function(t,r,e){return v(this,t,r,e,!0)},i.prototype.lastIndexOf=function(t,r,e){return v(this,t,r,e,!1)},i.prototype.write=function(t,r,e,n){if(void 0===r)n="utf8",e=this.length,r=0;else if(void 0===e&&"string"==typeof r)n=r,e=this.length,r=0;else{if(!isFinite(r))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");r>>>=0,isFinite(e)?(e>>>=0,void 0===n&&(n="utf8")):(n=e,e=void 0)}var i=this.length-r;if((void 0===e||e>i)&&(e=i),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var o=!1;;)switch(n){case"hex":return E(this,t,r,e);case"utf8":case"utf-8":return m(this,t,r,e);case"ascii":return A(this,t,r,e);case"latin1":case"binary":return B(this,t,r,e);case"base64":return I(this,t,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return _(this,t,r,e);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}},i.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var K=4096;i.prototype.slice=function(t,r){var e=this.length;t=~~t,r=void 0===r?e:~~r,t<0?(t+=e)<0&&(t=0):t>e&&(t=e),r<0?(r+=e)<0&&(r=0):r>e&&(r=e),r<t&&(r=t);var n=this.subarray(t,r);return n.__proto__=i.prototype,n},i.prototype.readUIntLE=function(t,r,e){t>>>=0,r>>>=0,e||R(t,r,this.length);for(var n=this[t],i=1,o=0;++o<r&&(i*=256);)n+=this[t+o]*i;return n},i.prototype.readUIntBE=function(t,r,e){t>>>=0,r>>>=0,e||R(t,r,this.length);for(var n=this[t+--r],i=1;r>0&&(i*=256);)n+=this[t+--r]*i;return n},i.prototype.readUInt8=function(t,r){return t>>>=0,r||R(t,1,this.length),this[t]},i.prototype.readUInt16LE=function(t,r){return t>>>=0,r||R(t,2,this.length),this[t]|this[t+1]<<8},i.prototype.readUInt16BE=function(t,r){return t>>>=0,r||R(t,2,this.length),this[t]<<8|this[t+1]},i.prototype.readUInt32LE=function(t,r){return t>>>=0,r||R(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},i.prototype.readUInt32BE=function(t,r){return t>>>=0,r||R(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},i.prototype.readIntLE=function(t,r,e){t>>>=0,r>>>=0,e||R(t,r,this.length);for(var n=this[t],i=1,o=0;++o<r&&(i*=256);)n+=this[t+o]*i;return i*=128,n>=i&&(n-=Math.pow(2,8*r)),n},i.prototype.readIntBE=function(t,r,e){t>>>=0,r>>>=0,e||R(t,r,this.length);for(var n=r,i=1,o=this[t+--n];n>0&&(i*=256);)o+=this[t+--n]*i;return i*=128,o>=i&&(o-=Math.pow(2,8*r)),o},i.prototype.readInt8=function(t,r){return t>>>=0,r||R(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},i.prototype.readInt16LE=function(t,r){t>>>=0,r||R(t,2,this.length);var e=this[t]|this[t+1]<<8;return 32768&e?4294901760|e:e},i.prototype.readInt16BE=function(t,r){t>>>=0,r||R(t,2,this.length);var e=this[t+1]|this[t]<<8;return 32768&e?4294901760|e:e},i.prototype.readInt32LE=function(t,r){return t>>>=0,r||R(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},i.prototype.readInt32BE=function(t,r){return t>>>=0,r||R(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},i.prototype.readFloatLE=function(t,r){return t>>>=0,r||R(t,4,this.length),G.read(this,t,!0,23,4)},i.prototype.readFloatBE=function(t,r){return t>>>=0,r||R(t,4,this.length),G.read(this,t,!1,23,4)},i.prototype.readDoubleLE=function(t,r){return t>>>=0,r||R(t,8,this.length),G.read(this,t,!0,52,8)},i.prototype.readDoubleBE=function(t,r){return t>>>=0,r||R(t,8,this.length),G.read(this,t,!1,52,8)},i.prototype.writeUIntLE=function(t,r,e,n){t=+t,r>>>=0,e>>>=0,n||k(this,t,r,e,Math.pow(2,8*e)-1,0);var i=1,o=0;for(this[r]=255&t;++o<e&&(i*=256);)this[r+o]=t/i&255;return r+e},i.prototype.writeUIntBE=function(t,r,e,n){t=+t,r>>>=0,e>>>=0,n||k(this,t,r,e,Math.pow(2,8*e)-1,0);var i=e-1,o=1;for(this[r+i]=255&t;--i>=0&&(o*=256);)this[r+i]=t/o&255;return r+e},i.prototype.writeUInt8=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,1,255,0),this[r]=255&t,r+1},i.prototype.writeUInt16LE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,2,65535,0),this[r]=255&t,this[r+1]=t>>>8,r+2},i.prototype.writeUInt16BE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,2,65535,0),this[r]=t>>>8,this[r+1]=255&t,r+2},i.prototype.writeUInt32LE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,4,4294967295,0),this[r+3]=t>>>24,this[r+2]=t>>>16,this[r+1]=t>>>8,this[r]=255&t,r+4},i.prototype.writeUInt32BE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,4,4294967295,0),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},i.prototype.writeIntLE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var i=Math.pow(2,8*e-1);k(this,t,r,e,i-1,-i)}var o=0,u=1,f=0;for(this[r]=255&t;++o<e&&(u*=256);)t<0&&0===f&&0!==this[r+o-1]&&(f=1),this[r+o]=(t/u>>0)-f&255;return r+e},i.prototype.writeIntBE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var i=Math.pow(2,8*e-1);k(this,t,r,e,i-1,-i)}var o=e-1,u=1,f=0;for(this[r+o]=255&t;--o>=0&&(u*=256);)t<0&&0===f&&0!==this[r+o+1]&&(f=1),this[r+o]=(t/u>>0)-f&255;return r+e},i.prototype.writeInt8=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,1,127,-128),t<0&&(t=255+t+1),this[r]=255&t,r+1},i.prototype.writeInt16LE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,2,32767,-32768),this[r]=255&t,this[r+1]=t>>>8,r+2},i.prototype.writeInt16BE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,2,32767,-32768),this[r]=t>>>8,this[r+1]=255&t,r+2},i.prototype.writeInt32LE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,4,2147483647,-2147483648),this[r]=255&t,this[r+1]=t>>>8,this[r+2]=t>>>16,this[r+3]=t>>>24,r+4},i.prototype.writeInt32BE=function(t,r,e){return t=+t,r>>>=0,e||k(this,t,r,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},i.prototype.writeFloatLE=function(t,r,e){return O(this,t,r,!0,e)},i.prototype.writeFloatBE=function(t,r,e){return O(this,t,r,!1,e)},i.prototype.writeDoubleLE=function(t,r,e){return P(this,t,r,!0,e)},i.prototype.writeDoubleBE=function(t,r,e){return P(this,t,r,!1,e)},i.prototype.copy=function(t,r,e,n){if(e||(e=0),n||0===n||(n=this.length),r>=t.length&&(r=t.length),r||(r=0),n>0&&n<e&&(n=e),n===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-r<n-e&&(n=t.length-r+e);var i,o=n-e;if(this===t&&e<r&&r<n)for(i=o-1;i>=0;--i)t[i+r]=this[i+e];else if(o<1e3)for(i=0;i<o;++i)t[i+r]=this[i+e];else Uint8Array.prototype.set.call(t,this.subarray(e,e+o),r);return o},i.prototype.fill=function(t,r,e,n){if("string"==typeof t){if("string"==typeof r?(n=r,r=0,e=this.length):"string"==typeof e&&(n=e,e=this.length),1===t.length){var o=t.charCodeAt(0);o<256&&(t=o)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!i.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0);var u;if("number"==typeof t)for(u=r;u<e;++u)this[u]=t;else{var f=i.isBuffer(t)?t:new i(t,n),s=f.length;for(u=0;u<e-r;++u)this[u+r]=f[u%s]}return this};var Q=/[^+/0-9A-Za-z-_]/g},{"base64-js":1,ieee754:3}],3:[function(t,r,e){e.read=function(t,r,e,n,i){var o,u,f=8*i-n-1,s=(1<<f)-1,h=s>>1,a=-7,c=e?i-1:0,p=e?-1:1,l=t[r+c];for(c+=p,o=l&(1<<-a)-1,l>>=-a,a+=f;a>0;o=256*o+t[r+c],c+=p,a-=8);for(u=o&(1<<-a)-1,o>>=-a,a+=n;a>0;u=256*u+t[r+c],c+=p,a-=8);if(0===o)o=1-h;else{if(o===s)return u?NaN:1/0*(l?-1:1);u+=Math.pow(2,n),o-=h}return(l?-1:1)*u*Math.pow(2,o-n)},e.write=function(t,r,e,n,i,o){var u,f,s,h=8*o-i-1,a=(1<<h)-1,c=a>>1,p=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,l=n?0:o-1,g=n?1:-1,y=r<0||0===r&&1/r<0?1:0;for(r=Math.abs(r),isNaN(r)||r===1/0?(f=isNaN(r)?1:0,u=a):(u=Math.floor(Math.log(r)/Math.LN2),r*(s=Math.pow(2,-u))<1&&(u--,s*=2),(r+=u+c>=1?p/s:p*Math.pow(2,1-c))*s>=2&&(u++,s/=2),u+c>=a?(f=0,u=a):u+c>=1?(f=(r*s-1)*Math.pow(2,i),u+=c):(f=r*Math.pow(2,c-1)*Math.pow(2,i),u=0));i>=8;t[e+l]=255&f,l+=g,f/=256,i-=8);for(u=u<<i|f,h+=i;h>0;t[e+l]=255&u,l+=g,u/=256,h-=8);t[e+l-g]|=128*y}},{}],4:[function(t,r,e){Buffer=t("buffer").Buffer},{buffer:2}]},{},[4]);
class Reader {
  constructor(buffer) {
    this.buffer = Buffer.from(buffer);
    this.offset = 0;
    this.output = "";
  }

  skipByte() {
    this.offset += 1;
  }

  skipBytes(offset) {
    this.offset += offset;
  }

  readInt8() {
    const val = this.buffer.readInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUInt8() {
    const val = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt16() {
    const val = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readUInt16() {
    const val = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readInt32() {
    const val = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readUInt32() {
    const val = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readFloat() {
    const val = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return val;
  }

  readDouble() {
    const val = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return val;
  }

  readZeroUTF8String() {
    let output = "";
    while (true) {
      const char = this.readUInt8();
      if (char === 0) break;
      output += String.fromCharCode(char);
    }
    return output;
  }

  readZeroUTF16String() {
    let output = "";
    while (true) {
      const char = this.readUInt16();
      if (char === 0) break;
      output += String.fromCharCode(char);
    }
    return output;
  }

  getBuffer() {
    return this.buffer;
  }
}

class Writer {
  constructor() {
    this.buffer = Buffer.allocUnsafe(255);
    this.offset = 0;
  }

  writeInt8(value) {
    this.buffer.writeInt8(value, this.offset);
    this.offset += 1;
  }

  writeUInt8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  writeInt16(value) {
    this.buffer.writeInt16LE(value, this.offset);
    this.offset += 2;
  }

  writeUInt16(value) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  writeInt32(value) {
    this.buffer.writeInt32LE(value, this.offset);
    this.offset += 4;
  }

  writeUInt32(value) {
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += 4;
  }

  writeDouble(value) {
    this.buffer.writeDoubleLE(value, this.offset);
    this.offset += 8;
  }

  writeZeroUTF8String(string) {
    this.buffer.write(string, this.offset, "utf-8");
    this.offset += string.length;
    this.buffer.writeUInt8(0, this.offset);
    this.offset += 1;
  }

  writeZeroUTF16String(string) {
    this.buffer.write(string, this.offset, "ucs2");
    this.offset += string.length * 2;
    this.buffer.writeUInt16LE(0, this.offset);
    this.offset += 2;
  }

  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }
}
