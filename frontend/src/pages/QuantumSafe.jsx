import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  LockClosedIcon, 
  LockOpenIcon, 
  CpuChipIcon, 
  ShieldCheckIcon,
  DocumentTextIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const QuantumSafe = () => {
  const { token, user, addToast } = useAuth();

  // Keys states
  const [kyberPk, setKyberPk] = useState('');
  const [kyberSk, setKyberSk] = useState('');
  
  // Encrypt Form states
  const [credentialPlaintext, setCredentialPlaintext] = useState('DATABASE_ROOT_KEY_SECURE_993A');
  const [encryptedPayload, setEncryptedPayload] = useState(null);
  const [encrypting, setEncrypting] = useState(false);

  // Decrypt Form states
  const [decryptedPlaintext, setDecryptedPlaintext] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  // Key Pair loading
  const fetchUserKeys = async () => {
    try {
      const res = await fetch(`${API_URL}/quantum/user-key?username=${user.username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKyberPk(data.kyber_pk);
        // Normally SK is not exposed to client in standard prod, 
        // but we seed/display SK in database and UI here for testing/demonstration purposes
        // So the user can see encapsulation/decapsulation in action!
        setKyberSk(data.encrypted_credential ? "EXISTS_IN_DB_SK_READ_ONLY" : "");
        
        // Find if we have actual SK from backend
        // Let's query backend list of users to get key values
        const uListRes = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (uListRes.ok) {
          const uList = await uListRes.json();
          const me = uList.find(u => u.username === user.username);
          if (me && me.kyber_pk) {
            setKyberPk(me.kyber_pk);
            // In our system database layout, User object has kyber_sk
            // Let's check: Yes! We can get key values directly
            // For security analyst and super admins, we can load user details
            // (We will simulate it or fetch it)
            // Let's write the decrypt handler to pass in the user's actual keys!
            // Wait, we can fetch keys from custom route or verify!
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUserKeys();
  }, []);

  const handleEncrypt = async (e) => {
    e.preventDefault();
    if (!credentialPlaintext.trim()) return;
    setEncrypting(true);
    setEncryptedPayload(null);
    setDecryptedPlaintext('');

    try {
      const res = await fetch(`${API_URL}/quantum/encrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plaintext: credentialPlaintext,
          pk_hex: kyberPk
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEncryptedPayload(data);
        addToast("Key Encapsulated", "ML-KEM (Kyber) negotiated shared secret. Payload encrypted.", "Info");
      }
    } catch (err) {
      console.error(err);
      addToast("Encryption Error", "Failed to run Kyber encapsulation.", "High");
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    if (!encryptedPayload) return;
    setDecrypting(true);
    setDecryptedPlaintext('');

    try {
      // Find actual user private key by fetching the users array
      const uListRes = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let skToUse = kyberSk;
      if (uListRes.ok) {
        const uList = await uListRes.json();
        const me = uList.find(u => u.username === user.username);
        // Note: UserResponse schema excludes kyber_sk for security.
        // The /api/quantum/decrypt endpoint accepts sk_hex from the client.
      }

      const res = await fetch(`${API_URL}/quantum/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ciphertext: encryptedPayload.ciphertext,
          aes_ciphertext: encryptedPayload.aes_ciphertext,
          nonce: encryptedPayload.nonce,
          sk_hex: kyberSk
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDecryptedPlaintext(data.plaintext);
        addToast("Kyber Decapsulation Success", "Private key matched ciphertext. Shared key recovered.", "Info");
      } else {
        const err = await res.json();
        addToast("Decapsulation Failed", err.detail || "Private key verification mismatch.", "High");
      }
    } catch (err) {
      console.error(err);
      addToast("Decapsulation Error", "Network connection issues.", "High");
    } finally {
      setDecrypting(false);
    }
  };

  // Run initial keys load
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          const me = list.find(u => u.username === user.username);
          if (me) {
            setKyberPk(me.kyber_pk);
            // Fetch raw SK directly from database using user-key endpoint (we will replace content in main.py to support this, or we can retrieve it)
            // Let's check if the endpoint has it. Since we will modify main.py, let's fetch from user-key!
            const keyRes = await fetch(`${API_URL}/quantum/user-key?username=${user.username}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (keyRes.ok) {
              const keyData = await keyRes.json();
              setKyberPk(keyData.kyber_pk);
              setKyberSk(keyData.kyber_sk || "LOCKED_SK_VAL"); // If we modify main.py to return it, we will load it!
            }
          }
        }
      } catch(e) {
        console.error(e);
      }
    };
    loadKeys();
  }, []);

  return (
    <div className="space-y-6 relative">
      {/* Floating Alert Badge */}
      <div className="absolute top-0 right-0 flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-xs font-mono tracking-widest uppercase animate-pulse">
        <ShieldCheckIcon className="h-4 w-4" />
        <span>Quantum Safe Enabled</span>
      </div>

      {/* Page Title */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          POST-QUANTUM HYBRID ENVELOPE VAULT
        </h2>
        <p className="text-xs text-slate-400">Implement cryptographic confidentiality using NIST ML-KEM (Kyber-768) and AES-256-GCM.</p>
      </div>

      {/* Concept Explanation Card */}
      <GlassCard delay={0.05}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-3 flex items-center gap-2">
          <CpuChipIcon className="h-5 w-5 text-indigo-400" /> NIST FIPS 203: ML-KEM Standard
        </h3>
        <div className="text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
          <p>
            Traditional public-key algorithms (like RSA, Diffie-Hellman, and Elliptic Curves) are vulnerable to Shor's algorithm, which can solve factorization and discrete logarithms in polynomial time on sufficiently large quantum computers.
          </p>
          <p>
            <strong>ML-KEM (Module Lattice Key Encapsulation Mechanism)</strong>, based on Kyber-768, utilizes module learning with errors (M-LWE) over polynomial rings. It generates a public matrix A and noise vectors. 
            Key exchange operates as a <strong>Key Encapsulation Mechanism</strong>: the sender uses the public key to encapsulate a 256-bit symmetric key, producing a ciphertext. The receiver decapsulates the ciphertext using the matching private key to negotiate the same shared key.
          </p>
          <p>
            <strong>Hybrid Envelope:</strong> The negotiated shared key is used as a session key to encrypt/decrypt sensitive database fields (such as system root credentials and incident details) using <strong>AES-256-GCM</strong>.
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keys details */}
        <GlassCard delay={0.1}>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4 flex items-center gap-1.5">
            <LockClosedIcon className="h-5 w-5 text-cyan-400" /> ML-KEM Keypair (Kyber-768)
          </h4>
          
          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[9px] font-bold">Public Key (pk_hex - Seed + Matrix)</span>
              <textarea
                readOnly
                value={kyberPk}
                rows={4}
                className="w-full mt-1.5 p-2 bg-slate-950/60 border border-white/5 text-[10px] text-cyan-400 font-mono rounded-lg outline-none resize-none"
              />
            </div>
            
            <div>
              <span className="text-slate-500 block uppercase text-[9px] font-bold">Private Key (sk_hex - Secret Polynomials)</span>
              <textarea
                readOnly
                value={kyberSk}
                rows={4}
                className="w-full mt-1.5 p-2 bg-slate-950/60 border border-white/5 text-[10px] text-purple-400 font-mono rounded-lg outline-none resize-none"
              />
            </div>
          </div>
        </GlassCard>

        {/* Encrypt/Decrypt Sandbox */}
        <GlassCard delay={0.15}>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono mb-4 flex items-center gap-1.5">
            <DocumentTextIcon className="h-5 w-5 text-cyan-400" /> Cryptographic Sandbox
          </h4>

          <div className="space-y-5 text-xs font-mono">
            {/* Step 1: Encrypt */}
            <div className="space-y-2.5">
              <label className="text-slate-400 font-bold block uppercase text-[9px]">1. Encrypt Credential Payload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter secret credential (e.g. database password)"
                  value={credentialPlaintext}
                  onChange={(e) => setCredentialPlaintext(e.target.value)}
                  className="flex-grow glass-input text-xs font-mono py-1.5"
                />
                <button
                  onClick={handleEncrypt}
                  disabled={encrypting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase transition-colors disabled:opacity-50"
                >
                  {encrypting ? "Running..." : "Encrypt"}
                </button>
              </div>
            </div>

            {/* Step 2: Encrypted Payload Output */}
            {encryptedPayload && (
              <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl space-y-3">
                <div>
                  <span className="text-slate-500 block uppercase text-[8px]">Kyber Ciphertext (ct - Hex)</span>
                  <div className="text-[9px] text-slate-300 break-all select-all font-mono line-clamp-2">
                    {encryptedPayload.ciphertext}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px]">AES Ciphertext (Base64)</span>
                    <div className="text-[9px] text-slate-300 break-all select-all font-mono truncate">
                      {encryptedPayload.aes_ciphertext}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px]">AES GCM Nonce (Hex)</span>
                    <div className="text-[9px] text-slate-300 font-mono">
                      {encryptedPayload.nonce}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Decrypt */}
            {encryptedPayload && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <label className="text-slate-400 font-bold block uppercase text-[9px]">2. Decapsulate & Decrypt</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter sk_hex to decrypt (pre-loaded)"
                    value={kyberSk}
                    onChange={(e) => setKyberSk(e.target.value)}
                    className="flex-grow glass-input text-xs font-mono py-1.5"
                  />
                  <button
                    onClick={handleDecrypt}
                    disabled={decrypting}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {decrypting ? "Decrypting..." : "Decrypt"}
                  </button>
                </div>

                {decryptedPlaintext && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-2.5 font-bold animate-fadeIn">
                    <LockOpenIcon className="h-5 w-5 text-emerald-400" />
                    <div>
                      <span className="text-[8px] text-emerald-500/70 block uppercase font-mono">Decrypted Plaintext Secret</span>
                      <span className="text-xs font-mono text-white">{decryptedPlaintext}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default QuantumSafe;
