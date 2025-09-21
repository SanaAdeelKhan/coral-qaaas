import { AlertTriangle, Settings } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ApiErrorNotificationProps {
  apiErrors: number
  onConfigureApis?: () => void
}

export default function ApiErrorNotification({ apiErrors, onConfigureApis }: ApiErrorNotificationProps) {
  if (apiErrors === 0) return null

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        API Configuration Issues Detected
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        {apiErrors} test{apiErrors > 1 ? 's' : ''} failed due to API configuration errors (missing or invalid API keys). 
        These are not code quality issues but service configuration problems.
        <div className="mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigureApis}
            className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-200 dark:border-orange-700 dark:hover:bg-orange-900"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure API Keys
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}