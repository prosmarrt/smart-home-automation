import { useState, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

interface DeviceNotesPanelProps {
  deviceId: string;
  deviceName: string;
  category: string;
  protocol?: string;
  initialNote?: string;
  onNoteChange: (note: string) => void;
}

export function DeviceNotesPanel({
  deviceId,
  deviceName,
  category,
  protocol,
  initialNote = '',
  onNoteChange
}: DeviceNotesPanelProps) {
  const [note, setNote] = useState(initialNote);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const { toast } = useToast();

  // Auto-save with debouncing
  useEffect(() => {
    if (note === initialNote) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [note]);

  const loadSuggestions = async () => {
    if (suggestions.length > 0) return; // Already loaded
    
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-installation-notes', {
        body: {
          device_name: deviceName,
          category: category,
          protocol: protocol
        }
      });

      if (error) {
        console.error('Error loading suggestions:', error);
        // Use fallback suggestions
        setSuggestions(getFallbackSuggestions(category));
      } else if (data?.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions(getFallbackSuggestions(category));
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions(getFallbackSuggestions(category));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // Notify parent component
      onNoteChange(note);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save note',
        variant: 'destructive'
      });
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  }, [note, onNoteChange, isSaving]);

  const insertSuggestion = (suggestion: string) => {
    const newNote = note ? `${note}\n${suggestion}` : suggestion;
    setNote(newNote);
  };

  const getFallbackSuggestions = (cat: string): string[] => {
    const fallbacks: Record<string, string[]> = {
      'camera': [
        'Install at 2.5-3m height facing entry points.',
        'Ensure stable network connection.',
        'Avoid direct sunlight exposure.'
      ],
      'mini_switch': [
        'Install behind existing wall switch.',
        'Ensure neutral wire availability.',
        'Pair with mobile app after installation.'
      ],
      'smart_lock': [
        'Check door thickness compatibility.',
        'Install backup mechanical key.',
        'Test battery level indicator.'
      ],
      'default': [
        'Follow manufacturer installation guidelines.',
        'Ensure stable power and network.',
        'Test functionality after installation.'
      ]
    };

    for (const key in fallbacks) {
      if (cat.includes(key)) return fallbacks[key];
    }
    return fallbacks['default'];
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Notes Textarea - Primary Feature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Installation Notes</label>
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add installation notes, positioning details, or client remarks..."
          className="min-h-[100px] resize-y"
          maxLength={1000}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Auto-saves after 2 seconds</span>
          <span>{note.length}/1000</span>
        </div>
      </div>

      {/* AI Suggestions - Load on Demand */}
      <div className="space-y-2">
        {!showSuggestions && suggestions.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSuggestions(true);
              loadSuggestions();
            }}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Get AI Installation Suggestions
          </Button>
        )}
        
        {(showSuggestions || suggestions.length > 0) && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Installation Suggestions</span>
            </div>
            
            {isLoadingSuggestions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating suggestions...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => insertSuggestion(suggestion)}
                  >
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {index + 1}
                    </Badge>
                    <p className="text-sm flex-1">{suggestion}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic">
                  Click any suggestion to insert into notes
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
