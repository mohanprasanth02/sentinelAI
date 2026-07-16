import os
import hashlib
import json
import base64
from typing import Tuple, Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Kyber-768 Parameters (ML-KEM)
# Modulus q = 3329
# Degree n = 256
# Module dimension k = 3
Q = 3329
N = 256
K = 3

class Polynomial:
    """Represents a polynomial in Z_3329[X]/(X^256 + 1)"""
    def __init__(self, coeffs=None):
        if coeffs is None:
            self.coeffs = [0] * N
        else:
            # Ensure degree < N
            self.coeffs = [int(c) % Q for c in coeffs]
            if len(self.coeffs) < N:
                self.coeffs += [0] * (N - len(self.coeffs))
            elif len(self.coeffs) > N:
                # Polynomial reduction modulo X^N + 1
                # X^N = -1, X^{N+i} = -X^i
                reduced = [0] * N
                for i, c in enumerate(self.coeffs):
                    idx = i % N
                    sign = -1 if (i // N) % 2 == 1 else 1
                    reduced[idx] = (reduced[idx] + sign * c) % Q
                self.coeffs = reduced

    def __add__(self, other):
        return Polynomial([(self.coeffs[i] + other.coeffs[i]) % Q for i in range(N)])

    def __sub__(self, other):
        return Polynomial([(self.coeffs[i] - other.coeffs[i] + Q) % Q for i in range(N)])

    def __mul__(self, other):
        # Full polynomial multiplication
        res = [0] * (2 * N)
        for i in range(N):
            if self.coeffs[i] == 0:
                continue
            for j in range(N):
                res[i + j] = (res[i + j] + self.coeffs[i] * other.coeffs[j]) % Q
        # Reduce modulo X^N + 1
        return Polynomial(res)

    def to_bytes(self) -> bytes:
        # Pack 12 bits per coefficient (since Q = 3329 < 4096)
        res = bytearray()
        for i in range(0, N, 2):
            c1 = self.coeffs[i]
            c2 = self.coeffs[i+1]
            # 2 coefficients pack into 3 bytes
            # c1 is 12 bits, c2 is 12 bits
            res.append(c1 & 0xFF)
            res.append(((c1 >> 8) & 0x0F) | ((c2 & 0x0F) << 4))
            res.append((c2 >> 4) & 0xFF)
        return bytes(res)

    @classmethod
    def from_bytes(cls, b: bytes):
        coeffs = [0] * N
        idx = 0
        for i in range(0, len(b), 3):
            if idx >= N:
                break
            b1, b2, b3 = b[i], b[i+1], b[i+2]
            coeffs[idx] = b1 | ((b2 & 0x0F) << 8)
            coeffs[idx+1] = (b2 >> 4) | (b3 << 4)
            idx += 2
        return cls(coeffs)

def generate_noise_poly(seed: bytes, nonce: int) -> Polynomial:
    """Generates a small noise polynomial using Centered Binomial Distribution (eta = 2)"""
    h = hashlib.shake_256(seed + bytes([nonce])).digest(N)
    coeffs = []
    for b in h:
        # Get 2 bits for binomial sample (-1, 0, 1)
        a = (b & 1) + ((b >> 1) & 1)
        b_val = ((b >> 2) & 1) + ((b >> 3) & 1)
        coeffs.append((a - b_val + Q) % Q)
    return Polynomial(coeffs)

def generate_matrix_a(seed: bytes) -> list:
    """Generates a pseudorandom matrix A of size K x K using SHAKE-128"""
    A = []
    for i in range(K):
        row = []
        for j in range(K):
            # Deterministic generation for A_ij
            h = hashlib.shake_128(seed + bytes([i, j])).digest(N * 2)
            coeffs = []
            for k in range(0, len(h), 2):
                val = (h[k] | (h[k+1] << 8)) % Q
                coeffs.append(val)
            row.append(Polynomial(coeffs))
        A.append(row)
    return A

def kyber_keygen() -> Tuple[str, str]:
    """
    Generates a Kyber-768 public and private key pair.
    Returns:
        (public_key_hex, private_key_hex)
    """
    # 1. Generate random seeds
    d = os.urandom(32)
    z = os.urandom(32)
    
    # Hash of d gives rho (seed for matrix A) and sigma (seed for noise)
    h = hashlib.sha512(d).digest()
    rho, sigma = h[:32], h[32:]
    
    # 2. Generate public matrix A
    A = generate_matrix_a(rho)
    
    # 3. Sample secret vector s and noise vector e
    s = [generate_noise_poly(sigma, idx) for idx in range(K)]
    e = [generate_noise_poly(sigma, idx + K) for idx in range(K)]
    
    # 4. Compute t = A * s + e
    t = []
    for i in range(K):
        val = Polynomial()
        for j in range(K):
            val = val + (A[i][j] * s[j])
        val = val + e[i]
        t.append(val)
        
    # Serialize Public Key: rho (32 bytes) + t (K * 384 bytes)
    pk_bytes = rho
    for poly in t:
        pk_bytes += poly.to_bytes()
        
    # Serialize Private Key: s (K * 384 bytes) + pk_bytes + z (32 bytes)
    sk_bytes = bytearray()
    for poly in s:
        sk_bytes += poly.to_bytes()
    sk_bytes += pk_bytes
    sk_bytes += z
    
    return pk_bytes.hex(), bytes(sk_bytes).hex()

def kyber_encapsulate(pk_hex: str) -> Tuple[str, str]:
    """
    Encapsulates a shared secret key using the public key.
    Returns:
        (ciphertext_hex, shared_secret_hex)
    """
    pk_bytes = bytes.fromhex(pk_hex)
    rho = pk_bytes[:32]
    
    # Reconstruct t from public key
    t = []
    idx = 32
    poly_len = N * 3 // 2 # 384 bytes
    for _ in range(K):
        poly_bytes = pk_bytes[idx:idx+poly_len]
        t.append(Polynomial.from_bytes(poly_bytes))
        idx += poly_len
        
    # Generate matrix A
    A = generate_matrix_a(rho)
    
    # Generate random message m (coins)
    m = os.urandom(32)
    # sigma for ephemeral noises
    coins = hashlib.sha256(m).digest()
    
    # Ephemeral secret r, noise e1, e2
    r = [generate_noise_poly(coins, idx) for idx in range(K)]
    e1 = [generate_noise_poly(coins, idx + K) for idx in range(K)]
    e2 = generate_noise_poly(coins, K * 2)
    
    # Compute u = A^T * r + e1
    u = []
    for j in range(K):
        val = Polynomial()
        for i in range(K):
            # Transposed multiplication
            val = val + (A[i][j] * r[i])
        val = val + e1[j]
        u.append(val)
        
    # Compute v = t^T * r + e2 + Decompress(m)
    # Decompress(m): map each bit of m to a polynomial coefficient
    m_coeffs = []
    for b in m:
        for bit in range(8):
            bit_val = (b >> bit) & 1
            # If bit is 1, coeff is round(Q/2) = 1665
            m_coeffs.append(1665 if bit_val == 1 else 0)
    m_poly = Polynomial(m_coeffs)
    
    v = Polynomial()
    for i in range(K):
        v = v + (t[i] * r[i])
    v = v + e2 + m_poly
    
    # Serialize Ciphertext: u (K * 384 bytes) + v (384 bytes)
    ct_bytes = bytearray()
    for poly in u:
        ct_bytes += poly.to_bytes()
    ct_bytes += v.to_bytes()
    
    # Shared secret is derived from KDF(m, Hash(pk))
    pk_hash = hashlib.sha256(pk_bytes).digest()
    shared_secret = hashlib.sha256(m + pk_hash).digest()
    
    return bytes(ct_bytes).hex(), shared_secret.hex()

def kyber_decapsulate(ct_hex: str, sk_hex: str) -> str:
    """
    Decapsulates the ciphertext using the private key to recover the shared secret.
    Returns:
        shared_secret_hex
    """
    ct_bytes = bytes.fromhex(ct_hex)
    sk_bytes = bytes.fromhex(sk_hex)
    
    poly_len = N * 3 // 2 # 384 bytes
    
    # Reconstruct secret s from private key
    s = []
    idx = 0
    for _ in range(K):
        s.append(Polynomial.from_bytes(sk_bytes[idx:idx+poly_len]))
        idx += poly_len
        
    # Reconstruct public key pk from private key
    pk_start = idx
    pk_len = 32 + K * poly_len
    pk_bytes = sk_bytes[pk_start : pk_start + pk_len]
    
    # Reconstruct ciphertext parts u and v
    u = []
    ct_idx = 0
    for _ in range(K):
        u.append(Polynomial.from_bytes(ct_bytes[ct_idx:ct_idx+poly_len]))
        ct_idx += poly_len
    v = Polynomial.from_bytes(ct_bytes[ct_idx:ct_idx+poly_len])
    
    # Compute m = v - s^T * u
    s_dot_u = Polynomial()
    for i in range(K):
        s_dot_u = s_dot_u + (s[i] * u[i])
    m_poly = v - s_dot_u
    
    # Compress/decode m coefficients back to 32 bytes
    m_bytes = bytearray()
    for i in range(0, N, 8):
        byte_val = 0
        for bit in range(8):
            coeff = m_poly.coeffs[i + bit]
            # Threshold decoding: is coeff closer to 1665 or 0 (mod Q)?
            diff = min((coeff - 1665) % Q, (1665 - coeff) % Q)
            zero_diff = min(coeff % Q, (-coeff) % Q)
            if diff < zero_diff:
                byte_val |= (1 << bit)
        m_bytes.append(byte_val)
        
    # Derive shared secret: KDF(m, Hash(pk))
    pk_hash = hashlib.sha256(pk_bytes).digest()
    shared_secret = hashlib.sha256(bytes(m_bytes) + pk_hash).digest()
    
    return shared_secret.hex()

# --- Hybrid Encryption Wrappers (Kyber + AES-256-GCM) ---

def quantum_encrypt(plaintext: str, pk_hex: str) -> Dict[str, str]:
    """
    Encrypts a plaintext string using Kyber key encapsulation and AES-GCM.
    Returns:
        {
            "ciphertext": Kyber Ciphertext (hex),
            "aes_ciphertext": Encrypted Data (base64 string),
            "nonce": AES Nonce (hex)
        }
    """
    # 1. Encapsulate shared key
    ct_hex, shared_secret_hex = kyber_encapsulate(pk_hex)
    shared_secret = bytes.fromhex(shared_secret_hex)
    
    # 2. Encrypt plaintext using AES-GCM
    aesgcm = AESGCM(shared_secret)
    nonce = os.urandom(12)
    aes_ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    
    return {
        "ciphertext": ct_hex,
        "aes_ciphertext": base64.b64encode(aes_ciphertext).decode('utf-8'),
        "nonce": nonce.hex()
    }

def quantum_decrypt(enc_data: Dict[str, str], sk_hex: str) -> str:
    """
    Decrypts the hybrid payload using Kyber decapsulation and AES-GCM.
    Args:
        enc_data: Dict containing keys: "ciphertext", "aes_ciphertext", "nonce"
        sk_hex: Kyber Private Key (hex)
    Returns:
        plaintext string
    """
    ct_hex = enc_data["ciphertext"]
    aes_ct_b64 = enc_data["aes_ciphertext"]
    nonce_hex = enc_data["nonce"]
    
    # 1. Decapsulate to get the shared key
    shared_secret_hex = kyber_decapsulate(ct_hex, sk_hex)
    shared_secret = bytes.fromhex(shared_secret_hex)
    
    # 2. Decrypt using AES-GCM
    aesgcm = AESGCM(shared_secret)
    aes_ciphertext = base64.b64decode(aes_ct_b64)
    nonce = bytes.fromhex(nonce_hex)
    
    plaintext_bytes = aesgcm.decrypt(nonce, aes_ciphertext, None)
    return plaintext_bytes.decode('utf-8')

if __name__ == "__main__":
    # Test keygen, enc, dec
    print("Testing ML-KEM Kyber-768 implementation...")
    pk, sk = kyber_keygen()
    print(f"Public Key (len {len(pk)} hex chars): {pk[:64]}...")
    print(f"Private Key (len {len(sk)} hex chars): {sk[:64]}...")
    
    msg = "CONFIDENTIAL: Suspected SQL injection attempt by analyst user_03 on Core Ledger database."
    print(f"Plaintext: {msg}")
    
    # Encrypt
    encrypted = quantum_encrypt(msg, pk)
    print("Encryption successful.")
    print(f"Kyber Ciphertext (len {len(encrypted['ciphertext'])}): {encrypted['ciphertext'][:64]}...")
    print(f"AES Ciphertext (len {len(encrypted['aes_ciphertext'])}): {encrypted['aes_ciphertext'][:64]}...")
    print(f"Nonce: {encrypted['nonce']}")
    
    # Decrypt
    decrypted = quantum_decrypt(encrypted, sk)
    print(f"Decrypted text: {decrypted}")
    assert msg == decrypted, "Decryption mismatch!"
    print("Kyber Verification Complete: SUCCESS!")
