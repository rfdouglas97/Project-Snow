
export function BackendDocs() {
  return (
    <div className="mt-12 bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-mira-text font-heading">
          Backend Documentation
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-mira-text/70">
          Key endpoints and configuration details
        </p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-mira-text/70">Authentication</dt>
            <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
              <code className="px-2 py-1 bg-mira-background rounded">/api/auth/google</code>,{" "}
              <code className="px-2 py-1 bg-mira-background rounded">/api/auth/apple</code>
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-mira-text/70">File Upload</dt>
            <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
              <code className="px-2 py-1 bg-mira-background rounded">/api/storage/upload</code>
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-mira-text/70">Avatar Generation</dt>
            <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
              <code className="px-2 py-1 bg-mira-background rounded">/functions/generate-avatar</code>
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-mira-text/70">File Retrieval</dt>
            <dd className="mt-1 text-sm text-mira-text sm:mt-0 sm:col-span-2">
              <code className="px-2 py-1 bg-mira-background rounded">/api/storage/files</code>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
