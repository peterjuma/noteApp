import { useState, useRef, useEffect, useCallback } from "react";
import { Lock, Eye, EyeOff, Fingerprint } from "lucide-react";

const PIN_HASH_KEY = "noteapp_pin_hash";
const SESSION_TIMEOUT_KEY = "noteapp_lock_timeout";
const BIOMETRIC_KEY = "noteapp_biometric_enabled";
const CREDENTIAL_ID_KEY = "noteapp_biometric_cred";

/** Hash a PIN string using SHA-256 and return a hex digest. */
async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check if a PIN lock is configured. */
export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

/** Set (or update) the PIN. */
export async function setPin(pin) {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
}

/** Remove the PIN lock and related settings. */
export function removePin() {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(SESSION_TIMEOUT_KEY);
  localStorage.removeItem(BIOMETRIC_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
}

/** Verify a PIN against the stored hash. */
export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return true;
  const hash = await hashPin(pin);
  return hash === stored;
}

/** Get session timeout in ms (0 = until tab close). */
export function getSessionTimeout() {
  return parseInt(localStorage.getItem(SESSION_TIMEOUT_KEY)) || 0;
}

/** Set session timeout in ms. */
export function setSessionTimeout(ms) {
  localStorage.setItem(SESSION_TIMEOUT_KEY, String(ms));
}

/** Check if biometric is enabled. */
export function isBiometricEnabled() {
  return localStorage.getItem(BIOMETRIC_KEY) === "true";
}

/** Check if WebAuthn platform authenticator is available. */
export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Register a biometric credential. */
export async function registerBiometric() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "NoteApp", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode("noteapp-user"),
        name: "NoteApp User",
        displayName: "NoteApp User",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    },
  });
  // Store the credential ID for future auth
  const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
  localStorage.setItem(CREDENTIAL_ID_KEY, credId);
  localStorage.setItem(BIOMETRIC_KEY, "true");
  return true;
}

/** Authenticate with biometrics. Returns true if successful. */
export async function authenticateBiometric() {
  const credIdB64 = localStorage.getItem(CREDENTIAL_ID_KEY);
  if (!credIdB64) return false;
  try {
    const credIdBytes = Uint8Array.from(atob(credIdB64), (c) => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credIdBytes, type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Remove biometric credential. */
export function removeBiometric() {
  localStorage.removeItem(BIOMETRIC_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
}

function LockScreen({ onUnlock }) {
  const [pin, setLocalPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);
  const inputRef = useRef(null);

  const tryBiometric = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) {
      onUnlock();
    } else {
      setError("Biometric authentication failed");
      if (inputRef.current) inputRef.current.focus();
    }
  }, [onUnlock]);

  useEffect(() => {
    // Check biometric availability (don't auto-prompt — let user choose)
    if (isBiometricEnabled()) {
      isBiometricAvailable().then(setBiometricAvail);
    }
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    const valid = await verifyPin(pin);
    if (valid) {
      onUnlock();
    } else {
      setError("Incorrect PIN");
      setLocalPin("");
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-screen-card">
        <div className="lock-screen-icon">
          <Lock size={32} />
        </div>
        <h2 className="lock-screen-title">NoteApp is locked</h2>
        <p className="lock-screen-hint">Enter your PIN to unlock</p>
        <form onSubmit={handleSubmit} className="lock-screen-form">
          <div className="lock-screen-input-wrapper">
            <input
              ref={inputRef}
              type={showPin ? "text" : "password"}
              className="lock-screen-input"
              value={pin}
              onChange={(e) => {
                setLocalPin(e.target.value);
                setError("");
              }}
              placeholder="Enter PIN"
              autoComplete="off"
              maxLength={32}
            />
            <button
              type="button"
              className="lock-screen-toggle-vis"
              onClick={() => setShowPin((v) => !v)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              tabIndex={-1}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="lock-screen-error">{error}</p>}
          <button type="submit" className="lock-screen-btn">
            Unlock
          </button>
          {biometricAvail && (
            <button
              type="button"
              className="lock-screen-biometric-btn"
              onClick={tryBiometric}
            >
              <Fingerprint size={18} />
              Use Biometrics
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default LockScreen;
