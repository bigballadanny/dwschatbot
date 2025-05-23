
import { useToast } from "@/hooks/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Info, XCircle, Loader2 } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determine icon based on variant
        let Icon = null
        if (variant === "success") {
          Icon = CheckCircle2
        } else if (variant === "destructive") {
          Icon = XCircle
        } else if (variant === "warning") {
          Icon = AlertCircle
        } else if (variant === "info") {
          Icon = Info
        } else if (variant === "loading") {
          Icon = Loader2
        }

        return (
          <Toast key={id} {...props} variant={variant} className="group backdrop-blur-sm">
            <div className="flex gap-3">
              {Icon && (
                <Icon className={`h-5 w-5 ${variant === 'loading' ? 'animate-spin' : ''}`} />
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
