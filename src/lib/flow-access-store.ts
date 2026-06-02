import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const FLOW_ACCESS_COOKIE = 'flow_access';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type RegisteredFlowKey = {
  createdAt?: string;
  id: string;
  keyHash: string;
  label: string;
  source: 'env' | 'file';
};

export type FlowAccessToken = {
  exp: number;
  iat: number;
  keyId: string;
  label: string;
};

type StoredKeyFile = {
  keys?: Array<{
    createdAt?: string;
    id: string;
    keyHash: string;
    label: string;
  }>;
};

export function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export function hashKey(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function keyStorePath() {
  return (
    process.env.FLOW_ACCESS_KEY_STORE ||
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      '.flow-access',
      'registered-keys.json',
    )
  );
}

function envKeys(): RegisteredFlowKey[] {
  const rawKeys =
    process.env.FLOW_REGISTERED_KEYS || process.env.FLOW_ACCESS_KEYS || '';
  const entries = rawKeys
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  const configured = entries.map((entry, index) => {
    const [maybeLabel, ...rest] = entry.split(':');
    const value = rest.length ? rest.join(':') : maybeLabel;
    const label = rest.length ? maybeLabel.trim() : `Flow key ${index + 1}`;
    const normalized = normalizeKey(value);
    const keyHash = hashKey(normalized);

    return {
      id: keyHash.slice(0, 16),
      keyHash,
      label: label || `Flow key ${index + 1}`,
      source: 'env' as const,
    };
  });

  if (configured.length || process.env.NODE_ENV === 'production') {
    return configured;
  }

  const normalized = normalizeKey('FLOW-DEMO-2026');
  const keyHash = hashKey(normalized);

  return [
    {
      createdAt: new Date(0).toISOString(),
      id: keyHash.slice(0, 16),
      keyHash,
      label: 'Development Flow key',
      source: 'env',
    },
  ];
}

async function fileKeys(): Promise<RegisteredFlowKey[]> {
  try {
    const data = JSON.parse(
      await readFile(keyStorePath(), 'utf8'),
    ) as StoredKeyFile;

    return (data.keys || [])
      .filter(key => key.id && key.keyHash && key.label)
      .map(key => ({
        ...key,
        source: 'file' as const,
      }));
  } catch {
    return [];
  }
}

async function writeFileKeys(keys: RegisteredFlowKey[]) {
  const storePath = keyStorePath();
  const fileKeysOnly = keys
    .filter(key => key.source === 'file')
    .map(({ createdAt, id, keyHash, label }) => ({
      createdAt,
      id,
      keyHash,
      label,
    }));

  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(
    storePath,
    `${JSON.stringify({ keys: fileKeysOnly }, null, 2)}\n`,
    'utf8',
  );
}

export async function readRegisteredKeys() {
  return [...envKeys(), ...(await fileKeys())];
}

export async function findRegisteredKey(code: string) {
  const keyHash = hashKey(normalizeKey(code));
  const keys = await readRegisteredKeys();

  return (
    keys.find(key => safeEqual(key.keyHash, keyHash)) || null
  );
}

function registrationSecret() {
  return (
    process.env.FLOW_REGISTRATION_SECRET ||
    process.env.FLOW_ADMIN_REGISTRATION_KEY ||
    (process.env.NODE_ENV === 'production' ? '' : 'FLOW-REGISTER-2026')
  );
}

export function canRegisterWithSecret(secret: string) {
  const configuredSecret = registrationSecret();

  if (!configuredSecret) return false;
  return safeEqual(secret.trim(), configuredSecret.trim());
}

export async function registerFlowKey({
  accessKey,
  label,
  registrationCode,
}: {
  accessKey: string;
  label: string;
  registrationCode: string;
}) {
  const normalized = normalizeKey(accessKey);
  const cleanLabel = label.trim();

  if (!canRegisterWithSecret(registrationCode)) {
    throw new Error('The registration code is not valid.');
  }

  if (!cleanLabel) {
    throw new Error('Add an employee or workspace label for this key.');
  }

  if (normalized.length < 10) {
    throw new Error('Use an access key with at least 10 characters.');
  }

  const keyHash = hashKey(normalized);
  const existing = await findRegisteredKey(normalized);

  if (existing) {
    throw new Error('That Flow key is already registered.');
  }

  const keys = await readRegisteredKeys();
  const registeredKey: RegisteredFlowKey = {
    createdAt: new Date().toISOString(),
    id: keyHash.slice(0, 16),
    keyHash,
    label: cleanLabel,
    source: 'file',
  };

  await writeFileKeys([...keys, registeredKey]);

  return registeredKey;
}

function signingSecret() {
  return (
    process.env.FLOW_ACCESS_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'flow-local-development-secret'
  );
}

function sign(payload: string) {
  return createHmac('sha256', signingSecret())
    .update(payload)
    .digest('base64url');
}

export function createAccessToken(key: RegisteredFlowKey) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const token: FlowAccessToken = {
    exp: issuedAt + SESSION_TTL_SECONDS,
    iat: issuedAt,
    keyId: key.id,
    label: key.label,
  };
  const payload = Buffer.from(JSON.stringify(token)).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export async function verifyAccessToken(value: string | undefined) {
  if (!value) return null;

  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const token = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as FlowAccessToken;

    if (!token.keyId || token.exp < Math.floor(Date.now() / 1000)) return null;

    const keys = await readRegisteredKeys();
    if (!keys.some(key => key.id === token.keyId)) return null;

    return token;
  } catch {
    return null;
  }
}

export function sessionPayload(token: FlowAccessToken | null) {
  if (!token) return { granted: false };

  return {
    expiresAt: new Date(token.exp * 1000).toISOString(),
    granted: true,
    keyLabel: token.label,
  };
}
