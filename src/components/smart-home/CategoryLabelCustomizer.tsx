import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';
import { Loader2, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { DeviceCategory } from '@/types/types';

interface CategoryLabelCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategoryLabelCustomizer({ open, onOpenChange }: CategoryLabelCustomizerProps) {
  const { labels, loading, updateBulk, refresh } = useCategoryLabels();
  const [localLabels, setLocalLabels] = useState<Record<string, string>>({});
  const [newCategoryKey, setNewCategoryKey] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLocalLabels(labels);
    }
  }, [open, labels]);

  const handleLabelChange = (category: string, newLabel: string) => {
    setLocalLabels(prev => ({ ...prev, [category]: newLabel }));
  };

  const handleAddCategory = () => {
    if (!newCategoryKey.trim() || !newCategoryLabel.trim()) {
      toast({
        title: 'Error',
        description: 'Both internal name and display label are required.',
        variant: 'destructive'
      });
      return;
    }

    // Sanitize key (snake_case)
    const sanitizedKey = newCategoryKey.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    if (localLabels[sanitizedKey]) {
      toast({
        title: 'Error',
        description: 'Category with this internal name already exists.',
        variant: 'destructive'
      });
      return;
    }

    setLocalLabels(prev => ({ ...prev, [sanitizedKey]: newCategoryLabel.trim() }));
    setNewCategoryKey('');
    setNewCategoryLabel('');
    toast({
      title: 'Added',
      description: `Category "${newCategoryLabel}" added to local list. Click Save All to persist.`
    });
  };

  const handleDeleteCategory = (category: string) => {
    const newLocalLabels = { ...localLabels };
    delete newLocalLabels[category];
    setLocalLabels(newLocalLabels);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const updates = Object.entries(localLabels).map(([category, display_label]) => ({
        category,
        display_label
      }));
      await updateBulk(updates);
      toast({
        title: 'Success',
        description: 'All category display labels updated successfully.'
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving category labels:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category labels.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    refresh();
    toast({
      title: 'Reset',
      description: 'Labels refreshed from database.'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Category Labels</DialogTitle>
          <DialogDescription>
            Rename device categories as they appear across the application. Internal names remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6">
          {/* Add New Category Section */}
          <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-4">
            <h4 className="font-semibold text-sm">Add New Category</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="new-key" className="text-xs">Internal Name (e.g., smart_curtain)</Label>
                <Input
                  id="new-key"
                  value={newCategoryKey}
                  onChange={(e) => setNewCategoryKey(e.target.value)}
                  placeholder="snake_case_only"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-label" className="text-xs">Display Label (e.g., Smart Curtain)</Label>
                <Input
                  id="new-label"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="User friendly name"
                  className="h-8"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleAddCategory} className="w-full">
              Add to List
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-[1fr,1.5fr,40px] gap-4 font-semibold border-b pb-2">
                <div>Internal Name</div>
                <div>Display Label</div>
                <div></div>
              </div>
              {Object.keys(localLabels).sort().map((category) => (
                <div key={category} className="grid grid-cols-[1fr,1.5fr,40px] gap-4 items-center">
                  <div className="text-sm font-mono text-muted-foreground truncate" title={category}>
                    {category}
                  </div>
                  <Input
                    value={localLabels[category] || ''}
                    onChange={(e) => handleLabelChange(category, e.target.value)}
                    placeholder={category}
                    className="h-8"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
          <Button variant="outline" onClick={handleReset} disabled={loading || saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to DB
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll} disabled={loading || saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
