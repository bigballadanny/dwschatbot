import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Brain, Database, Clock } from 'lucide-react'

interface RagIndicatorProps {
  ragPercentage?: number
  sourcesUsed?: string[]
  processingTime?: number
}

export function RagIndicator({ ragPercentage = 0, sourcesUsed = [], processingTime }: RagIndicatorProps) {
  if (ragPercentage === 0 && sourcesUsed.length === 0 && !processingTime) {
    return null; // Don't show indicator if no relevant data
  }

  return (
    <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs border border-muted">
      <div className="flex items-center gap-2 mb-1">
        {ragPercentage > 0 ? (
          <>
            <Database className="h-3 w-3 text-blue-500" />
            <span className="font-medium">{ragPercentage}% from transcripts</span>
          </>
        ) : (
          <>
            <Brain className="h-3 w-3 text-purple-500" />
            <span className="font-medium">General knowledge response</span>
          </>
        )}
        {processingTime && (
          <div className="flex items-center gap-1 text-muted-foreground ml-auto">
            <Clock className="h-3 w-3" />
            <span>{processingTime}ms</span>
          </div>
        )}
      </div>
      
      {ragPercentage > 0 && (
        <div className="mb-2">
          <Progress value={ragPercentage} className="h-1" />
        </div>
      )}
      
      {sourcesUsed.length > 0 && (
        <div className="text-muted-foreground">
          <span className="font-medium">Sources:</span> {sourcesUsed.join(', ')}
        </div>
      )}
    </div>
  )
}