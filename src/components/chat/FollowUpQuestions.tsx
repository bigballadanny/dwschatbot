import React from 'react'
import { Button } from '@/components/ui/button'
import { HelpCircle, ArrowRight } from 'lucide-react'

interface FollowUpQuestionsProps {
  questions: string[]
  onQuestionClick: (question: string) => void
}

export function FollowUpQuestions({ questions, onQuestionClick }: FollowUpQuestionsProps) {
  if (!questions || questions.length === 0) return null

  return (
    <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-md">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-primary">
        <HelpCircle className="h-4 w-4" />
        <span>Related questions:</span>
      </div>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-2 px-3 text-sm hover:bg-primary/5 border-primary/20"
            onClick={() => onQuestionClick(question)}
          >
            <div className="flex items-start gap-2 text-left">
              <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary/60" />
              <span className="flex-1">{question}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}