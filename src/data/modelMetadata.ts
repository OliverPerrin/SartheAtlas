// Public model metadata snapshot, poster sizes verified 2026-10-01.
// Source: https://api.sketchfab.com/v3/models/{id}. No mesh files are downloaded.
export type PosterVariant = {
  width: number;
  height: number;
  url: string;
  bytes?: number;
};
export type ModelMetadata = {
  modelTitle: string;
  poster: string;
  posterVariants?: readonly PosterVariant[];
  triangles: number;
  publishedAt: string;
  sourceUrl: string;
  authorUrl: string;
  licenseLabel: string;
};
export const modelMetadata: Record<string, ModelMetadata> = {
  a463226115184535928ec75660c6571f: {
    modelTitle: "Ferrari 296 GT3 | www.vecarz.com",
    poster:
      "https://media.sketchfab.com/models/a463226115184535928ec75660c6571f/thumbnails/91d56afd980742a3a2d6fd0651dc028e/fd372d59a7e740d7a609a2f6b9c854a0.jpeg",
    triangles: 411750,
    publishedAt: "2025-07-27T12:29:05.545528",
    sourceUrl:
      "https://sketchfab.com/3d-models/ferrari-296-gt3-wwwvecarzcom-a463226115184535928ec75660c6571f",
    authorUrl: "https://sketchfab.com/heynic",
    licenseLabel: "CC Attribution-NonCommercial",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/a463226115184535928ec75660c6571f/thumbnails/91d56afd980742a3a2d6fd0651dc028e/1dcff6347f74441990eeafc47c7a23fb.jpeg",
        bytes: 11791,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/a463226115184535928ec75660c6571f/thumbnails/91d56afd980742a3a2d6fd0651dc028e/7cad232ad50b402dbb9e1c70414ae5ea.jpeg",
        bytes: 68948,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/a463226115184535928ec75660c6571f/thumbnails/91d56afd980742a3a2d6fd0651dc028e/3c97ac2b69074cd9ad6a656b57c59e16.jpeg",
        bytes: 124834,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/a463226115184535928ec75660c6571f/thumbnails/91d56afd980742a3a2d6fd0651dc028e/fd372d59a7e740d7a609a2f6b9c854a0.jpeg",
        bytes: 440678,
      },
    ],
  },
  e5957ead88aa4f2996bc66073734d3d7: {
    modelTitle: "Ferrari 499P",
    poster:
      "https://media.sketchfab.com/models/e5957ead88aa4f2996bc66073734d3d7/thumbnails/be303c01738b4e34928cde506502eec4/ff80aac42e894bae9359d2169e48472b.jpeg",
    triangles: 1133757,
    publishedAt: "2024-01-07T23:55:52.526368",
    sourceUrl:
      "https://sketchfab.com/3d-models/ferrari-499p-e5957ead88aa4f2996bc66073734d3d7",
    authorUrl: "https://sketchfab.com/P212",
    licenseLabel: "Editorial",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/e5957ead88aa4f2996bc66073734d3d7/thumbnails/be303c01738b4e34928cde506502eec4/56dfa6f5fe01417a93595cc77ed60aa5.jpeg",
        bytes: 8793,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/e5957ead88aa4f2996bc66073734d3d7/thumbnails/be303c01738b4e34928cde506502eec4/239e09f2c39c4dd099e52dd30efaaf1d.jpeg",
        bytes: 43468,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/e5957ead88aa4f2996bc66073734d3d7/thumbnails/be303c01738b4e34928cde506502eec4/474ad3ba33a04365b066509ab6fcddfd.jpeg",
        bytes: 74160,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/e5957ead88aa4f2996bc66073734d3d7/thumbnails/be303c01738b4e34928cde506502eec4/ff80aac42e894bae9359d2169e48472b.jpeg",
        bytes: 240886,
      },
    ],
  },
  "9d9800d56b754f65acfba6f91966a5c3": {
    modelTitle: "2026 Toyota TR010 (read description)",
    poster:
      "https://media.sketchfab.com/models/9d9800d56b754f65acfba6f91966a5c3/thumbnails/3b33d1ce61f747ba87ec1ef5f947dbac/8c11cf829ff747f3b58d7da57351a23f.jpeg",
    triangles: 393549,
    publishedAt: "2026-07-21T20:52:30.402748",
    sourceUrl:
      "https://sketchfab.com/3d-models/2026-toyota-tr010-read-description-9d9800d56b754f65acfba6f91966a5c3",
    authorUrl: "https://sketchfab.com/LMP12",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/9d9800d56b754f65acfba6f91966a5c3/thumbnails/3b33d1ce61f747ba87ec1ef5f947dbac/dc19af2fa7964b9bbbfd077e52e7027d.jpeg",
        bytes: 5653,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/9d9800d56b754f65acfba6f91966a5c3/thumbnails/3b33d1ce61f747ba87ec1ef5f947dbac/0cd4e0d5d5744b668508f2b4327bcebe.jpeg",
        bytes: 28960,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/9d9800d56b754f65acfba6f91966a5c3/thumbnails/3b33d1ce61f747ba87ec1ef5f947dbac/e0c4fe64d67d4df685f724377373a497.jpeg",
        bytes: 49448,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/9d9800d56b754f65acfba6f91966a5c3/thumbnails/3b33d1ce61f747ba87ec1ef5f947dbac/8c11cf829ff747f3b58d7da57351a23f.jpeg",
        bytes: 137709,
      },
    ],
  },
  "7daa766d301f4d489312b0922d4bdc0d": {
    modelTitle: "Aston Martin Valkyrie LM | www.vecarz.com",
    poster:
      "https://media.sketchfab.com/models/7daa766d301f4d489312b0922d4bdc0d/thumbnails/3a632296c3594ba4bdac368bf0ea657a/7c0c19d4aad84f9b8328d649e4cc9873.jpeg",
    triangles: 344411,
    publishedAt: "2025-10-09T15:20:34.884889",
    sourceUrl:
      "https://sketchfab.com/3d-models/aston-martin-valkyrie-lm-wwwvecarzcom-7daa766d301f4d489312b0922d4bdc0d",
    authorUrl: "https://sketchfab.com/heynic",
    licenseLabel: "CC Attribution-NonCommercial-ShareAlike",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/7daa766d301f4d489312b0922d4bdc0d/thumbnails/3a632296c3594ba4bdac368bf0ea657a/865d0d449e484d4a90cda248ceb60358.jpeg",
        bytes: 3713,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/7daa766d301f4d489312b0922d4bdc0d/thumbnails/3a632296c3594ba4bdac368bf0ea657a/205b816df1a9495c8f40375e24b51ed9.jpeg",
        bytes: 22103,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/7daa766d301f4d489312b0922d4bdc0d/thumbnails/3a632296c3594ba4bdac368bf0ea657a/d9498e718d3643da8d20be752255ddbe.jpeg",
        bytes: 41891,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/7daa766d301f4d489312b0922d4bdc0d/thumbnails/3a632296c3594ba4bdac368bf0ea657a/7c0c19d4aad84f9b8328d649e4cc9873.jpeg",
        bytes: 174890,
      },
    ],
  },
  "171bd5faf6824674b73162143e1e70f9": {
    modelTitle: "2023 | Cadillac V-Series.R",
    poster:
      "https://media.sketchfab.com/models/171bd5faf6824674b73162143e1e70f9/thumbnails/e877694e4111400f95c136140f26cd3a/363262745a054774933196ff06f2f033.jpeg",
    triangles: 440625,
    publishedAt: "2024-09-24T15:46:07.614264",
    sourceUrl:
      "https://sketchfab.com/3d-models/2023-cadillac-v-seriesr-171bd5faf6824674b73162143e1e70f9",
    authorUrl: "https://sketchfab.com/sohyalebret",
    licenseLabel: "Not specified",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/171bd5faf6824674b73162143e1e70f9/thumbnails/e877694e4111400f95c136140f26cd3a/0d36e2efdf374ae682fe2de35882646c.jpeg",
        bytes: 7935,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/171bd5faf6824674b73162143e1e70f9/thumbnails/e877694e4111400f95c136140f26cd3a/36be23f5b56443ce9e804507213bdccc.jpeg",
        bytes: 38924,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/171bd5faf6824674b73162143e1e70f9/thumbnails/e877694e4111400f95c136140f26cd3a/22acf7f7bda04ccaba03fd122c9e9028.jpeg",
        bytes: 65452,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/171bd5faf6824674b73162143e1e70f9/thumbnails/e877694e4111400f95c136140f26cd3a/363262745a054774933196ff06f2f033.jpeg",
        bytes: 181373,
      },
    ],
  },
  "9871477854b64e82bd43438eb9b940fd": {
    modelTitle: "BMW M Hybrid V8",
    poster:
      "https://media.sketchfab.com/models/9871477854b64e82bd43438eb9b940fd/thumbnails/2c0a4e65180541b9b5ba1ea818e8c089/a536cab895274f379a35cd3e37fca0a1.jpeg",
    triangles: 432150,
    publishedAt: "2024-12-08T06:44:12.144548",
    sourceUrl:
      "https://sketchfab.com/3d-models/bmw-m-hybrid-v8-9871477854b64e82bd43438eb9b940fd",
    authorUrl: "https://sketchfab.com/JUSTGAME",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/9871477854b64e82bd43438eb9b940fd/thumbnails/2c0a4e65180541b9b5ba1ea818e8c089/2dc9efa7cd984b1289ce5a57a0480e21.jpeg",
        bytes: 5769,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/9871477854b64e82bd43438eb9b940fd/thumbnails/2c0a4e65180541b9b5ba1ea818e8c089/e8f8756d386b49a7b24f2656273ddf17.jpeg",
        bytes: 28709,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/9871477854b64e82bd43438eb9b940fd/thumbnails/2c0a4e65180541b9b5ba1ea818e8c089/32422d02a86946f1bdceb29054843de5.jpeg",
        bytes: 55940,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/9871477854b64e82bd43438eb9b940fd/thumbnails/2c0a4e65180541b9b5ba1ea818e8c089/a536cab895274f379a35cd3e37fca0a1.jpeg",
        bytes: 442177,
      },
    ],
  },
  b78356b7cea64044839219c44329ff82: {
    modelTitle: "2026 Genesis GMR-001 Hypercar",
    poster:
      "https://media.sketchfab.com/models/b78356b7cea64044839219c44329ff82/thumbnails/2d18681673b9486391cd5b82a38d5460/7c598b04a8f34b19b024d6024c150e1d.jpeg",
    triangles: 383628,
    publishedAt: "2026-06-19T01:42:11.981773",
    sourceUrl:
      "https://sketchfab.com/3d-models/2026-genesis-gmr-001-hypercar-b78356b7cea64044839219c44329ff82",
    authorUrl: "https://sketchfab.com/LMP12",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/b78356b7cea64044839219c44329ff82/thumbnails/2d18681673b9486391cd5b82a38d5460/9ce618b929044f49b5b482edd0b65d3c.jpeg",
        bytes: 2826,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/b78356b7cea64044839219c44329ff82/thumbnails/2d18681673b9486391cd5b82a38d5460/ce033b4164a5439d98f8f2619a4898f1.jpeg",
        bytes: 13989,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/b78356b7cea64044839219c44329ff82/thumbnails/2d18681673b9486391cd5b82a38d5460/75f5451e71a049a7937f0446e00d6510.jpeg",
        bytes: 24573,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/b78356b7cea64044839219c44329ff82/thumbnails/2d18681673b9486391cd5b82a38d5460/7c598b04a8f34b19b024d6024c150e1d.jpeg",
        bytes: 73922,
      },
    ],
  },
  a9e29a73196244979cce065fe25f9589: {
    modelTitle: "2024 Alpine Racing A424",
    poster:
      "https://media.sketchfab.com/models/a9e29a73196244979cce065fe25f9589/thumbnails/8fe05c4fe0994be39ac9ef4bc6559944/f7ec54f6907b47b0a6e11a50f4f3bf7c.jpeg",
    triangles: 471685,
    publishedAt: "2026-06-14T06:47:02.382655",
    sourceUrl:
      "https://sketchfab.com/3d-models/2024-alpine-racing-a424-a9e29a73196244979cce065fe25f9589",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/a9e29a73196244979cce065fe25f9589/thumbnails/8fe05c4fe0994be39ac9ef4bc6559944/4f0181df9d70458c830eb3ea4e5af2ea.jpeg",
        bytes: 9728,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/a9e29a73196244979cce065fe25f9589/thumbnails/8fe05c4fe0994be39ac9ef4bc6559944/d70d4eb0e043475093f09c2b215337d4.jpeg",
        bytes: 48701,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/a9e29a73196244979cce065fe25f9589/thumbnails/8fe05c4fe0994be39ac9ef4bc6559944/241cfa9d8d6049e8a1ebafac64562155.jpeg",
        bytes: 82523,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/a9e29a73196244979cce065fe25f9589/thumbnails/8fe05c4fe0994be39ac9ef4bc6559944/f7ec54f6907b47b0a6e11a50f4f3bf7c.jpeg",
        bytes: 243752,
      },
    ],
  },
  b3efbf3a774c4411983e630d764c8cea: {
    modelTitle: "2024 | Peugeot 9X8 EVO",
    poster:
      "https://media.sketchfab.com/models/b3efbf3a774c4411983e630d764c8cea/thumbnails/635ea1cadf24450a90a8186f0cd0bc85/bd06d381a01d4e43a07c094bd9a47b16.jpeg",
    triangles: 350020,
    publishedAt: "2025-01-25T09:02:40.552119",
    sourceUrl:
      "https://sketchfab.com/3d-models/2024-peugeot-9x8-evo-b3efbf3a774c4411983e630d764c8cea",
    authorUrl: "https://sketchfab.com/sohyalebret",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/b3efbf3a774c4411983e630d764c8cea/thumbnails/635ea1cadf24450a90a8186f0cd0bc85/4dec6d7f356741f2a03486ab7c648719.jpeg",
        bytes: 9574,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/b3efbf3a774c4411983e630d764c8cea/thumbnails/635ea1cadf24450a90a8186f0cd0bc85/8ada250f400c4d90aebbf283252199df.jpeg",
        bytes: 48428,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/b3efbf3a774c4411983e630d764c8cea/thumbnails/635ea1cadf24450a90a8186f0cd0bc85/38a0289bf5384385882704ec08465e73.jpeg",
        bytes: 82986,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/b3efbf3a774c4411983e630d764c8cea/thumbnails/635ea1cadf24450a90a8186f0cd0bc85/bd06d381a01d4e43a07c094bd9a47b16.jpeg",
        bytes: 238138,
      },
    ],
  },
  c2517d31955e48ae9e1b83dfe0dfc382: {
    modelTitle: "Oreca 07 LMP2",
    poster:
      "https://media.sketchfab.com/models/c2517d31955e48ae9e1b83dfe0dfc382/thumbnails/c3a70058267d4485af22cd6d08880be7/1c2bc3a93a9c4bef95ce535b3c0d9cdb.jpeg",
    triangles: 121525,
    publishedAt: "2017-08-28T13:56:47.115895",
    sourceUrl:
      "https://sketchfab.com/3d-models/oreca-07-lmp2-c2517d31955e48ae9e1b83dfe0dfc382",
    authorUrl: "https://sketchfab.com/todormalakchiev",
    licenseLabel: "Not specified",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/c2517d31955e48ae9e1b83dfe0dfc382/thumbnails/c3a70058267d4485af22cd6d08880be7/4b480854b3874f569847afb148721215.jpeg",
        bytes: 5067,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/c2517d31955e48ae9e1b83dfe0dfc382/thumbnails/c3a70058267d4485af22cd6d08880be7/e365b4e3f116486ea1825c6bb83707e6.jpeg",
        bytes: 24035,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/c2517d31955e48ae9e1b83dfe0dfc382/thumbnails/c3a70058267d4485af22cd6d08880be7/533749bdeb1d4c419828adbbd2f79374.jpeg",
        bytes: 40319,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/c2517d31955e48ae9e1b83dfe0dfc382/thumbnails/c3a70058267d4485af22cd6d08880be7/1c2bc3a93a9c4bef95ce535b3c0d9cdb.jpeg",
        bytes: 139038,
      },
    ],
  },
  "2752ec60ebad4b7496dd3dc7005eca90": {
    modelTitle: "Chevrolet Corvette C8 Z06 GT3",
    poster:
      "https://media.sketchfab.com/models/2752ec60ebad4b7496dd3dc7005eca90/thumbnails/71948b7ca48144f29ce47a2e43d33a71/275a68d385ed472dbe8704bb51bf4f6c.jpeg",
    triangles: 217319,
    publishedAt: "2026-08-17T12:40:34.787907",
    sourceUrl:
      "https://sketchfab.com/3d-models/chevrolet-corvette-c8-z06-gt3-2752ec60ebad4b7496dd3dc7005eca90",
    authorUrl: "https://sketchfab.com/patricars",
    licenseLabel: "Not specified",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/2752ec60ebad4b7496dd3dc7005eca90/thumbnails/71948b7ca48144f29ce47a2e43d33a71/050ce32e23034f43943788dcd34b6c28.jpeg",
        bytes: 8875,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/2752ec60ebad4b7496dd3dc7005eca90/thumbnails/71948b7ca48144f29ce47a2e43d33a71/3c42f0b2343342168de34601f12e59fc.jpeg",
        bytes: 45973,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/2752ec60ebad4b7496dd3dc7005eca90/thumbnails/71948b7ca48144f29ce47a2e43d33a71/74d6b243556345498e8e488cde38e950.jpeg",
        bytes: 79058,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/2752ec60ebad4b7496dd3dc7005eca90/thumbnails/71948b7ca48144f29ce47a2e43d33a71/275a68d385ed472dbe8704bb51bf4f6c.jpeg",
        bytes: 251270,
      },
    ],
  },
  e44e0ec2dc864c08bf68b062bf32d7d3: {
    modelTitle: "McLAREN 720S LMGT3 Evo",
    poster:
      "https://media.sketchfab.com/models/e44e0ec2dc864c08bf68b062bf32d7d3/thumbnails/d75c4577f52d43209c5f34484983463e/73d812567f074252ac564c7cac5925e7.jpeg",
    triangles: 361531,
    publishedAt: "2025-06-19T20:53:28.982275",
    sourceUrl:
      "https://sketchfab.com/3d-models/mclaren-720s-lmgt3-evo-e44e0ec2dc864c08bf68b062bf32d7d3",
    authorUrl: "https://sketchfab.com/MattDoesBlender",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/e44e0ec2dc864c08bf68b062bf32d7d3/thumbnails/d75c4577f52d43209c5f34484983463e/f523a1cafa8d4fc0add2d71af41d7c1b.jpeg",
        bytes: 3151,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/e44e0ec2dc864c08bf68b062bf32d7d3/thumbnails/d75c4577f52d43209c5f34484983463e/0c3554f85e054ccfb6170136f28c00c2.jpeg",
        bytes: 19010,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/e44e0ec2dc864c08bf68b062bf32d7d3/thumbnails/d75c4577f52d43209c5f34484983463e/26a8c392b8ab44999aeb904cf368f5ac.jpeg",
        bytes: 39401,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/e44e0ec2dc864c08bf68b062bf32d7d3/thumbnails/d75c4577f52d43209c5f34484983463e/73d812567f074252ac564c7cac5925e7.jpeg",
        bytes: 256304,
      },
    ],
  },
  b42382f18f024251bb5c23bb21cb3410: {
    modelTitle: "Vantage GT3 Evo Heart Of Racing",
    poster:
      "https://media.sketchfab.com/models/b42382f18f024251bb5c23bb21cb3410/thumbnails/be12cff2b3424c1ebf6966227ec031da/b8fd6006acc44b9097703c991ee9314d.jpeg",
    triangles: 378247,
    publishedAt: "2026-03-25T13:58:39.086335",
    sourceUrl:
      "https://sketchfab.com/3d-models/vantage-gt3-evo-heart-of-racing-b42382f18f024251bb5c23bb21cb3410",
    authorUrl: "https://sketchfab.com/toddeppe",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/b42382f18f024251bb5c23bb21cb3410/thumbnails/be12cff2b3424c1ebf6966227ec031da/a4095e9dc65d4a7f912c1e5333c4c738.jpeg",
        bytes: 5270,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/b42382f18f024251bb5c23bb21cb3410/thumbnails/be12cff2b3424c1ebf6966227ec031da/74edba0f9bac43dab47d836c71a383f2.jpeg",
        bytes: 25561,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/b42382f18f024251bb5c23bb21cb3410/thumbnails/be12cff2b3424c1ebf6966227ec031da/a9673819d6d944e8a0af9e2b37607a8a.jpeg",
        bytes: 43710,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/b42382f18f024251bb5c23bb21cb3410/thumbnails/be12cff2b3424c1ebf6966227ec031da/b8fd6006acc44b9097703c991ee9314d.jpeg",
        bytes: 121509,
      },
    ],
  },
  "0feb1f9793c14b35971518a93a97d688": {
    modelTitle: "BMW M4 GT3 EVO",
    poster:
      "https://media.sketchfab.com/models/0feb1f9793c14b35971518a93a97d688/thumbnails/4aef6043f4e649b1af063ce910ed60f3/2f4beaeaf8b2456cb5c498f5e1644f11.jpeg",
    triangles: 523877,
    publishedAt: "2025-06-17T21:29:05.211466",
    sourceUrl:
      "https://sketchfab.com/3d-models/bmw-m4-gt3-evo-0feb1f9793c14b35971518a93a97d688",
    authorUrl: "https://sketchfab.com/MattDoesBlender",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/0feb1f9793c14b35971518a93a97d688/thumbnails/4aef6043f4e649b1af063ce910ed60f3/7ff006958eaf40cea77e26b893c7f8ce.jpeg",
        bytes: 3862,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/0feb1f9793c14b35971518a93a97d688/thumbnails/4aef6043f4e649b1af063ce910ed60f3/e5f3af2dc14c4ed49016f2680ae87353.jpeg",
        bytes: 19616,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/0feb1f9793c14b35971518a93a97d688/thumbnails/4aef6043f4e649b1af063ce910ed60f3/02cf38e7312d4682a8b6537f80a75922.jpeg",
        bytes: 33680,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/0feb1f9793c14b35971518a93a97d688/thumbnails/4aef6043f4e649b1af063ce910ed60f3/2f4beaeaf8b2456cb5c498f5e1644f11.jpeg",
        bytes: 96048,
      },
    ],
  },
  "146766480dc348dbb95ec03c1bf33d0d": {
    modelTitle: "2020 Mercedes-AMG GT3 Evo (C190)",
    poster:
      "https://media.sketchfab.com/models/146766480dc348dbb95ec03c1bf33d0d/thumbnails/e32ff521f15f4f3c9484bbbabd0edf05/043900dd258f47369c94f2f155356feb.jpeg",
    triangles: 496613,
    publishedAt: "2024-10-21T03:22:14.584505",
    sourceUrl:
      "https://sketchfab.com/3d-models/2020-mercedes-amg-gt3-evo-c190-146766480dc348dbb95ec03c1bf33d0d",
    authorUrl: "https://sketchfab.com/supercarmodels",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/146766480dc348dbb95ec03c1bf33d0d/thumbnails/e32ff521f15f4f3c9484bbbabd0edf05/85542c47d1a24e618fcd27b317275258.jpeg",
        bytes: 5341,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/146766480dc348dbb95ec03c1bf33d0d/thumbnails/e32ff521f15f4f3c9484bbbabd0edf05/a87a1e592c764f4496527124e2bc424f.jpeg",
        bytes: 26770,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/146766480dc348dbb95ec03c1bf33d0d/thumbnails/e32ff521f15f4f3c9484bbbabd0edf05/23c29e65b79a4e278b7b547c83dd3756.jpeg",
        bytes: 45001,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/146766480dc348dbb95ec03c1bf33d0d/thumbnails/e32ff521f15f4f3c9484bbbabd0edf05/043900dd258f47369c94f2f155356feb.jpeg",
        bytes: 120144,
      },
    ],
  },
  "061487e4e4fa4cd1bf7e15eae2e238ba": {
    modelTitle: "Ford Mustang GT3 | www.vecarz.com",
    poster:
      "https://media.sketchfab.com/models/061487e4e4fa4cd1bf7e15eae2e238ba/thumbnails/c0a1cd08432742cda1598e9bf2aba2a8/a2ee3d9af5394de0a17c80cf66e44db7.jpeg",
    triangles: 375545,
    publishedAt: "2026-07-24T15:51:32.688831",
    sourceUrl:
      "https://sketchfab.com/3d-models/ford-mustang-gt3-wwwvecarzcom-061487e4e4fa4cd1bf7e15eae2e238ba",
    authorUrl: "https://sketchfab.com/heynic",
    licenseLabel: "Not specified",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/061487e4e4fa4cd1bf7e15eae2e238ba/thumbnails/c0a1cd08432742cda1598e9bf2aba2a8/ee1b140f8d71422cbc0ece96e13468a6.jpeg",
        bytes: 3403,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/061487e4e4fa4cd1bf7e15eae2e238ba/thumbnails/c0a1cd08432742cda1598e9bf2aba2a8/76ec405e18014d50a2489d1d2f1c9d5f.jpeg",
        bytes: 19619,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/061487e4e4fa4cd1bf7e15eae2e238ba/thumbnails/c0a1cd08432742cda1598e9bf2aba2a8/afb33067b6734c44b2fccf068ee1a1b6.jpeg",
        bytes: 36573,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/061487e4e4fa4cd1bf7e15eae2e238ba/thumbnails/c0a1cd08432742cda1598e9bf2aba2a8/a2ee3d9af5394de0a17c80cf66e44db7.jpeg",
        bytes: 116893,
      },
    ],
  },
  "59cff926f1d9460abf1401c5118c54d6": {
    modelTitle: "Lexus RC F GT3 | www.vecarz.com",
    poster:
      "https://media.sketchfab.com/models/59cff926f1d9460abf1401c5118c54d6/thumbnails/6f3fcc36434d41df89c3c62ab7015df7/0647c3073444403c831a986fbe88a1e4.jpeg",
    triangles: 323649,
    publishedAt: "2026-03-08T10:13:35.536052",
    sourceUrl:
      "https://sketchfab.com/3d-models/lexus-rc-f-gt3-wwwvecarzcom-59cff926f1d9460abf1401c5118c54d6",
    authorUrl: "https://sketchfab.com/heynic",
    licenseLabel: "Not specified",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/59cff926f1d9460abf1401c5118c54d6/thumbnails/6f3fcc36434d41df89c3c62ab7015df7/07f1fbfa998c434b89c42f98a83ea480.jpeg",
        bytes: 4167,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/59cff926f1d9460abf1401c5118c54d6/thumbnails/6f3fcc36434d41df89c3c62ab7015df7/11d5876d6e284a9ba2f411ef23196f42.jpeg",
        bytes: 23591,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/59cff926f1d9460abf1401c5118c54d6/thumbnails/6f3fcc36434d41df89c3c62ab7015df7/3ff25a20320543d490e9d3d16ffd3f91.jpeg",
        bytes: 43900,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/59cff926f1d9460abf1401c5118c54d6/thumbnails/6f3fcc36434d41df89c3c62ab7015df7/0647c3073444403c831a986fbe88a1e4.jpeg",
        bytes: 190524,
      },
    ],
  },
  d634485e0b2a4b07b66150b525009a6f: {
    modelTitle: "2023 Porsche 911 GT3 R",
    poster:
      "https://media.sketchfab.com/models/d634485e0b2a4b07b66150b525009a6f/thumbnails/ea1f537e5a264d12932df6d6fdbbb22e/21420d802c044c74bdd97c3a73b0ef65.jpeg",
    triangles: 525871,
    publishedAt: "2024-10-19T17:03:47.551053",
    sourceUrl:
      "https://sketchfab.com/3d-models/2023-porsche-911-gt3-r-d634485e0b2a4b07b66150b525009a6f",
    authorUrl: "https://sketchfab.com/supercarmodels",
    licenseLabel: "CC Attribution",
    posterVariants: [
      {
        width: 256,
        height: 144,
        url: "https://media.sketchfab.com/models/d634485e0b2a4b07b66150b525009a6f/thumbnails/ea1f537e5a264d12932df6d6fdbbb22e/a660b4a3c56d4bb589a83be0abf3d965.jpeg",
        bytes: 3962,
      },
      {
        width: 720,
        height: 405,
        url: "https://media.sketchfab.com/models/d634485e0b2a4b07b66150b525009a6f/thumbnails/ea1f537e5a264d12932df6d6fdbbb22e/871685e0b7f642abb75547a9e7a697d2.jpeg",
        bytes: 19007,
      },
      {
        width: 1024,
        height: 576,
        url: "https://media.sketchfab.com/models/d634485e0b2a4b07b66150b525009a6f/thumbnails/ea1f537e5a264d12932df6d6fdbbb22e/8e7c6c1b07ec4884a70f3d55e53c2fca.jpeg",
        bytes: 32365,
      },
      {
        width: 1920,
        height: 1080,
        url: "https://media.sketchfab.com/models/d634485e0b2a4b07b66150b525009a6f/thumbnails/ea1f537e5a264d12932df6d6fdbbb22e/21420d802c044c74bdd97c3a73b0ef65.jpeg",
        bytes: 90844,
      },
    ],
  },
};
