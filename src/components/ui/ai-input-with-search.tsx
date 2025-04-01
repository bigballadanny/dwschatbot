import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Loader2, Paperclip } from "lucide-react"

export interface AIInputWithSearchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSend: (value: string) => void
  onFileUpload?: (files: FileList) => void
  loading?: boolean
  buttonClassName?: string
  uploading?: boolean
}

const AIInputWithSearch = React.forwardRef<HTMLInputElement, AIInputWithSearchProps>(
  ({ className, onSend, onFileUpload, loading = false, uploading = false, buttonClassName, ...props }, ref) => {
    const [inputValue, setInputValue] = React.useState(props.value || '')
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    
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

    const handleFileClick = () => {
      fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && onFileUpload) {
        onFileUpload(e.target.files)
      }
    }

    return (
      <form
        className={cn(
          "flex w-full items-center gap-2 relative",
          className
        )}
        onSubmit={handleSubmit}
      >
        <div className="relative flex-1">
          <Input
            {...props}
            value={inputValue}
            onChange={handleChange}
            ref={ref}
            className={cn(
              "flex h-12 w-full rounded-lg border border-input bg-background px-4 py-6 text-base shadow-sm pr-24",
              props.disabled && "opacity-70"
            )}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              multiple
            />
            
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={uploading || props.disabled}
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-yellow-500",
                uploading && "opacity-70"
              )}
              onClick={handleFileClick}
              title="Upload document"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              type="submit"
              size="icon"
              disabled={loading || props.disabled}
              className={cn(
                "h-10 w-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black", 
                buttonClassName
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </form>
    )
  }
)

AIInputWithSearch.displayName = "AIInputWithSearch"

export { AIInputWithSearch }
