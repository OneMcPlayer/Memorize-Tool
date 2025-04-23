// 1Password Passkey Authentication Implementation

// Function to register a new passkey
async function registerPasskey(username) {
  try {
    // Generate a random user ID
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);
    const userIdBase64 = btoa(String.fromCharCode.apply(null, userId));
    
    // Create the PublicKeyCredentialCreationOptions
    const publicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(32),
      rp: {
        name: "Memorize Tool",
        id: window.location.hostname
      },
      user: {
        id: Uint8Array.from(userIdBase64, c => c.charCodeAt(0)),
        name: username,
        displayName: username
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: true,
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };
    
    // Fill challenge with random values
    window.crypto.getRandomValues(publicKeyCredentialCreationOptions.challenge);
    
    // Create the credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });
    
    // Convert the credential to a format that can be sent to the server
    const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
    const clientDataJSON = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.response.clientDataJSON)));
    const attestationObject = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.response.attestationObject)));
    
    // Return the credential data
    return {
      id: credentialId,
      clientDataJSON,
      attestationObject,
      type: credential.type
    };
  } catch (error) {
    console.error("Error registering passkey:", error);
    throw error;
  }
}

// Function to authenticate with a passkey
async function authenticateWithPasskey() {
  try {
    // Create the PublicKeyCredentialRequestOptions
    const publicKeyCredentialRequestOptions = {
      challenge: new Uint8Array(32),
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 60000
    };
    
    // Fill challenge with random values
    window.crypto.getRandomValues(publicKeyCredentialRequestOptions.challenge);
    
    // Get the credential
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });
    
    // Convert the credential to a format that can be sent to the server
    const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
    const clientDataJSON = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.response.clientDataJSON)));
    const authenticatorData = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.response.authenticatorData)));
    const signature = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.response.signature)));
    
    // Return the credential data
    return {
      id: credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
      type: credential.type
    };
  } catch (error) {
    console.error("Error authenticating with passkey:", error);
    throw error;
  }
}

// Check if passkeys are supported
function isPasskeySupported() {
  return window.PublicKeyCredential && 
         typeof window.PublicKeyCredential === 'function' &&
         typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

// Export the functions
export {
  registerPasskey,
  authenticateWithPasskey,
  isPasskeySupported
};
