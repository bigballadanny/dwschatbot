import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Loader2, Paperclip, Mic, MicOff } from "lucide-react"
import SearchModeToggle from '@/components/SearchModeToggle'
import { useAudio } from '@/contexts/AudioContext'

export interface AIInputWithSearchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSend: (value: string) => void
  onFileUpload?: (files: FileList) => void
  loading?: boolean
  buttonClassName?: string
  uploading?: boolean
  className?: string
  containerClassName?: string
  allowMultipleFiles?: boolean
  acceptFileTypes?: string
  enableOnlineSearch?: boolean
  onToggleOnlineSearch?: (enabled: boolean) => void
  showVoiceInput?: boolean
}

/**
 * Enhanced AI Input component with search mode toggle and voice input capabilities
 */
const AIInputWithSearch = React.forwardRef<HTMLInputElement, AIInputWithSearchProps>(
  ({ 
    className, 
    containerClassName, 
    onSend, 
    onFileUpload, 
    loading = false, 
    uploading = false, 
    buttonClassName, 
    allowMultipleFiles = false,
    acceptFileTypes = ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav",
    enableOnlineSearch,
    onToggleOnlineSearch,
    showVoiceInput = true,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = React.useState(props.value || '')
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const { isRecording, isProcessing, startRecording, stopRecording, transcript } = useAudio()
    
    // Handle voice input
    React.useEffect(() => {
      if (transcript && !loading) {
        setInputValue(transcript)
      }
    }, [transcript, loading])
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (typeof inputValue === 'string' && inputValue.trim()) {
        onSend(inputValue.trim())
        setInputValue('')
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

    const toggleVoiceRecording = () => {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    }

    React.useEffect(() => {
      if (props.value !== undefined && props.value !== inputValue) {
        setInputValue(props.value)
      }
    }, [props.value])

    return (
      <div className={cn("flex flex-col gap-2 w-full", containerClassName)}>
        <form
          className="flex items-center gap-2 w-full"
          onSubmit={handleSubmit}
        >
          <div className="relative flex-1">
            <Input
              {...props}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              ref={ref}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-background px-4 py-6 text-base shadow-sm", 
                props.disabled && "opacity-70",
                className
              )}
            />
          </div>
          
          <div className="flex items-center gap-1">
            {/* Voice input button */}
            {showVoiceInput && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={loading || uploading || props.disabled}
                className={cn(
                  "h-10 w-10 rounded-full",
                  isRecording ? "bg-red-500 text-white hover:bg-red-600" : "text-muted-foreground hover:text-amber-500 transition-colors",
                  isProcessing && "bg-amber-500 text-white hover:bg-amber-600"
                )}
                onClick={toggleVoiceRecording}
                title={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* File upload button */}
            {onFileUpload && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept={acceptFileTypes}
                  multiple={allowMultipleFiles}
                />
                
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={uploading || loading || props.disabled}
                  className={cn(
                    "h-10 w-10 rounded-full text-muted-foreground hover:text-amber-500 transition-colors",
                    uploading && "opacity-70"
                  )}
                  onClick={handleFileClick}
                  title="Upload document"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            
            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={loading || props.disabled || (!inputValue.trim() && !isRecording)}
              className={cn(
                "h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md", 
                buttonClassName
              )}
              title="Send message"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
        
        {/* Search mode toggle */}
        {typeof enableOnlineSearch !== 'undefined' && onToggleOnlineSearch && (
          <div className="flex justify-end">
            <SearchModeToggle
              enableOnlineSearch={enableOnlineSearch}
              onToggle={onToggleOnlineSearch}
              className="text-xs"
            />
          </div>
        )}
      </div>
    )
  }
)

AIInputWithSearch.displayName = "AIInputWithSearch"

export { AIInputWithSearch }