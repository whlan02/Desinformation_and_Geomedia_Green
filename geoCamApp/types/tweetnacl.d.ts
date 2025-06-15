declare module 'tweetnacl' {
  export interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export namespace sign {
    function keyPair(): SignKeyPair;
    function detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    
    namespace detached {
      function verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
    }
  }

  export function setPRNG(fn: (x: Uint8Array, n: number) => void): void;
} 