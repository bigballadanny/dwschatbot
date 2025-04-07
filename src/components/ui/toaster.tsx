
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"

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
        }

        return (
          <Toast key={id} {...props} variant={variant} className="group">
            <div className="flex gap-3">
              {Icon && <Icon className="h-5 w-5" />}
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
