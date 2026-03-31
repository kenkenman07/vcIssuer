import { NextResponse } from "next/server";

export async function GET() {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://sr.oots.tech.ec.europa.eu/schemas/pid",
    title: "PID",
    description:
      "The schema defines a VCDM v1.1 compliant, minimal implementation of the EUDI Wallet PID rulebook for usage in the context of the EUDI Wallet - OOTS synergies PoC",
    type: "object",
    properties: {
      "@context": {
        description:
          "Semantic context for the issued credential. First element MUST be https://www.w3.org/2018/credentials/v1",
        type: "array",
        items: {
          type: "string",
          format: "uri",
        },
        contains: {
          const: "https://www.w3.org/2018/credentials/v1",
        },
        minItems: 1,
        uniqueItems: true,
      },
      type: {
        description:
          "Full type chain, used to identify the credential base types",
        type: "array",
        items: {
          type: "string",
        },
        contains: {
          type: "string",
          const: "eu.europa.ec.eudi.pid.1",
        },
        uniqueItems: true,
      },
      issuer: {
        description: "Defines the issuer of a Verifiable Credential",
        type: "string",
      },
      issued: {
        description:
          "Defines the date and time, when the credential was issued. issuance_date as per ARF",
        type: "string",
        format: "date-time",
      },
      issuanceDate: {
        description:
          "Defines the date and time, when the issued credential becomes valid",
        type: "string",
        format: "date-time",
      },
      expirationDate: {
        description:
          "Defines the date and time, when the issued credential expires. expiry_date as per ARF",
        type: "string",
        format: "date-time",
      },
      credentialSubject: {
        description:
          "Defines information about the subject that is defined by the type chain",
        anyOf: [
          {
            $ref: "#/$defs/PID",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/PID",
            },
          },
        ],
      },
      credentialStatus: {
        description:
          "Defines suspension and/or revocation details for the issued credential. Further redefined by the type extension",
        anyOf: [
          {
            $ref: "#/$defs/credentialStatus",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/credentialStatus",
            },
          },
        ],
      },
      credentialSchema: {
        description:
          "One or more schemas that validate the Verifiable Credential.",
        anyOf: [
          {
            $ref: "#/$defs/credentialSchema",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/credentialSchema",
            },
          },
        ],
      },
      termsOfUse: {
        description:
          "Contains the terms under which the issued credential was issued",
        anyOf: [
          {
            $ref: "#/$defs/termsOfUse",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/termsOfUse",
            },
          },
        ],
      },
      evidence: {
        description:
          "Contains the optional evidence used to issue this credential",
        anyOf: [
          {
            $ref: "#/$defs/evidence",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/evidence",
            },
          },
        ],
      },
    },
    required: [
      "@context",
      "type",
      "issuer",
      "issuanceDate",
      "expirationDate",
      "credentialSubject",
      "credentialSchema",
    ],
    $defs: {
      PID: {
        description:
          "Defines information about the subject that is defined by the type chain",
        type: "object",
        properties: {
          id: {
            description: "The subject identifier",
            type: "string",
          },
          givenName: {
            description:
              "The current first name(s), including middle name(s), of the PID user. given_name as per ARF",
            type: "string",
          },
          familyName: {
            description:
              "The current last name(s) or surname(s) of the PID user. family_name as per ARF",
            type: "string",
          },
          birthDate: {
            description:
              "Day, month, and year on which the PID user was born. birth_date as per ARF",
            type: "string",
            format: "date",
          },
          ageOver18: {
            description:
              "Attesting whether the PID user is currently an adult (true) or a minor (false). age_over_18 as per ARF",
            type: "string",
          },
          ageOver21: {
            description: "Attesting whether the PID user is over 21 years old",
            type: "string",
          },
          documentNumber: {
            description: "The document number of the PID",
            type: "string",
          },
          expiryDate: {
            description: "The expiry date of the document",
            type: "string",
            format: "date",
          },
          issueDate: {
            description: "The issue date of the document",
            type: "string",
            format: "date",
          },
          issuingCountry: {
            description: "The country that issued the document",
            type: "string",
          },
          issuingAuthority: {
            description: "The authority that issued the document",
            type: "string",
          },
        },
        required: [
          "id",
          "givenName",
          "familyName",
          "birthDate",
          "ageOver18",
          "ageOver21",
          "documentNumber",
          "expiryDate",
          "issueDate",
          "issuingCountry",
          "issuingAuthority",
        ],
      },
      address: {
        description: "Defines an address",
        type: "object",
        properties: {
          addressCountry: {
            description:
              "The country of the address as an Alpha-2 country code as specified in ISO 3166-1",
            type: "string",
            $ref: "#/$defs/countryCode",
          },
        },
      },
      credentialStatus: {
        description:
          "Defines suspension and/or revocation details for the issued credential. Further redefined by the type extension",
        type: "object",
        properties: {
          id: {
            description: "Exact identity for the credential status",
            type: "string",
            format: "uri",
          },
          type: {
            description: "Defines the revocation type extension",
            type: "string",
          },
        },
        required: ["id", "type"],
      },
      credentialSchema: {
        description:
          "Contains information about the credential schema on which the issued credential is based",
        type: "object",
        properties: {
          id: {
            description:
              "References the credential schema stored on the Trusted Schemas Registry (TSR) on which the Verifiable Authorisation is based on",
            type: "string",
            format: "uri",
          },
          type: {
            description: "Defines credential schema type",
            type: "string",
          },
        },
        required: ["id", "type"],
      },
      termsOfUse: {
        description:
          "Contains the terms under which the issued credential was issued",
        type: "object",
        properties: {
          id: {
            description:
              "Contains a URL that points to where more information about this instance of terms of use can be found.",
            type: "string",
          },
          type: {
            description: "Defines the type extension",
            type: "string",
          },
        },
        required: ["type"],
      },
      evidence: {
        type: "object",
        properties: {
          id: {
            description:
              "If present, it SHOULD contain a URL that points to where more information about this instance of evidence can be found.",
            type: "string",
          },
          type: {
            anyOf: [
              {
                description: "Defines the evidence type extension",
                type: "string",
              },
              {
                description: "Defines the evidence type extension",
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
          },
        },
        required: ["type"],
      },
      countryCode: {
        type: "string",
        enum: [
          "AD",
          "AE",
          "AF",
          "AG",
          "AI",
          "AL",
          "AM",
          "AO",
          "AQ",
          "AR",
          "AT",
          "AU",
          "AW",
          "AX",
          "AZ",
          "BA",
          "BB",
          "BD",
          "BE",
          "BF",
          "BG",
          "BH",
          "BI",
          "BJ",
          "BL",
          "BM",
          "BN",
          "BO",
          "BQ",
          "BR",
          "BS",
          "BT",
          "BV",
          "BW",
          "BY",
          "BZ",
          "CA",
          "CC",
          "CD",
          "CF",
          "CG",
          "CH",
          "CI",
          "CK",
          "CL",
          "CM",
          "CN",
          "CO",
          "CR",
          "CU",
          "CV",
          "CW",
          "CX",
          "CY",
          "CZ",
          "DE",
          "DJ",
          "DK",
          "DM",
          "DO",
          "DZ",
          "EC",
          "EE",
          "EG",
          "EH",
          "ER",
          "ES",
          "ET",
          "FI",
          "FJ",
          "FK",
          "FM",
          "FO",
          "FR",
          "GA",
          "GB",
          "GD",
          "GE",
          "GF",
          "GG",
          "GH",
          "GI",
          "GL",
          "GM",
          "GN",
          "GP",
          "GQ",
          "GR",
          "GS",
          "GT",
          "GU",
          "GW",
          "GY",
          "HK",
          "HM",
          "HN",
          "HR",
          "HT",
          "HU",
          "ID",
          "IE",
          "IL",
          "IM",
          "IN",
          "IO",
          "IQ",
          "IR",
          "IS",
          "IT",
          "JE",
          "JM",
          "JO",
          "JP",
          "KE",
          "KG",
          "KH",
          "KI",
          "KM",
          "KN",
          "KP",
          "KR",
          "KW",
          "KY",
          "KZ",
          "LA",
          "LB",
          "LC",
          "LI",
          "LK",
          "LR",
          "LS",
          "LT",
          "LU",
          "LV",
          "LY",
          "MA",
          "MC",
          "MD",
          "ME",
          "MF",
          "MG",
          "MH",
          "MK",
          "ML",
          "MM",
          "MN",
          "MO",
          "MP",
          "MQ",
          "MR",
          "MS",
          "MT",
          "MU",
          "MV",
          "MW",
          "MX",
          "MY",
          "MZ",
          "NA",
          "NC",
          "NE",
          "NF",
          "NG",
          "NI",
          "NL",
          "NO",
          "NP",
          "NR",
          "NU",
          "NZ",
          "OM",
          "PA",
          "PE",
          "PF",
          "PG",
          "PH",
          "PK",
          "PL",
          "PM",
          "PN",
          "PR",
          "PS",
          "PT",
          "PW",
          "PY",
          "QA",
          "RE",
          "RO",
          "RS",
          "RU",
          "RW",
          "SA",
          "SB",
          "SC",
          "SD",
          "SE",
          "SG",
          "SH",
          "SI",
          "SJ",
          "SK",
          "SL",
          "SM",
          "SN",
          "SO",
          "SR",
          "SS",
          "ST",
          "SV",
          "SX",
          "SY",
          "SZ",
          "TC",
          "TD",
          "TF",
          "TG",
          "TH",
          "TJ",
          "TK",
          "TL",
          "TM",
          "TN",
          "TO",
          "TR",
          "TT",
          "TV",
          "TW",
          "TZ",
          "UA",
          "UG",
          "UM",
          "US",
          "UY",
          "UZ",
          "VA",
          "VC",
          "VE",
          "VG",
          "VI",
          "VN",
          "VU",
          "WF",
          "WS",
          "YE",
          "YT",
          "ZA",
          "ZM",
          "ZW",
        ],
      },
    },
  };

  return NextResponse.json(schema, {
    headers: {
      "Content-Type": "application/schema+json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}
