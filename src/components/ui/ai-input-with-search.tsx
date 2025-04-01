
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Loader2 } from "lucide-react"

export interface AIInputWithSearchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSend: (value: string) => void
  loading?: boolean
  buttonClassName?: string
}

const AIInputWithSearch = React.forwardRef<HTMLInputElement, AIInputWithSearchProps>(
  ({ className, onSend, loading = false, buttonClassName, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState(props.value || '')
    
    React.useEffect(() => {
      if (props.value !== undefined) {
        setInputValue(props.value)
      }
    }, [props.value])
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (typeof inputValue === 'string' && inputValue.trim()) {
        onSend(inputValue.trim())
        setInputValue('')
      }
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      if (props.onChange) {
        props.onChange(e)
      }
    }

    return (
      <form
        className={cn(
          "flex w-full items-center gap-2",
          className
        )}
        onSubmit={handleSubmit}
      >
        <Input
          {...props}
          value={inputValue}
          onChange={handleChange}
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-md border border-input bg-background px-4 py-6 text-base",
            props.disabled && "opacity-70"
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || props.disabled}
          className={cn(
            "h-12 w-12 flex-shrink-0", 
            buttonClassName
          )}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    )
  }
)

AIInputWithSearch.displayName = "AIInputWithSearch"

export { AIInputWithSearch }
