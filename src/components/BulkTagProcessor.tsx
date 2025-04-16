
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchSummaryProcessor from './BatchSummaryProcessor';
import { Tag, Sparkles } from 'lucide-react';
import BulkAutoTagProcessor from './BulkAutoTagProcessor';

interface BulkTagProcessorProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  userId: string;
}

const BulkTagProcessor: React.FC<BulkTagProcessorProps> = ({
  open,
  onClose,
  onComplete,
  userId
}) => {
  const [activeTab, setActiveTab] = useState("auto-tag");

  const handleCompleted = () => {
    if (onComplete) onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Processor</DialogTitle>
          <DialogDescription>
            Process multiple transcripts at once with AI assistance
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="auto-tag" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Auto-Tagging
            </TabsTrigger>
            <TabsTrigger value="summaries" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Summaries
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="auto-tag">
            <div className="mt-4">
              <p className="text-muted-foreground">
                This feature will scan your transcripts and automatically tag them based on their content.
              </p>
              
              <BulkAutoTagProcessor
                open={activeTab === "auto-tag"}
                onClose={handleCompleted}
                userId={userId}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="summaries">
            <BatchSummaryProcessor 
              open={activeTab === "summaries"} 
              onClose={handleCompleted}
              userId={userId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTagProcessor;

