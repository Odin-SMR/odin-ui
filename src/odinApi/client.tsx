import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const Log = z
  .object({
    AltEnd: z.number(),
    AltStart: z.number(),
    DateTime: z.string(),
    FreqMode: z.number().int(),
    LatEnd: z.number(),
    LatStart: z.number(),
    LonEnd: z.number(),
    LonStart: z.number(),
    MJDEnd: z.number(),
    MJDStart: z.number(),
    NumSpec: z.number().int(),
    Quality: z.number().int(),
    ScanID: z.number().int(),
    SunZD: z.number(),
    URLS: z
      .object({
        "URL-apriori-HF": z.string(),
        "URL-apriori-CO2": z.string(),
        "URL-apriori-CH4": z.string(),
        "URL-apriori-CO": z.string(),
        "URL-apriori-HCl": z.string(),
        "URL-apriori-ClO": z.string(),
        "URL-apriori-O2": z.string(),
        "URL-apriori-HCN": z.string(),
        "URL-apriori-OBrO": z.string(),
        "URL-apriori-BrO": z.string(),
        "URL-apriori-HO2": z.string(),
        "URL-apriori-C2H2": z.string(),
        "URL-apriori-ClONO2": z.string(),
        "URL-apriori-OClO": z.string(),
        "URL-apriori-H2O": z.string(),
        "URL-apriori-SO2": z.string(),
        "URL-apriori-HI": z.string(),
        "URL-apriori-HOBr": z.string(),
        "URL-apriori-NH3": z.string(),
        "URL-apriori-CH3CN": z.string(),
        "URL-apriori-HBr": z.string(),
        "URL-apriori-C2H6": z.string(),
        "URL-apriori-HOCl": z.string(),
        "URL-apriori-O3": z.string(),
        "URL-apriori-Cl2O2": z.string(),
        "URL-apriori-HCOOH": z.string(),
        "URL-apriori-ClOOCl": z.string(),
        "URL-apriori-NO2": z.string(),
        "URL-apriori-H2CO": z.string(),
        "URL-apriori-NO": z.string(),
        "URL-apriori-CH3Cl": z.string(),
        "URL-apriori-N2O": z.string(),
        "URL-apriori-OCS": z.string(),
        "URL-apriori-N2": z.string(),
        "URL-apriori-COF2": z.string(),
        "URL-apriori-HNO3": z.string(),
        "URL-apriori-SF6": z.string(),
        "URL-apriori-H2S": z.string(),
        "URL-apriori-OH": z.string(),
        "URL-apriori-H2O2": z.string(),
        "URL-log": z.string(),
        "URL-ptz": z.string(),
        "URL-spectra": z.string(),
      })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const L1b = z
  .object({
    Altitude: z.array(z.number()),
    Apodization: z.array(z.number().int()),
    AttitudeVersion: z.array(z.number().int()),
    Backend: z.array(z.number().int()),
    Channels: z.array(z.number().int()),
    Dec2000: z.array(z.number()),
    Efftime: z.array(z.number()),
    FreqCal: z.array(z.array(z.number())),
    FreqMode: z.array(z.number().int()),
    FreqRes: z.array(z.number()),
    Frequency: z
      .object({
        AppliedDopplerCorr: z.array(z.number()),
        ChannelsID: z.array(z.number().int()),
        IFreqGrid: z.array(z.number()),
        LOFreq: z.array(z.number()),
        SubBandIndex: z.array(z.array(z.number().int())),
      })
      .partial()
      .strict()
      .passthrough(),
    Frontend: z.array(z.number().int()),
    GPSpos: z.array(z.array(z.number())),
    GPSvel: z.array(z.array(z.number())),
    IntTime: z.array(z.number()),
    Latitude: z.array(z.number()),
    Longitude: z.array(z.number()),
    MJD: z.array(z.number()),
    MoonPos: z.array(z.array(z.number())),
    Orbit: z.array(z.number()),
    Quality: z.array(z.number()),
    RA2000: z.array(z.number()),
    SBpath: z.array(z.number()),
    STW: z.array(z.number().int()),
    ScanID: z.array(z.number().int()),
    Spectrum: z.array(z.array(z.number())),
    SunPos: z.array(z.array(z.number())),
    SunZD: z.array(z.number()),
    TSpill: z.array(z.number()),
    Tcal: z.array(z.number()),
    Trec: z.array(z.number()),
    TrecSpectrum: z.array(z.number()),
    Version: z.array(z.number().int()),
    Vgeo: z.array(z.number()),
    ZeroLagVar: z.array(z.array(z.number())),
  })
  .partial()
  .strict()
  .passthrough();
const ptz = z
  .object({
    Altitude: z.array(z.number()),
    Latitude: z.number(),
    Longitude: z.number(),
    MJD: z.number(),
    Pressure: z.array(z.number()),
    Temperature: z.array(z.number()),
  })
  .partial()
  .strict()
  .passthrough();
const apriori = z
  .object({
    Pressure: z.array(z.number()),
    Altitude: z.array(z.number()),
    Species: z.string(),
    VMR: z.array(z.number()),
  })
  .partial()
  .strict()
  .passthrough();
const collocation = z
  .object({ Instrument: z.string(), Species: z.string(), URL: z.string() })
  .partial()
  .strict()
  .passthrough();
const freqmode_info = z
  .object({
    Date: z.string(),
    Backend: z.string(),
    FreqMode: z.number().int(),
    NumScan: z.number().int(),
    URL: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const level2_project = z
  .object({
    Name: z.string(),
    URLS: z
      .object({ "URL-project": z.string() })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const level2_project_freqmode = z
  .object({
    FreqMode: z.number().int(),
    URLS: z
      .object({
        "URL-scans": z.string(),
        "URL-failed": z.string(),
        "URL-comment": z.string(),
      })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const L2ProjectAnnotation = z
  .object({
    Text: z.string(),
    FreqMode: z.number().int(),
    CreatedAt: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const level2_scan_comment = z
  .object({
    Comment: z.string(),
    URLS: z
      .object({ "URL-scans": z.string(), "URL-failed": z.string() })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const level2_scan_info = z
  .object({
    ScanID: z.number().int(),
    Date: z.string(),
    URLS: z
      .object({
        "URL-level2": z.string(),
        "URL-spectra": z.string(),
        "URL-log": z.string(),
        "URL-ancillary": z.string(),
      })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const level2_failed_scan_info = z
  .object({
    ScanID: z.number().int(),
    Date: z.string(),
    Error: z.string(),
    URLS: z
      .object({
        "URL-level2": z.string(),
        "URL-spectra": z.string(),
        "URL-log": z.string(),
      })
      .partial()
      .strict()
      .passthrough(),
  })
  .partial()
  .strict()
  .passthrough();
const L2 = z
  .object({
    Product: z.string(),
    InvMode: z.string(),
    FreqMode: z.number().int(),
    ScanID: z.number().int(),
    MJD: z.number(),
    Lat1D: z.number(),
    Lon1D: z.number(),
    Quality: z.number(),
    Altitude: z.array(z.number()),
    Pressure: z.array(z.number()),
    Latitude: z.array(z.number()),
    Longitude: z.array(z.number()),
    Temperature: z.array(z.number()),
    ErrorTotal: z.array(z.number()),
    ErrorNoise: z.array(z.number()),
    MeasResponse: z.array(z.number()),
    Apriori: z.array(z.number()),
    VMR: z.array(z.number()),
    AVK: z.array(z.array(z.number())),
  })
  .partial()
  .strict()
  .passthrough();
const L2i = z
  .object({
    InvMode: z.string(),
    FreqMode: z.number().int(),
    ScanID: z.number().int(),
    ChannelsID: z.array(z.number().int()),
    STW: z.array(z.number().int()),
    FreqOffset: z.number(),
    MinLmFactor: z.number(),
    PointOffset: z.number(),
    Residual: z.number(),
    LOFreq: z.array(z.number()),
    BlineOffset: z.array(z.array(z.number())),
    FitSpectrum: z.array(z.array(z.number())),
    GenerationTime: z.string(),
  })
  .partial()
  .strict()
  .passthrough();
const L2c = z.string();
const L2anc = z
  .object({
    InvMode: z.string(),
    FreqMode: z.number().int(),
    ScanID: z.number().int(),
    MJD: z.number(),
    Orbit: z.number().int(),
    Lat1D: z.number(),
    Lon1D: z.number(),
    Latitude: z.array(z.number()),
    Longitude: z.array(z.number()),
    Pressure: z.array(z.number()),
    SZA1D: z.number(),
    SZA: z.array(z.number()),
    LST: z.number(),
    Theta: z.array(z.number()),
  })
  .partial()
  .strict()
  .passthrough();
const level2_product_name = z.string();

export const schemas = {
  Log,
  L1b,
  ptz,
  apriori,
  collocation,
  freqmode_info,
  level2_project,
  level2_project_freqmode,
  L2ProjectAnnotation,
  level2_scan_comment,
  level2_scan_info,
  level2_failed_scan_info,
  L2,
  L2i,
  L2c,
  L2anc,
  level2_product_name,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/rest_api/v5/freqmode_info/:date/",
    alias: "getRest_apiv5freqmode_infoDate",
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z
      .object({
        Date: z.string().optional(),
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(freqmode_info),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/freqmode_info/:date/:freqmode/",
    alias: "getRest_apiv5freqmode_infoDateFreqmode",
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(Log) })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/freqmode_info/:date/:freqmode/:scanno/",
    alias: "getRest_apiv5freqmode_infoDateFreqmodeScanno",
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: Log })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/:scanno/apriori/:species/",
    alias: "getRest_apiv5level1FreqmodeScannoaprioriSpecies",
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "species",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "aprsource",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: apriori })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/:scanno/collocations/",
    alias: "getRest_apiv5level1FreqmodeScannocollocations",
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(collocation),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/:scanno/L1b/",
    alias: "getRest_apiv5level1FreqmodeScannoL1b",
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "debug",
        type: "Query",
        schema: z.boolean().optional(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int().nullable(), Data: L1b })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/:scanno/Log/",
    alias: "getRest_apiv5level1FreqmodeScannoLog",
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: Log })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/:scanno/ptz/",
    alias: "getRest_apiv5level1FreqmodeScannoptz",
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: ptz })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level1/:freqmode/scans/",
    alias: "getRest_apiv5level1Freqmodescans",
    description: `Get log info for scans in period and freqmode from cached table. Apriori URLs are by default only returned for requested species, use &#x27;apriori&#x3D;all&#x27; to override this. Species names are case sensitive, invalid species names will be ignored - see data documentation for information on available apriori data.`,
    requestFormat: "json",
    parameters: [
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "apriori",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(Log) })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/",
    alias: "getRest_apiv5level2Project",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_project_freqmode),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:date/",
    alias: "getRest_apiv5level2ProjectDate",
    description: `Get data for a certain day

Choose between min/max altitude and min/max pressure.

Example query:

    product&#x3D;p1&amp;product&#x3D;p2&amp;min_pressure&#x3D;1000&amp;max_pressure&#x3D;1000`,
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "date",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "product",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "min_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_scanid",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "document_limit",
        type: "Query",
        schema: z.number().int().optional().default(50000),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(L2) })
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `Unsupported query`,
        schema: z
          .object({ Error: z.string() })
          .partial()
          .strict()
          .passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/:scanno/",
    alias: "getRest_apiv5level2ProjectFreqmodeScanno",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z
          .object({
            L2: z
              .object({
                Type: z.string(),
                Count: z.number().int(),
                Data: z.array(L2),
              })
              .strict()
              .passthrough(),
            L2i: z
              .object({ Type: z.string(), Count: z.number().int(), Data: L2i })
              .strict()
              .passthrough(),
            L2c: z
              .object({
                Type: z.string(),
                Count: z.number().int(),
                Data: z.array(L2c),
              })
              .strict()
              .passthrough(),
            L2anc: z
              .object({
                Type: z.string(),
                Count: z.number().int(),
                Data: z.array(L2anc),
              })
              .strict()
              .passthrough(),
          })
          .strict()
          .passthrough(),
      })
      .partial()
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/:scanno/L2/",
    alias: "getRest_apiv5level2ProjectFreqmodeScannoL2",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "product",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(L2) })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/:scanno/L2anc/",
    alias: "getRest_apiv5level2ProjectFreqmodeScannoL2anc",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(L2anc),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/:scanno/L2c/",
    alias: "getRest_apiv5level2ProjectFreqmodeScannoL2c",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(L2c) })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/:scanno/L2i/",
    alias: "getRest_apiv5level2ProjectFreqmodeScannoL2i",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "scanno",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: L2i })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/comments/",
    alias: "getRest_apiv5level2ProjectFreqmodecomments",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "offset",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(1000),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_scan_comment),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/failed/",
    alias: "getRest_apiv5level2ProjectFreqmodefailed",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "comment",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "offset",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(1000),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_failed_scan_info),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/products/",
    alias: "getRest_apiv5level2ProjectFreqmodeproducts",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_product_name),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/:freqmode/scans/",
    alias: "getRest_apiv5level2ProjectFreqmodescans",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "freqmode",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "comment",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(1000),
      },
      {
        name: "offset",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_scan_info),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/annotations",
    alias: "getRest_apiv5level2Projectannotations",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(L2ProjectAnnotation),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/area",
    alias: "getRest_apiv5level2Projectarea",
    description: `Get data for a certain area

Provide latitude and/or longitude limits to get data for a certain area of the earth.

If no latitude or longitude limits are provided, data for the whole earth is returned.

Choose between min/max altitude and min/max pressure.
Example url parameters:

    product&#x3D;p1&amp;product&#x3D;p2&amp;min_pressure&#x3D;100&amp;max_pressure&#x3D;100&amp;start_time&#x3D;2015-10-11&amp;end_time&#x3D;2016-02-20&amp;min_lat&#x3D;-80&amp;max_lat&#x3D;-70&amp;min_lon&#x3D;150&amp;max_lon&#x3D;200`,
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "product",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "min_lat",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_lat",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_lon",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_lon",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "min_scanid",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "document_limit",
        type: "Query",
        schema: z.number().int().optional().default(50000),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(L2) })
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `Unsupported query`,
        schema: z
          .object({ Error: z.string() })
          .partial()
          .strict()
          .passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/locations",
    alias: "getRest_apiv5level2Projectlocations",
    description: `Provide one or more locations and a radius to get data within the resulting circles on the earth surface.

Choose between min/max altitude and min/max pressure.

Example query:

   product&#x3D;p1&amp;product&#x3D;p2&amp;min_pressure&#x3D;100&amp;max_pressure&#x3D;1000&amp;start_time&#x3D;2015-10-11&amp;end_time&#x3D;2016-02-20&amp;radius&#x3D;100&amp;location&#x3D;-24.0,200.0&amp;location&#x3D;-30.0,210.0`,
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "product",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "location",
        type: "Query",
        schema: z.array(z.string()),
      },
      {
        name: "radius",
        type: "Query",
        schema: z.number(),
      },
      {
        name: "min_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_pressure",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "min_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "max_altitude",
        type: "Query",
        schema: z.number().optional(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "min_scanid",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "document_limit",
        type: "Query",
        schema: z.number().int().optional().default(50000),
      },
    ],
    response: z
      .object({ Type: z.string(), Count: z.number().int(), Data: z.array(L2) })
      .strict()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `Unsupported query`,
        schema: z
          .object({ Error: z.string() })
          .partial()
          .strict()
          .passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/:project/products/",
    alias: "getRest_apiv5level2Projectproducts",
    requestFormat: "json",
    parameters: [
      {
        name: "project",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_product_name),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/level2/projects/",
    alias: "getRest_apiv5level2projects",
    requestFormat: "json",
    response: z
      .object({
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(level2_project),
      })
      .strict()
      .passthrough(),
  },
  {
    method: "get",
    path: "/rest_api/v5/period_info/:year/:month/:day/",
    alias: "getRest_apiv5period_infoYearMonthDay",
    description: `This is used to populate the calendar. The default length of the period is six weeks, just enough to fill a full calendar view.`,
    requestFormat: "json",
    parameters: [
      {
        name: "year",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "month",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "day",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "length",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: z
      .object({
        PeriodStart: z.string().optional(),
        PeriodEnd: z.string().optional(),
        Type: z.string(),
        Count: z.number().int(),
        Data: z.array(freqmode_info),
      })
      .strict()
      .passthrough(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
