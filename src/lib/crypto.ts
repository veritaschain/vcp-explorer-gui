// VCP Cryptographic Verification Utilities
// SHA-256 + Merkle Proof Verification (RFC 6962 compliant)

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash using Web Crypto API
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * SHA-256 hash of hex string, returns hex string
 */
export async function sha256Hex(hexData: string): Promise<string> {
  const bytes = hexToBytes(hexData);
  const hash = await sha256(bytes);
  return bytesToHex(hash);
}

/**
 * Concatenate two Uint8Arrays
 */
function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

/**
 * RFC 6962 Merkle Tree Leaf Hash
 * LeafHash = SHA-256(0x00 || data)
 */
export async function merkleLeafHash(data: Uint8Array): Promise<Uint8Array> {
  const prefix = new Uint8Array([0x00]);
  return sha256(concatBytes(prefix, data));
}

/**
 * RFC 6962 Merkle Tree Internal Node Hash
 * NodeHash = SHA-256(0x01 || left || right)
 */
export async function merkleNodeHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  const prefix = new Uint8Array([0x01]);
  const combined = concatBytes(prefix, concatBytes(left, right));
  return sha256(combined);
}

/**
 * Verify Merkle inclusion proof (RFC 6962)
 * 
 * @param eventHash - The hash of the event (leaf data)
 * @param leafIndex - The index of the leaf in the tree
 * @param auditPath - Array of sibling hashes along the path to root
 * @param expectedRoot - The expected Merkle root hash
 * @returns true if verification succeeds
 */
export async function verifyMerkleProof(
  eventHash: string,
  leafIndex: number,
  auditPath: string[],
  expectedRoot: string
): Promise<VerificationResult> {
  const steps: VerificationStep[] = [];
  
  try {
    // Step 1: Compute leaf hash
    const eventHashBytes = hexToBytes(eventHash);
    let currentHash = await merkleLeafHash(eventHashBytes);
    
    steps.push({
      step: 1,
      operation: 'Compute Leaf Hash',
      input: `0x00 || ${eventHash.substring(0, 16)}...`,
      output: bytesToHex(currentHash).substring(0, 16) + '...',
      success: true,
    });

    // Step 2-N: Walk up the tree
    let index = leafIndex;
    
    for (let i = 0; i < auditPath.length; i++) {
      const siblingHash = hexToBytes(auditPath[i]);
      const isRightNode = index % 2 === 0;
      
      let newHash: Uint8Array;
      let operation: string;
      
      if (isRightNode) {
        // Current node is on the left, sibling is on the right
        newHash = await merkleNodeHash(currentHash, siblingHash);
        operation = `Combine(current || sibling[${i}])`;
      } else {
        // Current node is on the right, sibling is on the left
        newHash = await merkleNodeHash(siblingHash, currentHash);
        operation = `Combine(sibling[${i}] || current)`;
      }
      
      steps.push({
        step: i + 2,
        operation,
        input: `Level ${i}: index=${index}, isRight=${isRightNode}`,
        output: bytesToHex(newHash).substring(0, 16) + '...',
        success: true,
      });
      
      currentHash = newHash;
      index = Math.floor(index / 2);
    }

    // Final step: Compare with expected root
    const computedRoot = bytesToHex(currentHash);
    const isValid = computedRoot.toLowerCase() === expectedRoot.toLowerCase();
    
    steps.push({
      step: steps.length + 1,
      operation: 'Compare with Merkle Root',
      input: `Computed: ${computedRoot.substring(0, 16)}...`,
      output: `Expected: ${expectedRoot.substring(0, 16)}...`,
      success: isValid,
    });

    return {
      isValid,
      computedRoot,
      expectedRoot,
      steps,
      error: isValid ? undefined : 'Root hash mismatch',
    };
  } catch (error) {
    return {
      isValid: false,
      computedRoot: '',
      expectedRoot,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verification step for UI display
 */
export interface VerificationStep {
  step: number;
  operation: string;
  input: string;
  output: string;
  success: boolean;
}

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  computedRoot: string;
  expectedRoot: string;
  steps: VerificationStep[];
  error?: string;
}

/**
 * Validate event hash format (64 character hex)
 */
export function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Validate UUID v7 format
 */
export function isValidUUIDv7(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, length: number = 8): string {
  if (hash.length <= length * 2) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}

/**
 * Format timestamp from nanosecond string
 */
export function formatNanosecondTimestamp(nsString: string): string {
  const ns = BigInt(nsString);
  const ms = ns / BigInt(1_000_000);
  return new Date(Number(ms)).toISOString();
}

/**
 * Calculate hash chain integrity
 */
export function verifyHashChain(events: { event_hash: string; prev_hash: string }[]): {
  isValid: boolean;
  brokenAt?: number;
} {
  for (let i = 1; i < events.length; i++) {
    if (events[i].prev_hash !== events[i - 1].event_hash) {
      return { isValid: false, brokenAt: i };
    }
  }
  return { isValid: true };
}
