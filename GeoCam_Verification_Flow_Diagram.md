# GeoCam Image Verification Flow Diagram

## Overview
This diagram illustrates the complete image verification process in the GeoCam app, showing how images are selected, analyzed, and verified using cryptographic signatures and steganography.

## Key Components
- **Private Key**: Stored securely on device, never transmitted
- **Public Key**: Shared with backend for verification
- **Steganography Service**: Extracts hidden metadata from images
- **Signature Verification**: Validates image authenticity using cryptographic signatures

---

## Complete Verification Flow

```mermaid
graph TB
    %% User Actions
    A[User Opens Verify Screen] --> B{Image Selected?}
    B -->|No| C[Show Empty State]
    C --> D[User Taps 'Browse Images']
    D --> E[Show Bottom Sheet Modal]
    
    %% Image Selection Options
    E --> F[Phone Gallery Option]
    E --> G[GeoCam Gallery Option]
    
    F --> H[Launch Image Picker]
    G --> I[Navigate to Gallery with Select Mode]
    
    H --> J[User Selects Image]
    I --> K[User Selects from GeoCam Gallery]
    
    J --> L[Set Selected Image URI]
    K --> M[Store URI in AsyncStorage]
    M --> N[Navigate Back to Verify Screen]
    N --> O[Read URI from AsyncStorage]
    O --> L
    
    %% Start Verification Process
    L --> P[Start Verification Process]
    P --> Q[Show Progress Animation]
    P --> R[Convert Image to Base64]
    
    %% Steganography Extraction
    R --> S[Call Steganography Service]
    S --> T[Extract Hidden Metadata]
    T --> U{Metadata Found?}
    
    U -->|Yes| V[Parse Decoded Data]
    U -->|No| W[Set Empty Metadata]
    
    %% Signature Verification Process
    V --> X{Signature & Public Key ID Found?}
    X -->|Yes| Y[Call Secure Backend Service]
    X -->|No| Z[Skip Signature Verification]
    
    Y --> AA[Backend Retrieves Public Key]
    AA --> BB[Verify Signature with Public Key]
    BB --> CC{Signature Valid?}
    
    CC -->|Yes| DD[Mark as Authentic]
    CC -->|No| EE[Mark as Not Authentic]
    
    %% Process Results
    DD --> FF[Combine Results]
    EE --> FF
    Z --> FF
    W --> FF
    
    FF --> GG[Update UI with Results]
    GG --> HH[Show Verification Status]
    HH --> II[Display Metadata Items]
    II --> JJ{Location Data Available?}
    
    JJ -->|Yes| KK[Show Map with Location]
    JJ -->|No| LL[Skip Map Display]
    
    KK --> MM[Show Action Button]
    LL --> MM
    
    %% Import Mode Handling
    MM --> NN{Import Mode Active?}
    NN -->|Yes & Valid| OO[Show Import Button]
    NN -->|No| PP[Show 'Verify Another' Button]
    
    OO --> QQ[Import to GeoCam Gallery]
    PP --> RR[Return to Image Selection]
    
    %% Key Management (Background Process)
    subgraph "Key Management (Device Only)"
        S1[Private Key Generated on Device]
        S2[Private Key Stored in Secure Store]
        S3[Public Key Derived from Private Key]
        S4[Public Key Sent to Backend]
        S5[Backend Stores Public Key with Device ID]
        
        S1 --> S2
        S1 --> S3
        S3 --> S4
        S4 --> S5
    end
    
    %% Backend Services
    subgraph "Backend Services"
        B1[Steganography Service<br/>Port 3001]
        B2[Secure Backend Service<br/>Port 5001]
        B3[Public Key Storage]
        B4[Signature Verification]
        
        B1 --> B2
        B2 --> B3
        B2 --> B4
    end
    
    %% Connect flows
    S --> B1
    Y --> B2
    AA --> B3
    BB --> B4

    %% Styling
    classDef userAction fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class A,C,D,F,G,H,I,J,K userAction
    class P,Q,R,S,T,V,FF,GG,HH,II,MM,QQ process
    class B,U,X,CC,JJ,NN decision
    class S1,S2,S3,S4,S5 security
    class B1,B2,B3,B4 backend
```

---

## Detailed Verification Steps

### 1. Image Selection Phase
```mermaid
sequenceDiagram
    participant U as User
    participant UI as Verify Screen
    participant AS as AsyncStorage
    participant IP as Image Picker
    participant G as Gallery
    
    U->>UI: Opens verify screen
    UI->>AS: Check for selected image URI
    AS-->>UI: Return URI (if exists)
    
    alt No image selected
        UI->>U: Show empty state
        U->>UI: Tap "Browse Images"
        UI->>UI: Show bottom sheet
        
        alt Phone Gallery
            U->>IP: Select "Phone Gallery"
            IP->>IP: Launch system picker
            IP-->>UI: Return selected image URI
        else GeoCam Gallery
            U->>G: Select "GeoCam Gallery"
            G->>AS: Store selected URI
            G->>UI: Navigate back
            UI->>AS: Read stored URI
        end
    end
    
    UI->>UI: Set selected image & start verification
```

### 2. Steganography Extraction Phase
```mermaid
sequenceDiagram
    participant UI as Verify Screen
    participant FS as File System
    participant STEG as Steganography Service
    participant BE as Backend
    
    UI->>FS: Convert image to Base64
    FS-->>UI: Base64 data
    
    UI->>STEG: Call verifyImagePurePng(base64Data)
    STEG->>BE: POST /extract-steganography
    BE->>BE: Extract hidden metadata
    BE-->>STEG: Return decoded data
    STEG-->>UI: Verification result with metadata
    
    UI->>UI: Parse decoded data
    UI->>UI: Extract location, device info, timestamp
```

### 3. Signature Verification Phase
```mermaid
sequenceDiagram
    participant UI as Verify Screen
    participant SBS as Secure Backend Service
    participant BE as Secure Backend
    participant KS as Key Storage
    
    UI->>UI: Check for signature & public_key_id
    
    alt Signature exists
        UI->>SBS: Call verifyImageSecure(base64, signature, public_key_id)
        SBS->>BE: POST /verify-image-secure
        BE->>KS: Retrieve public key by ID
        KS-->>BE: Return public key
        BE->>BE: Verify signature using public key
        BE-->>SBS: Return verification result
        SBS-->>UI: Signature validation result
    else No signature
        UI->>UI: Skip signature verification
    end
    
    UI->>UI: Combine steganography + signature results
```

### 4. Key Management Flow
```mermaid
graph LR
    subgraph "Device (Secure)"
        A[Generate Private Key] --> B[Store in Secure Storage]
        A --> C[Derive Public Key]
        B --> D[Private Key Never Leaves Device]
    end
    
    subgraph "Network Communication"
        C --> E[Send Public Key to Backend]
        E --> F[Backend Stores Public Key]
    end
    
    subgraph "Verification Process"
        F --> G[Retrieve Public Key for Verification]
        G --> H[Verify Signature]
        H --> I[Return Validation Result]
    end
    
    classDef secure fill:#ffcdd2,stroke:#d32f2f,stroke-width:3px
    classDef network fill:#e1f5fe,stroke:#1976d2,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class A,B,D secure
    class C,E,F network
    class G,H,I process
```

---

## Data Flow Architecture

### 1. Metadata Processing
```mermaid
graph TD
    A[Raw Image Data] --> B[Base64 Conversion]
    B --> C[Steganography Extraction]
    C --> D[Decoded Metadata Object]
    
    D --> E[Device Information]
    D --> F[Location Data]
    D --> G[Timestamp]
    D --> H[Signature Data]
    D --> I[Public Key ID]
    
    E --> J[Display Device Info]
    F --> K[Show Map Location]
    G --> L[Show Capture Time]
    H --> M[Signature Verification]
    I --> M
    
    M --> N[Authentication Result]
    N --> O[UI Status Update]
    
    classDef data fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef ui fill:#e1f5fe,stroke:#1976d2,stroke-width:2px
    
    class A,B,D,E,F,G,H,I data
    class C,M,N process
    class J,K,L,O ui
```

### 2. UI State Management
```mermaid
stateDiagram-v2
    [*] --> EmptyState
    EmptyState --> ImageSelected : User selects image
    ImageSelected --> Verifying : Start verification
    Verifying --> VerificationComplete : Process complete
    VerificationComplete --> ShowResults : Display results
    ShowResults --> EmptyState : Verify another image
    ShowResults --> ImportMode : Import to gallery
    ImportMode --> EmptyState : Import complete
    
    Verifying --> Error : Verification failed
    Error --> EmptyState : Try again
    
    note right of Verifying
        - Show progress animation
        - Convert to Base64
        - Call steganography service
        - Verify signature if present
    end note
    
    note right of ShowResults
        - Display verification status
        - Show metadata items
        - Render map if location available
        - Show appropriate action button
    end note
```

---

## Security Model

### Key Security Principles
1. **Private Key Isolation**: Private keys never leave the device
2. **Public Key Distribution**: Only public keys are transmitted to backend
3. **Signature Verification**: Backend uses public key to verify signatures
4. **Secure Storage**: Private keys stored in device secure storage
5. **No Key Transmission**: Verification process doesn't require private key transmission

### Cryptographic Flow
```mermaid
graph TB
    subgraph "Device Security Boundary"
        PK[Private Key<br/>🔒 Secure Storage]
        SIG[Sign Image<br/>🔐 Private Key]
        META[Embed Metadata<br/>📊 Steganography]
    end
    
    subgraph "Network Layer"
        PUB[Public Key<br/>📤 Transmitted]
        IMG[Signed Image<br/>📸 With Metadata]
    end
    
    subgraph "Backend Verification"
        STORE[Public Key Storage<br/>🗃️ Database]
        VERIFY[Signature Verification<br/>✅ Public Key]
        RESULT[Verification Result<br/>📋 Authentic/Invalid]
    end
    
    PK --> SIG
    SIG --> META
    META --> IMG
    PK --> PUB
    PUB --> STORE
    IMG --> VERIFY
    STORE --> VERIFY
    VERIFY --> RESULT
    
    classDef secure fill:#ffcdd2,stroke:#d32f2f,stroke-width:3px
    classDef network fill:#e1f5fe,stroke:#1976d2,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class PK,SIG,META secure
    class PUB,IMG network
    class STORE,VERIFY,RESULT backend
```

---

## Error Handling Flow

```mermaid
graph TD
    A[Start Verification] --> B{Image Readable?}
    B -->|No| C[Show File Error]
    B -->|Yes| D[Convert to Base64]
    
    D --> E{Steganography Service Available?}
    E -->|No| F[Show Network Error]
    E -->|Yes| G[Extract Metadata]
    
    G --> H{Extraction Successful?}
    H -->|No| I[Show 'Not GeoCam Image' Error]
    H -->|Yes| J[Check for Signature]
    
    J --> K{Signature Present?}
    K -->|No| L[Show Metadata Only]
    K -->|Yes| M[Verify Signature]
    
    M --> N{Backend Available?}
    N -->|No| O[Show Network Error]
    N -->|Yes| P[Get Verification Result]
    
    P --> Q{Verification Successful?}
    Q -->|No| R[Show Authentication Failed]
    Q -->|Yes| S[Show Success Result]
    
    C --> T[Enable Retry]
    F --> T
    I --> T
    O --> T
    R --> U[Show Partial Results]
    
    classDef error fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class C,F,I,O,R error
    class S,U success
    class A,D,G,J,M,P process
```

---

## Implementation Notes

### Key Technologies Used
- **React Native**: Mobile app framework
- **Expo**: Development platform and tools
- **AsyncStorage**: Local data persistence
- **Secure Storage**: Cryptographic key storage
- **File System**: Image file operations
- **Image Picker**: System image selection
- **Maps**: Location visualization
- **Steganography**: Hidden data embedding/extraction
- **Cryptographic Signatures**: Image authentication

### Performance Considerations
- Progress animation during verification (25-second simulation)
- Lazy loading of verification results
- Efficient Base64 conversion
- Optimized map rendering
- Smooth UI transitions

### User Experience Features
- Empty state with clear call-to-action
- Progress feedback during verification
- Animated scroll indicators
- Bottom sheet for source selection
- Responsive design for different screen sizes
- Dark/light theme support
- Import mode for external images

This comprehensive flow diagram illustrates how the GeoCam verification system maintains security while providing a seamless user experience for image authenticity verification.
