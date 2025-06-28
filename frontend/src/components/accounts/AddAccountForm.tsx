import React, { useState } from "react";
import accountService from "../../services/accountService";

interface AddAccountFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AddAccountForm: React.FC<AddAccountFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    provider: "",
    accountName: "",
    credentials: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const providers = [
    { id: "aws-s3", name: "AWS S3", icon: "🪣" },
    { id: "google-drive", name: "Google Drive", icon: "📱" },
    { id: "azure-blob", name: "Azure Blob", icon: "☁️" },
    { id: "dropbox", name: "Dropbox", icon: "📦" },
  ];

  const handleProviderChange = (provider: string) => {
    setFormData({
      provider,
      accountName: "",
      credentials: {},
    });
    setError("");
  };

  const handleCredentialChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      credentials: {
        ...formData.credentials,
        [field]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await accountService.addAccount(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCredentialFields = () => {
    switch (formData.provider) {
      case "aws-s3":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Access Key ID
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) =>
                  handleCredentialChange("accessKeyId", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Secret Access Key
              </label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) =>
                  handleCredentialChange("secretAccessKey", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Region
              </label>
              <input
                type="text"
                required
                placeholder="e.g., us-east-1"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) =>
                  handleCredentialChange("region", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bucket Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) =>
                  handleCredentialChange("bucketName", e.target.value)
                }
              />
            </div>
          </div>
        );

      case "google-drive":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Service Account Key
              </label>
              <textarea
                required
                rows={8}
                placeholder="Paste your Google service account JSON here..."
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  try {
                    const serviceAccountKey = JSON.parse(e.target.value);
                    handleCredentialChange(
                      "serviceAccountKey",
                      serviceAccountKey
                    );
                  } catch (error) {
                    // Invalid JSON, keep the string for now
                    handleCredentialChange("serviceAccountKey", e.target.value);
                  }
                }}
              />
              <p className="mt-1 text-sm text-gray-500">
                Paste the entire JSON content from your Google service account
                key file.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Please select a provider to configure credentials.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Add Cloud Account
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Provider
          </label>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleProviderChange(provider.id)}
                className={`flex items-center p-3 border rounded-lg text-left transition-colors ${
                  formData.provider === provider.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className="text-2xl mr-3">{provider.icon}</span>
                <span className="font-medium">{provider.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account Name */}
        {formData.provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Name
            </label>
            <input
              type="text"
              required
              value={formData.accountName}
              onChange={(e) =>
                setFormData({ ...formData, accountName: e.target.value })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a name for this account"
            />
          </div>
        )}

        {/* Credentials */}
        {formData.provider && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {providers.find((p) => p.id === formData.provider)?.name}{" "}
              Credentials
            </h3>
            {renderCredentialFields()}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.provider || !formData.accountName || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {loading ? "Adding Account..." : "Add Account"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAccountForm;
