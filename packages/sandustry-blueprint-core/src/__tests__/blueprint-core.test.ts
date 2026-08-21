import assert from "node:assert/strict";
import { test } from "bun:test";
import * as core from "..";

test("blueprint core baseline", async () => {
  const fixture = {
    name: "Codec fixture",
    data: [
      { type: 12, x: 4, y: 7 },
      {
        type: "example.mod:machine",
        x: 9,
        y: 2,
        filter: { mode: "block", density: 3, elementType: 5 },
      },
      {
        type: "example.mod:machine",
        x: 10,
        y: 2,
        filter: { mode: "allow", elementType: [1, 2], affectsLiquid: true },
        data: { setting: "fast", enabled: true },
      },
    ],
    signalLinks: [{ from: { x: 4, y: 7 }, to: { x: 9, y: 2 }, on: true }],
  };

  assert.deepEqual(core.decodeBlueprint(core.encodeBlueprint(fixture)), fixture);
  assert.deepEqual(core.decodeBlueprint(core.encodeBlueprint(fixture, "text")), fixture);
  assert.deepEqual(
    core.decodeBlueprint(core.encodeBlueprint({ name: "Empty", data: [], signalLinks: null })),
    { name: "Empty", data: [], signalLinks: [] },
  );

  const preparedSvg = await core.prepareSvgForPng(
    `<svg class="map" style="color:red"><rect fill="#33a8ff"/><image href="catalog/machine.png"/></svg>`,
    {
      width: 64,
      height: 32,
      scale: 2,
      title: "Test & blueprint",
      includeBackground: false,
      resolveImage: async (source) => `data:image/png;base64,${source.length}`,
    },
  );
  assert.match(preparedSvg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(preparedSvg, /width="128"/);
  assert.match(preparedSvg, /height="64"/);
  assert.match(preparedSvg, /<title>Test &amp; blueprint<\/title>/);
  assert.doesNotMatch(preparedSvg, /#33a8ff/);
  assert.match(preparedSvg, /href="data:image\/png;base64,19"/);

  const renderModel = core.createBlueprintRenderModel(
    {
      name: "Render model",
      data: [
        { type: "machine", x: 4, y: 8 },
        { type: 11, x: 0, y: 0 },
      ],
      signalLinks: null,
    },
    {
      padding: 2,
      cell: 8,
      catalog: {
        get: (type) =>
          type === "machine"
            ? { name: "Machine", footprint: { width: 4, height: 4 }, z: 2 }
            : type === 11
              ? { name: "Foundation", footprint: { width: 4, height: 4 }, z: 0 }
              : undefined,
      },
    },
  );
  assert.deepEqual(
    renderModel.renderStructures.map(({ structure }) => structure.type),
    [11, "machine"],
  );
  assert.equal(renderModel.width, 96);
  assert.equal(renderModel.height, 128);
  assert.equal(core.tileColor("machine"), "#563d46");
  assert.deepEqual(core.wrapLabel("Signal Presence Sensor", 8), ["Signal", "Presence", "Sensor"]);

  const diagonalOutline = core.foundationOutlinePath(
    [
      {
        structure: { type: 11, x: 0, y: 0 },
        index: 0,
        footprint: { width: 1, height: 1 },
        topY: 0,
        visualTopY: 0,
        z: 0,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      },
      {
        structure: { type: 11, x: 1, y: 1 },
        index: 1,
        footprint: { width: 1, height: 1 },
        topY: 1,
        visualTopY: 1,
        z: 0,
        bounds: { minX: 1, minY: 1, maxX: 1, maxY: 1 },
      },
    ],
    0,
    0,
    0,
    1,
  );
  assert.equal((diagonalOutline.match(/M /g) ?? []).length, 1);

  const ringOutline = core.foundationOutlinePath(
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ].map(([x, y]) => ({
      structure: { type: 11, x, y },
      index: 0,
      footprint: { width: 1, height: 1 },
      topY: y,
      visualTopY: y,
      z: 0,
      bounds: { minX: x, minY: y, maxX: x, maxY: y },
    })),
    0,
    0,
    0,
    1,
  );
  assert.equal((ringOutline.match(/M /g) ?? []).length, 2);

  const renderedSvg = core.renderBlueprintToSvg(
    { name: "SVG fixture", data: [{ type: "machine", x: 0, y: 0 }], signalLinks: null },
    {
      padding: 1,
      cell: 8,
      catalog: {
        get: (type) =>
          type === "machine"
            ? {
                name: "Mill",
                footprint: { width: 4, height: 4 },
                renderAsset: { path: "machine.png", sourceSize: { width: 16, height: 16 } },
              }
            : undefined,
      },
      assetBaseUrl: "/assets/",
      showGrid: false,
      showFoundationOutlines: false,
      showSignalLinks: false,
      showNames: true,
    },
  );
  assert.match(renderedSvg.svg, /href="\/assets\/machine\.png"/);
  assert.match(renderedSvg.svg, /<text[^>]*>Mill<\/text>/);
  assert.match(renderedSvg.svg, /viewBox="0 0 48 48"/);

  const pngResult = await core.renderBlueprintStringToPng(
    core.encodeBlueprint({ name: "PNG string fixture", data: [], signalLinks: null }),
    {
      scale: 1,
      platform: {
        loadSvg: async (svg) => svg,
        createCanvas: (width, height) => ({ width, height }),
        drawImage: () => {},
        encodePng: async (canvas) => new Uint8Array([canvas.width, canvas.height]),
      },
    },
  );
  assert.deepEqual([...pngResult], [104, 104]);

  const relativeSignals = {
    name: "Relative signals",
    data: [
      { type: "signalBuffer", x: 0, y: 8 },
      { type: "signalToggle", x: 8, y: 8 },
      { type: "signalLamp", x: 16, y: 8 },
    ],
    signalLinks: [
      { from: { x: 0, y: 8 }, to: { x: 8, y: 8 }, on: false },
      { from: { x: 8, y: 8 }, to: { x: 16, y: 8 }, on: true },
    ],
  };
  const preparedRelative = core.prepareBlueprint(relativeSignals);
  assert.deepEqual(preparedRelative.signalCoordinateOffset, { x: 0, y: 0 });
  assert.deepEqual(preparedRelative.preparedSignalLinks[0].fromPoint, { x: 1.5, y: 9.5 });
  assert.equal(preparedRelative.preparedSignalLinks[0].path.kind, "line");
  assert.equal(preparedRelative.preparedSignalLinks[1].path.kind, "cubic");

  const statefulStructures = core.prepareBlueprint({
    name: "Stateful structures",
    data: [
      { type: "signalLamp", x: 0, y: 0, data: { spriteIndex: 1 } },
      { type: "signalGate", x: 8, y: 0, data: { desiredOpen: true } },
    ],
    signalLinks: null,
  });
  assert.equal(statefulStructures.preparedStructures[0].spriteIndex, 1);
  assert.equal(statefulStructures.preparedStructures[1].spriteIndex, 1);

  const preparedRecord = core.prepareBlueprint({
    name: "Prepared records",
    data: [
      {
        type: "wallLight",
        x: 0,
        y: 0,
        data: {
          state: { lightColor: [1, 0.5, 0] },
          __prefabulatorBlueprint: {
            definition: {
              shape: [
                [1, 0],
                [1, 1],
              ],
            },
          },
        },
      },
    ],
    signalLinks: null,
  });
  assert.equal(preparedRecord.preparedStructures[0].lightColor, "rgb(255, 128, 0)");
  assert.deepEqual(preparedRecord.preparedStructures[0].customShape, [
    [1, 0],
    [1, 1],
  ]);

  const absoluteSignals = {
    ...relativeSignals,
    signalLinks: relativeSignals.signalLinks.map((link) => ({
      ...link,
      from: { x: link.from.x + 2096, y: link.from.y + 1012 },
      to: { x: link.to.x + 2096, y: link.to.y + 1012 },
    })),
  };
  const preparedAbsolute = core.prepareBlueprint(absoluteSignals);
  assert.deepEqual(preparedAbsolute.signalCoordinateOffset, { x: 2096, y: 1012 });
  assert.deepEqual(
    preparedAbsolute.preparedSignalLinks.map(({ fromPoint, toPoint }) => ({ fromPoint, toPoint })),
    preparedRelative.preparedSignalLinks.map(({ fromPoint, toPoint }) => ({ fromPoint, toPoint })),
  );

  const catalogPrepared = core.prepareBlueprint(relativeSignals, {
    catalog: {
      get: (type) =>
        type === "signalBuffer"
          ? {
              footprint: { width: 4, height: 4 },
              signalPoints: { shared: { x: 0.5, y: 0.5 } },
              shape: [
                [1, 1],
                [1, 0],
              ],
            }
          : undefined,
    },
  });
  assert.deepEqual(catalogPrepared.preparedSignalLinks[0].fromPoint, { x: 0.5, y: 8.5 });
  assert.deepEqual(catalogPrepared.preparedStructures[0].footprint, { width: 2, height: 2 });
  assert.deepEqual(catalogPrepared.preparedStructures[0].shape, [
    [1, 1],
    [1, 0],
  ]);
  assert.equal(catalogPrepared.preparedStructures[0].z, 0.5);
  assert.deepEqual(catalogPrepared.bounds, { minX: 0, minY: 8, maxX: 16, maxY: 9 });

  const collectorPrepared = core.prepareBlueprint(
    {
      name: "Collector sprites",
      data: [
        { type: "collector", x: 0, y: 0 },
        { type: "collector", x: 4, y: 0 },
        { type: "collector", x: 0, y: 4 },
      ],
      signalLinks: null,
    },
    {
      catalog: {
        get: (type) =>
          type === "collector"
            ? { renderAsset: { animation: { topology: "collector" } } }
            : undefined,
      },
    },
  );
  assert.deepEqual(
    collectorPrepared.preparedStructures.map((prepared) => [
      prepared.sprite?.frameIndex,
      prepared.sprite?.rotation,
    ]),
    [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  );

  const oversizedTypeTable = [4, 1, 120, 65];
  for (let index = 0; index < 65; index++) oversizedTypeTable.push(0, index);
  oversizedTypeTable.push(1, 63, 0, 0, 0);
  const oversizedDecoded = core.decodeBlueprint(
    `SAND:BP:v2:${Buffer.from(oversizedTypeTable).toString("base64")}`,
  );
  assert.equal(oversizedDecoded.data.length, 1);
  assert.equal(oversizedDecoded.data[0].type, 63);

  const errors = [
    ["SAND:BP:v1:ignored", "Legacy v1 blueprint strings are not supported"],
    ["SAND:BACKUP:v1:ignored", "Legacy v1 blueprint strings are not supported"],
    ["SAND:BP:v2:not-base64!", "Invalid base64 blueprint data"],
    ["SAND:BP:v2t:4,1", "Invalid or truncated"],
    ["SAND:UNKNOWN:value", "Unsupported blueprint prefix"],
  ];
  for (const [input, message] of errors)
    assert.throws(() => core.decodeBlueprint(input), new RegExp(message));
  assert.throws(
    () => core.decodeBlueprint("SAND:BP:v2t:4,1,0,999"),
    /Invalid v2 text blueprint data/,
  );
});
