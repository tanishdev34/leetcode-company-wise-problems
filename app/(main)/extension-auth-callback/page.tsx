export default function ExtensionAuthCallbackPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-2xl font-bold">Authentication Successful!</h1>
        <p className="text-muted-foreground">
          You have been logged in. You can close this tab and return to the extension.
        </p>
      </div>
    </div>
  )
}
