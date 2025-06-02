import { z } from "zod";

const Frequency = z.object({
  AppliedDopplerCorr: z.array(z.number()),
  ChannelsID: z.array(z.number()),
  IFreqGrid: z.array(z.number()),
  LOFreq: z.array(z.number()),
  SubBandIndex: z.array(z.array(z.number())),
});

const Entry = z.object({
  Altitude: z.array(z.number()),
  Apodization: z.array(z.number()),
  AttitudeVersion: z.array(z.number()),
  Backend: z.array(z.number()),
  Channels: z.array(z.number()),
  Dec2000: z.array(z.number()),
  Efftime: z.array(z.number()),
  FreqCal: z.array(z.number()),
  FreqMode: z.array(z.number()),
  FreqRes: z.array(z.number()),
  Frequency: Frequency,
  Frontend: z.array(z.number()),
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
  STW: z.array(z.number()),
  ScanID: z.array(z.number()),
  Spectrum: z.array(z.array(z.number())),
  SunPos: z.array(z.array(z.number())),
  SunZD: z.array(z.number()),
  TSpill: z.array(z.number()),
  Tcal: z.array(z.number()),
  Trec: z.array(z.number()),
  TrecSpectrum: z.array(z.number()),
  Version: z.array(z.number()),
  Vgeo: z.array(z.number()),
  ZeroLagVar: z.array(z.array(z.number())),
});
export const Schema = z.object({
  Type: z.string(),
  Count: z.number(),
  Data: z.array(Entry),
});

export type L1Data = z.infer<typeof Entry>;
export type L1DataResponse = z.infer<typeof Schema>;
