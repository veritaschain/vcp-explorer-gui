// Deterministic synthetic demo tree, not signed or externally anchored evidence.
// Leaf data: SHA-256(UTF-8 decimal i), i = 0..11.
// Tree/proofs: RFC 6962 section 2.1, recursively split at the largest power of
// two below n, with 0x00 leaf and 0x01 internal-node prefixes (no duplication).
// test/merkle.test.mjs independently reconstructs these constants with node:crypto.
// The root also matches vcp-sdk 026d11a test-vectors/vectors.json (size 12).
export const DEMO_MERKLE_FIXTURE = {
  "tree_size": 12,
  "root_hash": "5d0afc99d7670033abe6c861dbda6781744a1dceed4da35e7c7b71cecebc97de",
  "event_hashes": [
    "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9",
    "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
    "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
    "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    "e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683",
    "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451",
    "2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3",
    "19581e27de7ced00ff1ce50b2047e7a567c76b1cbaebabe5ef03f7c3017bb5b7",
    "4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5",
    "4fc82b26aecb47d2868c4efbe3581732a3e7cbcc6c2efb32062c08170a05eeb8"
  ],
  "audit_paths": [
    [
      "58705e7af8dbab9f2f5b6449ba18d22cce7eedf245fca8dcfd93cf0f906ccf95",
      "94d8e890a83c68081af355575ee41d8738f4eab7150e5b41862787b5996682ef",
      "dda8915079e27037f07130ff899b9ce7e6d619fec11809b6afa5b3794a239dc8",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "13a77175e35eb1d9da91ee14df0d7772cea71289800206e2b45c882ecb06efbf",
      "94d8e890a83c68081af355575ee41d8738f4eab7150e5b41862787b5996682ef",
      "dda8915079e27037f07130ff899b9ce7e6d619fec11809b6afa5b3794a239dc8",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "395421df5d0a75bdeb3c2ff42b96c071e4e197b1df5b7f7bbfd3e61a4864de46",
      "bbb441530bdded54e6e2bfcdc829819ff39b30768eb9f023071dffc16b410f10",
      "dda8915079e27037f07130ff899b9ce7e6d619fec11809b6afa5b3794a239dc8",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "393ec8686f48e854d38c68530b0adc1469655252e12ec7d849e4e4117b7ad4a7",
      "bbb441530bdded54e6e2bfcdc829819ff39b30768eb9f023071dffc16b410f10",
      "dda8915079e27037f07130ff899b9ce7e6d619fec11809b6afa5b3794a239dc8",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "c89ca9c47afe1528d11e91a9a5f3ddae89b6a78edbc8d815fb18ff03d3b45326",
      "5f54a87fb83d5d3dc498468618058593313e81beaba80a0478a351d340e055fd",
      "626635eec4e2fa4a75475a0f1d633dbee55b6783247c108b9a12dcc60f13836e",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "4c6bf817639562abeec7d3a2a6d4d2aaf3e1e818e0ff82cd04a43463ff84f6d6",
      "5f54a87fb83d5d3dc498468618058593313e81beaba80a0478a351d340e055fd",
      "626635eec4e2fa4a75475a0f1d633dbee55b6783247c108b9a12dcc60f13836e",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "b2e76ad7aed99e8e1203da65d0fd12d7f9f41edc68f52623ade19c687f25908d",
      "3c2be77f2a522cf0fc58d00354bafb4acfe0c96d9cac5853b46ebbcf2dd47b43",
      "626635eec4e2fa4a75475a0f1d633dbee55b6783247c108b9a12dcc60f13836e",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "ed2d2da25ede96a6b6106a41a9e81792cf2cf392a6cde761dc42305fe693731d",
      "3c2be77f2a522cf0fc58d00354bafb4acfe0c96d9cac5853b46ebbcf2dd47b43",
      "626635eec4e2fa4a75475a0f1d633dbee55b6783247c108b9a12dcc60f13836e",
      "7d3fbf58a1f96e87e673e243aa2dca2f2c0ab3d973caeb2bb4ab4601e4d67b1a"
    ],
    [
      "6562149317b7df494dc0efa53fd84d740a6a5fbd060f77754a7e0816020da791",
      "9df356fecc13593e6c8c9728c3ce5d7c63050e78ccc079dbba3e8f71125e681a",
      "da17ac5d45a1b0c50260c7e411bf342ba2a41c9c824bb3b6404e5330a585a057"
    ],
    [
      "4ed5134b64f6c048b04a85c265e4cc9640b66af56c7f676235561a479cc5db77",
      "9df356fecc13593e6c8c9728c3ce5d7c63050e78ccc079dbba3e8f71125e681a",
      "da17ac5d45a1b0c50260c7e411bf342ba2a41c9c824bb3b6404e5330a585a057"
    ],
    [
      "9e16f03fbcbbbea782052c7b9d693308569a1f772d44fdaa26966ce6da4656ae",
      "361a0c32e2545bce8175c2776389dccbef7a0b63a96daee9b04ef16f82b27add",
      "da17ac5d45a1b0c50260c7e411bf342ba2a41c9c824bb3b6404e5330a585a057"
    ],
    [
      "1978dfd947afc4bf5f310cba84adea07f7a92930854cf7f6e8def81a3afa3062",
      "361a0c32e2545bce8175c2776389dccbef7a0b63a96daee9b04ef16f82b27add",
      "da17ac5d45a1b0c50260c7e411bf342ba2a41c9c824bb3b6404e5330a585a057"
    ]
  ]
} as const;
