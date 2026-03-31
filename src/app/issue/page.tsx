"use client";

import { useState, useEffect, SetStateAction } from "react";
import QRCode from "qrcode";
import Link from "next/link";

interface UserData {
  given_name: string;
  family_name: string;
  birth_date: string;
  document_number?: string;
  issuing_country?: string;
}

export default function IssuePage() {
  const [userData, setUserData] = useState<UserData>({
    given_name: "",
    family_name: "",
    birth_date: "",
    document_number: "",
    issuing_country: "EU",
  });
  const [loading, setLoading] = useState(false);
  const [credentialOffer, setCredentialOffer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Generate QR code when credential offer is created
  useEffect(() => {
    if (credentialOffer?.credential_offer_uri) {
      QRCode.toDataURL(credentialOffer.credential_offer_uri, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((dataUrl: SetStateAction<string | null>) => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch((err: any) => {
          console.error("Error generating QR code:", err);
        });
    } else {
      setQrCodeDataUrl(null);
    }
  }, [credentialOffer]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCredentialOffer(null);

    try {
      // Validate required fields
      if (
        !userData.given_name ||
        !userData.family_name ||
        !userData.birth_date
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Request credential offer from issuer
      const response = await fetch("/api/issue/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_data: userData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error_description || "Failed to create credential offer"
        );
      }

      const result = await response.json();
      setCredentialOffer(result);
    } catch (err) {
      console.error("Full error object:", err);
      const errorMessage = (err as Error).message || "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Digital Credentials Issuer
          </h1>
          <p className="text-gray-600 mb-8">
            Request your EU Digital Identity (PID) credential
          </p>
        </div>

        {!credentialOffer ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white p-6 rounded-lg shadow"
          >
            <div>
              <label
                htmlFor="given_name"
                className="block text-sm font-medium text-gray-700"
              >
                Given Name *
              </label>
              <input
                type="text"
                id="given_name"
                name="given_name"
                required
                value={userData.given_name}
                onChange={handleInputChange}
                className="mt-1 block text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="John"
              />
            </div>

            <div>
              <label
                htmlFor="family_name"
                className="block text-sm font-medium text-gray-700"
              >
                Family Name *
              </label>
              <input
                type="text"
                id="family_name"
                name="family_name"
                required
                value={userData.family_name}
                onChange={handleInputChange}
                className="mt-1 block text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Doe"
              />
            </div>

            <div>
              <label
                htmlFor="birth_date"
                className="block text-sm font-medium text-gray-700"
              >
                Date of Birth *
              </label>
              <input
                type="date"
                id="birth_date"
                name="birth_date"
                required
                value={userData.birth_date}
                onChange={handleInputChange}
                className="mt-1 text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="document_number"
                className="block text-sm font-medium text-gray-700"
              >
                Document Number (Optional)
              </label>
              <input
                type="text"
                id="document_number"
                name="document_number"
                value={userData.document_number}
                onChange={handleInputChange}
                className="mt-1 block text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456789"
              />
            </div>

            <div>
              <label
                htmlFor="issuing_country"
                className="block text-sm font-medium text-gray-700"
              >
                Issuing Country
              </label>
              <select
                id="issuing_country"
                name="issuing_country"
                value={userData.issuing_country}
                onChange={handleInputChange}
                className="mt-1 block text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EU">European Union</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Credential Offer..." : "Request Credential"}
            </button>
          </form>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Credential Offer Created!
              </h2>
              <p className="text-gray-600 mb-4">
                Your credential offer has been generated. Scan the QR code below
                with your wallet app or manually copy the offer details.
              </p>
            </div>

            <div className="space-y-4">
              {qrCodeDataUrl && (
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Scan QR Code with Your Wallet
                  </label>
                  <div className="flex justify-center mb-4">
                    <img
                      src={qrCodeDataUrl}
                      alt="Credential Offer QR Code"
                      className="border border-gray-300 rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="mb-4">
                    <a
                      href={credentialOffer.credential_offer_uri}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      Open in Wallet (for mobile)
                    </a>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Scan this QR code with Sphereon or any OpenID4VCI-compatible
                    wallet
                  </p>
                  <div className="flex justify-center space-x-4 mb-6">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.sphereon.ssi.wallet&hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                      </svg>
                      Get on Google Play
                    </a>
                    <a
                      href="https://apps.apple.com/us/app/sphereon-wallet/id1661096796"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,21.97 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,9.1 17.41,11.63C17.44,14.39 20.06,15.5 20.09,15.58C20.06,15.67 19.67,17.19 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                      </svg>
                      Download on App Store
                    </a>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-authorized Code
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={credentialOffer.pre_authorized_code}
                    readOnly
                    className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(credentialOffer.pre_authorized_code)
                    }
                    className="px-3 py-2 text-black border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Code (PIN)
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={credentialOffer.tx_code}
                    readOnly
                    className="flex-1 px-3 py-2 text-black border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(credentialOffer.tx_code)}
                    className="px-3 py-2 text-black border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You&apos;ll need this 4-digit code when exchanging the
                  authorization code for a token
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Offer URI
                </label>
                <div className="flex">
                  <textarea
                    value={credentialOffer.credential_offer_uri}
                    readOnly
                    rows={3}
                    className="flex-1 px-3 py-2 text-black border border-gray-300 rounded-l-md bg-gray-50 text-xs"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(credentialOffer.credential_offer_uri)
                    }
                    className="px-3 py-2 text-black border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Next Steps:
                </h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Open your wallet app (e.g., Sphereon)</li>
                  <li>
                    2. Scan the QR code above or paste the credential offer URI
                    below
                  </li>
                  <li>
                    3. Enter the transaction code when prompted:{" "}
                    <strong>{credentialOffer.tx_code}</strong>
                  </li>
                  <li>4. Complete the credential issuance flow</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  setCredentialOffer(null);
                  setQrCodeDataUrl(null);
                  setUserData({
                    given_name: "",
                    family_name: "",
                    birth_date: "",
                    document_number: "",
                    issuing_country: "EU",
                  });
                }}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Another Credential
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-500 text-sm">
            ← Back to Verifier
          </Link>
        </div>
      </div>
    </div>
  );
}
