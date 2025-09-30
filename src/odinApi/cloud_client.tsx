import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

type FreqModeDays = Array<FreqModeDay>;
type FreqModeDay = {
  day: string;
  freqmode: number;
  count: number;
};
type HTTPValidationError = Partial<{
  detail: Array<ValidationError>;
}>;
type ValidationError = {
  loc: Array<(string | number) | Array<string | number>>;
  msg: string;
  type: string;
};
type Product = {
  name: string;
  scanid: number;
  data: ProductData;
};
type ProductData = {
  vmr: Array<number | null>;
  meas_resp: Array<number>;
  temp: Array<number>;
  pressure: Array<number>;
  alt: Array<number>;
};
type Products = Array<Product>;
type Scans = Array<Scan>;
type Scan = {
  scanid: number;
  lat: number;
  lon: number;
};

const FreqModeDay: z.ZodType<FreqModeDay> = z
  .object({
    day: z.string(),
    freqmode: z.number().int(),
    count: z.number().int(),
  })
  .strict()
  .passthrough();
const FreqModeDays: z.ZodType<FreqModeDays> = z.array(FreqModeDay);
const DefaultError = z.object({ detail: z.string() }).strict().passthrough();
const ValidationError: z.ZodType<ValidationError> = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .strict()
  .passthrough();
const HTTPValidationError: z.ZodType<HTTPValidationError> = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .strict()
  .passthrough();
const Scan: z.ZodType<Scan> = z
  .object({ scanid: z.number().int(), lat: z.number(), lon: z.number() })
  .strict()
  .passthrough();
const Scans: z.ZodType<Scans> = z.array(Scan);
const ProductData: z.ZodType<ProductData> = z
  .object({
    vmr: z.array(z.number().nullable()),
    meas_resp: z.array(z.number()),
    temp: z.array(z.number()),
    pressure: z.array(z.number()),
    alt: z.array(z.number()),
  })
  .strict()
  .passthrough();
const Product: z.ZodType<Product> = z
  .object({ name: z.string(), scanid: z.number().int(), data: ProductData })
  .strict()
  .passthrough();
const Products: z.ZodType<Products> = z.array(Product);

export const schemas = {
  FreqModeDay,
  FreqModeDays,
  DefaultError,
  ValidationError,
  HTTPValidationError,
  Scan,
  Scans,
  ProductData,
  Product,
  Products,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/calendar",
    alias: "l2_calendar_calendar_get",
    requestFormat: "json",
    parameters: [
      {
        name: "year",
        type: "Query",
        schema: z.number().int().gte(2000).lte(2050),
      },
      {
        name: "month",
        type: "Query",
        schema: z.number().int().gte(1).lte(12),
      },
    ],
    response: z.array(FreqModeDay),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 424,
        description: `Failed Dependency`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/products",
    alias: "products_products_get",
    requestFormat: "json",
    parameters: [
      {
        name: "day",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "scanid",
        type: "Query",
        schema: z.number().int(),
      },
    ],
    response: z.array(Product),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 424,
        description: `Failed Dependency`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
    ],
  },
  {
    method: "get",
    path: "/scans",
    alias: "dayscans_scans_get",
    requestFormat: "json",
    parameters: [
      {
        name: "day",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "fm",
        type: "Query",
        schema: z.number().int(),
      },
    ],
    response: z.array(Scan),
    errors: [
      {
        status: 404,
        description: `Not Found`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 424,
        description: `Failed Dependency`,
        schema: z.object({ detail: z.string() }).strict().passthrough(),
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
