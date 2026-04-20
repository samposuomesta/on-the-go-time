/**
 * RFC 8291 Web Push encryption + VAPID signing
 * Uses Web Crypto API (available in Deno/Edge Functions)
 */

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const raw = atob(base64 + pad);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

function lengthPrefixed(buffer: Uint8Array): Uint8Array {
  const len = new Uint8Array(2);
  len[0] = (buffer.length >> 8) & 0xff;
  len[1] = buffer.length & 0xff;
  return concat(len, buffer);
}

function getVapidSubject(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `mailto:admin@${url.host}`;
  } catch {
    return "mailto:admin@yourdomain.com";
  }
}

async function createVapidJwt(
  audience: string,
  privateKeyRaw: Uint8Array,
  publicKeyRaw: Uint8Array,
  subject: string,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  // Apple Push Service rejects exp > 24h and exp very close to 24h.
  // Keep it well under the limit (12h) for reliability.
  // sub MUST be a valid mailto: with a real domain — Apple validates this strictly.
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  // Import private key as JWK
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: uint8ArrayToBase64Url(privateKeyRaw),
      x: uint8ArrayToBase64Url(publicKeyRaw.slice(1, 33)),
      y: uint8ArrayToBase64Url(publicKeyRaw.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(unsigned),
  );

  // Convert DER to raw r||s
  const derSig = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (derSig[0] === 0x30) {
    const rLen = derSig[3];
    const rBytes = derSig.slice(4, 4 + rLen);
    const sLen = derSig[5 + rLen];
    const sBytes = derSig.slice(6 + rLen, 6 + rLen + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    if (r.length < 32) { const pad = new Uint8Array(32); pad.set(r, 32 - r.length); r = pad; }
    if (s.length < 32) { const pad = new Uint8Array(32); pad.set(s, 32 - s.length); s = pad; }
  } else {
    r = derSig.slice(0, 32);
    s = derSig.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsigned}.${uint8ArrayToBase64Url(rawSig)}`;
}

/**
 * Encrypt payload per RFC 8291 (aes128gcm)
 */
async function encryptPayload(
  payload: Uint8Array,
  subscriptionPublicKey: Uint8Array, // p256dh (65 bytes, uncompressed)
  subscriptionAuth: Uint8Array,       // auth secret (16 bytes)
): Promise<{ ciphertext: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey),
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(subscriptionPublicKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256,
    ),
  );

  const enc = new TextEncoder();

  // HKDF to derive auth_info -> PRK
  const authInfo = concat(
    enc.encode("WebPush: info\0"),
    subscriptionPublicKey,
    localPublicKeyRaw,
  );

  const prkKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(subscriptionAuth),
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  // Actually per RFC 8291: IKM = HKDF-Extract(auth, ecdh_secret), then expand
  // Step 1: Extract PRK from ECDH secret using auth as salt
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: toArrayBuffer(subscriptionAuth),
        info: toArrayBuffer(authInfo),
      },
      ikmKey,
      256,
    ),
  );

  // Derive content encryption key (CEK) and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prkForContent = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: enc.encode("Content-Encoding: aes128gcm\0"),
    },
    prkForContent,
    128,
  );

  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: enc.encode("Content-Encoding: nonce\0"),
    },
    prkForContent,
    96,
  );

  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Pad the plaintext: add delimiter byte 0x02 (final record)
  const paddedPayload = concat(payload, new Uint8Array([2]));

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits },
      cek,
      toArrayBuffer(paddedPayload),
    ),
  );

  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const rs = new Uint8Array(4);
  const recordSize = 4096;
  rs[0] = (recordSize >> 24) & 0xff;
  rs[1] = (recordSize >> 16) & 0xff;
  rs[2] = (recordSize >> 8) & 0xff;
  rs[3] = recordSize & 0xff;

  const idlen = new Uint8Array([localPublicKeyRaw.length]);

  const ciphertext = concat(salt, rs, idlen, localPublicKeyRaw, encrypted);

  return { ciphertext, localPublicKey: localPublicKeyRaw };
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendResult {
  expired: boolean;
  status?: number;
}

function createPushDeliveryError(status: number, body: string): Error {
  return new Error(`Push delivery failed with status ${status}${body ? `: ${body}` : ""}`);
}

export async function sendWebPush(
  subscription: PushSubscription,
  payloadString: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<SendResult> {
  const rawPublic = base64UrlToUint8Array(vapidPublicKey);
  const rawPrivate = base64UrlToUint8Array(vapidPrivateKey);

  const subscriberPublicKey = base64UrlToUint8Array(subscription.p256dh);
  const subscriberAuth = base64UrlToUint8Array(subscription.auth);

  // Encrypt payload
  const { ciphertext } = await encryptPayload(
    new TextEncoder().encode(payloadString),
    subscriberPublicKey,
    subscriberAuth,
  );

  // Create VAPID JWT
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const subject = getVapidSubject(subscription.endpoint);
  const jwt = await createVapidJwt(audience, rawPrivate, rawPublic, subject);

  const pushHost = new URL(subscription.endpoint).host;
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "60",
      Urgency: "high",
      Authorization: `vapid t=${jwt}, k=${uint8ArrayToBase64Url(rawPublic)}`,
    },
    body: ciphertext,
  });

  const responseBody = await response.text().catch(() => "");
  console.log(
    `[web-push] ${pushHost} → status=${response.status} body=${responseBody || "(empty)"}`,
  );

  if (!response.ok) {
    console.error(
      `[web-push] DELIVERY FAILED ${pushHost} status=${response.status}: ${responseBody}`,
    );
    if (response.status === 410 || response.status === 404) {
      return { expired: true };
    }

    throw createPushDeliveryError(response.status, responseBody);
  }

  return { expired: false, status: response.status };
}
