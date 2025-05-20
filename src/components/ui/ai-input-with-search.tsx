import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Loader2, Paperclip, Mic, MicOff, Lightbulb, Globe2 } from "lucide-react"
import SearchModeToggle from '@/components/SearchModeToggle'
import { useAudio } from '@/contexts/AudioContext'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from "framer-motion"

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
 * Enhanced AI Input component with improved usability, mobile support, and visual feedback
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
    const [focused, setFocused] = React.useState(false)
    const [typingPause, setTypingPause] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const { isRecording, isProcessing, startRecording, stopRecording, transcript } = useAudio()
    const isMobile = useIsMobile()
    const inputRef = React.useRef<HTMLInputElement>(null)
    const mergedRef = (node: HTMLInputElement) => {
      // Handle both the forwardRef and our local ref
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
      inputRef.current = node
    }
    
    // Handle voice input
    React.useEffect(() => {
      if (transcript && !loading) {
        setInputValue(transcript)
        // Focus and trigger typing pause when transcript is received
        if (inputRef.current) {
          inputRef.current.focus()
          setTypingPause(true)
          
          // Reset typing pause after a delay
          setTimeout(() => {
            setTypingPause(false)
          }, 1000)
        }
      }
    }, [transcript, loading])
    
    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (typeof inputValue === 'string' && inputValue.trim()) {
        onSend(inputValue.trim())
        setInputValue('')
        
        // Keep focus on input after sending
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }
    }
    
    // Handle file upload clicks
    const handleFileClick = () => {
      fileInputRef.current?.click()
    }

    // Handle file changes
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && onFileUpload) {
        onFileUpload(e.target.files)
        // Clear the input value to allow re-upload of the same file
        e.target.value = ''
      }
    }

    // Toggle voice recording
    const toggleVoiceRecording = () => {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
        // Clear input when starting recording
        setInputValue('')
      }
    }
    
    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Submit on Enter (unless Shift is pressed for multiline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (inputValue.trim() && !loading && !props.disabled) {
          handleSubmit(e)
        }
      }
      
      // Escape key stops recording if active
      if (e.key === 'Escape' && isRecording) {
        stopRecording()
      }
    }

    // Sync props.value with internal state
    React.useEffect(() => {
      if (props.value !== undefined && props.value !== inputValue) {
        setInputValue(props.value)
      }
    }, [props.value])
    
    // Determine if input field should use autocomplete
    // Turn off for voice input to avoid interference
    const autocompleteValue = isRecording ? "off" : props.autoComplete || "off"
    
    // Placeholder text based on recording state
    const placeholderText = isRecording 
      ? "Listening..."
      : isProcessing
        ? "Processing voice input..."
        : props.placeholder || "Ask a question..."

    return (
      <div className={cn("flex flex-col gap-2 w-full", containerClassName)}>
        <form
          className="flex items-center gap-2 w-full"
          onSubmit={handleSubmit}
        >
          <div className={cn(
            "relative flex-1 transition-all",
            focused && "ring-1 ring-amber-400 rounded-lg"
          )}>
            <Input
              {...props}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              autoComplete={autocompleteValue}
              ref={mergedRef}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-background pr-12 pl-4 py-6 shadow-sm transition-all duration-200", 
                props.disabled && "opacity-70",
                isRecording && "animate-pulse border-red-400",
                focused && "border-amber-400",
                isMobile && "text-base", // Larger text on mobile
                className
              )}
              placeholder={placeholderText}
            />
            
            {/* Visual recording indicator */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  className="absolute right-16 top-1/2 transform -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Search mode indicator inside input field */}
            {enableOnlineSearch && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Globe2 className="w-4 h-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Web search enabled</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Voice input button with tooltip */}
            {showVoiceInput && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      disabled={loading || uploading || props.disabled}
                      className={cn(
                        "h-10 w-10 rounded-full",
                        isRecording ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" : "text-muted-foreground hover:text-amber-500 transition-colors",
                        isProcessing && "bg-amber-500 text-white hover:bg-amber-600"
                      )}
                      onClick={toggleVoiceRecording}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{isRecording ? "Stop recording" : "Start voice input"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* File upload button with tooltip */}
            {onFileUpload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
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
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Upload document</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Send button with tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={loading || props.disabled || (!inputValue.trim() && !isRecording)}
                      className={cn(
                        "h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md", 
                        buttonClassName,
                        (loading || uploading) && "opacity-70",
                        inputValue.trim() && !loading && "animate-pulse"
                      )}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>
        
        {/* Search mode toggle - styled for better visibility */}
        {typeof enableOnlineSearch !== 'undefined' && onToggleOnlineSearch && (
          <div className="flex justify-end">
            <SearchModeToggle
              enableOnlineSearch={enableOnlineSearch}
              onToggle={onToggleOnlineSearch}
              className={cn(
                "text-xs transition-all",
                enableOnlineSearch ? "text-amber-500" : "text-muted-foreground"
              )}
            />
          </div>
        )}
      </div>
    )
  }
)

AIInputWithSearch.displayName = "AIInputWithSearch"

export { AIInputWithSearch }